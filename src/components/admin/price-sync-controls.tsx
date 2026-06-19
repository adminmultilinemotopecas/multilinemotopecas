"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { adminFetch, AdminApiError } from "@/lib/admin/client";
import {
  syncAllPricesViaBrowser,
  syncProductPriceViaBrowser,
} from "@/lib/admin/ml-price-sync-client";
import { Loader2, RefreshCw } from "lucide-react";
import { MlBrowserValidationDialog } from "@/components/admin/ml-browser-validation-dialog";
import {
  hasSyncUrl,
  PriceSyncStatusDisplay,
} from "@/components/admin/price-sync-status";
import type { PriceSyncStatus, Product } from "@/types/database";

interface SyncPriceResponse {
  success: boolean;
  updated: boolean;
  message: string;
  status: PriceSyncStatus;
  newPrice: number | null;
  checkedAt: string;
  sourceUrl?: string;
  requiresBrowserValidation?: boolean;
}

interface BatchProgress {
  running: boolean;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  currentProductName: string | null;
}

interface BatchStatusResponse {
  progress: BatchProgress;
  eligibleCount: number;
  cron: {
    enabled: boolean;
    time: string;
    timeZone: string;
    ranToday: boolean;
  };
}

interface ValidationDialogState {
  open: boolean;
  sourceUrl: string;
  productName: string;
  productId: string;
}

async function requestPriceSync(
  productId: string,
  body: Record<string, unknown> = {}
): Promise<SyncPriceResponse> {
  return adminFetch<SyncPriceResponse>(`/api/admin/products/${productId}/sync-price`, {
    method: "POST",
    body: JSON.stringify({
      afterBrowserValidation: true,
      ...body,
    }),
  });
}

function isBlockedSyncResult(result: SyncPriceResponse): boolean {
  return result.status === "blocked" || result.requiresBrowserValidation === true;
}

export function ProductPriceSyncButton({
  product,
  onSynced,
}: {
  product: Pick<
    Product,
    | "id"
    | "name"
    | "ml_source_url"
    | "mercado_livre_url"
    | "price_sync_enabled"
    | "last_price_sync_at"
    | "last_price_sync_status"
    | "last_price_sync_error"
    | "last_synced_price"
  >;
  onSynced?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [validationDialog, setValidationDialog] = useState<ValidationDialogState | null>(
    null
  );

  const canSync =
    hasSyncUrl({
      mlSourceUrl: product.ml_source_url,
      mercadoLivreUrl: product.mercado_livre_url,
    }) && product.price_sync_enabled;

  const resolveSourceUrl = useCallback(
    (result?: SyncPriceResponse) =>
      result?.sourceUrl ||
      product.ml_source_url ||
      product.mercado_livre_url ||
      "",
    [product.ml_source_url, product.mercado_livre_url]
  );

  function openValidationDialog(result?: SyncPriceResponse) {
    const sourceUrl = resolveSourceUrl(result);
    if (!sourceUrl) return;

    setValidationDialog({
      open: true,
      sourceUrl,
      productName: product.name,
      productId: product.id,
    });
  }

  async function handleSyncResult(result: SyncPriceResponse) {
    if (isBlockedSyncResult(result)) {
      openValidationDialog(result);
      setFeedback(result.message);
      return;
    }

    setFeedback(result.message);
    onSynced?.();
  }

  async function handleSync() {
    if (!canSync || loading) return;
    setLoading(true);
    setFeedback(null);

    const sourceUrl = resolveSourceUrl();

    try {
      const browserSync = await syncProductPriceViaBrowser({
        productId: product.id,
        sourceUrl,
      });

      if (browserSync.ok) {
        await handleSyncResult(browserSync.result);
        return;
      }

      if (browserSync.reason === "error") {
        setFeedback(browserSync.error || "Falha na sincronização via navegador.");
      }

      const result = await requestPriceSync(product.id);
      await handleSyncResult(result);
    } catch (error) {
      if (error instanceof AdminApiError && error.code === "ml_blocked") {
        openValidationDialog({ sourceUrl: error.sourceUrl ?? undefined } as SyncPriceResponse);
        setFeedback(error.message);
      } else {
        setFeedback(
          error instanceof AdminApiError ? error.message : "Erro ao sincronizar"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRetryAfterValidation() {
    setLoading(true);
    try {
      const result = await requestPriceSync(product.id, {
        afterBrowserValidation: true,
      });
      if (isBlockedSyncResult(result)) {
        setFeedback(result.message);
        throw new Error(result.message);
      }
      setValidationDialog(null);
      setFeedback(result.message);
      onSynced?.();
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyManualPrice(input: {
    price: number;
    promotionalPrice: number | null;
  }) {
    setLoading(true);
    try {
      const result = await requestPriceSync(product.id, {
        manualPrice: input.price,
        manualPromotionalPrice: input.promotionalPrice,
        afterBrowserValidation: true,
      });
      setValidationDialog(null);
      setFeedback(result.message);
      onSynced?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={!canSync || loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sincronizar preço
        </Button>
        <PriceSyncStatusDisplay
          mlSourceUrl={product.ml_source_url}
          mercadoLivreUrl={product.mercado_livre_url}
          lastPriceSyncAt={product.last_price_sync_at}
          lastPriceSyncStatus={product.last_price_sync_status}
          lastPriceSyncError={product.last_price_sync_error}
          lastSyncedPrice={product.last_synced_price}
          priceSyncEnabled={product.price_sync_enabled}
          compact
        />
        {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
      </div>

      {validationDialog && (
        <MlBrowserValidationDialog
          open={validationDialog.open}
          onOpenChange={(open) => {
            if (!open) setValidationDialog(null);
          }}
          sourceUrl={validationDialog.sourceUrl}
          productName={validationDialog.productName}
          loading={loading}
          autoStartOnOpen
          onRetrySync={handleRetryAfterValidation}
          onApplyManualPrice={handleApplyManualPrice}
        />
      )}
    </>
  );
}

export function SyncAllPricesPanel({ onComplete }: { onComplete?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<BatchStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationDialog, setValidationDialog] = useState<ValidationDialogState | null>(
    null
  );

  const loadStatus = useCallback(async () => {
    try {
      const data = await adminFetch<BatchStatusResponse>(
        "/api/admin/products/sync-prices"
      );
      setStatus(data);
      if (!data.progress.running && data.progress.processed > 0) {
        onComplete?.();
      }
    } catch {
      // ignore polling errors
    }
  }, [onComplete]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!status?.progress.running) return;
    const interval = setInterval(loadStatus, 2000);
    return () => clearInterval(interval);
  }, [status?.progress.running, loadStatus]);

  async function handleStart() {
    setLoading(true);
    setError(null);

    try {
      const browserSync = await syncAllPricesViaBrowser();
      if (browserSync.ok) {
        setError(null);
        await loadStatus();
        onComplete?.();
        return;
      }

      if (browserSync.reason === "error") {
        setError(browserSync.error || "Falha ao sincronizar via navegador.");
      }

      await adminFetch("/api/admin/products/sync-prices", { method: "POST" });
      await loadStatus();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Erro ao iniciar sync");
    } finally {
      setLoading(false);
    }
  }

  const progress = status?.progress;
  const running = progress?.running ?? false;

  return (
    <>
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Sincronização de preços ML</h2>
            <p className="text-sm text-muted-foreground">
              {status?.eligibleCount ?? 0} produto(s) elegível(is). Usa a sessão do Mercado Livre
              no seu navegador (extensão v1.3+).
            </p>
          </div>
          <Button type="button" onClick={handleStart} disabled={loading || running}>
            {loading || running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sincronizar todos os preços
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {progress && (running || progress.processed > 0) && (
          <div className="text-sm space-y-1 text-muted-foreground">
            <p>
              Progresso: {progress.processed}/{progress.total}
            </p>
            <p>
              Sucesso: {progress.succeeded} · Falhas: {progress.failed} · Ignorados:{" "}
              {progress.skipped}
            </p>
            {progress.currentProductName && running && (
              <p>Sincronizando: {progress.currentProductName}</p>
            )}
            {progress.failed > 0 && (
              <p className="text-amber-600">
                Se algum produto falhou por captcha, sincronize individualmente para abrir a
                validação.
              </p>
            )}
          </div>
        )}

        {status?.cron && (
          <p className="text-xs text-muted-foreground">
            Cron diário:{" "}
            {status.cron.enabled
              ? `ativo às ${status.cron.time} (${status.cron.timeZone})${
                  status.cron.ranToday ? " — já executou hoje" : ""
                }`
              : "desabilitado (PRICE_SYNC_CRON_ENABLED != true)"}
          </p>
        )}
      </div>

      {validationDialog && (
        <MlBrowserValidationDialog
          open={validationDialog.open}
          onOpenChange={(open) => {
            if (!open) setValidationDialog(null);
          }}
          sourceUrl={validationDialog.sourceUrl}
          productName={validationDialog.productName}
          loading={loading}
          onRetrySync={async () => {
            await requestPriceSync(validationDialog.productId, {
              afterBrowserValidation: true,
            });
            setValidationDialog(null);
            onComplete?.();
          }}
          onApplyManualPrice={async ({ price, promotionalPrice }) => {
            await requestPriceSync(validationDialog.productId, {
              manualPrice: price,
              manualPromotionalPrice: promotionalPrice,
              afterBrowserValidation: true,
            });
            setValidationDialog(null);
            onComplete?.();
          }}
        />
      )}
    </>
  );
}
