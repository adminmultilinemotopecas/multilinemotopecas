"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import type { MotorcycleModel } from "@/types/database";
import { Loader2, Save } from "lucide-react";

interface MotorcycleModelFormProps {
  model?: MotorcycleModel;
}

export function MotorcycleModelForm({ model }: MotorcycleModelFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    motorcycle_brand: model?.motorcycle_brand || "",
    model: model?.model || "",
    displacement: model?.displacement || "",
    year_start: model?.year_start?.toString() || "",
    year_end: model?.year_end?.toString() || "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const data = {
      motorcycle_brand: form.motorcycle_brand,
      model: form.model,
      slug: model?.slug || slugify(`${form.motorcycle_brand}-${form.model}-${form.displacement}`),
      displacement: form.displacement || null,
      year_start: form.year_start ? parseInt(form.year_start) : null,
      year_end: form.year_end ? parseInt(form.year_end) : null,
    };

    if (model) {
      await supabase.from("motorcycle_models").update(data).eq("id", model.id);
    } else {
      await supabase.from("motorcycle_models").insert(data);
    }

    setLoading(false);
    router.push("/admin/modelos");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <div>
            <Label>Marca da Moto *</Label>
            <Input value={form.motorcycle_brand} onChange={(e) => setForm({ ...form, motorcycle_brand: e.target.value })} required className="mt-1" />
          </div>
          <div>
            <Label>Modelo *</Label>
            <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required className="mt-1" />
          </div>
          <div>
            <Label>Cilindrada</Label>
            <Input value={form.displacement} onChange={(e) => setForm({ ...form, displacement: e.target.value })} placeholder="160cc" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Ano Inicial</Label>
              <Input type="number" value={form.year_start} onChange={(e) => setForm({ ...form, year_start: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Ano Final</Label>
              <Input type="number" value={form.year_end} onChange={(e) => setForm({ ...form, year_end: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
