import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductGrid } from "@/components/products/product-grid";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types/database";

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllHref?: string;
}

export function ProductSection({
  title,
  subtitle,
  products,
  viewAllHref,
}: ProductSectionProps) {
  if (products.length === 0) return null;

  const words = title.split(" ");
  const lastWord = words.pop();
  const firstPart = words.join(" ");

  return (
    <section className="py-12 border-t border-border/40 first:border-t-0">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="section-title">
            {firstPart && <>{firstPart} </>}
            <span className="section-title-accent">{lastWord}</span>
          </h2>
          {subtitle && (
            <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
          )}
        </div>
        {viewAllHref && (
          <Button variant="ghost" asChild className="hidden sm:flex gap-1 text-primary hover:text-primary">
            <Link href={viewAllHref}>
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
      <ProductGrid products={products} columns={4} />
      {viewAllHref && (
        <div className="mt-6 text-center sm:hidden">
          <Button variant="outline" asChild className="border-primary/30 text-primary">
            <Link href={viewAllHref}>Ver todos</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
