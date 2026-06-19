import { assertSafeMercadoLivreUrl } from "@/lib/ml-price-sync/url-validator";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
};

export interface MercadoLivreHtmlResponse {
  html: string;
  status: number;
  finalUrl: string;
}

export async function fetchMercadoLivreHtml(url: string): Promise<MercadoLivreHtmlResponse> {
  assertSafeMercadoLivreUrl(url);

  const response = await fetch(url, {
    headers: FETCH_HEADERS,
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(25_000),
  });

  const html = await response.text();

  return {
    html,
    status: response.status,
    finalUrl: response.url,
  };
}
