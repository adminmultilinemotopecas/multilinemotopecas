"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Link2,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminFetch } from "@/lib/admin/client";
import { formatPrice } from "@/lib/utils";
import {
  getVerificationBadgeVariant,
  getVerificationLabel,
  type MlVerificationResult,
  type MlVerificationStatus,
} from "@/lib/mercado-livre-verify";
import type { Product, ProductImage } from "@/types/database";

const PAGE_SIZE = 15;

type CatalogProduct = Pick<
  Product,
  | "id"
  | "name"
  | "slug"
  | "sku"
  | "internal_code"
  | "price"
  | "promotional_price"
  | "status"
  | "listing_status"
  | "mercado_livre_url"
  | "mercado_livre_id"
  | "ml_verification_pending"
  | "ml_verification_message"
  | "ml_verified_at"
  | "brand"
  | "category"
  | "images"
>;

type VerificationMap = Record<string, MlVerificationResult>;

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  draft: "Rascunho",
  out_of_stock: "Sem estoque",
};

const LISTING_LABELS: Record<string, string> = {
  active: "Ativo",
  paused: "Pausado",
  closed: "Encerrado",
  not_listed: "Não listado",
};

function truncateUrl(url: string, max = 40) {
  if (url.length <= max) return url;
  return `${url.slice(0, max)}…`;
}

function formatCheckedAt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function getPrimaryImageUrl(images?: ProductImage[]): string | null {
  if (!images?.length) return null;
  const primary = images.find((img) => img.is_primary) ?? images[0];
  return primary?.url ?? null;
}

export default function AdminCatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState<VerificationMap>({});
  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(new Set());
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState({ done: 0, total: 0 });
  const [filter, setFilter] = useState<
    "all" | "site" | "with_link" | "issues" | "pending"
  >("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadProducts = useCallback(async () => {
    const data = await adminFetch<CatalogProduct[]>("/api/admin/catalog");
    setProducts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      if (filter === "site") {
        if (product.status !== "active") return false;
      } else if (filter === "with_link") {
        if (!product.mercado_livre_url) return false;
      } else if (filter === "issues") {
        const v = verifications[product.id];
        const hasIssue =
          product.ml_verification_pending ||
          (v &&
            ["inactive", "not_found", "invalid_url", "error"].includes(
              v.status
            ));
        if (!hasIssue) return false;
      } else if (filter === "pending") {
        if (!product.ml_verification_pending) return false;
      }

      if (!query) return true;

      const haystack = [
        product.name,
        product.sku,
        product.internal_code,
        product.brand?.name,
        product.category?.name,
        product.mercado_livre_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [products, filter, verifications, search]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, page]);

  const stats = useMemo(() => {
    const onSite = products.filter((p) => p.status === "active");
    const withLink = onSite.filter((p) => p.mercado_livre_url);
    const verified = Object.values(verifications);
    const activeLinks = verified.filter((v) => v.status === "active").length;
    const problemLinks = verified.filter((v) =>
      ["inactive", "not_found", "invalid_url", "error"].includes(v.status)
    ).length;

    const pending = products.filter((p) => p.ml_verification_pending).length;

    return {
      onSite: onSite.length,
      withLink: withLink.length,
      activeLinks,
      problemLinks,
      pending,
    };
  }, [products, verifications]);

  async function verifyProduct(productId: string): Promise<void> {
    setVerifyingIds((prev) => new Set(prev).add(productId));

    try {
      const response = await fetch("/api/admin/verify-ml-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setVerifications((prev) => ({
          ...prev,
          [productId]: {
            status: "error",
            message: data.error || "Erro ao verificar",
            checkedAt: new Date().toISOString(),
          },
        }));
        return;
      }

      setVerifications((prev) => ({
        ...prev,
        [productId]: {
          status: data.status as MlVerificationStatus,
          message: data.message,
          itemId: data.itemId,
          pageTitle: data.pageTitle,
          nameMatch: data.nameMatch,
          matchScore: data.matchScore,
          checkedAt: data.checkedAt,
        },
      }));

      setProducts((prev) =>
        prev.map((product) => {
          if (product.id !== productId) return product;

          if (data.productDeactivated) {
            return {
              ...product,
              status: "inactive",
              ml_verification_pending: true,
              ml_verification_message: data.message,
              ml_verified_at: data.checkedAt,
            };
          }

          if (data.productReactivated) {
            return {
              ...product,
              status: "active",
              ml_verification_pending: false,
              ml_verification_message: data.message,
              ml_verified_at: data.checkedAt,
            };
          }

          return {
            ...product,
            ml_verification_message: data.message,
            ml_verified_at: data.checkedAt,
          };
        })
      );
    } catch {
      setVerifications((prev) => ({
        ...prev,
        [productId]: {
          status: "error",
          message: "Falha na requisição",
          checkedAt: new Date().toISOString(),
        },
      }));
    } finally {
      setVerifyingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }

  function verifyProductInBackground(productId: string) {
    void verifyProduct(productId);
  }

  async function verifyAllInBackground() {
    const toVerify = filteredProducts.filter((p) => p.mercado_livre_url);
    if (toVerify.length === 0) return;

    setVerifyingAll(true);
    setVerifyProgress({ done: 0, total: toVerify.length });

    let done = 0;
    const queue = [...toVerify];
    const concurrency = 2;

    async function worker() {
      while (queue.length > 0) {
        const product = queue.shift();
        if (!product) break;

        await verifyProduct(product.id);
        done += 1;
        setVerifyProgress({ done, total: toVerify.length });

        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(concurrency, toVerify.length) }, worker)
    );

    setVerifyingAll(false);
  }

  function startVerifyAll() {
    void verifyAllInBackground();
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Catálogo do Site</h1>
          <p className="text-muted-foreground mt-1">
            Verificação por scraping HTML — suporta meli.la e links curtos do Mercado Livre
          </p>
        </div>
        <Button
          onClick={startVerifyAll}
          disabled={verifyingAll || filteredProducts.every((p) => !p.mercado_livre_url)}
        >
          {verifyingAll ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          Verificar todos
          {verifyingAll && (
            <span className="text-xs opacity-80">
              ({verifyProgress.done}/{verifyProgress.total})
            </span>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">No site</p>
          <p className="text-2xl font-bold">{stats.onSite}</p>
        </div>
        <div className="border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Com link ML</p>
          <p className="text-2xl font-bold">{stats.withLink}</p>
        </div>
        <div className="border rounded-xl p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            Links ativos
          </p>
          <p className="text-2xl font-bold text-green-500">{stats.activeLinks}</p>
        </div>
        <div className="border rounded-xl p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Pendente de Verificação
          </p>
          <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
        </div>
      </div>

      {stats.pending > 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <strong>{stats.pending} produto(s)</strong> com alerta{" "}
          <strong>Pendente de Verificação</strong> — foram ocultados do site até
          o link do Mercado Livre ser corrigido e verificado com sucesso.
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {(
          [
            ["site", "No site"],
            ["all", "Todos"],
            ["with_link", "Com link ML"],
            ["issues", "Com problema"],
            ["pending", "Pendente de Verificação"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            variant={filter === value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border bg-muted/20 p-4 mb-6 space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1 flex-1 min-w-[240px] max-w-xl">
            <Label htmlFor="catalog-search">Pesquisar produtos</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="catalog-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, SKU, marca, categoria ou ID ML..."
                className="pl-9"
              />
            </div>
          </div>
          {search.trim().length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setSearch("")}>
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredProducts.length} produto(s) encontrado(s)
        </p>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl">
          Nenhum produto encontrado para este filtro
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-background">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: "1300px" }}>
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium w-20">Foto</th>
                  <th className="px-4 py-3 text-left font-medium min-w-[220px]">Produto</th>
                  <th className="px-4 py-3 text-left font-medium">SKU</th>
                  <th className="px-4 py-3 text-left font-medium">Marca</th>
                  <th className="px-4 py-3 text-left font-medium">Preço</th>
                  <th className="px-4 py-3 text-left font-medium">Preço Promocional</th>
                  <th className="px-4 py-3 text-left font-medium">Status site</th>
                  <th className="px-4 py-3 text-left font-medium">Link ML</th>
                  <th className="px-4 py-3 text-left font-medium min-w-[140px]">Verificação</th>
                  <th className="px-4 py-3 text-right font-medium w-40 sticky right-0 bg-muted/50">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product) => {
                  const verification = verifications[product.id];
                  const isVerifying = verifyingIds.has(product.id);
                  const imageUrl = getPrimaryImageUrl(product.images);

                  return (
                    <tr key={product.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 align-middle">
                        <div className="relative h-14 w-14 rounded-lg overflow-hidden border bg-muted shrink-0">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={product.name}
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
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="font-medium">{product.name}</div>
                        {product.ml_verification_pending && (
                          <Badge variant="warning" className="mt-1">
                            Pendente de Verificação
                          </Badge>
                        )}
                        {product.internal_code && (
                          <div className="text-xs text-muted-foreground">
                            Cód. {product.internal_code}
                          </div>
                        )}
                        {product.category?.name && (
                          <div className="text-xs text-muted-foreground">
                            {product.category.name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground align-middle">
                        {product.sku}
                      </td>
                      <td className="px-4 py-3 align-middle">{product.brand?.name || "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap align-middle">
                        {formatPrice(product.price)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap align-middle">
                        {product.promotional_price != null
                          ? formatPrice(product.promotional_price)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <Badge
                          variant={
                            product.status === "active" ? "success" : "secondary"
                          }
                        >
                          {STATUS_LABELS[product.status] || product.status}
                        </Badge>
                        {product.ml_verification_pending && (
                          <div className="mt-1">
                            <Badge variant="warning" className="text-[10px]">
                              Oculto do site
                            </Badge>
                          </div>
                        )}
                        <div className="mt-1">
                          <Badge
                            variant={
                              product.listing_status === "active"
                                ? "success"
                                : "outline"
                            }
                            className="text-[10px]"
                          >
                            ML: {LISTING_LABELS[product.listing_status] || product.listing_status}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[180px] align-middle">
                        {product.mercado_livre_url ? (
                          <a
                            href={product.mercado_livre_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline break-all"
                            title={product.mercado_livre_url}
                          >
                            <Link2 className="h-3.5 w-3.5 shrink-0" />
                            {truncateUrl(product.mercado_livre_url)}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Sem link</span>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[140px] align-middle">
                        {verification ? (
                          <div className="space-y-1">
                            <Badge
                              variant={getVerificationBadgeVariant(
                                verification.status
                              )}
                            >
                              {getVerificationLabel(verification.status)}
                            </Badge>
                            <p
                              className="text-xs text-muted-foreground"
                              title={verification.message}
                            >
                              {verification.message}
                            </p>
                            {verification.pageTitle && (
                              <p
                                className="text-[10px] text-muted-foreground line-clamp-2"
                                title={verification.pageTitle}
                              >
                                ML: {verification.pageTitle}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                              {formatCheckedAt(verification.checkedAt)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Não verificado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle sticky right-0 bg-background">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => verifyProductInBackground(product.id)}
                            disabled={isVerifying || !product.mercado_livre_url}
                            title={
                              product.mercado_livre_url
                                ? "Abrir link e verificar nome na página (em segundo plano)"
                                : "Produto sem link do Mercado Livre"
                            }
                          >
                            {isVerifying ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            Verificar
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link
                              href={`/produtos/${product.slug}`}
                              target="_blank"
                              title="Ver no site"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link
                              href={`/admin/produtos/${product.id}`}
                              title="Editar produto"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredProducts.length > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 bg-muted/20">
              <p className="text-sm text-muted-foreground">
                Exibindo {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filteredProducts.length)} de{" "}
                {filteredProducts.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Página {page} de {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
