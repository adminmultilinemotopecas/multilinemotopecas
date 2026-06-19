import {
  extractMercadoLivreId,
  isMercadoLivreUrl,
  verifyMercadoLivreListing,
  compareProductNames,
  type MlVerificationResult,
} from "@/lib/mercado-livre-verify";
import type { MlBrowserSession } from "@/lib/ml-price-sync/ml-browser-session";
import {
  assertSafeMercadoLivreUrl,
  isMercadoLivreProductPageUrl,
  normalizeSyncUrl,
} from "@/lib/ml-price-sync/url-validator";

export class MlValidationError extends Error {
  code: "ml_blocked" | "ml_invalid";
  sourceUrl: string | null;

  constructor(
    code: "ml_blocked" | "ml_invalid",
    message: string,
    sourceUrl: string | null = null
  ) {
    super(message);
    this.name = "MlValidationError";
    this.code = code;
    this.sourceUrl = sourceUrl;
  }
}

export interface NormalizedMlFields {
  mercado_livre_url: string | null;
  ml_source_url: string | null;
  mercado_livre_id: string | null;
}

export interface MlUrlValidationResult {
  ok: boolean;
  normalized: NormalizedMlFields;
  verification?: MlVerificationResult;
  blocked?: boolean;
  error?: string;
  sourceUrl?: string | null;
}

function trimOrNull(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function validateUrlFormat(url: string, label: string): void {
  try {
    assertSafeMercadoLivreUrl(url);
  } catch {
    throw new MlValidationError(
      "ml_invalid",
      `${label} inválida. Use apenas links do Mercado Livre (mercadolivre.com.br, meli.la, etc.).`
    );
  }

  if (!isMercadoLivreUrl(url)) {
    throw new MlValidationError(
      "ml_invalid",
      `${label} não é um domínio permitido do Mercado Livre.`
    );
  }
}

export function normalizeMlFields(input: {
  mercado_livre_url?: string | null;
  ml_source_url?: string | null;
  mercado_livre_id?: string | null;
}): NormalizedMlFields {
  const mercado_livre_url = trimOrNull(input.mercado_livre_url);
  let ml_source_url = trimOrNull(input.ml_source_url);
  let mercado_livre_id = trimOrNull(input.mercado_livre_id);

  if (ml_source_url) {
    ml_source_url = normalizeSyncUrl(ml_source_url);
  }

  if (mercado_livre_url) {
    const normalizedAffiliate = normalizeSyncUrl(mercado_livre_url);
    if (!ml_source_url && isMercadoLivreProductPageUrl(normalizedAffiliate)) {
      ml_source_url = normalizedAffiliate;
    }
  }

  if (!mercado_livre_id) {
    mercado_livre_id =
      extractMercadoLivreId(ml_source_url ?? "") ??
      extractMercadoLivreId(mercado_livre_url ?? "");
  }

  return {
    mercado_livre_url,
    ml_source_url,
    mercado_livre_id,
  };
}

function mlFieldsChanged(
  input: NormalizedMlFields,
  existing?: {
    mercado_livre_url: string | null;
    ml_source_url: string | null;
    mercado_livre_id: string | null;
  } | null
): boolean {
  if (!existing) return Boolean(input.mercado_livre_url || input.ml_source_url);
  return (
    (input.mercado_livre_url ?? null) !== (existing.mercado_livre_url ?? null) ||
    (input.ml_source_url ?? null) !== (existing.ml_source_url ?? null) ||
    (input.mercado_livre_id ?? null) !== (existing.mercado_livre_id ?? null)
  );
}

export async function validateAndNormalizeMlUrls(input: {
  name: string;
  mercado_livre_url?: string | null;
  ml_source_url?: string | null;
  mercado_livre_id?: string | null;
  existing?: {
    mercado_livre_url: string | null;
    ml_source_url: string | null;
    mercado_livre_id: string | null;
  } | null;
  skipNetworkVerify?: boolean;
  browserSession?: MlBrowserSession | null;
}): Promise<MlUrlValidationResult> {
  const mercado_livre_url = trimOrNull(input.mercado_livre_url);
  const ml_source_url = trimOrNull(input.ml_source_url);

  if (!mercado_livre_url && !ml_source_url) {
    return {
      ok: true,
      normalized: {
        mercado_livre_url: null,
        ml_source_url: null,
        mercado_livre_id: trimOrNull(input.mercado_livre_id),
      },
    };
  }

  if (mercado_livre_url) {
    validateUrlFormat(mercado_livre_url, "URL do anúncio (afiliado)");
  }

  if (ml_source_url) {
    validateUrlFormat(ml_source_url, "URL de origem para sincronização");
    if (
      !isMercadoLivreProductPageUrl(ml_source_url) &&
      !isMercadoLivreUrl(ml_source_url)
    ) {
      throw new MlValidationError(
        "ml_invalid",
        "URL de origem deve ser uma página de produto válida do Mercado Livre."
      );
    }
  }

  const normalized = normalizeMlFields({
    mercado_livre_url,
    ml_source_url,
    mercado_livre_id: input.mercado_livre_id,
  });

  if (
    normalized.ml_source_url &&
    !isMercadoLivreProductPageUrl(normalized.ml_source_url) &&
    !normalized.mercado_livre_url
  ) {
    throw new MlValidationError(
      "ml_invalid",
      "Informe também a URL de afiliado ou use uma URL de página de produto em URL de origem."
    );
  }

  const shouldVerify =
    !input.skipNetworkVerify &&
    mlFieldsChanged(normalized, input.existing ?? null);

  if (!shouldVerify) {
    return { ok: true, normalized };
  }

  const verifyUrl =
    normalized.ml_source_url ??
    (normalized.mercado_livre_url && isMercadoLivreProductPageUrl(normalized.mercado_livre_url)
      ? normalized.mercado_livre_url
      : normalized.mercado_livre_url);

  if (input.browserSession) {
    const checkedAt = new Date().toISOString();

    if (input.browserSession.pageTitle) {
      const { match, score } = compareProductNames(
        input.name,
        input.browserSession.pageTitle
      );

      if (match) {
        return {
          ok: true,
          normalized,
          verification: {
            status: "active",
            message: `Validado no navegador (${Math.round(score * 100)}% de correspondência)`,
            itemId: normalized.mercado_livre_id ?? undefined,
            pageTitle: input.browserSession.pageTitle,
            nameMatch: true,
            matchScore: score,
            checkedAt,
          },
          sourceUrl: verifyUrl,
        };
      }
    }

    if (
      input.browserSession.scrapedPrice != null &&
      input.browserSession.sourceUrl &&
      verifyUrl
    ) {
      const sessionUrl = normalizeSyncUrl(input.browserSession.sourceUrl);
      const targetUrl = normalizeSyncUrl(verifyUrl);

      if (sessionUrl === targetUrl) {
        return {
          ok: true,
          normalized,
          verification: {
            status: "active",
            message: "Validado no navegador via extensão (preço capturado).",
            itemId: normalized.mercado_livre_id ?? undefined,
            pageTitle: input.browserSession.pageTitle ?? undefined,
            checkedAt,
          },
          sourceUrl: verifyUrl,
        };
      }
    }
  }

  const verification = await verifyMercadoLivreListing(
    verifyUrl,
    input.name,
    normalized.mercado_livre_id,
    input.browserSession
      ? {
          cookieHeader: input.browserSession.cookieHeader,
          userAgent: input.browserSession.userAgent,
        }
      : undefined
  );

  if (verification.status === "blocked") {
    return {
      ok: false,
      blocked: true,
      normalized,
      verification,
      error:
        verification.message ||
        "Mercado Livre exigiu verificação (captcha). Conclua a validação no navegador.",
      sourceUrl: verifyUrl,
    };
  }

  if (verification.status === "invalid_url" || verification.status === "not_found") {
    throw new MlValidationError(
      "ml_invalid",
      verification.message || "Link do Mercado Livre inválido ou não encontrado.",
      verifyUrl ?? null
    );
  }

  if (verification.itemId && !normalized.mercado_livre_id) {
    normalized.mercado_livre_id = verification.itemId;
  }

  return {
    ok: true,
    normalized,
    verification,
    sourceUrl: verifyUrl,
  };
}
