import Link from "next/link";
import { getCategories } from "@/lib/queries/catalog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categorias de Motopeças",
  description:
    "Navegue por todas as categorias de peças e acessórios para motocicletas no catálogo Multiline Motopeças.",
};

export const revalidate = 3600;

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      <div className="mb-10">
        <h1 className="section-title mb-2">
          Todas as <span className="section-title-accent">Categorias</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          {categories.length} categorias de peças e acessórios para motos
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categorias/${category.slug}`}
            className="group rounded-2xl border border-border/60 bg-card p-5 hover:border-primary/40 transition-all"
          >
            <h2 className="font-bold text-foreground group-hover:text-primary transition-colors">
              {category.name}
            </h2>
            {category.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {category.description}
              </p>
            )}
            {category.children && category.children.length > 0 && (
              <p className="text-xs text-primary mt-3 font-semibold">
                {category.children.length} subcategorias
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
