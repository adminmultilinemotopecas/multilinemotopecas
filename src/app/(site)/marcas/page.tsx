import { getBrands } from "@/lib/queries/catalog";
import { BrandGrid } from "@/components/home/brand-grid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marcas de Motopeças",
  description:
    "Explore todas as marcas de peças e acessórios para motocicletas disponíveis no catálogo Multiline Motopeças.",
};

export const revalidate = 3600;

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      <div className="mb-10">
        <h1 className="section-title mb-2">
          Todas as <span className="section-title-accent">Marcas</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          {brands.length} marcas de peças e acessórios para motos
        </p>
      </div>

      <BrandGrid brands={brands} />
    </div>
  );
}
