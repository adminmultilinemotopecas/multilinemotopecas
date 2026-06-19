"use client";

import {
  getAdminOrigin,
  getMlExtensionBridge,
  waitForMlExtensionBridge,
} from "@/lib/admin/ml-extension-client";
import type { PriceSyncStatus } from "@/types/database";

export interface SyncPriceResponse {
  success: boolean;
  updated: boolean;
  message: string;
  status: PriceSyncStatus;
  newPrice: number | null;
  checkedAt: string;
  sourceUrl?: string;
  requiresBrowserValidation?: boolean;
}

export async function syncProductPriceViaBrowser(input: {
  productId: string;
  sourceUrl: string;
}): Promise<{ ok: true; result: SyncPriceResponse } | { ok: false; reason: "no_extension" | "error"; error?: string }> {
  const bridge = getMlExtensionBridge() || (await waitForMlExtensionBridge(3000));
  if (!bridge?.syncProductPrice) {
    return { ok: false, reason: "no_extension" };
  }

  try {
    const response = await bridge.syncProductPrice({
      productId: input.productId,
      sourceUrl: input.sourceUrl,
      adminOrigin: getAdminOrigin(),
    });

    if (!response.ok || !response.result) {
      return {
        ok: false,
        reason: "error",
        error: response.error || "Falha ao sincronizar via navegador",
      };
    }

    return { ok: true, result: response.result as SyncPriceResponse };
  } catch (error) {
    return {
      ok: false,
      reason: "error",
      error: error instanceof Error ? error.message : "Falha ao sincronizar via navegador",
    };
  }
}

export async function syncAllPricesViaBrowser(): Promise<
  | {
      ok: true;
      stats: { total: number; processed: number; succeeded: number; failed: number };
    }
  | { ok: false; reason: "no_extension" | "error"; error?: string }
> {
  const bridge = getMlExtensionBridge() || (await waitForMlExtensionBridge(3000));
  if (!bridge?.syncAllProductPrices) {
    return { ok: false, reason: "no_extension" };
  }

  try {
    const response = await bridge.syncAllProductPrices();
    if (!response.ok || !response.stats) {
      return {
        ok: false,
        reason: "error",
        error: response.error || "Falha ao sincronizar todos via navegador",
      };
    }

    return { ok: true, stats: response.stats };
  } catch (error) {
    return {
      ok: false,
      reason: "error",
      error: error instanceof Error ? error.message : "Falha ao sincronizar todos via navegador",
    };
  }
}
