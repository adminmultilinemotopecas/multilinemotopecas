import Link from "next/link";
import { RemoteImage } from "@/components/ui/remote-image";
import type { Category } from "@/types/database";
import { cn } from "@/lib/utils";

interface CategoryGridProps {
  categories: Category[];
  className?: string;
}

export function CategoryGrid({ categories, className }: CategoryGridProps) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4", className)}>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/categorias/${category.slug}`}
          className="group flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/40 hover:bg-card/80 transition-all"
        >
          <div className="relative h-16 w-16 rounded-full overflow-hidden bg-secondary ring-2 ring-border/40 group-hover:ring-primary/40 transition-all">
            {category.image_url ? (
              <RemoteImage
                src={category.image_url}
                alt={category.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl font-extrabold text-primary/40">
                {category.name.charAt(0)}
              </div>
            )}
          </div>
          <span className="text-xs font-bold uppercase tracking-wide text-center text-muted-foreground group-hover:text-primary transition-colors">
            {category.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
