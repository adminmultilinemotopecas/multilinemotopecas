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
  getModelYearRange,
  type ModelCompatibilitySelection,
} from "@/lib/motorcycle-utils";
import type { Product, Brand, Category, MotorcycleModel, ProductImage } from "@/types/database";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { ProductPriceSyncButton } from "@/components/admin/price-sync-controls";
import { MlBrowserValidationDialog } from "@/components/admin/ml-browser-validation-dialog";
import { ProductCompatibilitySection } from "@/components/admin/product-compatibility-section";
import { FormattedDescriptionField } from "@/components/admin/formatted-description-field";
import { normalizeProductDescription } from "@/lib/product-description";

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
    status: product?.ml_verification_pending ? "active" : product?.status || "draft",
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
  const [extraMotorcycleModels, setExtraMotorcycleModels] = useState<MotorcycleModel[]>([]);

  const allMotorcycleModels = useMemo(() => {
    const byId = new Map<string, MotorcycleModel>();
    for (const model of [...motorcycleModels, ...extraMotorcycleModels]) {
      byId.set(model.id, model);
    }
    return [...byId.values()];
  }, [motorcycleModels, extraMotorcycleModels]);
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
      short_description: normalizeProductDescription(form.short_description),
      full_description: normalizeProductDescription(form.full_description),
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
            Corrija os dados do produto e clique em <strong>Salvar</strong> para
            reativá-lo no site.
          </span>
        </div>
      )}

      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Cadastro rápido</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Preencha primeiro nome, preço e identificação — o restante pode vir depois.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                  className="mt-1"
                  placeholder="Nome do produto"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>SKU *</Label>
                  <Input
                    value={form.sku}
                    onChange={(e) => updateField("sku", e.target.value)}
                    required
                    className="mt-1"
                  />
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
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="out_of_stock">Sem Estoque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Preço *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => updateField("price", e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Preço Promocional</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.promotional_price}
                    onChange={(e) => updateField("promotional_price", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Estoque</Label>
                  <Input
                    type="number"
                    value={form.stock}
                    onChange={(e) => updateField("stock", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              {isNewProduct && (
                <p className="text-[11px] text-muted-foreground">
                  O código interno é gerado automaticamente (6 dígitos) ao salvar.
                </p>
              )}
              <div className="flex gap-3 pt-2 xl:hidden">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {product ? "Salvar" : "Criar"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Imagens</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  A primeira imagem será a principal do catálogo.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addImageField}>
                <ImagePlus className="h-4 w-4" />
                Adicionar
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
                      URL {index === 0 && <span className="text-primary">(principal)</span>}
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
                    <Label>Alt (opcional)</Label>
                    <Input
                      value={image.alt_text}
                      onChange={(e) => updateImageField(index, "alt_text", e.target.value)}
                      placeholder={form.name || "Descrição"}
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
                      <div className="h-16 w-16 rounded-md border bg-white p-1 flex items-center justify-center shrink-0">
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
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <ProductCompatibilitySection
            motorcycleModels={allMotorcycleModels}
            modelCompat={modelCompat}
            onModelCompatChange={setModelCompat}
            onModelsAdded={(models) =>
              setExtraMotorcycleModels((prev) => {
                const byId = new Map(prev.map((model) => [model.id, model]));
                for (const model of models) byId.set(model.id, model);
                return [...byId.values()];
              })
            }
          />

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Descrições</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormattedDescriptionField
                  id="short_description"
                  label="Descrição curta"
                  value={form.short_description}
                  onChange={(value) => updateField("short_description", value)}
                  minHeightClass="min-h-[72px]"
                  placeholder="Resumo do produto..."
                />
                <FormattedDescriptionField
                  id="full_description"
                  label="Descrição completa"
                  value={form.full_description}
                  onChange={(value) => updateField("full_description", value)}
                  minHeightClass="min-h-[160px]"
                  placeholder="Descrição detalhada do produto..."
                />
                <div>
                  <Label>Aplicações</Label>
                  <textarea
                    value={form.applications}
                    onChange={(e) => updateField("applications", e.target.value)}
                    className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px]"
                  />
                </div>
                <div>
                  <Label>Compatibilidades (texto livre)</Label>
                  <textarea
                    value={form.compatibilities}
                    onChange={(e) => updateField("compatibilities", e.target.value)}
                    className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px]"
                  />
                </div>
                <div>
                  <Label>Referências</Label>
                  <textarea
                    value={form.product_references}
                    onChange={(e) => updateField("product_references", e.target.value)}
                    className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px]"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mercado Livre</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>URL de origem (sync de preço)</Label>
                  <Input
                    value={form.ml_source_url}
                    onChange={(e) => updateField("ml_source_url", e.target.value)}
                    placeholder="https://produto.mercadolivre.com.br/MLB-..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>URL do anúncio (afiliado)</Label>
                  <Input
                    value={form.mercado_livre_url}
                    onChange={(e) => updateField("mercado_livre_url", e.target.value)}
                    placeholder="https://meli.la/..."
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>ID do anúncio</Label>
                    <Input
                      value={form.mercado_livre_id}
                      onChange={(e) => updateField("mercado_livre_id", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Status do anúncio</Label>
                    <Select
                      value={form.listing_status}
                      onValueChange={(v) => updateField("listing_status", v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="paused">Pausado</SelectItem>
                        <SelectItem value="closed">Encerrado</SelectItem>
                        <SelectItem value="not_listed">Não listado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    id="price_sync_enabled"
                    type="checkbox"
                    checked={form.price_sync_enabled}
                    onChange={(e) => updateField("price_sync_enabled", e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Sincronização automática de preço
                </label>
                {product && (
                  <ProductPriceSyncButton
                    product={product}
                    onSynced={() => router.refresh()}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-4">
          <Card>
            <CardHeader>
              <CardTitle>Classificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Marca do produto</Label>
                <Select
                  value={form.brand_id || undefined}
                  onValueChange={(v) => updateField("brand_id", v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select
                  value={form.category_id || undefined}
                  onValueChange={(v) => updateField("category_id", v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subcategoria</Label>
                <Select
                  value={form.subcategory_id || undefined}
                  onValueChange={(v) => updateField("subcategory_id", v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Destaques</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {[
                { key: "is_featured", label: "Destaque" },
                { key: "is_bestseller", label: "Mais vendido" },
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

          <Card>
            <CardHeader>
              <CardTitle>SEO e tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tags</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => updateField("tags", e.target.value)}
                  placeholder="Separadas por vírgula"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Palavras-chave SEO</Label>
                <Input
                  value={form.seo_keywords}
                  onChange={(e) => updateField("seo_keywords", e.target.value)}
                  placeholder="Separadas por vírgula"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {product ? "Salvar alterações" : "Criar produto"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full">
              Cancelar
            </Button>
          </div>
        </aside>
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
        autoStartOnOpen
        onRetrySync={handleSaveAfterMlValidation}
      />
    )}
    </>
  );
}
