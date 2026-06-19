import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/db/mappers";
import { getMlBrowserSession } from "@/lib/ml-price-sync/ml-browser-session";
import { resolveProductSyncUrl } from "@/lib/ml-price-sync/url-validator";
import { scrapeMercadoLivrePrice } from "@/lib/ml-price-sync/scrape-prices";
import type {
  PriceSyncApplyResult,
  PriceSyncResultStatus,
  PriceScrapeEvidence,
  PriceScrapeResult,
  ProductSyncCandidate,
} from "@/lib/ml-price-sync/types";
import type { Prisma, price_sync_status } from "@prisma/client";

function getMinConfidence(): number {
  const raw = process.env.PRICE_SYNC_MIN_CONFIDENCE;
  const parsed = raw ? Number.parseFloat(raw) : 0.65;
  return Number.isFinite(parsed) ? parsed : 0.65;
}

function getMaxPriceChangePercent(): number {
  const raw = process.env.PRICE_SYNC_MAX_PRICE_CHANGE_PERCENT;
  const parsed = raw ? Number.parseFloat(raw) : 50;
  return Number.isFinite(parsed) ? parsed : 50;
}

function getEffectiveSitePrice(product: ProductSyncCandidate): number {
  return product.promotional_price ?? product.price;
}

function isPriceChangeTooLarge(current: number, next: number): boolean {
  if (current <= 0) return false;
  const deltaPercent = (Math.abs(next - current) / current) * 100;
  return deltaPercent > getMaxPriceChangePercent();
}

function mapStatus(status: PriceSyncResultStatus): price_sync_status {
  return status as price_sync_status;
}

export function toProductSyncCandidate(product: {
  id: string;
  name: string;
  slug: string;
  price: { toNumber?: () => number } | number;
  promotional_price: { toNumber?: () => number } | number | null;
  mercado_livre_id: string | null;
  ml_source_url: string | null;
  mercado_livre_url: string | null;
  price_sync_enabled: boolean;
}): ProductSyncCandidate {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: decimalToNumber(product.price as never) ?? 0,
    promotional_price: decimalToNumber(product.promotional_price as never),
    mercado_livre_id: product.mercado_livre_id,
    ml_source_url: product.ml_source_url,
    mercado_livre_url: product.mercado_livre_url,
    price_sync_enabled: product.price_sync_enabled,
  };
}

export async function syncProductPrice(input: {
  productId: string;
  adminUserId?: string;
  triggerSource?: "manual" | "cron";
  forceUpdate?: boolean;
  manualPrice?: number;
  manualPromotionalPrice?: number | null;
  afterBrowserValidation?: boolean;
  browserScraped?: boolean;
}): Promise<PriceSyncApplyResult> {
  const product = await prisma.products.findUnique({
    where: { id: input.productId },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      promotional_price: true,
      mercado_livre_id: true,
      ml_source_url: true,
      mercado_livre_url: true,
      price_sync_enabled: true,
    },
  });

  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  const candidate = toProductSyncCandidate(product);
  const oldPrice = candidate.price;
  const oldPromotionalPrice = candidate.promotional_price;

  if (!candidate.price_sync_enabled) {
    const scrape = {
      success: false,
      price: null,
      promotionalPrice: null,
      sourceUrl: "",
      checkedAt: new Date().toISOString(),
      status: "skipped" as const,
      error: "Sincronização de preço desabilitada para este produto.",
      confidenceScore: 0,
      evidence: { strategies: [] },
    };

    await persistSyncResult({
      productId: candidate.id,
      scrape,
      oldPrice,
      oldPromotionalPrice,
      updated: false,
      triggerSource: input.triggerSource ?? "manual",
    });

    return {
      productId: candidate.id,
      updated: false,
      scrape,
      oldPrice,
      newPrice: null,
      oldPromotionalPrice,
      newPromotionalPrice: null,
      message: scrape.error ?? "Sincronização ignorada.",
    };
  }

  const sourceUrl = resolveProductSyncUrl(candidate);
  if (!sourceUrl) {
    const scrape = {
      success: false,
      price: null,
      promotionalPrice: null,
      sourceUrl: "",
      checkedAt: new Date().toISOString(),
      status: "no_url" as const,
      error: "Produto sem URL de origem para sincronização.",
      confidenceScore: 0,
      evidence: { strategies: [] },
    };

    await persistSyncResult({
      productId: candidate.id,
      scrape,
      oldPrice,
      oldPromotionalPrice,
      updated: false,
      triggerSource: input.triggerSource ?? "manual",
    });

    return {
      productId: candidate.id,
      updated: false,
      scrape,
      oldPrice,
      newPrice: null,
      oldPromotionalPrice,
      newPromotionalPrice: null,
      message: scrape.error,
    };
  }

  const checkedAt = new Date().toISOString();
  const browserSession =
    input.adminUserId && input.triggerSource !== "cron" && !input.browserScraped
      ? getMlBrowserSession(input.adminUserId)
      : null;

  const useBrowserPrice =
    input.manualPrice != null && Number.isFinite(input.manualPrice);

  const scrape: PriceScrapeResult = useBrowserPrice
      ? {
          success: true,
          price: Math.round(input.manualPrice! * 100) / 100,
          promotionalPrice:
            input.manualPromotionalPrice != null &&
            Number.isFinite(input.manualPromotionalPrice)
              ? Math.round(input.manualPromotionalPrice * 100) / 100
              : null,
          sourceUrl,
          checkedAt,
          status: "success" as const,
          confidenceScore: 1,
          evidence: {
            strategies: input.browserScraped
              ? ["extension_browser_session", "browser_scrape"]
              : ["manual_browser_validation"],
            finalUrl: sourceUrl,
          },
        }
      : browserSession?.scrapedPrice != null &&
          input.triggerSource !== "cron" &&
          (input.manualPrice == null || !Number.isFinite(input.manualPrice))
        ? {
            success: true,
            price: browserSession.scrapedPrice,
            promotionalPrice: browserSession.scrapedPromotionalPrice,
            sourceUrl: browserSession.sourceUrl || sourceUrl,
            checkedAt,
            status: "success" as const,
            confidenceScore: 0.95,
            evidence: {
              strategies: ["extension_browser_scrape", "browser_session_cookies"],
              finalUrl: browserSession.sourceUrl || sourceUrl,
              pageTitle: browserSession.pageTitle,
            },
            pageTitle: browserSession.pageTitle,
          }
        : await scrapeMercadoLivrePrice({
            sourceUrl,
            expectedProductName: candidate.name,
            expectedItemId: candidate.mercado_livre_id,
            browserSession: browserSession
              ? {
                  cookieHeader: browserSession.cookieHeader,
                  userAgent: browserSession.userAgent,
                }
              : null,
          });

  let finalStatus: PriceSyncResultStatus = scrape.status;
  let message = scrape.error ?? "Sincronização concluída.";
  let updated = false;
  let newPrice: number | null = null;
  let newPromotionalPrice: number | null = null;

  if (scrape.success && scrape.price != null) {
    const effectiveCurrent = getEffectiveSitePrice(candidate);
    const effectiveNext = scrape.promotionalPrice ?? scrape.price;

    if (scrape.confidenceScore < getMinConfidence()) {
      finalStatus = "low_confidence";
      message = `Confiança baixa (${Math.round(scrape.confidenceScore * 100)}%). Preço não atualizado.`;
    } else if (
      scrape.nameMatchScore != null &&
      scrape.nameMatchScore < 0.35
    ) {
      finalStatus = "low_confidence";
      message = "Título da página ML não corresponde ao produto. Preço não atualizado.";
    } else if (isPriceChangeTooLarge(effectiveCurrent, effectiveNext) && !input.forceUpdate) {
      finalStatus = "low_confidence";
      message = `Variação de preço acima de ${getMaxPriceChangePercent()}%. Preço não atualizado automaticamente.`;
    } else {
      newPrice = scrape.price;
      newPromotionalPrice = scrape.promotionalPrice;
      updated = true;
      finalStatus = "success";
      message = scrape.evidence.strategies.includes("manual_browser_validation")
        ? "Preço aplicado após validação manual no Mercado Livre."
        : scrape.evidence.strategies.includes("extension_browser_scrape")
          ? "Preço sincronizado com sessão validada no navegador."
          : browserSession?.cookieHeader
            ? "Preço sincronizado usando sessão do Mercado Livre."
            : "Preço sincronizado com sucesso.";
    }
  } else if (!scrape.success) {
    finalStatus = scrape.status === "success" ? "failed" : scrape.status;
    message = scrape.error ?? "Falha ao sincronizar preço.";
  }

  const finalScrape = { ...scrape, status: finalStatus, error: message };

  if (updated && newPrice != null) {
    await prisma.products.update({
      where: { id: candidate.id },
      data: {
        price: newPrice,
        promotional_price: newPromotionalPrice,
        is_promotion: newPromotionalPrice != null,
        last_price_sync_at: new Date(scrape.checkedAt),
        last_price_sync_status: mapStatus(finalStatus),
        last_price_sync_error: null,
        last_synced_price: newPromotionalPrice ?? newPrice,
      },
    });
  } else {
    await prisma.products.update({
      where: { id: candidate.id },
      data: {
        last_price_sync_at: new Date(scrape.checkedAt),
        last_price_sync_status: mapStatus(finalStatus),
        last_price_sync_error: message,
        last_synced_price: scrape.price,
      },
    });
  }

  await persistSyncResult({
    productId: candidate.id,
    scrape: finalScrape,
    oldPrice,
    oldPromotionalPrice,
    newPrice: updated ? newPrice : null,
    newPromotionalPrice: updated ? newPromotionalPrice : null,
    updated,
    triggerSource: input.triggerSource ?? "manual",
  });

  return {
    productId: candidate.id,
    updated,
    scrape: finalScrape,
    oldPrice,
    newPrice: updated ? newPrice : null,
    oldPromotionalPrice,
    newPromotionalPrice: updated ? newPromotionalPrice : null,
    message,
  };
}

async function persistSyncResult(input: {
  productId: string;
  scrape: {
    status: PriceSyncResultStatus;
    error?: string;
    sourceUrl: string;
    confidenceScore: number;
    evidence: PriceScrapeEvidence;
    price: number | null;
    promotionalPrice: number | null;
    checkedAt: string;
  };
  oldPrice: number;
  oldPromotionalPrice: number | null;
  newPrice?: number | null;
  newPromotionalPrice?: number | null;
  updated: boolean;
  triggerSource: "manual" | "cron";
}) {
  await prisma.price_sync_logs.create({
    data: {
      product_id: input.productId,
      old_price: input.oldPrice,
      new_price: input.newPrice ?? input.scrape.price,
      old_promotional_price: input.oldPromotionalPrice,
      new_promotional_price: input.newPromotionalPrice ?? input.scrape.promotionalPrice,
      status: mapStatus(input.scrape.status),
      error: input.scrape.error ?? null,
      source_url: input.scrape.sourceUrl || null,
      confidence_score: input.scrape.confidenceScore,
      evidence: input.scrape.evidence as unknown as Prisma.InputJsonValue,
      trigger_source: input.triggerSource,
    },
  });
}

export async function listSyncCandidates(): Promise<ProductSyncCandidate[]> {
  const records = await prisma.products.findMany({
    where: {
      price_sync_enabled: true,
      OR: [{ ml_source_url: { not: null } }, { mercado_livre_url: { not: null } }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      promotional_price: true,
      mercado_livre_id: true,
      ml_source_url: true,
      mercado_livre_url: true,
      price_sync_enabled: true,
    },
    orderBy: { name: "asc" },
  });

  return records
    .map(toProductSyncCandidate)
    .filter((product) => resolveProductSyncUrl(product) != null);
}

export function getSyncDelayMs(): number {
  const raw = process.env.PRICE_SYNC_DELAY_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : 2500;
  return Number.isFinite(parsed) && parsed >= 500 ? parsed : 2500;
}

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
