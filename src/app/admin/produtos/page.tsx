"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/database";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select("*, brand:brands(name), category:categories!category_id(name)")
      .order("created_at", { ascending: false });
    setProducts((data as Product[]) || []);
    setLoading(false);
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Excluir "${product.name}"?`)) return;
    const supabase = createClient();
    await supabase.from("products").delete().eq("id", product.id);
    loadProducts();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Produtos</h1>
        <Button asChild>
          <Link href="/admin/produtos/novo">
            <Plus className="h-4 w-4" />
            Novo Produto
          </Link>
        </Button>
      </div>

      <DataTable
        data={products}
        columns={[
          { key: "name", label: "Nome" },
          { key: "sku", label: "SKU" },
          {
            key: "brand",
            label: "Marca",
            render: (p) => p.brand?.name || "-",
          },
          {
            key: "price",
            label: "Preço",
            render: (p) => formatPrice(p.price),
          },
          {
            key: "promotional_price",
            label: "Preço Promocional",
            render: (p) =>
              p.promotional_price != null
                ? formatPrice(p.promotional_price)
                : "-",
          },
          {
            key: "status",
            label: "Status",
            render: (p) => (
              <div className="space-y-1">
                <Badge variant={p.status === "active" ? "success" : "secondary"}>
                  {p.status}
                </Badge>
                {p.ml_verification_pending && (
                  <Badge variant="warning" className="block w-fit">
                    Pendente de Verificação
                  </Badge>
                )}
              </div>
            ),
          },
          {
            key: "listing_status",
            label: "Anúncio ML",
            render: (p) => (
              <Badge variant={p.listing_status === "active" ? "success" : "outline"}>
                {p.listing_status}
              </Badge>
            ),
          },
        ]}
        onEdit={(p) => window.location.href = `/admin/produtos/${p.id}`}
        onDelete={handleDelete}
      />
    </div>
  );
}
