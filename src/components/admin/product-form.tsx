"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminFetch, AdminApiError } from "@/lib/admin/client";
import { cn } from "@/lib/utils";
import {
  getDefaultCompatibilityYears,
  getModelYearRange,
  type ModelCompatibilitySelection,
} from "@/lib/motorcycle-utils";
import type { Product, Brand, Category, MotorcycleModel, ProductImage } from "@/types/database";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { ProductPriceSyncButton } from "@/components/admin/price-sync-controls";
import { MlBrowserValidationDialog } from "@/components/admin/ml-browser-validation-dialog";

interface ProductFormProps {
  product?: Product;
  brands: Brand[];
  categories: Category[];
  motorcycleModels: MotorcycleModel[];
  selectedCompatibilities?: ModelCompatibilitySelection[];
  initialImages?: ProductImage[];
  suggestedInternalCode?: string;
}

function buildInitialCompatibilities(
  motorcycleModels: MotorcycleModel[],
  selected?: ModelCompatibilitySelection[]
): ModelCompatibilitySelection[] {
  if (!selected || selected.length === 0) return [];

  return selected.map((item) => {
    const model = motorcycleModels.find((m) => m.id === item.modelId);
    const years = model ? getModelYearRange(model) : [item.year];
    const year = years.includes(item.year) ? item.year : years[years.length - 1] ?? item.year;
    const yearEnd = years.includes(item.yearEnd) ? item.yearEnd : years[0] ?? item.yearEnd;
    return {
      modelId: item.modelId,
      year: Math.min(year, yearEnd),
      yearEnd: Math.max(year, yearEnd),
    };
  });
}

interface ImageField {
  url: string;
  alt_text: string;
}

function formatApiError(message: string): string {
  if (message.includes("duplicado") || message.includes("duplicate")) {
    if (message.includes("slug")) return "Já existe um produto com este nome/slug.";
    if (message.includes("sku")) return "Já existe um produto com este SKU.";
    if (message.includes("internal_code")) {
      return "Código interno duplicado. Tente salvar novamente.";
    }
    return "Registro duplicado. Verifique nome ou SKU.";
  }
  return message;
}

function buildInitialImages(images?: ProductImage[]): ImageField[] {
  if (!images || images.length === 0) {
    return [{ url: "", alt_text: "" }];
  }
  return [...images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({
      url: img.url,
      alt_text: img.alt_text || "",
    }));
}

export function ProductForm({
  product,
  brands,
  categories,
  motorcycleModels,
  selectedCompatibilities = [],
  initialImages = [],
  suggestedInternalCode,
}: ProductFormProps) {
  const isNewProduct = !product;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: product?.name || "",
    sku: product?.sku || "",
    internal_code: product?.internal_code || suggestedInternalCode || "",
    brand_id: product?.brand_id || "",
    category_id: product?.category_id || "",
    subcategory_id: product?.subcategory_id || "",
    price: product?.price?.toString() || "",
    promotional_price: product?.promotional_price?.toString() || "",
    stock: product?.stock?.toString() || "0",
    weight: product?.weight?.toString() || "",
    dimensions: product?.dimensions || "",
    short_description: product?.short_description || "",
    full_description: product?.full_description || "",
    applications: product?.applications || "",
    compatibilities: product?.compatibilities || "",
    product_references: product?.product_references || "",
    tags: product?.tags?.join(", ") || "",
    seo_keywords: product?.seo_keywords?.join(", ") || "",
    mercado_livre_url: product?.mercado_livre_url || "",
    mercado_livre_id: product?.mercado_livre_id || "",
    ml_source_url: product?.ml_source_url || "",
    price_sync_enabled: product?.price_sync_enabled ?? true,
    listing_status: product?.listing_status || "not_listed",
    status: product?.status || "draft",
    is_featured: product?.is_featured || false,
    is_bestseller: product?.is_bestseller || false,
    is_new: product?.is_new || false,
    is_promotion: product?.is_promotion || false,
    is_launch: product?.is_launch || false,
    is_recommended: product?.is_recommended || false,
  });
  const [modelCompat, setModelCompat] = useState<ModelCompatibilitySelection[]>(
    buildInitialCompatibilities(motorcycleModels, selectedCompatibilities)
  );

  const sortedMotorcycleModels = useMemo(
    () =>
      [...motorcycleModels].sort((a, b) => {
        const brand = a.motorcycle_brand.localeCompare(b.motorcycle_brand);
        if (brand !== 0) return brand;
        return a.model.localeCompare(b.model);
      }),
    [motorcycleModels]
  );
  const [imageFields, setImageFields] = useState<ImageField[]>(
    buildInitialImages(initialImages.length > 0 ? initialImages : product?.images)
  );
  const [mlValidationDialog, setMlValidationDialog] = useState<{
    open: boolean;
    sourceUrl: string;
  } | null>(null);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(
    null
  );

  useEffect(() => {
    if (!isNewProduct || suggestedInternalCode) return;

    fetch("/api/admin/products/internal-code")
      .then((res) => res.json())
      .then((data: { code?: string }) => {
        if (data.code) {
          setForm((prev) =>
            prev.internal_code ? prev : { ...prev, internal_code: data.code as string }
          );
        }
      })
      .catch(() => {});
  }, [isNewProduct, suggestedInternalCode]);

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addImageField() {
    setImageFields((prev) => [...prev, { url: "", alt_text: "" }]);
  }

  function removeImageField(index: number) {
    setImageFields((prev) => {
      if (prev.length === 1) return [{ url: "", alt_text: "" }];
      return prev.filter((_, i) => i !== index);
    });
  }

  function updateImageField(index: number, field: keyof ImageField, value: string) {
    setImageFields((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function moveImageField(index: number, direction: "up" | "down") {
    setImageFields((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  async function submitProduct(
    payload: Record<string, unknown>,
    options?: { skipMlNetworkVerify?: boolean }
  ) {
    const url = product ? `/api/admin/products/${product.id}` : "/api/admin/products";
    await adminFetch(url, {
      method: product ? "PUT" : "POST",
      body: JSON.stringify({
        ...payload,
        skip_ml_network_verify: options?.skipMlNetworkVerify === true,
      }),
    });

    router.push("/admin/produtos");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!form.name.trim()) {
      setError("Informe o nome do produto.");
      setLoading(false);
      return;
    }

    if (!form.sku.trim()) {
      setError("Informe o SKU do produto.");
      setLoading(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      internal_code: isNewProduct ? null : form.internal_code.trim() || null,
      brand_id: form.brand_id || null,
      category_id: form.category_id || null,
      subcategory_id: form.subcategory_id || null,
      price: parseFloat(form.price) || 0,
      promotional_price: form.promotional_price ? parseFloat(form.promotional_price) : null,
      stock: parseInt(form.stock, 10) || 0,
      weight: form.weight ? parseFloat(form.weight) : null,
      dimensions: form.dimensions.trim() || null,
      short_description: form.short_description.trim() || null,
      full_description: form.full_description.trim() || null,
      applications: form.applications.trim() || null,
      compatibilities: form.compatibilities.trim() || null,
      product_references: form.product_references.trim() || null,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      seo_keywords: form.seo_keywords
        ? form.seo_keywords.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      mercado_livre_url: form.mercado_livre_url.trim() || null,
      mercado_livre_id: form.mercado_livre_id.trim() || null,
      ml_source_url: form.ml_source_url.trim() || null,
      price_sync_enabled: form.price_sync_enabled,
      listing_status: form.listing_status,
      status: form.status,
      is_featured: form.is_featured,
      is_bestseller: form.is_bestseller,
      is_new: form.is_new,
      is_promotion: form.is_promotion,
      is_launch: form.is_launch,
      is_recommended: form.is_recommended,
      images: imageFields
        .map((img) => ({
          url: img.url.trim(),
          alt_text: img.alt_text.trim() || form.name.trim(),
        }))
        .filter((img) => img.url.length > 0),
      modelCompat,
    };

    try {
      await submitProduct(payload);
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "ml_blocked") {
        setPendingPayload(payload);
        setMlValidationDialog({
          open: true,
          sourceUrl:
            err.sourceUrl ||
            form.ml_source_url.trim() ||
            form.mercado_livre_url.trim(),
        });
        setError(
          "Mercado Livre exigiu verificação. Conclua o captcha no popup e salve novamente."
        );
      } else {
        const message = err instanceof AdminApiError ? err.message : "Erro ao salvar produto";
        setError(formatApiError(message));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAfterMlValidation() {
    if (!pendingPayload) return;
    setLoading(true);
    setError("");
    try {
      await submitProduct(pendingPayload, { skipMlNetworkVerify: true });
      setMlValidationDialog(null);
      setPendingPayload(null);
    } catch (err) {
      const message = err instanceof AdminApiError ? err.message : "Erro ao salvar produto";
      setError(formatApiError(message));
    } finally {
      setLoading(false);
    }
  }

  const subcategories = categories.flatMap((c) => c.children || []);

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {product?.ml_verification_pending && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <strong>Pendente de Verificação</strong> — este produto foi ocultado do
          site porque o link do Mercado Livre não foi encontrado ou é inválido.
          {product.ml_verification_message && (
            <span className="block mt-1 text-amber-200/80">
              {product.ml_verification_message}
            </span>
          )}
          <span className="block mt-2">
            Corrija o link, salve e use <strong>Verificar</strong> no Catálogo do
            Site para reativar o produto.
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label>SKU *</Label>
            <Input value={form.sku} onChange={(e) => updateField("sku", e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label>Código Interno</Label>
            <Input
              value={form.internal_code}
              onChange={(e) => updateField("internal_code", e.target.value)}
              readOnly={isNewProduct}
              className={cn("mt-1", isNewProduct && "bg-muted/50 cursor-default")}
              placeholder={isNewProduct ? "Gerando..." : undefined}
            />
            {isNewProduct && (
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Gerado automaticamente (6 dígitos) ao salvar o produto.
              </p>
            )}
          </div>
          <div>
            <Label>Marca</Label>
            <Select
              value={form.brand_id || undefined}
              onValueChange={(v) => updateField("brand_id", v)}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select
              value={form.category_id || undefined}
              onValueChange={(v) => updateField("category_id", v)}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subcategoria</Label>
            <Select
              value={form.subcategory_id || undefined}
              onValueChange={(v) => updateField("subcategory_id", v)}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {subcategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="out_of_stock">Sem Estoque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Imagens do Produto</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Cole os links das imagens (URL). Use as setas para ordenar — a primeira será a principal.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addImageField}>
            <ImagePlus className="h-4 w-4" />
            Adicionar imagem
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {imageFields.map((image, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_auto] gap-3 items-end p-4 rounded-lg border bg-muted/20"
            >
              <div className="flex md:flex-col gap-1 items-center md:items-stretch pb-1 md:pb-0">
                <span className="text-xs font-bold text-muted-foreground md:text-center md:mb-1">
                  #{index + 1}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveImageField(index, "up")}
                  disabled={index === 0}
                  title="Mover para cima"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveImageField(index, "down")}
                  disabled={index === imageFields.length - 1}
                  title="Mover para baixo"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <Label>
                  URL da imagem {index + 1}
                  {index === 0 && <span className="text-primary ml-1">(principal)</span>}
                </Label>
                <Input
                  type="url"
                  value={image.url}
                  onChange={(e) => updateImageField(index, "url", e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Texto alternativo (opcional)</Label>
                <Input
                  value={image.alt_text}
                  onChange={(e) => updateImageField(index, "alt_text", e.target.value)}
                  placeholder={form.name || "Descrição da imagem"}
                  className="mt-1"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeImageField(index)}
                className="text-muted-foreground hover:text-destructive"
                title="Remover imagem"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              {image.url && (
                <div className="md:col-span-4 flex items-center gap-3">
                  <div className="h-20 w-20 rounded-md border bg-white p-1 flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.alt_text || form.name || "Prévia"}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  {index === 0 && (
                    <span className="text-xs text-primary font-semibold uppercase tracking-wide">
                      Imagem principal do catálogo
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preço e Estoque</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Preço *</Label>
            <Input type="number" step="0.01" value={form.price} onChange={(e) => updateField("price", e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label>Preço Promocional</Label>
            <Input type="number" step="0.01" value={form.promotional_price} onChange={(e) => updateField("promotional_price", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Estoque</Label>
            <Input type="number" value={form.stock} onChange={(e) => updateField("stock", e.target.value)} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mercado Livre</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>URL de origem (página ML para sync de preço)</Label>
            <Input
              value={form.ml_source_url}
              onChange={(e) => updateField("ml_source_url", e.target.value)}
              placeholder="https://produto.mercadolivre.com.br/MLB-..."
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              URL da página original do anúncio. Usada para sincronizar preços automaticamente.
            </p>
          </div>
          <div className="md:col-span-2">
            <Label>URL do Anúncio (afiliado)</Label>
            <Input value={form.mercado_livre_url} onChange={(e) => updateField("mercado_livre_url", e.target.value)} placeholder="https://meli.la/... ou https://produto.mercadolivre.com.br/..." className="mt-1" />
          </div>
          <div>
            <Label>ID do Anúncio</Label>
            <Input value={form.mercado_livre_id} onChange={(e) => updateField("mercado_livre_id", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Status do Anúncio</Label>
            <Select value={form.listing_status} onValueChange={(v) => updateField("listing_status", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="closed">Encerrado</SelectItem>
                <SelectItem value="not_listed">Não listado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="price_sync_enabled"
              type="checkbox"
              checked={form.price_sync_enabled}
              onChange={(e) => updateField("price_sync_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="price_sync_enabled">Sincronização automática de preço habilitada</Label>
          </div>
          {product && (
            <div className="md:col-span-2">
              <ProductPriceSyncButton
                product={product}
                onSynced={() => router.refresh()}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descrições</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Descrição Curta</Label>
            <textarea
              value={form.short_description}
              onChange={(e) => updateField("short_description", e.target.value)}
              className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
            />
          </div>
          <div>
            <Label>Descrição Completa</Label>
            <textarea
              value={form.full_description}
              onChange={(e) => updateField("full_description", e.target.value)}
              className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[160px]"
            />
          </div>
          <div>
            <Label>Aplicações</Label>
            <textarea value={form.applications} onChange={(e) => updateField("applications", e.target.value)} className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" />
          </div>
          <div>
            <Label>Compatibilidades</Label>
            <textarea value={form.compatibilities} onChange={(e) => updateField("compatibilities", e.target.value)} className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" />
          </div>
          <div>
            <Label>Referências</Label>
            <textarea value={form.product_references} onChange={(e) => updateField("product_references", e.target.value)} className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO e Tags</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Tags (separadas por vírgula)</Label>
            <Input value={form.tags} onChange={(e) => updateField("tags", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Palavras-chave SEO</Label>
            <Input value={form.seo_keywords} onChange={(e) => updateField("seo_keywords", e.target.value)} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modelos de Motos Compatíveis</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Marque o modelo e selecione o ano inicial e final de compatibilidade.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1 scrollbar-hide">
            {sortedMotorcycleModels.map((model) => {
              const selection = modelCompat.find((item) => item.modelId === model.id);
              const isSelected = Boolean(selection);
              const years = getModelYearRange(model);

              return (
                <div
                  key={model.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border transition-colors",
                    isSelected ? "border-primary/40 bg-primary/5" : "border-border/60 hover:bg-muted/30"
                  )}
                >
                  <label className="flex items-center gap-2 text-sm cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const defaults = getDefaultCompatibilityYears(model);
                          setModelCompat((prev) => [
                            ...prev,
                            { modelId: model.id, ...defaults },
                          ]);
                        } else {
                          setModelCompat((prev) =>
                            prev.filter((item) => item.modelId !== model.id)
                          );
                        }
                      }}
                      className="rounded shrink-0"
                    />
                    <span className="truncate">
                      <span className="font-semibold text-foreground">
                        {model.motorcycle_brand}
                      </span>{" "}
                      {model.model}
                      {model.displacement && ` ${model.displacement}`}
                      {model.year_start && (
                        <span className="text-muted-foreground text-xs ml-1">
                          ({model.year_start}
                          {model.year_end && model.year_end >= new Date().getFullYear()
                            ? "+"
                            : model.year_end
                              ? `-${model.year_end}`
                              : ""}
                          )
                        </span>
                      )}
                    </span>
                  </label>
                  {isSelected && (
                    <div className="flex gap-2 sm:gap-3 shrink-0 pl-6 sm:pl-0">
                      <div className="w-24 sm:w-28">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Ano inicial
                        </Label>
                        <Select
                          value={String(selection?.year ?? years[years.length - 1])}
                          onValueChange={(value) => {
                            const newStart = parseInt(value, 10);
                            setModelCompat((prev) =>
                              prev.map((item) => {
                                if (item.modelId !== model.id) return item;
                                const yearEnd =
                                  item.yearEnd < newStart ? newStart : item.yearEnd;
                                return { ...item, year: newStart, yearEnd };
                              })
                            );
                          }}
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((year) => (
                              <SelectItem key={year} value={String(year)}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24 sm:w-28">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Ano final
                        </Label>
                        <Select
                          value={String(selection?.yearEnd ?? years[0])}
                          onValueChange={(value) => {
                            const newEnd = parseInt(value, 10);
                            setModelCompat((prev) =>
                              prev.map((item) => {
                                if (item.modelId !== model.id) return item;
                                const year =
                                  item.year > newEnd ? newEnd : item.year;
                                return { ...item, year, yearEnd: newEnd };
                              })
                            );
                          }}
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {years
                              .filter((year) => year >= (selection?.year ?? years[years.length - 1]))
                              .map((year) => (
                                <SelectItem key={year} value={String(year)}>
                                  {year}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Destaques</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {[
            { key: "is_featured", label: "Destaque" },
            { key: "is_bestseller", label: "Mais Vendido" },
            { key: "is_new", label: "Novo" },
            { key: "is_promotion", label: "Promoção" },
            { key: "is_launch", label: "Lançamento" },
            { key: "is_recommended", label: "Recomendado" },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form[key as keyof typeof form] as boolean}
                onChange={(e) => updateField(key, e.target.checked)}
                className="rounded"
              />
              {label}
            </label>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading} size="lg">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {product ? "Salvar Alterações" : "Criar Produto"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>

    {mlValidationDialog && (
      <MlBrowserValidationDialog
        open={mlValidationDialog.open}
        onOpenChange={(open) => {
          if (!open) setMlValidationDialog(null);
        }}
        sourceUrl={mlValidationDialog.sourceUrl}
        productName={form.name}
        title="Validar link do Mercado Livre"
        description="O Mercado Livre pediu verificação ao salvar. Abra a página, conclua login/captcha e feche a janela — o salvamento continuará automaticamente."
        confirmLabel="Concluí validação — salvar produto"
        showManualPrice={false}
        loading={loading}
        autoContinueOnPopupClose
        onRetrySync={handleSaveAfterMlValidation}
      />
    )}
    </>
  );
}
