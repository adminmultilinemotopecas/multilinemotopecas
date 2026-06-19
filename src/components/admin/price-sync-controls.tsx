"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { adminFetch, AdminApiError } from "@/lib/admin/client";
import { Loader2, RefreshCw } from "lucide-react";
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
    serverFetchEnabled?: boolean;
  };
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

  const canSync =
    hasSyncUrl({
      mlSourceUrl: product.ml_source_url,
      mercadoLivreUrl: product.mercado_livre_url,
    }) && product.price_sync_enabled;

  async function handleSync() {
    if (!canSync || loading) return;
    setLoading(true);
    setFeedback(null);

    try {
      const result = await adminFetch<SyncPriceResponse>(
        `/api/admin/produtos/${product.id}/sync-ml-price`,
        { method: "POST" }
      );
      setFeedback(result.message);
      onSynced?.();
    } catch (error) {
      setFeedback(
        error instanceof AdminApiError ? error.message : "Erro ao sincronizar"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
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
  );
}

export function SyncAllPricesPanel({ onComplete }: { onComplete?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<BatchStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await adminFetch<BatchStatusResponse>(
        "/api/admin/produtos/sync-ml-prices"
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
      await adminFetch("/api/admin/produtos/sync-ml-prices", { method: "POST" });
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
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Sincronização de preços ML</h2>
          <p className="text-sm text-muted-foreground">
            {status?.eligibleCount ?? 0} produto(s) elegível(is). Busca o link de afiliado
            salvo, abre a página do produto e atualiza o preço via HTML no servidor.
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
  );
}
