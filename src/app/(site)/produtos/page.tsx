import { Suspense } from "react";
import { ProductGrid } from "@/components/products/product-grid";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { CatalogSort } from "@/components/catalog/catalog-sort";
import { Pagination } from "@/components/catalog/pagination";
import { SearchBar } from "@/components/search/search-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { getProducts } from "@/lib/queries/products";
import { getBrands, getCategories, getMotorcycleModels } from "@/lib/queries/catalog";
import type { ProductFilters, ProductSort } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catálogo de Motopeças",
  description:
    "Explore nosso catálogo completo de peças para motocicletas. Filtre por marca, categoria, modelo e compre no Mercado Livre.",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    brand?: string;
    category?: string;
    subcategory?: string;
    moto?: string;
    ano?: string;
    min_price?: string;
    max_price?: string;
    featured?: string;
    q?: string;
  }>;
}

export const revalidate = 1800;

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const sort = (params.sort || "newest") as ProductSort;

  const filters: ProductFilters = {
    brand_id: params.brand,
    category_id: params.category,
    subcategory_id: params.subcategory,
    motorcycle_model_id: params.moto,
    min_price: params.min_price ? parseFloat(params.min_price) : undefined,
    max_price: params.max_price ? parseFloat(params.max_price) : undefined,
    is_promotion: params.featured === "promotion" ? true : undefined,
  };

  const [productsResult, brands, categories, motorcycleModels] = await Promise.all([
    getProducts({ filters, sort, page, featured: params.featured }),
    getBrands(),
    getCategories(),
    getMotorcycleModels(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="section-title mb-2">
          Catálogo de <span className="section-title-accent">Motopeças</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          {productsResult.total} produtos encontrados
          {params.moto && params.ano && (
            <span className="text-primary"> · Moto {params.ano}</span>
          )}
        </p>
      </div>
      <div className="mb-6 max-w-xl">
        <SearchBar placeholder="Refinar busca no catálogo..." />
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-64 shrink-0">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <CatalogFilters brands={brands} categories={categories} motorcycleModels={motorcycleModels} />
          </Suspense>
        </aside>
        <div className="flex-1">
          <div className="flex justify-end mb-6">
            <Suspense fallback={<Skeleton className="h-10 w-44" />}>
              <CatalogSort />
            </Suspense>
          </div>
          <ProductGrid products={productsResult.products} />
          <Pagination currentPage={page} totalPages={productsResult.totalPages} />
        </div>
      </div>
    </div>
  );
}
