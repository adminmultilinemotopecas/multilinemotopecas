"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/data-table";
import { adminFetch } from "@/lib/admin/client";
import type { Brand } from "@/types/database";

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBrands();
  }, []);

  async function loadBrands() {
    try {
      const data = await adminFetch<Brand[]>("/api/admin/brands");
      setBrands(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(brand: Brand) {
    if (!confirm(`Excluir marca "${brand.name}"?`)) return;
    await adminFetch(`/api/admin/brands/${brand.id}`, { method: "DELETE" });
    loadBrands();
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
        <h1 className="text-3xl font-bold">Marcas</h1>
        <Button asChild>
          <Link href="/admin/marcas/novo">
            <Plus className="h-4 w-4" />
            Nova Marca
          </Link>
        </Button>
      </div>
      <DataTable
        data={brands}
        columns={[
          { key: "name", label: "Nome" },
          { key: "slug", label: "Slug" },
          {
            key: "description",
            label: "Descrição",
            render: (b) => b.description?.slice(0, 50) || "-",
          },
        ]}
        onEdit={(b) => {
          window.location.href = `/admin/marcas/${b.id}`;
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
