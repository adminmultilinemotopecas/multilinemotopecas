const HIDE_FROM_CATALOG_STATUSES = new Set(["failed", "blocked", "no_url"]);

export function getPriceSyncCatalogStatusUpdate(input: {
  status: string;
  updated: boolean;
  lastSyncedPrice: number | null;
  mlVerificationPending?: boolean;
}): { status?: "active" | "inactive" } {
  if (input.updated && input.status === "success" && !input.mlVerificationPending) {
    return { status: "active" };
  }

  const couldNotObtainPrice =
    input.lastSyncedPrice == null && HIDE_FROM_CATALOG_STATUSES.has(input.status);

  if (couldNotObtainPrice) {
    return { status: "inactive" };
  }

  return {};
}

export function appendCatalogHiddenMessage(message: string, hidden: boolean): string {
  if (!hidden) return message;
  if (/ocultad/i.test(message)) return message;
  return `${message} Produto ocultado do catálogo do site.`;
}

export function buildPriceSyncProductUpdate(input: {
  status: string;
  message: string;
  updated: boolean;
  lastSyncedPrice: number | null;
  mlVerificationPending?: boolean;
  checkedAt: string;
  newPrice?: number | null;
  newPromotionalPrice?: number | null;
}): {
  price?: number;
  promotional_price?: number | null;
  is_promotion?: boolean;
  last_price_sync_at: Date;
  last_price_sync_status: string;
  last_price_sync_error: string | null;
  last_synced_price?: number | null;
  status?: "active" | "inactive";
} {
  const catalogStatus = getPriceSyncCatalogStatusUpdate({
    status: input.status,
    updated: input.updated,
    lastSyncedPrice: input.lastSyncedPrice,
    mlVerificationPending: input.mlVerificationPending,
  });
  const hideFromCatalog = catalogStatus.status === "inactive";
  const syncErrorMessage =
    input.status === "success"
      ? null
      : appendCatalogHiddenMessage(input.message, hideFromCatalog);

  const base = {
    last_price_sync_at: new Date(input.checkedAt),
    last_price_sync_status: input.status,
    last_price_sync_error: syncErrorMessage,
    ...catalogStatus,
  };

  if (input.updated && input.newPrice != null) {
    return {
      ...base,
      price: input.newPrice,
      promotional_price: input.newPromotionalPrice ?? null,
      is_promotion: input.newPromotionalPrice != null,
      last_price_sync_error: null,
      last_synced_price: input.lastSyncedPrice,
    };
  }

  return {
    ...base,
    last_synced_price: input.lastSyncedPrice,
  };
}
