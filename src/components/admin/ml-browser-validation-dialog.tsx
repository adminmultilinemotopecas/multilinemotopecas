"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  /** Ao fechar o popup do ML, chama onRetrySync automaticamente. */
  autoContinueOnPopupClose?: boolean;
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
  description = "O Mercado Livre bloqueou o acesso automático. Abra a página do anúncio, faça login ou conclua o captcha. Depois feche a janela e continue abaixo.",
  confirmLabel = "Tentar sincronizar novamente",
  showManualPrice = true,
  loading = false,
  autoContinueOnPopupClose = true,
  onRetrySync,
  onApplyManualPrice,
}: MlBrowserValidationDialogProps) {
  const popupRef = useRef<Window | null>(null);
  const autoContinueRef = useRef(autoContinueOnPopupClose);
  const continuingRef = useRef(false);
  const [manualPrice, setManualPrice] = useState("");
  const [manualPromotionalPrice, setManualPromotionalPrice] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [validationDone, setValidationDone] = useState(false);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    autoContinueRef.current = autoContinueOnPopupClose;
  }, [autoContinueOnPopupClose]);

  useEffect(() => {
    if (!open) {
      popupRef.current?.close();
      popupRef.current = null;
      setLocalError(null);
      setStatusMessage(null);
      setPopupOpen(false);
      setValidationDone(false);
      setContinuing(false);
      continuingRef.current = false;
      return;
    }
  }, [open]);

  const continueAfterValidation = useCallback(async () => {
    if (continuingRef.current) return;
    continuingRef.current = true;
    setContinuing(true);
    setLocalError(null);

    try {
      await onRetrySync();
      onOpenChange(false);
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : "Não foi possível continuar. Informe o preço manualmente abaixo."
      );
    } finally {
      continuingRef.current = false;
      setContinuing(false);
    }
  }, [onOpenChange, onRetrySync]);

  const openMercadoLivrePopup = useCallback(() => {
    setLocalError(null);
    setStatusMessage(null);
    setValidationDone(false);

    popupRef.current?.close();
    const popup = window.open(sourceUrl, "ml-validation", POPUP_FEATURES);

    if (!popup) {
      setLocalError(
        "Não foi possível abrir a janela. Permita popups para este site ou use “Abrir em nova aba”."
      );
      return;
    }

    popupRef.current = popup;
    setPopupOpen(true);
    setStatusMessage(
      "Janela do Mercado Livre aberta. Conclua login/captcha, confira o produto e feche a janela."
    );
  }, [sourceUrl]);

  useEffect(() => {
    if (!open || !popupOpen) return;

    const interval = window.setInterval(() => {
      const popup = popupRef.current;
      if (!popup || !popup.closed) return;

      window.clearInterval(interval);
      popupRef.current = null;
      setPopupOpen(false);
      setValidationDone(true);
      setStatusMessage(
        showManualPrice && onApplyManualPrice
          ? "Janela fechada. Informe o preço visto no Mercado Livre ou clique em tentar sincronizar novamente."
          : "Janela fechada. Clique em continuar para concluir."
      );

      if (autoContinueRef.current) {
        void continueAfterValidation();
      }
    }, 800);

    return () => window.clearInterval(interval);
  }, [
    open,
    popupOpen,
    showManualPrice,
    onApplyManualPrice,
    continueAfterValidation,
  ]);

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
    await continueAfterValidation();
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
    setContinuing(true);
    try {
      await onApplyManualPrice({ price, promotionalPrice });
      onOpenChange(false);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Erro ao aplicar preço");
    } finally {
      setContinuing(false);
    }
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

          <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
            <li>Abra a página do Mercado Livre.</li>
            <li>Faça login, captcha ou validação solicitada.</li>
            <li>Feche a janela quando o produto estiver visível.</li>
            {showManualPrice && onApplyManualPrice ? (
              <li>Informe o preço visto na página ou tente sincronizar novamente.</li>
            ) : (
              <li>Clique em continuar para concluir o processo.</li>
            )}
          </ol>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={openMercadoLivrePopup}>
              <ExternalLink className="h-4 w-4" />
              Abrir Mercado Livre
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

          {validationDone && showManualPrice && onApplyManualPrice && (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-medium">Preço após validação no Mercado Livre</p>
              <p className="text-xs text-muted-foreground">
                Copie o preço exibido na página do anúncio após concluir o captcha.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="ml-manual-price">Preço (R$)</Label>
                  <Input
                    id="ml-manual-price"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder="Ex: 129.90"
                    autoFocus
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
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
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
