"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import {
  ProductPriceSyncButton,
  SyncAllPricesPanel,
} from "@/components/admin/price-sync-controls";
import { PriceSyncStatusDisplay } from "@/components/admin/price-sync-status";
import { adminFetch } from "@/lib/admin/client";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/database";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const data = await adminFetch<Product[]>("/api/admin/products");
      setProducts(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Excluir "${product.name}"?`)) return;
    await adminFetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
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

      <div className="mb-6">
        <SyncAllPricesPanel onComplete={loadProducts} />
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
              p.promotional_price != null ? formatPrice(p.promotional_price) : "-",
          },
          {
            key: "price_sync",
            label: "Sync ML",
            render: (p) => (
              <PriceSyncStatusDisplay
                mlSourceUrl={p.ml_source_url}
                mercadoLivreUrl={p.mercado_livre_url}
                lastPriceSyncAt={p.last_price_sync_at}
                lastPriceSyncStatus={p.last_price_sync_status}
                lastPriceSyncError={p.last_price_sync_error}
                lastSyncedPrice={p.last_synced_price}
                priceSyncEnabled={p.price_sync_enabled}
                compact
              />
            ),
          },
          {
            key: "sync_action",
            label: "Sincronizar",
            render: (p) => (
              <ProductPriceSyncButton product={p} onSynced={loadProducts} />
            ),
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
        onEdit={(p) => {
          window.location.href = `/admin/produtos/${p.id}`;
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
