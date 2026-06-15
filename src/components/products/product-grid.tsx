import { ProductCard } from "@/components/products/product-card";
import type { Product, SearchResult } from "@/types/database";
import { cn } from "@/lib/utils";

interface ProductGridProps {
  products: (Product | SearchResult)[];
  className?: string;
  columns?: 2 | 3 | 4 | 5;
}

export function ProductGrid({ products, className, columns = 4 }: ProductGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          Nenhum produto encontrado
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Tente ajustar os filtros ou fazer uma nova busca
        </p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 md:gap-6", gridCols[columns], className)}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < 4}
        />
      ))}
    </div>
  );
}
