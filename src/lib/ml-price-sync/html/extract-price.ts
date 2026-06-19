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

export function extractPriceFromSocialPage(html: string): number | null {
  const socialPatterns = [
    /class=["'][^"']*andes-money-amount[^"']*["'][^>]*aria-label=["']([^"']+)["']/i,
    /aria-label=["'](\d[\d.,]*)\s*reais?[^"']*["'][^>]*class=["'][^"']*andes-money-amount/i,
    /class=["'][^"']*social-post[^"']*["'][\s\S]{0,2500}?class=["'][^"']*andes-money-amount__fraction["'][^>]*>([\d.]+)/i,
  ];

  for (const pattern of socialPatterns) {
    const match = html.match(pattern);
    const price = normalizePrice(match?.[1] ? decodeHtmlEntities(match[1]) : null);
    if (price != null) return price;
  }

  return null;
}

export function extractPriceNearMercadoLivreId(
  html: string,
  mercadoLivreId: string | null | undefined
): number | null {
  if (!mercadoLivreId?.trim()) return null;

  const numericId = mercadoLivreId.replace(/^MLB-?/i, "");
  if (!numericId) return null;

  const patterns = [
    new RegExp(
      `MLB-?${numericId}[\\s\\S]{0,5000}?class=["'][^"']*andes-money-amount__fraction["'][^>]*>([\\d.]+)`,
      "i"
    ),
    new RegExp(
      `MLB-?${numericId}[\\s\\S]{0,5000}?aria-label=["']([^"']*reais[^"']*)["']`,
      "i"
    ),
    new RegExp(`MLB-?${numericId}[\\s\\S]{0,5000}?"price"\\s*:\\s*([\\d.]+)`, "i"),
    new RegExp(
      `item_id(?:%3A|:)MLB${numericId}[\\s\\S]{0,5000}?"price"\\s*:\\s*([\\d.]+)`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const price = normalizePrice(match?.[1] ? decodeHtmlEntities(match[1]) : null);
    if (price != null) return price;
  }

  return null;
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
): {
  price: number | null;
  source: string | null;
} {
  if (options?.mercadoLivreId) {
    const targetedPrice = extractPriceNearMercadoLivreId(html, options.mercadoLivreId);
    if (targetedPrice != null) {
      return { price: targetedPrice, source: "social_profile_mlb" };
    }
  }

  if (options?.preferSocial) {
    const socialPrice = extractPriceFromSocialPage(html);
    if (socialPrice != null) return { price: socialPrice, source: "social_profile" };
  }

  const jsonLdPrice = extractPriceFromJsonLd(html);
  if (jsonLdPrice != null) return { price: jsonLdPrice, source: "json_ld" };

  const metaPrice = extractPriceFromMetaTags(html);
  if (metaPrice != null) return { price: metaPrice, source: "meta_tags" };

  const socialPrice = extractPriceFromSocialPage(html);
  if (socialPrice != null) return { price: socialPrice, source: "social_profile" };

  const scriptPrice = extractPriceFromScripts(html);
  if (scriptPrice != null) return { price: scriptPrice, source: "scripts" };

  return { price: null, source: null };
}
