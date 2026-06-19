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
  onSessionCaptured(
    callback: (detail: {
      sourceUrl?: string | null;
      hasScrapedPrice?: boolean;
      hasCookies?: boolean;
      error?: string | null;
      persisted?: boolean;
    }) => void
  ): () => void;
}

declare global {
  interface Window {
    multilineMlBridge?: MultilineMlBridge;
  }
}

export {};
