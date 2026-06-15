import Link from "next/link";
import { RemoteImage } from "@/components/ui/remote-image";
import type { Brand } from "@/types/database";
import { cn } from "@/lib/utils";

interface BrandGridProps {
  brands: Brand[];
  className?: string;
}

export function BrandGrid({ brands, className }: BrandGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4",
        className
      )}
    >
      {brands.map((brand) => (
        <Link
          key={brand.id}
          href={`/marcas/${brand.slug}`}
          className="group flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-5 hover:border-primary/40 hover:bg-card/80 transition-all"
        >
          <div className="relative h-12 w-full">
            {brand.logo_url ? (
              <RemoteImage
                src={brand.logo_url}
                alt={brand.name}
                fill
                className="object-contain opacity-90 group-hover:opacity-100 transition-opacity"
              />
            ) : (
              <span className="flex h-full items-center justify-center font-extrabold text-primary uppercase tracking-wide text-sm text-center">
                {brand.name}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors text-center line-clamp-2">
            {brand.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
