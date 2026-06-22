import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Star, Shield, Truck, RefreshCw } from "lucide-react";
import { MercadoLivreButton } from "@/components/products/mercado-livre-button";
import { ProductGrid } from "@/components/products/product-grid";
import { ShareButtons } from "@/components/products/share-buttons";
import { ProductGallery } from "@/components/products/product-gallery";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries/products";
import { generateProductMetadata, generateProductJsonLd, generateBreadcrumbJsonLd } from "@/lib/seo";
import { formatPrice, getDisplayPrice, calculateDiscount } from "@/lib/utils";
import { SITE_CONFIG } from "@/lib/constants";
import { ProductDescriptionContent } from "@/components/products/product-description-content";
import { ProductViewTracker } from "@/components/products/product-view-tracker";
import { stripProductDescriptionMarkup } from "@/lib/product-description";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  return generateProductMetadata(product);
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const relatedProducts = await getRelatedProducts(product.id, product.category_id, product.brand_id);
  const { current, original, hasDiscount } = getDisplayPrice(product.price, product.promotional_price);

  const breadcrumbs = [
    { name: "Início", url: SITE_CONFIG.url },
    { name: "Produtos", url: `${SITE_CONFIG.url}/produtos` },
    ...(product.category ? [{ name: product.category.name, url: `${SITE_CONFIG.url}/categorias/${product.category.slug}` }] : []),
    { name: product.name, url: `${SITE_CONFIG.url}/produtos/${product.slug}` },
  ];

  const avgRating = product.reviews?.length
    ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
    : 0;

  return (
    <>
      <JsonLd data={generateProductJsonLd(product)} />
      <JsonLd data={generateBreadcrumbJsonLd(breadcrumbs)} />
      <ProductViewTracker productId={product.id} productName={product.name} />

      <div className="container mx-auto px-4 py-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link href="/" className="hover:text-foreground">Início</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/produtos" className="hover:text-foreground">Produtos</Link>
          {product.category && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link href={`/categorias/${product.category.slug}`} className="hover:text-foreground">{product.category.name}</Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <ProductGallery images={product.images || []} productName={product.name} />
          <div className="flex flex-col">
            {product.brand && (
              <Link href={`/marcas/${product.brand.slug}`} className="text-sm text-primary font-medium uppercase tracking-wide mb-2 hover:underline">
                {product.brand.name}
              </Link>
            )}
            <h1 className="text-2xl md:text-3xl font-bold mb-3">{product.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-muted-foreground">
              <span>SKU: {product.sku}</span>
              {product.internal_code && <span>Código: {product.internal_code}</span>}
              {avgRating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {avgRating.toFixed(1)} ({product.reviews?.length} avaliações)
                </span>
              )}
            </div>
            {product.short_description && (
              <ProductDescriptionContent
                content={product.short_description}
                className="mb-6 text-base"
              />
            )}

            <div className="rounded-2xl border border-border/60 bg-card p-6 mb-6 ring-1 ring-primary/10">
              <div className="mb-4">
                {hasDiscount && original && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg text-muted-foreground line-through">{formatPrice(original)}</span>
                    <Badge variant="promo">-{calculateDiscount(original, current)}%</Badge>
                  </div>
                )}
                <p className="text-3xl md:text-4xl font-bold text-primary">{formatPrice(current)}</p>
              </div>
              {product.mercado_livre_url ? (
                <MercadoLivreButton url={product.mercado_livre_url} productId={product.id} productName={product.name} price={current} size="xl" className="w-full" />
              ) : (
                <p className="text-sm text-muted-foreground text-center">Anúncio temporariamente indisponível</p>
              )}
              <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs text-muted-foreground">
                <div className="flex flex-col items-center gap-1"><Shield className="h-4 w-4 text-primary" />Compra Segura</div>
                <div className="flex flex-col items-center gap-1"><Truck className="h-4 w-4 text-primary" />Envio Nacional</div>
                <div className="flex flex-col items-center gap-1"><RefreshCw className="h-4 w-4 text-primary" />Troca Fácil</div>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium mb-2">Compartilhar</p>
              <ShareButtons
                productId={product.id}
                productName={product.name}
                slug={product.slug}
                description={
                  stripProductDescriptionMarkup(product.short_description || product.name)
                }
              />
            </div>
          </div>
        </div>

        <Separator className="my-10" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {product.full_description && (
              <section>
                <h2 className="text-xl font-bold mb-4">Descrição</h2>
                <ProductDescriptionContent content={product.full_description} />
              </section>
            )}
            {product.technical_specs && product.technical_specs.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">Características Técnicas</h2>
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {product.technical_specs.map((spec, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                          <td className="px-4 py-3 font-medium w-1/3">{spec.label}</td>
                          <td className="px-4 py-3 text-muted-foreground">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {product.applications && (
              <section><h2 className="text-xl font-bold mb-4">Aplicações</h2><p className="text-muted-foreground whitespace-pre-line">{product.applications}</p></section>
            )}
            {product.compatibilities && (
              <section><h2 className="text-xl font-bold mb-4">Compatibilidades</h2><p className="text-muted-foreground whitespace-pre-line">{product.compatibilities}</p></section>
            )}
            {product.motorcycle_models && product.motorcycle_models.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">Modelos Compatíveis</h2>
                <div className="flex flex-wrap gap-2">
                  {product.motorcycle_models.map((model) => (
                    <Badge
                      key={`${model.id}-${model.compatibility_year ?? "all"}-${model.compatibility_year_end ?? ""}`}
                      variant="secondary"
                    >
                      {model.motorcycle_brand} {model.model}
                      {model.displacement && ` ${model.displacement}`}
                      {model.compatibility_year && model.compatibility_year_end
                        ? model.compatibility_year === model.compatibility_year_end
                          ? ` (${model.compatibility_year})`
                          : ` (${model.compatibility_year}-${model.compatibility_year_end})`
                        : model.year_start &&
                          ` (${model.year_start}${model.year_end ? `-${model.year_end}` : "+"})`}
                    </Badge>
                  ))}
                </div>
              </section>
            )}
            {product.product_references && (
              <section><h2 className="text-xl font-bold mb-4">Referências</h2><p className="text-muted-foreground whitespace-pre-line">{product.product_references}</p></section>
            )}
          </div>
          <aside>
            {product.reviews && product.reviews.length > 0 && (
              <section className="rounded-xl border p-6">
                <h2 className="text-lg font-bold mb-4">Avaliações</h2>
                <div className="space-y-4">
                  {product.reviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{review.author_name}</span>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Produtos Relacionados</h2>
            <ProductGrid products={relatedProducts} columns={4} />
          </section>
        )}
      </div>
    </>
  );
}
