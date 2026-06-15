"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Brand, Category } from "@/types/database";

interface NavMegaMenuProps {
  label: string;
  isActive: boolean;
  children: React.ReactNode;
}

export function NavMegaMenu({ label, isActive, children }: NavMegaMenuProps) {
  return (
    <div className="relative group">
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors rounded-md",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
      </button>

      <div className="absolute left-0 top-full pt-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none group-hover:pointer-events-auto">
        <div className="rounded-2xl border border-border bg-background shadow-2xl shadow-black/60 p-4 min-w-[320px] max-w-[min(90vw,720px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

interface BrandsMenuPanelProps {
  brands: Brand[];
}

export function BrandsMenuPanel({ brands }: BrandsMenuPanelProps) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
        Marcas de peças e acessórios
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-72 overflow-y-auto pr-1 scrollbar-hide">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/marcas/${brand.slug}`}
            className="px-2 py-1.5 text-sm rounded-md text-muted-foreground hover:text-primary hover:bg-muted/60 transition-colors truncate"
          >
            {brand.name}
          </Link>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-border/60">
        <Link
          href="/marcas"
          className="text-sm font-semibold text-primary hover:underline underline-offset-2 px-1"
        >
          Ver todas as marcas →
        </Link>
      </div>
    </div>
  );
}

interface CategoriesMenuPanelProps {
  categories: Category[];
}

export function CategoriesMenuPanel({ categories }: CategoriesMenuPanelProps) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
        Categorias de motopeças
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-72 overflow-y-auto pr-1 scrollbar-hide">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categorias/${category.slug}`}
            className="px-2 py-1.5 text-sm rounded-md text-muted-foreground hover:text-primary hover:bg-muted/60 transition-colors truncate"
            title={category.description || category.name}
          >
            {category.name}
          </Link>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-border/60">
        <Link
          href="/categorias"
          className="text-sm font-semibold text-primary hover:underline underline-offset-2 px-1"
        >
          Ver todas as categorias →
        </Link>
      </div>
    </div>
  );
}

interface MobileNavSectionProps {
  title: string;
  viewAllHref: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function MobileNavSection({
  title,
  viewAllHref,
  children,
  defaultOpen = false,
}: MobileNavSectionProps) {
  return (
    <details className="group rounded-md" open={defaultOpen}>
      <summary className="px-3 py-2.5 text-sm font-semibold uppercase tracking-wide cursor-pointer list-none flex items-center justify-between hover:bg-accent rounded-md">
        {title}
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-1 max-h-48 overflow-y-auto">
        {children}
        <Link
          href={viewAllHref}
          className="block pt-2 text-sm font-semibold text-primary"
        >
          Ver todas →
        </Link>
      </div>
    </details>
  );
}
