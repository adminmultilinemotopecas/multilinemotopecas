"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/data-table";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types/database";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories((data as Category[]) || []);
    setLoading(false);
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Excluir categoria "${cat.name}"?`)) return;
    const supabase = createClient();
    await supabase.from("categories").delete().eq("id", cat.id);
    load();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Categorias</h1>
        <Button asChild><Link href="/admin/categorias/novo"><Plus className="h-4 w-4" />Nova Categoria</Link></Button>
      </div>
      <DataTable
        data={categories}
        columns={[
          { key: "name", label: "Nome" },
          { key: "slug", label: "Slug" },
          { key: "parent_id", label: "Pai", render: (c) => c.parent_id ? "Subcategoria" : "Principal" },
        ]}
        onEdit={(c) => window.location.href = `/admin/categorias/${c.id}`}
        onDelete={handleDelete}
      />
    </div>
  );
}
