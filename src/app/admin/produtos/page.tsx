"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/admin/data-table";
import {
  ProductPriceSyncButton,
  SyncAllPricesPanel,
} from "@/components/admin/price-sync-controls";
import { ProductInlinePriceEditor } from "@/components/admin/product-inline-price-editor";
import { PriceSyncStatusDisplay } from "@/components/admin/price-sync-status";
import { adminFetch } from "@/lib/admin/client";
import type { Product, ProductStatus, ListingStatus } from "@/types/database";

const PAGE_SIZE = 15;

function getPrimaryImageUrl(product: Product): string | null {
  const images = product.images ?? [];
  const primary = images.find((img) => img.is_primary) ?? images[0];
  return primary?.url ?? null;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");
  const [listingFilter, setListingFilter] = useState<ListingStatus | "all">("all");
  const [mlPendingOnly, setMlPendingOnly] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, listingFilter, mlPendingOnly]);

  async function loadProducts() {
    try {
      const data = await adminFetch<Product[]>("/api/admin/products");
      setProducts(data);
    } finally {
      setLoading(false);
    }
  }

  async function handlePriceSaved(
    productId: string,
    updated: Pick<Product, "price" | "promotional_price" | "is_promotion">
  ) {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId ? { ...product, ...updated } : product
      )
    );
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Excluir "${product.name}"?`)) return;
    await adminFetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    loadProducts();
  }

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      if (statusFilter !== "all" && product.status !== statusFilter) return false;
      if (listingFilter !== "all" && product.listing_status !== listingFilter) {
        return false;
      }
      if (mlPendingOnly && !product.ml_verification_pending) return false;

      if (!query) return true;

      const haystack = [
        product.name,
        product.sku,
        product.internal_code,
        product.brand?.name,
        product.mercado_livre_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [products, search, statusFilter, listingFilter, mlPendingOnly]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, page]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    listingFilter !== "all" ||
    mlPendingOnly;

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setListingFilter("all");
    setMlPendingOnly(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredProducts.length} de {products.length} produto(s)
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/produtos/novo">
            <Plus className="h-4 w-4" />
            Novo Produto
          </Link>
        </Button>
      </div>

      <SyncAllPricesPanel onComplete={loadProducts} />

      <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-[240px] max-w-xl">
            <Label htmlFor="product-search">Pesquisar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="product-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, SKU, código interno, marca ou ID ML..."
                className="pl-9"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" />
              Limpar filtros
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as ProductStatus | "all")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="out_of_stock">Sem estoque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Anúncio ML</Label>
            <Select
              value={listingFilter}
              onValueChange={(value) => setListingFilter(value as ListingStatus | "all")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="closed">Encerrado</SelectItem>
                <SelectItem value="not_listed">Não listado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 flex flex-col justify-end">
            <label className="flex items-center gap-2 h-10 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={mlPendingOnly}
                onChange={(e) => setMlPendingOnly(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Somente pendentes de verificação ML
            </label>
          </div>
        </div>
      </div>

      <DataTable
        data={paginatedProducts}
        minWidth="1400px"
        emptyMessage={
          hasActiveFilters
            ? "Nenhum produto encontrado com os filtros aplicados."
            : "Nenhum produto cadastrado."
        }
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          totalItems: filteredProducts.length,
          onPageChange: setPage,
        }}
        columns={[
          {
            key: "image",
            label: "Foto",
            headerClassName: "w-20",
            className: "w-20",
            render: (p) => {
              const imageUrl = getPrimaryImageUrl(p);
              return (
                <div className="relative h-14 w-14 rounded-lg overflow-hidden border bg-muted shrink-0">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={p.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground text-center px-1">
                      Sem foto
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            key: "name",
            label: "Nome",
            className: "min-w-[220px] max-w-[320px]",
            render: (p) => (
              <div className="space-y-1">
                <p className="font-medium leading-snug line-clamp-2">{p.name}</p>
                {p.internal_code && (
                  <p className="text-xs text-muted-foreground">Cód. {p.internal_code}</p>
                )}
              </div>
            ),
          },
          {
            key: "sku",
            label: "SKU",
            className: "whitespace-nowrap",
            render: (p) => p.sku,
          },
          {
            key: "brand",
            label: "Marca",
            className: "whitespace-nowrap min-w-[100px]",
            render: (p) => p.brand?.name || "-",
          },
          {
            key: "prices",
            label: "Preços",
            className: "min-w-[180px]",
            render: (p) => (
              <ProductInlinePriceEditor
                productId={p.id}
                price={p.price}
                promotionalPrice={p.promotional_price}
                onSaved={(updated) => handlePriceSaved(p.id, updated)}
              />
            ),
          },
          {
            key: "price_sync",
            label: "Sync ML",
            className: "min-w-[140px]",
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
            className: "min-w-[160px]",
            render: (p) => (
              <ProductPriceSyncButton product={p} onSynced={loadProducts} />
            ),
          },
          {
            key: "status",
            label: "Status",
            className: "min-w-[120px]",
            render: (p) => (
              <div className="space-y-1">
                <Badge variant={p.status === "active" ? "success" : "secondary"}>
                  {p.status}
                </Badge>
                {p.ml_verification_pending && (
                  <Badge variant="warning" className="block w-fit">
                    Pendente ML
                  </Badge>
                )}
              </div>
            ),
          },
          {
            key: "listing_status",
            label: "Anúncio ML",
            className: "whitespace-nowrap",
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
