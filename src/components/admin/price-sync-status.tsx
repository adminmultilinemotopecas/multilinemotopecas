"use client";

import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import type { PriceSyncStatus } from "@/types/database";

const STATUS_LABELS: Record<PriceSyncStatus, string> = {
  success: "Sucesso",
  failed: "Falha",
  skipped: "Ignorado",
  low_confidence: "Baixa confiança",
  no_url: "Sem URL",
  blocked: "Bloqueado",
  unavailable: "Indisponível",
  inactive: "Inativo",
};

const STATUS_VARIANT: Record<
  PriceSyncStatus,
  "success" | "destructive" | "secondary" | "warning" | "outline"
> = {
  success: "success",
  failed: "destructive",
  skipped: "secondary",
  low_confidence: "warning",
  no_url: "outline",
  blocked: "destructive",
  unavailable: "warning",
  inactive: "warning",
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

interface PriceSyncStatusDisplayProps {
  mlSourceUrl?: string | null;
  mercadoLivreUrl?: string | null;
  lastPriceSyncAt?: string | null;
  lastPriceSyncStatus?: PriceSyncStatus | null;
  lastPriceSyncError?: string | null;
  lastSyncedPrice?: number | null;
  priceSyncEnabled?: boolean;
  compact?: boolean;
}

export function hasSyncUrl(
  product: Pick<
    PriceSyncStatusDisplayProps,
    "mlSourceUrl" | "mercadoLivreUrl"
  >
): boolean {
  const urls = [product.mlSourceUrl, product.mercadoLivreUrl].filter(Boolean);
  return urls.some(
    (url) =>
      /mercadolivre\.com\.br/i.test(url!) &&
      (/\/MLB-?\d+/i.test(url!) || /\/p\/MLB/i.test(url!))
  );
}

export function PriceSyncStatusDisplay({
  mlSourceUrl,
  mercadoLivreUrl,
  lastPriceSyncAt,
  lastPriceSyncStatus,
  lastPriceSyncError,
  lastSyncedPrice,
  priceSyncEnabled = true,
  compact = false,
}: PriceSyncStatusDisplayProps) {
  const canSync = hasSyncUrl({ mlSourceUrl, mercadoLivreUrl }) && priceSyncEnabled;

  if (!canSync) {
    return (
      <p className="text-xs text-muted-foreground">
        Produto sem URL de origem para sincronização
      </p>
    );
  }

  if (compact && !lastPriceSyncAt) {
    return <span className="text-xs text-muted-foreground">Nunca sincronizado</span>;
  }

  return (
    <div className="space-y-1 text-xs">
      {lastPriceSyncStatus && (
        <Badge variant={STATUS_VARIANT[lastPriceSyncStatus]}>
          {STATUS_LABELS[lastPriceSyncStatus]}
        </Badge>
      )}
      {!compact && (
        <>
          <p className="text-muted-foreground">
            Última sync: {formatDateTime(lastPriceSyncAt)}
          </p>
          {lastSyncedPrice != null && (
            <p className="text-muted-foreground">
              Preço lido: {formatPrice(lastSyncedPrice)}
            </p>
          )}
          {lastPriceSyncError && lastPriceSyncStatus !== "success" && (
            <p className="text-destructive">{lastPriceSyncError}</p>
          )}
        </>
      )}
    </div>
  );
}
