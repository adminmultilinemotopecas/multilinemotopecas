"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  /** Abre aba do ML automaticamente ao exibir o dialogo. */
  autoStartOnOpen?: boolean;
  onRetrySync: () => Promise<void>;
  onApplyManualPrice?: (input: {
    price: number;
    promotionalPrice: number | null;
  }) => Promise<void>;
}

const POPUP_FEATURES = "width=1180,height=860,scrollbars=yes,resizable=yes";

export function MlBrowserValidationDialog({
  open,
  onOpenChange,
  sourceUrl,
  productName,
  title = "Validação do Mercado Livre necessária",
  description = "O Mercado Livre bloqueou a leitura interna. Uma aba será aberta no seu navegador para ler o preço — conclua o captcha se aparecer e aguarde.",
  confirmLabel = "Tentar sincronizar novamente",
  showManualPrice = true,
  loading = false,
  autoStartOnOpen = true,
  onRetrySync,
  onApplyManualPrice,
}: MlBrowserValidationDialogProps) {
  const popupRef = useRef<Window | null>(null);
  const autoStartedRef = useRef(false);
  const continuingRef = useRef(false);
  const [manualPrice, setManualPrice] = useState("");
  const [manualPromotionalPrice, setManualPromotionalPrice] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [extensionReady, setExtensionReady] = useState(false);
  const [browserTabOpen, setBrowserTabOpen] = useState(false);
  const [continuing, setContinuing] = useState(false);

  const applyScrapedPrice = useCallback(
    async (price: number, promotionalPrice: number | null) => {
      if (continuingRef.current) return;
      continuingRef.current = true;
      setContinuing(true);
      setLocalError(null);
      setStatusMessage(`Preço R$ ${price.toFixed(2)} capturado. Sincronizando...`);

      try {
        if (onApplyManualPrice) {
          await onApplyManualPrice({ price, promotionalPrice });
        } else {
          await onRetrySync();
        }
        onOpenChange(false);
      } catch (error) {
        setLocalError(
          error instanceof Error ? error.message : "Erro ao sincronizar preço capturado"
        );
      } finally {
        continuingRef.current = false;
        setContinuing(false);
      }
    },
    [onApplyManualPrice, onOpenChange, onRetrySync]
  );

  const startBrowserScrape = useCallback(async () => {
    setLocalError(null);
    setStatusMessage("Abrindo Mercado Livre no seu navegador...");

    const bridge = getMlExtensionBridge() || (await waitForMlExtensionBridge(3000));

    if (bridge) {
      try {
        await bridge.startValidation({
          sourceUrl,
          adminOrigin: getAdminOrigin(),
        });
        setExtensionReady(true);
        setBrowserTabOpen(true);
        setStatusMessage(
          "Aba do Mercado Livre aberta. Se aparecer captcha, conclua a verificação — o preço será lido e a aba fechada automaticamente."
        );
        return;
      } catch (error) {
        setLocalError(
          error instanceof Error ? error.message : "Falha ao abrir aba via extensão."
        );
      }
    }

    popupRef.current?.close();
    const popup = window.open(sourceUrl, "ml-validation", POPUP_FEATURES);

    if (!popup) {
      setLocalError(
        "Instale a extensão Multiline Motopeças (pasta extension/) e recarregue o admin, ou permita popups neste site."
      );
      return;
    }

    popupRef.current = popup;
    setBrowserTabOpen(true);
    setStatusMessage(
      "Extensão não detectada — leitura automática indisponível. Conclua o captcha, feche a janela e informe o preço manualmente."
    );
  }, [sourceUrl]);

  useEffect(() => {
    if (!open) {
      popupRef.current?.close();
      popupRef.current = null;
      autoStartedRef.current = false;
      setLocalError(null);
      setStatusMessage(null);
      setExtensionReady(false);
      setBrowserTabOpen(false);
      setContinuing(false);
      continuingRef.current = false;
      return;
    }

    return subscribeMlExtensionBridge((bridge) => {
      setExtensionReady(Boolean(bridge));
    });
  }, [open]);

  useEffect(() => {
    if (!open || !autoStartOnOpen || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void startBrowserScrape();
  }, [open, autoStartOnOpen, startBrowserScrape]);

  useEffect(() => {
    if (!open) return;

    let unsubscribe: (() => void) | undefined;
    let attached = false;

    function attachListener() {
      const bridge = getMlExtensionBridge();
      if (!bridge || attached) return;

      attached = true;
      unsubscribe = bridge.onSessionCaptured((detail) => {
        if (detail.error && detail.scrapedPrice == null) {
          setLocalError(detail.error);
          return;
        }

        if (detail.scrapedPrice != null && Number.isFinite(detail.scrapedPrice)) {
          setBrowserTabOpen(false);
          void applyScrapedPrice(
            detail.scrapedPrice,
            detail.scrapedPromotionalPrice ?? null
          );
          return;
        }

        if (detail.persisted && detail.hasScrapedPrice) {
          void applyScrapedPrice(
            detail.scrapedPrice ?? 0,
            detail.scrapedPromotionalPrice ?? null
          );
        }
      });
    }

    attachListener();
    const poll = window.setInterval(() => {
      if (!attached) attachListener();
    }, 400);

    return () => {
      window.clearInterval(poll);
      unsubscribe?.();
    };
  }, [open, applyScrapedPrice]);

  useEffect(() => {
    if (!open || !browserTabOpen || extensionReady) return;

    const popup = popupRef.current;
    if (!popup) return;

    const interval = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(interval);
        popupRef.current = null;
        setBrowserTabOpen(false);
        setStatusMessage(
          "Janela fechada. Informe o preço manualmente ou instale a extensão para leitura automática."
        );
      }
    }, 800);

    return () => window.clearInterval(interval);
  }, [open, browserTabOpen, extensionReady]);

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

  if (!open) return null;

  async function handleRetry() {
    setLocalError(null);
    setContinuing(true);
    try {
      await onRetrySync();
      onOpenChange(false);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Erro ao sincronizar");
    } finally {
      setContinuing(false);
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

    await applyScrapedPrice(price, promotionalPrice);
  }

  const busy = loading || continuing;

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
              ? "Extensão ativa — aba aberta automaticamente, preço lido e sincronizado sem intervenção."
              : "Para leitura automática: carregue a extensão em chrome://extensions (modo desenvolvedor → pasta extension/) e recarregue o admin (F5)."}
          </div>

          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando...
            </div>
          )}

          {statusMessage && !busy && (
            <p className="text-sm text-muted-foreground">{statusMessage}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={startBrowserScrape}>
              <ExternalLink className="h-4 w-4" />
              Reabrir Mercado Livre
            </Button>
            <Button type="button" variant="ghost" asChild>
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                Abrir em nova aba
              </a>
            </Button>
          </div>

          {showManualPrice && onApplyManualPrice && !extensionReady && (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-medium">Preço manual (sem extensão)</p>
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
