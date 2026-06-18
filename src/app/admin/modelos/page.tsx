"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/data-table";
import { adminFetch } from "@/lib/admin/client";
import type { MotorcycleModel } from "@/types/database";

export default function AdminMotorcycleModelsPage() {
  const [models, setModels] = useState<MotorcycleModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    try {
      const data = await adminFetch<MotorcycleModel[]>("/api/admin/motorcycle-models");
      setModels(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(model: MotorcycleModel) {
    if (!confirm(`Excluir modelo "${model.motorcycle_brand} ${model.model}"?`)) return;
    await adminFetch(`/api/admin/motorcycle-models/${model.id}`, { method: "DELETE" });
    loadModels();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Modelos de Motos</h1>
        <Button asChild>
          <Link href="/admin/modelos/novo">
            <Plus className="h-4 w-4" />
            Novo Modelo
          </Link>
        </Button>
      </div>
      <DataTable
        data={models}
        columns={[
          { key: "motorcycle_brand", label: "Marca" },
          { key: "model", label: "Modelo" },
          { key: "displacement", label: "Cilindrada", render: (m) => m.displacement || "-" },
          {
            key: "years",
            label: "Anos",
            render: (m) =>
              m.year_start || m.year_end
                ? `${m.year_start || "?"} - ${m.year_end || "?"}`
                : "-",
          },
        ]}
        onEdit={(m) => {
          window.location.href = `/admin/modelos/${m.id}`;
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
