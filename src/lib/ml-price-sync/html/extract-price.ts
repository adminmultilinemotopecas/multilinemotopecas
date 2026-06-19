export function normalizePrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value * 100) / 100;
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return Math.round(parsed * 100) / 100;
}

export interface ExtractedMercadoLivrePrices {
  price: number | null;
  promotionalPrice: number | null;
  source: string | null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function isBrlCurrency(value: unknown): boolean {
  if (value == null) return true;
  return /^BRL$/i.test(String(value).trim());
}

function parseMercadoLivreMoneyLabel(label: string): number | null {
  const text = decodeHtmlEntities(label).toLowerCase();
  const match = text.match(
    /(\d{1,3}(?:\.\d{3})*|\d+)\s*reais(?:\s*(?:com|e)\s*(\d{1,2})\s*centavos?)?/
  );
  if (!match) return null;

  const reais = match[1].replace(/\./g, "");
  const cents = (match[2] ?? "0").padStart(2, "0");
  return normalizePrice(`${reais}.${cents}`);
}

function extractPrimarySocialCardHtml(html: string): string {
  const start = html.search(/social-post|poly-card|poly-price/i);
  if (start === -1) return html;

  const slice = html.slice(start, start + 12000);
  const altIdx = slice.search(/outra op[cç][aã]o de compra/i);
  return altIdx > 0 ? slice.slice(0, altIdx) : slice;
}

function normalizePricePair(input: {
  originalPrice: number | null;
  currentPrice: number | null;
}): { price: number | null; promotionalPrice: number | null } {
  const { originalPrice, currentPrice } = input;

  if (
    originalPrice != null &&
    currentPrice != null &&
    originalPrice > currentPrice &&
    originalPrice - currentPrice >= 0.5
  ) {
    return { price: originalPrice, promotionalPrice: currentPrice };
  }

  const single = currentPrice ?? originalPrice;
  return { price: single, promotionalPrice: null };
}

function readOffersPrice(
  offers: unknown
): { price: number; currency: string | null } | null {
  const offerList = Array.isArray(offers) ? offers : offers ? [offers] : [];

  for (const offer of offerList) {
    if (!offer || typeof offer !== "object") continue;
    const record = offer as Record<string, unknown>;
    const currency = String(record.priceCurrency ?? record.pricecurrency ?? "BRL");
    if (!isBrlCurrency(currency)) continue;

    const candidates = [record.price, record.lowPrice, record.highPrice];
    for (const candidate of candidates) {
      const price = normalizePrice(candidate);
      if (price != null) return { price, currency };
    }
  }

  return null;
}

export function extractPricesFromSocialPage(html: string): {
  price: number | null;
  promotionalPrice: number | null;
} {
  const scope = extractPrimarySocialCardHtml(html);
  let originalPrice: number | null = null;
  let currentPrice: number | null = null;

  for (const match of scope.matchAll(/aria-label=["']([^"']+)["']/gi)) {
    const label = match[1];
    const value = parseMercadoLivreMoneyLabel(label);
    if (value == null) continue;

    if (/antes/i.test(label)) originalPrice = value;
    if (/agora/i.test(label)) currentPrice = value;
  }

  if (currentPrice == null || originalPrice == null) {
    const previousMatch = scope.match(
      /andes-money-amount--previous[\s\S]{0,700}?andes-money-amount__fraction[^>]*>([\d.]+)[\s\S]{0,180}?andes-money-amount__cents[^>]*>(\d+)/i
    );
    const currentMatch = scope.match(
      /andes-money-amount--cents-superscript[\s\S]{0,700}?andes-money-amount__fraction[^>]*>([\d.]+)[\s\S]{0,180}?andes-money-amount__cents[^>]*>(\d+)/i
    );

    if (previousMatch) {
      originalPrice =
        normalizePrice(`${previousMatch[1].replace(/\./g, "")}.${previousMatch[2]}`) ??
        originalPrice;
    }

    if (currentMatch) {
      currentPrice =
        normalizePrice(`${currentMatch[1].replace(/\./g, "")}.${currentMatch[2]}`) ??
        currentPrice;
    }
  }

  return normalizePricePair({ originalPrice, currentPrice });
}

export function extractPriceFromJsonLd(html: string): number | null {
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

        const nodes: Record<string, unknown>[] = [record];
        if (Array.isArray(record["@graph"])) {
          for (const node of record["@graph"]) {
            if (node && typeof node === "object") {
              nodes.push(node as Record<string, unknown>);
            }
          }
        }

        for (const node of nodes) {
          if (node["@type"] !== "Product" && node["@type"] !== "Offer") continue;

          const fromOffers = readOffersPrice(node.offers);
          if (fromOffers?.price != null) return fromOffers.price;

          if (node["@type"] === "Offer") {
            const currency = String(node.priceCurrency ?? "BRL");
            if (!isBrlCurrency(currency)) continue;
            const price = normalizePrice(node.price ?? node.lowPrice ?? node.highPrice);
            if (price != null) return price;
          }
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  return null;
}

export function extractPriceFromMetaTags(html: string): number | null {
  const patterns = [
    /property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+property=["']product:price:amount["']/i,
    /property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+property=["']og:price:amount["']/i,
    /itemprop=["']price["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+itemprop=["']price["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const price = normalizePrice(match?.[1] ? decodeHtmlEntities(match[1]) : null);
    if (price != null) {
      const currencyMatch = html.match(
        /(?:property=["']product:price:currency["'][^>]+content=["']([^"']+)["']|content=["']([^"']+)["'][^>]+property=["']product:price:currency["'])/i
      );
      const currency = currencyMatch?.[1] ?? currencyMatch?.[2];
      if (currency && !isBrlCurrency(currency)) continue;
      return price;
    }
  }

  return null;
}

/** @deprecated Use extractPricesFromSocialPage */
export function extractPriceFromSocialPage(html: string): number | null {
  return extractPricesFromSocialPage(html).price;
}

export function extractPricesNearMercadoLivreId(
  html: string,
  mercadoLivreId: string | null | undefined
): { price: number | null; promotionalPrice: number | null } {
  if (!mercadoLivreId?.trim()) {
    return { price: null, promotionalPrice: null };
  }

  const numericId = mercadoLivreId.replace(/^MLB-?/i, "");
  if (!numericId) return { price: null, promotionalPrice: null };

  const start = html.search(new RegExp(`MLB-?${numericId}`, "i"));
  if (start === -1) return { price: null, promotionalPrice: null };

  const scope = html.slice(start, start + 12000);
  const altIdx = scope.search(/outra op[cç][aã]o de compra/i);
  const cardScope = altIdx > 0 ? scope.slice(0, altIdx) : scope;

  return extractPricesFromSocialPage(cardScope);
}

/** @deprecated Use extractPricesNearMercadoLivreId */
export function extractPriceNearMercadoLivreId(
  html: string,
  mercadoLivreId: string | null | undefined
): number | null {
  return extractPricesNearMercadoLivreId(html, mercadoLivreId).price;
}

export function extractPriceFromScripts(html: string): number | null {
  const brlChunks = html.split(/"currency_id"\s*:\s*"BRL"/i);

  for (let index = 1; index < brlChunks.length; index++) {
    const window = brlChunks[index].slice(0, 800);
    const priceMatch =
      window.match(/"price"\s*:\s*([\d.]+)/) ?? window.match(/"amount"\s*:\s*([\d.]+)/);
    const price = normalizePrice(priceMatch?.[1]);
    if (price != null) return price;
  }

  const contextualPatterns = [
    /"price"\s*:\s*([\d.]+)[\s\S]{0,240}?"currency_id"\s*:\s*"BRL"/i,
    /"amount"\s*:\s*([\d.]+)[\s\S]{0,240}?"currency_id"\s*:\s*"BRL"/i,
    /"currency_id"\s*:\s*"BRL"[\s\S]{0,240}?"price"\s*:\s*([\d.]+)/i,
    /"currency_id"\s*:\s*"BRL"[\s\S]{0,240}?"amount"\s*:\s*([\d.]+)/i,
  ];

  for (const pattern of contextualPatterns) {
    const match = html.match(pattern);
    const price = normalizePrice(match?.[1]);
    if (price != null) return price;
  }

  return null;
}

export function extractMercadoLivrePrice(
  html: string,
  options?: { preferSocial?: boolean; mercadoLivreId?: string | null }
): ExtractedMercadoLivrePrices {
  if (options?.mercadoLivreId) {
    const targeted = extractPricesNearMercadoLivreId(html, options.mercadoLivreId);
    if (targeted.price != null) {
      return { ...targeted, source: "social_profile_mlb" };
    }
  }

  if (options?.preferSocial) {
    const socialPrices = extractPricesFromSocialPage(html);
    if (socialPrices.price != null) {
      return { ...socialPrices, source: "social_profile" };
    }
  }

  const jsonLdPrice = extractPriceFromJsonLd(html);
  if (jsonLdPrice != null) {
    return { price: jsonLdPrice, promotionalPrice: null, source: "json_ld" };
  }

  const metaPrice = extractPriceFromMetaTags(html);
  if (metaPrice != null) {
    return { price: metaPrice, promotionalPrice: null, source: "meta_tags" };
  }

  const socialPrices = extractPricesFromSocialPage(html);
  if (socialPrices.price != null) {
    return { ...socialPrices, source: "social_profile" };
  }

  const scriptPrice = extractPriceFromScripts(html);
  if (scriptPrice != null) {
    return { price: scriptPrice, promotionalPrice: null, source: "scripts" };
  }

  return { price: null, promotionalPrice: null, source: null };
}
