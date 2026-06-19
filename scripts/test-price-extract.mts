import { fetchAffiliateMercadoLivreHtml } from "../src/lib/ml-price-sync/html/affiliate-fetch.ts";
import { extractMercadoLivrePrice } from "../src/lib/ml-price-sync/html/extract-price.ts";

const url = process.argv[2] ?? "https://meli.la/2H4q8SS";

const fetched = await fetchAffiliateMercadoLivreHtml(url);
const extracted = extractMercadoLivrePrice(fetched.html, { preferSocial: true });

console.log("URL:", url);
console.log("Resultado:", extracted);
