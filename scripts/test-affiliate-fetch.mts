import { fetchAffiliateMercadoLivreHtml } from "../src/lib/ml-price-sync/html/affiliate-fetch.ts";
import { detectMercadoLivreBlock } from "../src/lib/ml-price-sync/html/block-detection.ts";
import { extractMercadoLivrePrice } from "../src/lib/ml-price-sync/html/extract-price.ts";

const url = process.argv[2] ?? "https://meli.la/1YAzjhx";

async function main() {
  console.log("URL testada:", url);
  console.log("=".repeat(60));

  try {
    const fetched = await fetchAffiliateMercadoLivreHtml(url);
    const block = detectMercadoLivreBlock(
      fetched.html,
      fetched.status,
      fetched.finalUrl
    );
    const price = extractMercadoLivrePrice(fetched.html, {
      preferSocial: fetched.usedSocialFallback || !fetched.productPageUrl,
    });

    console.log(
      JSON.stringify(
        {
          status: fetched.status,
          landingUrl: fetched.landingUrl,
          finalUrl: fetched.finalUrl,
          productPageUrl: fetched.productPageUrl,
          usedSocialFallback: fetched.usedSocialFallback ?? false,
          blocked: block.blocked,
          price: price.price,
          priceSource: price.source,
          title: fetched.html.match(/<title[^>]*>([^<]+)/i)?.[1]?.trim() ?? null,
        },
        null,
        2
      )
    );

    console.log("\n" + "=".repeat(60));
    console.log("RESUMO:");
    console.log("- Bloqueado:", block.blocked ? "SIM" : "NAO");
    console.log("- Fallback social:", fetched.usedSocialFallback ? "SIM" : "NAO");
    console.log("- Preco:", price.price != null ? `R$ ${price.price}` : "nao encontrado");
  } catch (error) {
    console.log("FALHOU:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

void main();
