export interface MultilineMlBridge {
  isAvailable(): boolean;
  startValidation(input: {
    sourceUrl: string;
    adminOrigin: string;
  }): Promise<{ ok: boolean; tabId?: number; error?: string }>;
  captureNow(input: {
    tabId?: number;
    adminOrigin: string;
    sourceUrl: string;
  }): Promise<{ ok: boolean; error?: string }>;
  syncProductPrice(input: {
    productId: string;
    sourceUrl: string;
    adminOrigin?: string;
  }): Promise<{
    ok: boolean;
    result?: { message?: string; updated?: boolean; newPrice?: number | null };
    scrape?: { price?: number; promotionalPrice?: number | null };
    error?: string;
  }>;
  syncAllProductPrices(): Promise<{
    ok: boolean;
    stats?: {
      total: number;
      processed: number;
      succeeded: number;
      failed: number;
    };
    error?: string;
  }>;
  onSessionCaptured(
    callback: (detail: {
      sourceUrl?: string | null;
      hasScrapedPrice?: boolean;
      hasCookies?: boolean;
      error?: string | null;
      persisted?: boolean;
      scrapedPrice?: number | null;
      scrapedPromotionalPrice?: number | null;
    }) => void
  ): () => void;
}

declare global {
  interface Window {
    multilineMlBridge?: MultilineMlBridge;
  }
}

export {};
