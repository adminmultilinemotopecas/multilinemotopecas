import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductGrid } from "@/components/products/product-grid";
import { SearchBar } from "@/components/search/search-bar";
import { Pagination } from "@/components/catalog/pagination";
import { CatalogSort } from "@/components/catalog/catalog-sort";
import { JsonLd } from "@/components/seo/json-ld";
import { getCategoryBySlug } from "@/lib/queries/catalog";
import { getProducts } from "@/lib/queries/products";
import { generateCategoryMetadata, generateBreadcrumbJsonLd } from "@/lib/seo";
import { SITE_CONFIG } from "@/lib/constants";
import type { ProductSort } from "@/types/database";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Categoria não encontrada" };
  return generateCategoryMetadata(category);
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const page = parseInt(sp.page || "1", 10);
  const sort = (sp.sort || "newest") as ProductSort;
  const { products, total, totalPages } = await getProducts({
    filters: { category_id: category.id },
    sort,
    page,
  });

  const breadcrumbs = [
    { name: "Início", url: SITE_CONFIG.url },
    { name: "Categorias", url: `${SITE_CONFIG.url}/categorias` },
    { name: category.name, url: `${SITE_CONFIG.url}/categorias/${category.slug}` },
  ];

  return (
    <>
      <JsonLd data={generateBreadcrumbJsonLd(breadcrumbs)} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="section-title mb-2">{category.name}</h1>
        {category.description && <p className="text-muted-foreground mb-4">{category.description}</p>}
        <p className="text-sm text-muted-foreground mb-6">{total} produtos</p>
        <div className="max-w-xl mb-6"><SearchBar placeholder={`Buscar em ${category.name}...`} /></div>
        <div className="flex justify-end mb-6"><Suspense><CatalogSort /></Suspense></div>
        <ProductGrid products={products} />
        <Pagination currentPage={page} totalPages={totalPages} />
      </div>
    </>
  );
}
