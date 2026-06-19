import {
  compareProductNames,
  extractMercadoLivreId,
  extractMercadoLivreIdFromHtml,
} from "@/lib/mercado-livre-verify";
import {
  assertSafeMercadoLivreUrl,
  isMercadoLivreProductPageUrl,
  isRedirectAwayFromProductPage,
  normalizeSyncUrl,
} from "@/lib/ml-price-sync/url-validator";
import type { PriceScrapeEvidence, PriceScrapeResult } from "@/lib/ml-price-sync/types";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
};

const INACTIVE_PATTERNS = [
  /publica[cç][aã]o\s+pausada/i,
  /publica[cç][aã]o\s+finalizada/i,
  /an[uú]ncio\s+pausado/i,
  /an[uú]ncio\s+finalizado/i,
  /produto\s+n[aã]o\s+est[aá]\s+dispon[ií]vel/i,
  /"item_status"\s*:\s*"(?:paused|closed)"/i,
];

const BLOCKED_PATTERNS = [
  /captcha/i,
  /account-verification/i,
  /robot/i,
  /access denied/i,
  /cf-browser-verification/i,
];

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

export function parseBrazilianPrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }
  if (typeof value !== "string") return null;

  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.round(parsed * 100) / 100
    : null;
}

function extractOgTitle(html: string): string | null {
  const match =
    html.match(/property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : null;
}

function extractMetaPrice(html: string): number | null {
  const patterns = [
    /property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+property=["']product:price:amount["']/i,
    /property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const price = parseBrazilianPrice(match?.[1]);
    if (price != null) return price;
  }

  const currencyMatch = html.match(
    /property=["']product:price:currency["'][^>]+content=["']([^"']+)["']/i
  );
  if (currencyMatch?.[1] && !/^BRL$/i.test(currencyMatch[1].trim())) {
    return null;
  }

  return null;
}

function extractJsonLdProducts(html: string): Array<Record<string, unknown>> {
  const products: Array<Record<string, unknown>> = [];
  const scriptRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim()) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        if (record["@type"] === "Product") products.push(record);
        if (Array.isArray(record["@graph"])) {
          for (const node of record["@graph"]) {
            if (node && typeof node === "object" && (node as Record<string, unknown>)["@type"] === "Product") {
              products.push(node as Record<string, unknown>);
            }
          }
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  return products;
}

function extractPricesFromJsonLd(
  products: Array<Record<string, unknown>>
): { price: number; promotionalPrice: number | null } | null {
  for (const product of products) {
    const offers = product.offers;
    const offerList = Array.isArray(offers) ? offers : offers ? [offers] : [];

    for (const offer of offerList) {
      if (!offer || typeof offer !== "object") continue;
      const record = offer as Record<string, unknown>;
      const currency = String(record.priceCurrency || record.pricecurrency || "BRL");
      if (!/^BRL$/i.test(currency)) continue;

      const price = parseBrazilianPrice(record.price ?? record.lowPrice);
      if (price != null) {
        return { price, promotionalPrice: null };
      }
    }
  }

  return null;
}

function extractPreloadedStatePrices(
  html: string
): { price: number; promotionalPrice: number | null } | null {
  const match = html.match(
    /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\})\s*;\s*(?:<\/script>|window\.__|$)/i
  );
  if (!match?.[1]) return null;

  try {
    const state = JSON.parse(match[1]) as Record<string, unknown>;
    const pageState = state.pageState as Record<string, unknown> | undefined;
    const initialState = state.initialState as Record<string, unknown> | undefined;

    const priceCandidates: number[] = [];

    function walk(node: unknown, depth = 0) {
      if (depth > 8 || node == null) return;
      if (typeof node === "number" && node > 0 && node < 1_000_000) {
        priceCandidates.push(node);
        return;
      }
      if (typeof node !== "object") return;

      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (/price|amount|value/i.test(key)) {
          const parsed = parseBrazilianPrice(value);
          if (parsed != null) priceCandidates.push(parsed);
        }
        walk(value, depth + 1);
      }
    }

    walk(pageState);
    walk(initialState);

    const plausible = [...new Set(priceCandidates)]
      .filter((p) => p >= 0.5 && p <= 500_000)
      .sort((a, b) => a - b);

    if (plausible.length === 0) return null;

    return { price: plausible[0], promotionalPrice: null };
  } catch {
    return null;
  }
}

function slicePriceRootHtml(html: string): string | null {
  const patterns = [
    /<div[^>]*class="[^"]*\bui-pdp-price\b[^"]*"[\s\S]*?<\/div>\s*<\/div>/i,
    /<div[^>]*class="[^"]*\bpoly-price\b[^"]*"[\s\S]*?<\/div>\s*<\/div>/i,
    /<div[^>]*data-testid=["']price-part["'][\s\S]*?<\/div>\s*<\/div>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[0]) return match[0];
  }

  return null;
}

function extractMoneyFromHtmlBlock(block: string): {
  current: number | null;
  original: number | null;
} {
  const fractionRegex =
    /andes-money-amount__fraction[^>]*>([\d.]+)<[\s\S]*?(?:andes-money-amount__cents[^>]*>(\d{1,2})<)?/gi;

  const amounts: number[] = [];
  let match: RegExpExecArray | null;

  while ((match = fractionRegex.exec(block)) !== null) {
    const fraction = match[1];
    const cents = match[2];
    const value = cents
      ? parseBrazilianPrice(`${fraction},${cents}`)
      : parseBrazilianPrice(fraction);
    if (value != null) amounts.push(value);
  }

  const previousMatch = block.match(
    /andes-money-amount--previous[\s\S]*?andes-money-amount__fraction[^>]*>([\d.]+)<[\s\S]*?(?:andes-money-amount__cents[^>]*>(\d{1,2})<)?/i
  );

  let original: number | null = null;
  if (previousMatch) {
    original = previousMatch[2]
      ? parseBrazilianPrice(`${previousMatch[1]},${previousMatch[2]}`)
      : parseBrazilianPrice(previousMatch[1]);
  }

  const current = amounts.find((value) => value !== original) ?? amounts[0] ?? null;
  return { current, original };
}

function extractPricesFromDomBlock(html: string): {
  price: number;
  promotionalPrice: number | null;
} | null {
  const root = slicePriceRootHtml(html);
  if (!root) return null;

  if (/ui-pdp-price__installments|poly-price__installments|price__subtitles/i.test(root)) {
    const withoutInstallments = root.replace(
      /<[^>]+(?:ui-pdp-price__installments|poly-price__installments|price__subtitles)[^>]*>[\s\S]*?<\/[^>]+>/gi,
      ""
    );
    const { current, original } = extractMoneyFromHtmlBlock(withoutInstallments);
    return normalizePricePair(current, original);
  }

  const { current, original } = extractMoneyFromHtmlBlock(root);
  return normalizePricePair(current, original);
}

function normalizePricePair(
  current: number | null,
  original: number | null
): { price: number; promotionalPrice: number | null } | null {
  if (current == null && original == null) return null;

  if (
    original != null &&
    current != null &&
    original > current &&
    original - current >= 0.5
  ) {
    return { price: original, promotionalPrice: current };
  }

  const single = current ?? original;
  if (single == null) return null;
  return { price: single, promotionalPrice: null };
}

function isPlausiblePrice(price: number): boolean {
  return price > 0 && price <= 500_000;
}

function computeConfidence(
  candidates: Array<{ source: string; price: number; promotionalPrice?: number | null }>,
  nameMatchScore?: number
): number {
  if (candidates.length === 0) return 0;

  let score = 0;
  const sources = new Set(candidates.map((c) => c.source));

  if (sources.has("json_ld")) score += 0.35;
  if (sources.has("preloaded_state")) score += 0.3;
  if (sources.has("meta")) score += 0.25;
  if (sources.has("dom_price_root")) score += 0.3;

  const prices = candidates.map((c) => c.promotionalPrice ?? c.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (max - min <= Math.max(1, min * 0.02)) score += 0.15;

  if (nameMatchScore != null) {
    score += Math.min(0.25, nameMatchScore * 0.25);
  }

  return Math.min(1, score);
}

export async function scrapeMercadoLivrePrice(input: {
  sourceUrl: string;
  expectedProductName: string;
  expectedItemId?: string | null;
  browserSession?: {
    cookieHeader: string;
    userAgent?: string | null;
  } | null;
}): Promise<PriceScrapeResult> {
  const checkedAt = new Date().toISOString();
  const sourceUrl = normalizeSyncUrl(input.sourceUrl);

  const evidence: PriceScrapeEvidence = { strategies: [] };

  try {
    assertSafeMercadoLivreUrl(sourceUrl);
  } catch (error) {
    return {
      success: false,
      price: null,
      promotionalPrice: null,
      sourceUrl,
      checkedAt,
      status: "failed",
      error: error instanceof Error ? error.message : "URL inválida",
      confidenceScore: 0,
      evidence,
    };
  }

  if (!isMercadoLivreProductPageUrl(sourceUrl) && !input.expectedItemId) {
    return {
      success: false,
      price: null,
      promotionalPrice: null,
      sourceUrl,
      checkedAt,
      status: "no_url",
      error: "URL não parece ser uma página de produto do Mercado Livre.",
      confidenceScore: 0,
      evidence,
    };
  }

  let response: Response;
  const fetchHeaders: Record<string, string> = {
    ...FETCH_HEADERS,
  };

  if (input.browserSession?.cookieHeader) {
    fetchHeaders.Cookie = input.browserSession.cookieHeader;
  }

  if (input.browserSession?.userAgent) {
    fetchHeaders["User-Agent"] = input.browserSession.userAgent;
  }

  if (input.browserSession?.cookieHeader) {
    evidence.strategies.push("browser_session_cookies");
  }

  try {
    response = await fetch(sourceUrl, {
      headers: fetchHeaders,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao acessar página";
    return {
      success: false,
      price: null,
      promotionalPrice: null,
      sourceUrl,
      checkedAt,
      status: message.toLowerCase().includes("timeout") ? "blocked" : "failed",
      error: message,
      confidenceScore: 0,
      evidence,
    };
  }

  const html = await response.text();
  const finalUrl = response.url;
  evidence.finalUrl = finalUrl;
  evidence.httpStatus = response.status;

  if (response.status === 403 || BLOCKED_PATTERNS.some((p) => p.test(html))) {
    return {
      success: false,
      price: null,
      promotionalPrice: null,
      sourceUrl: finalUrl,
      checkedAt,
      status: "blocked",
      error: "Mercado Livre bloqueou ou exigiu verificação (captcha).",
      confidenceScore: 0,
      evidence,
    };
  }

  if (response.status === 404 || /p[aá]gina\s+n[aã]o\s+existe/i.test(html)) {
    return {
      success: false,
      price: null,
      promotionalPrice: null,
      sourceUrl: finalUrl,
      checkedAt,
      status: "unavailable",
      error: "Página do produto não encontrada.",
      confidenceScore: 0,
      evidence,
    };
  }

  if (INACTIVE_PATTERNS.some((p) => p.test(html))) {
    return {
      success: false,
      price: null,
      promotionalPrice: null,
      sourceUrl: finalUrl,
      checkedAt,
      status: "inactive",
      error: "Anúncio pausado, encerrado ou indisponível.",
      confidenceScore: 0,
      evidence,
    };
  }

  if (isRedirectAwayFromProductPage(sourceUrl, finalUrl, html)) {
    return {
      success: false,
      price: null,
      promotionalPrice: null,
      sourceUrl: finalUrl,
      checkedAt,
      status: "unavailable",
      error: "A URL redirecionou para fora da página do produto.",
      confidenceScore: 0,
      evidence,
    };
  }

  const pageTitle = extractOgTitle(html);
  evidence.pageTitle = pageTitle;

  const itemId =
    extractMercadoLivreId(finalUrl, input.expectedItemId) ??
    extractMercadoLivreIdFromHtml(html) ??
    input.expectedItemId ??
    null;
  evidence.itemId = itemId ?? undefined;

  const nameComparison = compareProductNames(
    input.expectedProductName,
    pageTitle || html.slice(0, 5000)
  );
  evidence.nameMatchScore = nameComparison.score;

  const candidates: Array<{ source: string; price: number; promotionalPrice?: number | null }> =
    [];

  const metaPrice = extractMetaPrice(html);
  if (metaPrice != null && isPlausiblePrice(metaPrice)) {
    candidates.push({ source: "meta", price: metaPrice });
    evidence.strategies.push("meta");
  }

  const jsonLdProducts = extractJsonLdProducts(html);
  const jsonLdPrices = extractPricesFromJsonLd(jsonLdProducts);
  if (jsonLdPrices && isPlausiblePrice(jsonLdPrices.price)) {
    candidates.push({
      source: "json_ld",
      price: jsonLdPrices.price,
      promotionalPrice: jsonLdPrices.promotionalPrice,
    });
    evidence.strategies.push("json_ld");
  }

  const preloaded = extractPreloadedStatePrices(html);
  if (preloaded && isPlausiblePrice(preloaded.price)) {
    candidates.push({
      source: "preloaded_state",
      price: preloaded.price,
      promotionalPrice: preloaded.promotionalPrice,
    });
    evidence.strategies.push("preloaded_state");
  }

  const domPrices = extractPricesFromDomBlock(html);
  if (domPrices && isPlausiblePrice(domPrices.price)) {
    candidates.push({
      source: "dom_price_root",
      price: domPrices.price,
      promotionalPrice: domPrices.promotionalPrice,
    });
    evidence.strategies.push("dom_price_root");
  }

  evidence.rawCandidates = candidates;

  if (candidates.length === 0) {
    return {
      success: false,
      price: null,
      promotionalPrice: null,
      sourceUrl: finalUrl,
      checkedAt,
      status: "failed",
      error: "Não foi possível identificar o preço principal do produto.",
      confidenceScore: 0,
      evidence,
      pageTitle,
      itemId,
      nameMatchScore: nameComparison.score,
    };
  }

  const confidenceScore = computeConfidence(candidates, nameComparison.score);

  const sorted = [...candidates].sort((a, b) => {
    const weight = (source: string) =>
      source === "dom_price_root"
        ? 4
        : source === "json_ld"
          ? 3
          : source === "preloaded_state"
            ? 2
            : 1;
    return weight(b.source) - weight(a.source);
  });

  const best = sorted[0];

  return {
    success: true,
    price: best.price,
    promotionalPrice: best.promotionalPrice ?? null,
    sourceUrl: finalUrl,
    checkedAt,
    status: "success",
    confidenceScore,
    evidence,
    pageTitle,
    itemId,
    nameMatchScore: nameComparison.score,
  };
}
