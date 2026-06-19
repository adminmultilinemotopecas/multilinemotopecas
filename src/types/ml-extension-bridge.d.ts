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
  }): Promise<{
    ok: boolean;
    scrape?: {
      price?: number;
      promotionalPrice?: number | null;
      sourcePageUrl?: string;
      pageTitle?: string;
    };
    error?: string;
  }>;
  scrapeAffiliateUrl(input: {
    affiliateUrl: string;
  }): Promise<{
    ok: boolean;
    data?: {
      name: string;
      price: number;
      promotionalPrice: number | null;
      mercadoLivreId: string | null;
      images: string[];
      sourcePageUrl: string;
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
