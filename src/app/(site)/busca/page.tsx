import { Suspense } from "react";
import { ProductGrid } from "@/components/products/product-grid";
import { SearchBar } from "@/components/search/search-bar";
import { Pagination } from "@/components/catalog/pagination";
import { searchProducts } from "@/lib/queries/products";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import { robotsNoIndexFollow } from "@/lib/seo";
import type { Metadata } from "next";

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q || "";
  return {
    title: query ? `Busca: ${query}` : "Busca de Motopeças",
    description: query
      ? `Resultados da busca por "${query}" em nosso catálogo de motopeças.`
      : "Busque peças por modelo, marca, SKU ou código.",
    robots: robotsNoIndexFollow,
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const page = parseInt(params.page || "1", 10);
  const offset = (page - 1) * PRODUCTS_PER_PAGE;
  const results = query ? await searchProducts(query, PRODUCTS_PER_PAGE, offset) : [];
  const totalPages = Math.ceil(results.length / PRODUCTS_PER_PAGE) || 1;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="section-title mb-2">
        Busca de <span className="section-title-accent">Motopeças</span>
      </h1>
      <div className="max-w-2xl mb-8">
        <Suspense><SearchBar variant="hero" autoFocus /></Suspense>
      </div>
      {query ? (
        <>
          <p className="text-muted-foreground mb-6">
            {results.length > 0 ? `${results.length} resultado(s) para "${query}"` : `Nenhum resultado para "${query}"`}
          </p>
          <ProductGrid products={results} />
          <Pagination currentPage={page} totalPages={totalPages} />
        </>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Digite o que você procura na barra de busca acima</p>
          <p className="text-sm mt-2">Exemplos: &quot;pastilha titan&quot;, &quot;160&quot;, &quot;ngk&quot;, &quot;cr7hsa&quot;</p>
        </div>
      )}
    </div>
  );
}
