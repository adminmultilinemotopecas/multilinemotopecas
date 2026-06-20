import { fetchAffiliateMercadoLivreHtml } from "../src/lib/ml-price-sync/html/affiliate-fetch.ts";
import { extractMercadoLivrePrice } from "../src/lib/ml-price-sync/html/extract-price.ts";
import { extractMercadoLivreItemIdFromUrl } from "../src/lib/ml-price-sync/url-validator.ts";

const url = process.argv[2] ?? "https://meli.la/1L3qkeE";

const fetched = await fetchAffiliateMercadoLivreHtml(url);
const itemId = extractMercadoLivreItemIdFromUrl(fetched.productPageUrl ?? url);
const extracted = extractMercadoLivrePrice(fetched.html, {
  preferSocial: true,
  mercadoLivreId: itemId,
});

console.log("URL:", url);
console.log("itemId:", itemId);
console.log("productPageUrl:", fetched.productPageUrl);
console.log("Resultado:", extracted);
