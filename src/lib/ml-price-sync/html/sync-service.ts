import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/db/mappers";
import { fetchAffiliateMercadoLivreHtml } from "@/lib/ml-price-sync/html/affiliate-fetch";
import { detectMercadoLivreBlock } from "@/lib/ml-price-sync/html/block-detection";
import { extractMercadoLivrePrice } from "@/lib/ml-price-sync/html/extract-price";
import {
  getSyncDelayMs,
  listSyncCandidates,
  sleep,
} from "@/lib/ml-price-sync/price-sync-service";
import {
  resolveProductSyncUrl,
  extractMercadoLivreItemIdFromUrl,
} from "@/lib/ml-price-sync/url-validator";
import type { price_sync_status } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const MAX_PRICE_CHANGE_PERCENT = 30;
const BLOCKED_MESSAGE = "Mercado Livre bloqueou ou exigiu verificação.";
const MANUAL_REVIEW_MESSAGE =
  "Preço varia mais de 30% do valor atual — revisão manual necessária.";
const AFFILIATE_PRICE_SOURCES = new Set([
  "social_profile",
  "social_profile_fallback",
  "social_profile_mlb",
]);

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function shouldTrustAffiliatePrice(extractionSource: string): boolean {
  return AFFILIATE_PRICE_SOURCES.has(extractionSource);
}

function buildHtmlSyncMessage(input: {
  status: MlHtmlSyncStatus;
  baseMessage: string;
  usedSocialFallback: boolean;
  extractedPrice: number | null;
}): string {
  if (input.status === "success" && input.usedSocialFallback) {
    return "Preço atualizado via link de afiliado (perfil social).";
  }

  if (input.status === "low_confidence" && input.extractedPrice != null) {
    return `Preço lido ${formatCurrency(input.extractedPrice)}. ${input.baseMessage}`;
  }

  if (input.status === "blocked") {
    return "Mercado Livre bloqueou a leitura. Use o link de afiliado meli.la salvo no produto.";
  }

  return input.baseMessage;
}

export function isServerFetchEnabled(): boolean {
  return process.env.PRICE_SYNC_SERVER_FETCH !== "false";
}

export function getSyncDelayWithJitter(baseMs?: number): number {
  const base = baseMs ?? getSyncDelayMs();
  const jitter = Math.floor(Math.random() * 1500);
  return base + jitter;
}

export type MlHtmlSyncStatus =
  | "success"
  | "blocked"
  | "low_confidence"
  | "failed"
  | "no_url"
  | "skipped";

export interface MlHtmlSyncResult {
  productId: string;
  productName: string;
  status: MlHtmlSyncStatus;
  message: string;
  updated: boolean;
  sourceUrl: string | null;
  oldPrice: number;
  newPrice: number | null;
  oldPromotionalPrice: number | null;
  newPromotionalPrice: number | null;
  lastSyncedPrice: number | null;
  checkedAt: string;
  extractionSource: string | null;
}

function mapDbStatus(status: MlHtmlSyncStatus): price_sync_status {
  return status as price_sync_status;
}

function getEffectivePrice(price: number, promotionalPrice: number | null): number {
  return promotionalPrice ?? price;
}

function isPriceChangeTooLarge(current: number, next: number): boolean {
  if (current <= 0) return false;
  const deltaPercent = (Math.abs(next - current) / current) * 100;
  return deltaPercent > MAX_PRICE_CHANGE_PERCENT;
}

function evaluateExtractedPrice(input: {
  oldPrice: number;
  oldPromotionalPrice: number | null;
  extractedPrice: number;
  extractedPromotionalPrice?: number | null;
  extractionSource: string;
}): {
  status: MlHtmlSyncStatus;
  message: string;
  updated: boolean;
  newPrice: number | null;
  newPromotionalPrice: number | null;
  lastSyncedPrice: number;
} {
  const lastSyncedPrice = input.extractedPromotionalPrice ?? input.extractedPrice;
  const effectiveCurrent = getEffectivePrice(input.oldPrice, input.oldPromotionalPrice);
  const effectiveNext = input.extractedPromotionalPrice ?? input.extractedPrice;

  if (
    !shouldTrustAffiliatePrice(input.extractionSource) &&
    isPriceChangeTooLarge(effectiveCurrent, effectiveNext)
  ) {
    return {
      status: "low_confidence",
      message: MANUAL_REVIEW_MESSAGE,
      updated: false,
      newPrice: null,
      newPromotionalPrice: null,
      lastSyncedPrice,
    };
  }

  return {
    status: "success",
    message:
      input.extractionSource === "browser_session"
        ? "Preço sincronizado via sessão do navegador."
        : "Preço sincronizado com sucesso.",
    updated: true,
    newPrice: input.extractedPrice,
    newPromotionalPrice: input.extractedPromotionalPrice ?? null,
    lastSyncedPrice,
  };
}

async function loadProductForSync(productId: string) {
  const product = await prisma.products.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      price: true,
      promotional_price: true,
      ml_source_url: true,
      mercado_livre_url: true,
      mercado_livre_id: true,
      price_sync_enabled: true,
    },
  });

  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  return {
    product,
    oldPrice: decimalToNumber(product.price as never) ?? 0,
    oldPromotionalPrice: decimalToNumber(product.promotional_price as never),
  };
}

async function persistProductSyncState(input: {
  productId: string;
  status: MlHtmlSyncStatus;
  message: string;
  sourceUrl: string | null;
  oldPrice: number;
  oldPromotionalPrice: number | null;
  newPrice: number | null;
  newPromotionalPrice: number | null;
  lastSyncedPrice: number | null;
  updated: boolean;
  extractionSource: string | null;
  triggerSource: "manual" | "cron";
  checkedAt: string;
}) {
  const checkedAtDate = new Date(input.checkedAt);

  if (input.updated && input.newPrice != null) {
    await prisma.products.update({
      where: { id: input.productId },
      data: {
        price: input.newPrice,
        promotional_price: input.newPromotionalPrice,
        is_promotion: input.newPromotionalPrice != null,
        last_price_sync_at: checkedAtDate,
        last_price_sync_status: mapDbStatus(input.status),
        last_price_sync_error: null,
        last_synced_price: input.lastSyncedPrice,
      },
    });
  } else {
    await prisma.products.update({
      where: { id: input.productId },
      data: {
        last_price_sync_at: checkedAtDate,
        last_price_sync_status: mapDbStatus(input.status),
        last_price_sync_error: input.status === "success" ? null : input.message,
        last_synced_price: input.lastSyncedPrice,
      },
    });
  }

  await prisma.price_sync_logs.create({
    data: {
      product_id: input.productId,
      old_price: input.oldPrice,
      new_price: input.updated ? input.newPrice : input.lastSyncedPrice,
      old_promotional_price: input.oldPromotionalPrice,
      new_promotional_price: input.updated ? input.newPromotionalPrice : null,
      status: mapDbStatus(input.status),
      error: input.status === "success" ? null : input.message,
      source_url: input.sourceUrl,
      confidence_score: input.extractionSource ? 0.9 : 0,
      evidence: {
        strategies: input.extractionSource ? [input.extractionSource] : [],
      } as Prisma.InputJsonValue,
      trigger_source: input.triggerSource,
    },
  });
}

export async function applyMercadoLivreBrowserPrice(
  productId: string,
  input: {
    price: number;
    promotionalPrice?: number | null;
    sourceUrl?: string | null;
  },
  triggerSource: "manual" | "cron" = "manual"
): Promise<MlHtmlSyncResult> {
  const checkedAt = new Date().toISOString();
  const { product, oldPrice, oldPromotionalPrice } = await loadProductForSync(productId);

  if (!product.price_sync_enabled) {
    const result: MlHtmlSyncResult = {
      productId: product.id,
      productName: product.name,
      status: "skipped",
      message: "Sincronização de preço desabilitada para este produto.",
      updated: false,
      sourceUrl: input.sourceUrl ?? null,
      oldPrice,
      newPrice: null,
      oldPromotionalPrice,
      newPromotionalPrice: null,
      lastSyncedPrice: null,
      checkedAt,
      extractionSource: null,
    };

    await persistProductSyncState({
      productId: product.id,
      status: result.status,
      message: result.message,
      sourceUrl: result.sourceUrl,
      oldPrice,
      oldPromotionalPrice,
      newPrice: null,
      newPromotionalPrice: null,
      lastSyncedPrice: null,
      updated: false,
      extractionSource: null,
      triggerSource,
      checkedAt,
    });

    return result;
  }

  const sourceUrl =
    input.sourceUrl ??
    resolveProductSyncUrl({
      ml_source_url: product.ml_source_url,
      mercado_livre_url: product.mercado_livre_url,
    });

  if (!sourceUrl) {
    const result: MlHtmlSyncResult = {
      productId: product.id,
      productName: product.name,
      status: "no_url",
      message: "Produto sem URL do Mercado Livre salva.",
      updated: false,
      sourceUrl: null,
      oldPrice,
      newPrice: null,
      oldPromotionalPrice,
      newPromotionalPrice: null,
      lastSyncedPrice: null,
      checkedAt,
      extractionSource: null,
    };

    await persistProductSyncState({
      productId: product.id,
      status: result.status,
      message: result.message,
      sourceUrl: null,
      oldPrice,
      oldPromotionalPrice,
      newPrice: null,
      newPromotionalPrice: null,
      lastSyncedPrice: null,
      updated: false,
      extractionSource: null,
      triggerSource,
      checkedAt,
    });

    return result;
  }

  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new Error("Preço inválido recebido do navegador.");
  }

  const roundedPrice = Math.round(input.price * 100) / 100;
  const roundedPromotional =
    input.promotionalPrice != null && Number.isFinite(input.promotionalPrice)
      ? Math.round(input.promotionalPrice * 100) / 100
      : null;

  const evaluated = evaluateExtractedPrice({
    oldPrice,
    oldPromotionalPrice,
    extractedPrice: roundedPrice,
    extractedPromotionalPrice: roundedPromotional,
    extractionSource: "browser_session",
  });

  await persistProductSyncState({
    productId: product.id,
    status: evaluated.status,
    message: evaluated.message,
    sourceUrl,
    oldPrice,
    oldPromotionalPrice,
    newPrice: evaluated.newPrice,
    newPromotionalPrice: evaluated.newPromotionalPrice,
    lastSyncedPrice: evaluated.lastSyncedPrice,
    updated: evaluated.updated,
    extractionSource: "browser_session",
    triggerSource,
    checkedAt,
  });

  return {
    productId: product.id,
    productName: product.name,
    status: evaluated.status,
    message: evaluated.message,
    updated: evaluated.updated,
    sourceUrl,
    oldPrice,
    newPrice: evaluated.updated ? evaluated.newPrice : null,
    oldPromotionalPrice,
    newPromotionalPrice: evaluated.updated ? evaluated.newPromotionalPrice : null,
    lastSyncedPrice: evaluated.lastSyncedPrice,
    checkedAt,
    extractionSource: "browser_session",
  };
}

export async function syncMercadoLivrePrice(
  productId: string,
  triggerSource: "manual" | "cron" = "manual"
): Promise<MlHtmlSyncResult> {
  const checkedAt = new Date().toISOString();
  const { product, oldPrice, oldPromotionalPrice } = await loadProductForSync(productId);

  if (!product.price_sync_enabled) {
    const result: MlHtmlSyncResult = {
      productId: product.id,
      productName: product.name,
      status: "skipped",
      message: "Sincronização de preço desabilitada para este produto.",
      updated: false,
      sourceUrl: null,
      oldPrice,
      newPrice: null,
      oldPromotionalPrice,
      newPromotionalPrice: null,
      lastSyncedPrice: null,
      checkedAt,
      extractionSource: null,
    };

    await persistProductSyncState({
      productId: product.id,
      status: result.status,
      message: result.message,
      sourceUrl: null,
      oldPrice,
      oldPromotionalPrice,
      newPrice: null,
      newPromotionalPrice: null,
      lastSyncedPrice: null,
      updated: false,
      extractionSource: null,
      triggerSource,
      checkedAt,
    });

    return result;
  }

  const sourceUrl = resolveProductSyncUrl({
    ml_source_url: product.ml_source_url,
    mercado_livre_url: product.mercado_livre_url,
  });

  if (!sourceUrl) {
    const result: MlHtmlSyncResult = {
      productId: product.id,
      productName: product.name,
      status: "no_url",
      message: "Produto sem URL do Mercado Livre salva.",
      updated: false,
      sourceUrl: null,
      oldPrice,
      newPrice: null,
      oldPromotionalPrice,
      newPromotionalPrice: null,
      lastSyncedPrice: null,
      checkedAt,
      extractionSource: null,
    };

    await persistProductSyncState({
      productId: product.id,
      status: result.status,
      message: result.message,
      sourceUrl: null,
      oldPrice,
      oldPromotionalPrice,
      newPrice: null,
      newPromotionalPrice: null,
      lastSyncedPrice: null,
      updated: false,
      extractionSource: null,
      triggerSource,
      checkedAt,
    });

    return result;
  }

  let status: MlHtmlSyncStatus = "failed";
  let message = "Não foi possível extrair o preço do Mercado Livre.";
  let updated = false;
  let newPrice: number | null = null;
  let newPromotionalPrice: number | null = null;
  let lastSyncedPrice: number | null = null;
  let extractionSource: string | null = null;

  try {
    const fetched = await fetchAffiliateMercadoLivreHtml(sourceUrl);
    const block = detectMercadoLivreBlock(
      fetched.html,
      fetched.status,
      fetched.finalUrl
    );

    if (block.blocked) {
      status = "blocked";
      message = block.message ?? BLOCKED_MESSAGE;
    } else {
      const syncItemId =
        product.mercado_livre_id ??
        extractMercadoLivreItemIdFromUrl(fetched.productPageUrl ?? "") ??
        extractMercadoLivreItemIdFromUrl(sourceUrl);

      const extracted = extractMercadoLivrePrice(fetched.html, {
        preferSocial: fetched.usedSocialFallback || !fetched.productPageUrl,
        mercadoLivreId: syncItemId,
      });

      if (extracted.price == null) {
        status = "failed";
        message =
          "Preço não encontrado. Confirme se o produto tem link meli.la de afiliado salvo.";
      } else {
        extractionSource = fetched.usedSocialFallback
          ? "social_profile_fallback"
          : (extracted.source ?? "html_fetch");

        const evaluated = evaluateExtractedPrice({
          oldPrice,
          oldPromotionalPrice,
          extractedPrice: extracted.price,
          extractedPromotionalPrice: extracted.promotionalPrice,
          extractionSource,
        });
        status = evaluated.status;
        message = buildHtmlSyncMessage({
          status: evaluated.status,
          baseMessage: evaluated.message,
          usedSocialFallback: Boolean(fetched.usedSocialFallback),
          extractedPrice: extracted.price,
        });
        updated = evaluated.updated;
        newPrice = evaluated.newPrice;
        newPromotionalPrice = evaluated.newPromotionalPrice;
        lastSyncedPrice = evaluated.lastSyncedPrice;
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Falha ao buscar página do Mercado Livre.";

    if (/bloqueou|verifica[cç][aã]o/i.test(errorMessage)) {
      status = "blocked";
      message = buildHtmlSyncMessage({
        status: "blocked",
        baseMessage: errorMessage,
        usedSocialFallback: false,
        extractedPrice: null,
      });
    } else {
      status = "failed";
      message = errorMessage;
    }
  }

  await persistProductSyncState({
    productId: product.id,
    status,
    message,
    sourceUrl,
    oldPrice,
    oldPromotionalPrice,
    newPrice,
    newPromotionalPrice,
    lastSyncedPrice,
    updated,
    extractionSource,
    triggerSource,
    checkedAt,
  });

  return {
    productId: product.id,
    productName: product.name,
    status,
    message,
    updated,
    sourceUrl,
    oldPrice,
    newPrice: updated ? newPrice : null,
    oldPromotionalPrice,
    newPromotionalPrice: updated ? newPromotionalPrice : null,
    lastSyncedPrice,
    checkedAt,
    extractionSource,
  };
}

export interface MlHtmlBatchSyncResult {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: MlHtmlSyncResult[];
}

export async function syncAllMercadoLivrePrices(input?: {
  triggerSource?: "manual" | "cron";
  onProgress?: (progress: {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
    currentProductId: string | null;
    currentProductName: string | null;
  }) => void;
}): Promise<MlHtmlBatchSyncResult> {
  const triggerSource = input?.triggerSource ?? "manual";
  const candidates = await listSyncCandidates();

  const batch: MlHtmlBatchSyncResult = {
    total: candidates.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    results: [],
  };

  for (const candidate of candidates) {
    const result = await syncMercadoLivrePrice(candidate.id, triggerSource);
    batch.results.push(result);
    batch.processed += 1;

    if (result.status === "success") {
      batch.succeeded += 1;
    } else if (
      result.status === "skipped" ||
      result.status === "no_url" ||
      result.status === "low_confidence"
    ) {
      batch.skipped += 1;
    } else {
      batch.failed += 1;
    }

    if (result.status === "blocked") {
      input?.onProgress?.({
        total: batch.total,
        processed: batch.processed,
        succeeded: batch.succeeded,
        failed: batch.failed,
        skipped: batch.skipped,
        currentProductId: candidate.id,
        currentProductName: candidate.name,
      });
      if (batch.processed < batch.total) {
        await sleep(getSyncDelayWithJitter());
      }
      continue;
    }

    input?.onProgress?.({
      total: batch.total,
      processed: batch.processed,
      succeeded: batch.succeeded,
      failed: batch.failed,
      skipped: batch.skipped,
      currentProductId: candidate.id,
      currentProductName: candidate.name,
    });

    if (batch.processed < batch.total) {
      await sleep(getSyncDelayWithJitter());
    }
  }

  input?.onProgress?.({
    total: batch.total,
    processed: batch.processed,
    succeeded: batch.succeeded,
    failed: batch.failed,
    skipped: batch.skipped,
    currentProductId: null,
    currentProductName: null,
  });

  return batch;
}
