"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAdminOrigin,
  getMlExtensionBridge,
  subscribeMlExtensionBridge,
  waitForMlExtensionBridge,
} from "@/lib/admin/ml-extension-client";

export interface MlBrowserValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceUrl: string;
  productName?: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
  showManualPrice?: boolean;
  loading?: boolean;
  autoContinueOnSession?: boolean;
  onRetrySync: () => Promise<void>;
  onApplyManualPrice?: (input: {
    price: number;
    promotionalPrice: number | null;
  }) => Promise<void>;
}

export function MlBrowserValidationDialog({
  open,
  onOpenChange,
  sourceUrl,
  productName,
  title = "Validação do Mercado Livre necessária",
  description = "O Mercado Livre bloqueou o acesso automático. Abra a página do anúncio, faça login ou conclua o captcha. Ao fechar a aba, a extensão captura sua sessão e cookies para continuar automaticamente.",
  confirmLabel = "Tentar sincronizar novamente",
  showManualPrice = true,
  loading = false,
  autoContinueOnSession = true,
  onRetrySync,
  onApplyManualPrice,
}: MlBrowserValidationDialogProps) {
  const popupRef = useRef<Window | null>(null);
  const extensionTabIdRef = useRef<number | null>(null);
  const autoContinueRef = useRef(false);
  const [manualPrice, setManualPrice] = useState("");
  const [manualPromotionalPrice, setManualPromotionalPrice] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [extensionReady, setExtensionReady] = useState(false);
  const [capturingSession, setCapturingSession] = useState(false);

  useEffect(() => {
    autoContinueRef.current = autoContinueOnSession;
  }, [autoContinueOnSession]);

  useEffect(() => {
    if (!open) {
      popupRef.current?.close();
      popupRef.current = null;
      extensionTabIdRef.current = null;
      setLocalError(null);
      setStatusMessage(null);
      setCapturingSession(false);
      setExtensionReady(false);
      return;
    }

    return subscribeMlExtensionBridge((bridge) => {
      setExtensionReady(Boolean(bridge));
    });
  }, [open]);

  useEffect(() => {
    if (!open || !extensionReady) return;

    const bridge = getMlExtensionBridge();
    if (!bridge) return;

    return bridge.onSessionCaptured(async (detail) => {
      if (detail.error || detail.persisted === false) {
        setLocalError(detail.error || "Falha ao capturar sessão do Mercado Livre.");
        return;
      }

      if (!detail.hasCookies && !detail.hasScrapedPrice) {
        setLocalError("Sessão capturada sem cookies ou preço. Tente novamente.");
        return;
      }

      setStatusMessage(
        detail.hasScrapedPrice
          ? "Sessão capturada com preço lido do navegador. Continuando..."
          : "Sessão e cookies capturados. Continuando..."
      );

      if (!autoContinueRef.current) return;

      setCapturingSession(true);
      try {
        await onRetrySync();
        onOpenChange(false);
      } catch (error) {
        setLocalError(
          error instanceof Error ? error.message : "Erro ao continuar após captura"
        );
      } finally {
        setCapturingSession(false);
      }
    });
  }, [open, extensionReady, onOpenChange, onRetrySync]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const popup = popupRef.current;
    if (!popup) return;

    const interval = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(interval);
        popupRef.current = null;
        setStatusMessage(
          "Janela fechada. Se a extensão estiver instalada, a sessão será capturada automaticamente."
        );
      }
    }, 800);

    return () => window.clearInterval(interval);
  }, [open]);

  if (!open) return null;

  async function openMercadoLivreValidation() {
    setLocalError(null);
    setStatusMessage(null);

    const bridge = getMlExtensionBridge() || (await waitForMlExtensionBridge());

    if (bridge) {
      try {
        const result = await bridge.startValidation({
          sourceUrl,
          adminOrigin: getAdminOrigin(),
        });
        extensionTabIdRef.current = result.tabId ?? null;
        setExtensionReady(true);
        setStatusMessage(
          "Aba do Mercado Livre aberta. Conclua a validação e feche a aba — sua sessão será capturada automaticamente."
        );
        return;
      } catch (error) {
        setLocalError(
          error instanceof Error
            ? error.message
            : "Falha ao abrir via extensão. Tentando popup..."
        );
      }
    }

    popupRef.current?.close();
    popupRef.current = window.open(
      sourceUrl,
      "ml-validation",
      "width=1180,height=860,scrollbars=yes,resizable=yes"
    );

    if (!popupRef.current) {
      setLocalError(
        "Instale a extensão Multiline Motopeças e permita popups, ou use abrir em nova aba."
      );
      return;
    }

    setStatusMessage(
      "Popup aberto sem extensão — ao fechar, clique em tentar novamente manualmente."
    );
  }

  async function handleRetry() {
    setLocalError(null);
    try {
      await onRetrySync();
      onOpenChange(false);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Erro ao sincronizar");
    }
  }

  async function handleCaptureNow() {
    let bridge = getMlExtensionBridge();
    if (!bridge) {
      bridge = await waitForMlExtensionBridge(5000);
    }

    if (!bridge) {
      setLocalError(
        "Extensão não detectada. Vá em chrome://extensions, recarregue a extensão (v1.1.2+) e recarregue esta página (F5)."
      );
      return;
    }

    setExtensionReady(true);

    setCapturingSession(true);
    setLocalError(null);
    try {
      await bridge.captureNow({
        tabId: extensionTabIdRef.current ?? undefined,
        adminOrigin: getAdminOrigin(),
        sourceUrl,
      });
      setStatusMessage("Sessão capturada. Continuando...");
      if (!autoContinueRef.current) {
        await onRetrySync();
        onOpenChange(false);
      }
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Falha ao capturar sessão do navegador"
      );
    } finally {
      setCapturingSession(false);
    }
  }

  async function handleApplyManualPrice() {
    if (!onApplyManualPrice) return;

    const price = Number.parseFloat(manualPrice.replace(",", "."));
    const promotionalRaw = manualPromotionalPrice.trim();
    const promotionalPrice = promotionalRaw
      ? Number.parseFloat(promotionalRaw.replace(",", "."))
      : null;

    if (!Number.isFinite(price) || price <= 0) {
      setLocalError("Informe um preço válido maior que zero.");
      return;
    }

    if (promotionalPrice != null && (!Number.isFinite(promotionalPrice) || promotionalPrice <= 0)) {
      setLocalError("Informe um preço promocional válido ou deixe em branco.");
      return;
    }

    setLocalError(null);
    try {
      await onApplyManualPrice({ price, promotionalPrice });
      onOpenChange(false);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Erro ao aplicar preço");
    }
  }

  const busy = loading || capturingSession;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Fechar"
        onClick={() => onOpenChange(false)}
      />

      <div className="relative z-10 w-full max-w-lg rounded-xl border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <h2 className="font-semibold text-lg">{title}</h2>
              {productName && (
                <p className="text-sm text-muted-foreground mt-1">{productName}</p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar dialogo"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>

          <div
            className={`rounded-lg border px-3 py-2 text-xs ${
              extensionReady
                ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
            }`}
          >
            {extensionReady
              ? "Extensão detectada — cookies e sessão serão capturados ao fechar a aba do ML ou ao voltar ao admin."
              : "Extensão não detectada. Instale/atualize (v1.1.2+), recarregue o admin (F5) e tente novamente."}
          </div>

          <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
            <li>Abra a página do Mercado Livre.</li>
            <li>Faça login, captcha ou validação solicitada.</li>
            <li>Feche a aba ou volte ao admin quando o produto estiver visível — o processo continua sozinho.</li>
          </ol>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={openMercadoLivreValidation}>
              <ExternalLink className="h-4 w-4" />
              Abrir Mercado Livre
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={handleCaptureNow}
              title={
                extensionReady
                  ? "Captura cookies e preço da aba do ML aberta"
                  : "Requer extensão instalada e admin recarregado"
              }
            >
              Capturar sessão agora
            </Button>
            <Button type="button" variant="ghost" asChild>
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                Abrir em nova aba
              </a>
            </Button>
          </div>

          {statusMessage && (
            <p className="text-sm text-muted-foreground">{statusMessage}</p>
          )}

          {showManualPrice && onApplyManualPrice && (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-medium">Preço após validação manual</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="ml-manual-price">Preço (R$)</Label>
                  <Input
                    id="ml-manual-price"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder="Ex: 129.90"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ml-manual-promo">Promocional (opcional)</Label>
                  <Input
                    id="ml-manual-promo"
                    value={manualPromotionalPrice}
                    onChange={(e) => setManualPromotionalPrice(e.target.value)}
                    placeholder="Ex: 99.90"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={handleApplyManualPrice}
              >
                Aplicar preço informado
              </Button>
            </div>
          )}

          {localError && <p className="text-sm text-destructive">{localError}</p>}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleRetry} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
