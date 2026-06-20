import {
  compareProductNames,
  extractMercadoLivreId,
  extractMercadoLivreIdFromHtml,
  extractPageProductContent,
  type MlVerificationResult,
} from "@/lib/mercado-livre-verify";
import { fetchAffiliateMercadoLivreHtml } from "@/lib/ml-price-sync/html/affiliate-fetch";
import { extractPrimaryAffiliateCardHtml } from "@/lib/ml-price-sync/html/extract-price";
import {
  extractMercadoLivreItemIdFromUrl,
  resolveProductSyncUrl,
} from "@/lib/ml-price-sync/url-validator";

const BLOCKED_MESSAGE =
  "Mercado Livre bloqueou ou exigiu verificação. Tente novamente em alguns minutos.";

export async function verifyMercadoLivreListingViaAffiliate(input: {
  mercado_livre_url?: string | null;
  ml_source_url?: string | null;
  productName: string;
  mercado_livre_id?: string | null;
}): Promise<MlVerificationResult> {
  const checkedAt = new Date().toISOString();
  const syncUrl = resolveProductSyncUrl({
    mercado_livre_url: input.mercado_livre_url,
    ml_source_url: input.ml_source_url,
  });

  if (!syncUrl) {
    return {
      status: "no_url",
      message: "Produto sem link do Mercado Livre",
      checkedAt,
    };
  }

  let itemId =
    extractMercadoLivreId(syncUrl, input.mercado_livre_id) ??
    extractMercadoLivreItemIdFromUrl(syncUrl);

  try {
    const fetched = await fetchAffiliateMercadoLivreHtml(syncUrl);

    itemId =
      extractMercadoLivreId(fetched.productPageUrl ?? fetched.finalUrl, itemId) ??
      extractMercadoLivreIdFromHtml(fetched.html) ??
      itemId;

    const scopedHtml = extractPrimaryAffiliateCardHtml(fetched.html, itemId);
    const polyCard =
      extractPageProductContent(scopedHtml) ??
      extractPageProductContent(fetched.html);

    if (!polyCard) {
      return {
        status: "unknown",
        message:
          "Página do Mercado Livre aberta, mas o nome do produto não foi encontrado",
        itemId: itemId ?? undefined,
        checkedAt,
      };
    }

    const pageTitle =
      polyCard.displayTitle ??
      (polyCard.fullText.length > 120
        ? `${polyCard.fullText.slice(0, 120)}…`
        : polyCard.fullText);

    const { match, score } = compareProductNames(
      input.productName,
      polyCard.fullText
    );

    if (match) {
      return {
        status: "active",
        message: `Nome encontrado na página ML (${Math.round(score * 100)}% de correspondência)`,
        itemId: itemId ?? undefined,
        pageTitle,
        nameMatch: true,
        matchScore: score,
        checkedAt,
      };
    }

    return {
      status: "inactive",
      message: `Nome não encontrado na página ML (${Math.round(score * 100)}% de correspondência)`,
      itemId: itemId ?? undefined,
      pageTitle,
      nameMatch: false,
      matchScore: score,
      checkedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao verificar link do Mercado Livre";

    if (/bloqueou|verifica[cç][aã]o|captcha/i.test(message)) {
      return {
        status: "blocked",
        message: BLOCKED_MESSAGE,
        itemId: itemId ?? undefined,
        checkedAt,
      };
    }

    return {
      status: "error",
      message,
      itemId: itemId ?? undefined,
      checkedAt,
    };
  }
}
