"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/data-table";
import { createClient } from "@/lib/supabase/client";
import type { MotorcycleModel } from "@/types/database";

export default function AdminModelsPage() {
  const [models, setModels] = useState<MotorcycleModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("motorcycle_models").select("*").order("motorcycle_brand");
    setModels((data as MotorcycleModel[]) || []);
    setLoading(false);
  }

  async function handleDelete(model: MotorcycleModel) {
    if (!confirm(`Excluir "${model.motorcycle_brand} ${model.model}"?`)) return;
    const supabase = createClient();
    await supabase.from("motorcycle_models").delete().eq("id", model.id);
    load();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Modelos de Motos</h1>
        <Button asChild><Link href="/admin/modelos/novo"><Plus className="h-4 w-4" />Novo Modelo</Link></Button>
      </div>
      <DataTable
        data={models}
        columns={[
          { key: "motorcycle_brand", label: "Marca" },
          { key: "model", label: "Modelo" },
          { key: "displacement", label: "Cilindrada" },
          { key: "years", label: "Anos", render: (m) => `${m.year_start || "?"} - ${m.year_end || "atual"}` },
        ]}
        onEdit={(m) => window.location.href = `/admin/modelos/${m.id}`}
        onDelete={handleDelete}
      />
    </div>
  );
}
