"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminFetch, AdminApiError } from "@/lib/admin/client";
import { formatPrice } from "@/lib/utils";
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

interface PriceHistoryEntry {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  oldPrice: number | null;
  newPrice: number | null;
  oldPromotionalPrice: number | null;
  newPromotionalPrice: number | null;
  status: string;
  error: string | null;
  triggerSource: string;
  createdAt: string;
}

interface PriceHistoryResponse {
  logs: PriceHistoryEntry[];
  total: number;
}

function formatPriceValue(value: number | null): string {
  if (value == null) return "—";
  return formatPrice(value);
}

function formatPriceChange(
  oldValue: number | null,
  newValue: number | null
): string {
  if (oldValue == null && newValue == null) return "—";
  if (oldValue === newValue) return formatPriceValue(newValue);
  return `${formatPriceValue(oldValue)} → ${formatPriceValue(newValue)}`;
}

function triggerSourceLabel(source: string): string {
  switch (source) {
    case "cron":
      return "Cron diário";
    case "manual_admin":
      return "Edição na lista";
    case "form_edit":
      return "Cadastro do produto";
    case "manual":
      return "Sync manual";
    default:
      return source;
  }
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "success") return "default";
  if (status === "skipped") return "secondary";
  return "destructive";
}

export function PriceSyncHistoryPanel({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<PriceHistoryResponse | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch<PriceHistoryResponse>(
        "/api/admin/produtos/price-sync-history?limit=50"
      );
      setHistory(data);
    } catch {
      setHistory(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshKey]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Histórico de alterações de preço</h2>
          <p className="text-sm text-muted-foreground">
            {history?.total ?? 0} registro(s) — sync ML, edição na lista ou cadastro do produto.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={loadHistory} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar
        </Button>
      </div>

      {loading && !history ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !history || history.logs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Nenhuma alteração registrada ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Preço</th>
                <th className="px-3 py-2 font-medium">Promo</th>
                <th className="px-3 py-2 font-medium">Origem</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.logs.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-3 py-2 min-w-[160px]">
                    <Link
                      href={`/admin/produtos/${entry.productId}`}
                      className="font-medium hover:underline line-clamp-1"
                    >
                      {entry.productName}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{entry.productSku}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {formatPriceChange(entry.oldPrice, entry.newPrice)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {formatPriceChange(entry.oldPromotionalPrice, entry.newPromotionalPrice)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {triggerSourceLabel(entry.triggerSource)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={statusVariant(entry.status)} className="text-[10px]">
                      {entry.status}
                    </Badge>
                    {entry.error && (
                      <span className="block text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                        {entry.error}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
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
  const [wasRunning, setWasRunning] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await adminFetch<BatchStatusResponse>(
        "/api/admin/produtos/sync-ml-prices"
      );
      setStatus(data);
      if (wasRunning && !data.progress.running && data.progress.processed > 0) {
        onComplete?.();
      }
      setWasRunning(data.progress.running);
    } catch {
      // ignore polling errors
    }
  }, [onComplete, wasRunning]);

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
