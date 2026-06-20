"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { adminFetch, AdminApiError } from "@/lib/admin/client";
import type { MotorcycleModel } from "@/types/database";
import { Loader2, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";

interface MotorcycleModelFormProps {
  model?: MotorcycleModel;
  embedded?: boolean;
  existingBrands?: string[];
  onSuccess?: (model: MotorcycleModel) => void;
  onCancel?: () => void;
}

export function MotorcycleModelForm({
  model,
  embedded = false,
  existingBrands = [],
  onSuccess,
  onCancel,
}: MotorcycleModelFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    motorcycle_brand: model?.motorcycle_brand || "",
    model: model?.model || "",
    displacement: model?.displacement || "",
    year_start: model?.year_start?.toString() || "",
    year_end: model?.year_end?.toString() || "",
  });

  const brandSuggestions = useMemo(
    () => [...new Set(existingBrands.filter(Boolean))].sort(),
    [existingBrands]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const data = {
      motorcycle_brand: form.motorcycle_brand,
      model: form.model,
      displacement: form.displacement || null,
      year_start: form.year_start ? parseInt(form.year_start, 10) : null,
      year_end: form.year_end ? parseInt(form.year_end, 10) : null,
    };

    try {
      if (model) {
        const updated = await adminFetch<MotorcycleModel>(
          `/api/admin/motorcycle-models/${model.id}`,
          {
            method: "PUT",
            body: JSON.stringify(data),
          }
        );
        if (embedded && onSuccess) {
          onSuccess(updated);
        } else {
          router.push("/admin/modelos");
          router.refresh();
        }
      } else {
        const created = await adminFetch<MotorcycleModel>("/api/admin/motorcycle-models", {
          method: "POST",
          body: JSON.stringify(data),
        });
        if (embedded && onSuccess) {
          onSuccess(created);
        } else {
          router.push("/admin/modelos");
          router.refresh();
        }
      }
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div>
        <Label>Marca da Moto *</Label>
        <Input
          list={brandSuggestions.length > 0 ? "motorcycle-brand-suggestions" : undefined}
          value={form.motorcycle_brand}
          onChange={(e) => setForm({ ...form, motorcycle_brand: e.target.value })}
          required
          className="mt-1"
          placeholder="Ex: Honda, Yamaha..."
        />
        {brandSuggestions.length > 0 && (
          <datalist id="motorcycle-brand-suggestions">
            {brandSuggestions.map((brand) => (
              <option key={brand} value={brand} />
            ))}
          </datalist>
        )}
      </div>
      <div>
        <Label>Modelo *</Label>
        <Input
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
          required
          className="mt-1"
          placeholder="Ex: CG 160, Factor 150..."
        />
      </div>
      <div>
        <Label>Cilindrada</Label>
        <Input
          value={form.displacement}
          onChange={(e) => setForm({ ...form, displacement: e.target.value })}
          placeholder="160cc"
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Ano Inicial</Label>
          <Input
            type="number"
            value={form.year_start}
            onChange={(e) => setForm({ ...form, year_start: e.target.value })}
            className="mt-1"
            placeholder="2010"
          />
        </div>
        <div>
          <Label>Ano Final</Label>
          <Input
            type="number"
            value={form.year_end}
            onChange={(e) => setForm({ ...form, year_end: e.target.value })}
            className="mt-1"
            placeholder="2025"
          />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : embedded ? (
            <Plus className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {embedded ? "Cadastrar modelo" : "Salvar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => (onCancel ? onCancel() : router.back())}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );

  if (embedded) {
    return formContent;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="max-w-lg">{formContent}</div>
      </CardContent>
    </Card>
  );
}
