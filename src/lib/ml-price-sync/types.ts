export type PriceSyncResultStatus =
  | "success"
  | "failed"
  | "skipped"
  | "low_confidence"
  | "no_url"
  | "blocked"
  | "unavailable"
  | "inactive";

export interface PriceScrapeEvidence {
  strategies: string[];
  pageTitle?: string | null;
  itemId?: string | null;
  nameMatchScore?: number;
  rawCandidates?: Array<{ source: string; price: number; promotionalPrice?: number | null }>;
  finalUrl?: string;
  httpStatus?: number;
}

export interface PriceScrapeResult {
  success: boolean;
  price: number | null;
  promotionalPrice: number | null;
  sourceUrl: string;
  checkedAt: string;
  status: PriceSyncResultStatus;
  error?: string;
  confidenceScore: number;
  evidence: PriceScrapeEvidence;
  pageTitle?: string | null;
  itemId?: string | null;
  nameMatchScore?: number;
}

export interface PriceSyncApplyResult {
  productId: string;
  updated: boolean;
  scrape: PriceScrapeResult;
  oldPrice: number;
  newPrice: number | null;
  oldPromotionalPrice: number | null;
  newPromotionalPrice: number | null;
  message: string;
}

export interface BatchSyncProgress {
  running: boolean;
  triggerSource: "manual" | "cron" | null;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  currentProductId: string | null;
  currentProductName: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  lastError: string | null;
}

export interface ProductSyncCandidate {
  id: string;
  name: string;
  slug: string;
  price: number;
  promotional_price: number | null;
  mercado_livre_id: string | null;
  ml_source_url: string | null;
  mercado_livre_url: string | null;
  price_sync_enabled: boolean;
}
