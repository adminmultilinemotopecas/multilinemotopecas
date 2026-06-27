import { notFound } from "next/navigation";
import { RemoteImage } from "@/components/ui/remote-image";
import { Suspense } from "react";
import { ProductGrid } from "@/components/products/product-grid";
import { SearchBar } from "@/components/search/search-bar";
import { Pagination } from "@/components/catalog/pagination";
import { CatalogSort } from "@/components/catalog/catalog-sort";
import { JsonLd } from "@/components/seo/json-ld";
import { getBrandBySlug } from "@/lib/queries/catalog";
import { getProducts } from "@/lib/queries/products";
import { generateBrandMetadata, generateBreadcrumbJsonLd, hasPaginatedListingFilters, robotsNoIndexFollow } from "@/lib/seo";
import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/constants";
import type { ProductSort } from "@/types/database";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}

export const revalidate = 3600;

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const brand = await getBrandBySlug(slug);
  if (!brand) return { title: "Marca não encontrada" };

  const base = generateBrandMetadata(brand);
  if (hasPaginatedListingFilters(sp)) {
    return { ...base, robots: robotsNoIndexFollow };
  }
  return base;
}

export default async function BrandPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const page = parseInt(sp.page || "1", 10);
  const sort = (sp.sort || "newest") as ProductSort;
  const { products, total, totalPages } = await getProducts({
    filters: { brand_id: brand.id },
    sort,
    page,
  });

  const breadcrumbs = [
    { name: "Início", url: SITE_CONFIG.url },
    { name: "Marcas", url: `${SITE_CONFIG.url}/marcas` },
    { name: brand.name, url: `${SITE_CONFIG.url}/marcas/${brand.slug}` },
  ];

  return (
    <>
      <JsonLd data={generateBreadcrumbJsonLd(breadcrumbs)} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          {brand.logo_url && (
            <div className="relative h-16 w-24">
              <RemoteImage src={brand.logo_url} alt={brand.name} fill className="object-contain" />
            </div>
          )}
          <div>
            <h1 className="section-title">Peças <span className="section-title-accent">{brand.name}</span></h1>
            {brand.description && <p className="text-muted-foreground mt-1">{brand.description}</p>}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{total} produtos</p>
        <div className="max-w-xl mb-6"><SearchBar placeholder={`Buscar peças ${brand.name}...`} /></div>
        <div className="flex justify-end mb-6"><Suspense><CatalogSort /></Suspense></div>
        <ProductGrid products={products} />
        <Pagination currentPage={page} totalPages={totalPages} />
      </div>
    </>
  );
}
