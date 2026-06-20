"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch, AdminApiError } from "@/lib/admin/client";
import type { Product } from "@/types/database";

interface ProductInlinePriceEditorProps {
  productId: string;
  price: number;
  promotionalPrice: number | null;
  onSaved: (updated: Pick<Product, "price" | "promotional_price" | "is_promotion">) => void;
}

function formatInputValue(value: number | null): string {
  if (value == null) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function ProductInlinePriceEditor({
  productId,
  price,
  promotionalPrice,
  onSaved,
}: ProductInlinePriceEditorProps) {
  const [priceValue, setPriceValue] = useState(formatInputValue(price));
  const [promoValue, setPromoValue] = useState(formatInputValue(promotionalPrice));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPriceValue(formatInputValue(price));
    setPromoValue(formatInputValue(promotionalPrice));
    setError(null);
  }, [price, promotionalPrice, productId]);

  const isDirty =
    priceValue !== formatInputValue(price) ||
    promoValue !== formatInputValue(promotionalPrice);

  function handleReset() {
    setPriceValue(formatInputValue(price));
    setPromoValue(formatInputValue(promotionalPrice));
    setError(null);
  }

  async function handleSave() {
    if (!isDirty || saving) return;

    setSaving(true);
    setError(null);

    try {
      const result = await adminFetch<{ product: Product }>(
        `/api/admin/products/${productId}/prices`,
        {
          method: "PATCH",
          body: JSON.stringify({
            price: priceValue,
            promotional_price: promoValue.trim() ? promoValue : null,
          }),
        }
      );

      onSaved({
        price: result.product.price,
        promotional_price: result.product.promotional_price,
        is_promotion: result.product.is_promotion,
      });
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Erro ao salvar preços");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 min-w-[170px]">
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Preço
        </label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={priceValue}
          onChange={(e) => setPriceValue(e.target.value)}
          className="h-8 text-sm"
          disabled={saving}
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Promoção
        </label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={promoValue}
          onChange={(e) => setPromoValue(e.target.value)}
          placeholder="Opcional"
          className="h-8 text-sm"
          disabled={saving}
        />
      </div>

      {isDirty && (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            className="h-7 px-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Salvar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={handleReset}
            disabled={saving}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {error && <p className="text-[11px] text-destructive leading-snug">{error}</p>}
    </div>
  );
}
