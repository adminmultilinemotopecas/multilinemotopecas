export { fetchAffiliateMercadoLivreHtml, extractProductPageUrlFromHtml } from "./affiliate-fetch";
export { fetchMercadoLivreHtml } from "./fetch-html";
export { detectMercadoLivreBlock } from "./block-detection";
export {
  extractPriceFromJsonLd,
  extractPriceFromMetaTags,
  extractPriceFromSocialPage,
  extractPricesFromSocialPage,
  extractPriceFromScripts,
  extractMercadoLivrePrice,
  normalizePrice,
} from "./extract-price";
export {
  syncMercadoLivrePrice,
  syncAllMercadoLivrePrices,
  applyMercadoLivreBrowserPrice,
  isServerFetchEnabled,
  getSyncDelayWithJitter,
} from "./sync-service";
