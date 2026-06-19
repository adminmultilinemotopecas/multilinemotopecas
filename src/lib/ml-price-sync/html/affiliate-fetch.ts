import { detectMercadoLivreBlock } from "@/lib/ml-price-sync/html/block-detection";
import { extractMercadoLivrePrice } from "@/lib/ml-price-sync/html/extract-price";
import { fetchMercadoLivreHtml } from "@/lib/ml-price-sync/html/fetch-html";
import {
  isMercadoLivreProductPageUrl,
  normalizeSyncUrl,
} from "@/lib/ml-price-sync/url-validator";

const BLOCKED_MESSAGE = "Mercado Livre bloqueou ou exigiu verificação.";

function decodeHtmlUrl(raw: string): string {
  return raw.replace(/&amp;/g, "&").replace(/\\\//g, "/");
}

function collectPatternMatches(html: string, pattern: RegExp): string[] {
  const globalPattern = pattern.global
    ? pattern
    : new RegExp(
        pattern.source,
        pattern.flags.includes("i") ? "gi" : "g"
      );

  const matches: string[] = [];
  for (const match of html.matchAll(globalPattern)) {
    matches.push(match[1] ?? match[0]);
  }
  return matches;
}

export function extractProductPageUrlFromHtml(html: string): string | null {
  const patterns = [
    /href="(https?:\/\/(?:www\.|produto\.)?mercadolivre\.com\.br[^"]*(?:MLB-?\d+|\/p\/MLB)[^"]*)"/gi,
    /"permalink"\s*:\s*"(https?:\\\/\\\/[^"]+MLB[^"]+)"/gi,
    /"url"\s*:\s*"(https?:\\\/\\\/[^"]+MLB[^"]+)"/gi,
    /https?:\/\/(?:www\.|produto\.)?mercadolivre\.com\.br[^\s"'<>]*MLB-?\d+[^\s"'<>]*/gi,
  ];

  for (const pattern of patterns) {
    for (const raw of collectPatternMatches(html, pattern)) {
      try {
        const url = normalizeSyncUrl(decodeHtmlUrl(raw));
        if (isMercadoLivreProductPageUrl(url)) return url;
      } catch {
        // ignore invalid url
      }
    }
  }

  return null;
}

export interface AffiliateFetchResult {
  html: string;
  status: number;
  finalUrl: string;
  affiliateUrl: string;
  landingUrl: string;
  productPageUrl: string | null;
  usedSocialFallback?: boolean;
}

function buildLandingResult(
  landing: Awaited<ReturnType<typeof fetchMercadoLivreHtml>>,
  affiliateUrl: string,
  productPageUrl: string | null,
  usedSocialFallback = false
): AffiliateFetchResult {
  return {
    html: landing.html,
    status: landing.status,
    finalUrl: landing.finalUrl,
    affiliateUrl,
    landingUrl: landing.finalUrl,
    productPageUrl,
    usedSocialFallback,
  };
}

export async function fetchAffiliateMercadoLivreHtml(
  affiliateUrl: string
): Promise<AffiliateFetchResult> {
  const landing = await fetchMercadoLivreHtml(affiliateUrl);

  const landingBlock = detectMercadoLivreBlock(
    landing.html,
    landing.status,
    landing.finalUrl
  );
  if (landingBlock.blocked) {
    throw new Error(landingBlock.message ?? BLOCKED_MESSAGE);
  }

  const productPageUrl =
    extractProductPageUrlFromHtml(landing.html) ||
    (isMercadoLivreProductPageUrl(landing.finalUrl) ? landing.finalUrl : null);

  const landingResult = buildLandingResult(landing, affiliateUrl, productPageUrl);

  if (
    !productPageUrl ||
    normalizeSyncUrl(productPageUrl) === normalizeSyncUrl(landing.finalUrl)
  ) {
    return landingResult;
  }

  try {
    const product = await fetchMercadoLivreHtml(decodeHtmlUrl(productPageUrl));
    const productBlock = detectMercadoLivreBlock(
      product.html,
      product.status,
      product.finalUrl
    );

    if (!productBlock.blocked) {
      return {
        html: product.html,
        status: product.status,
        finalUrl: product.finalUrl,
        affiliateUrl,
        landingUrl: landing.finalUrl,
        productPageUrl: product.finalUrl,
        usedSocialFallback: false,
      };
    }
  } catch {
    // fall through to social profile fallback
  }

  const landingPrice = extractMercadoLivrePrice(landing.html, { preferSocial: true });
  if (landingPrice.price != null) {
    return buildLandingResult(landing, affiliateUrl, productPageUrl, true);
  }

  throw new Error(BLOCKED_MESSAGE);
}
