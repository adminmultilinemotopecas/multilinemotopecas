import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroSection } from "@/components/home/hero-section";
import { CategoryGrid } from "@/components/home/category-grid";
import { BrandCarousel } from "@/components/home/brand-carousel";
import { ProductSection } from "@/components/home/product-section";
import { Button } from "@/components/ui/button";
import { BenefitsSection } from "@/components/home/benefits-section";
import { FAQSection } from "@/components/home/faq-section";
import { JsonLd } from "@/components/seo/json-ld";
import { getProducts } from "@/lib/queries/products";
import { getBrands, getCategories, getFAQs, getMotorcycleModels } from "@/lib/queries/catalog";
import { generateFAQJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export default async function HomePage() {
  const [
    categories,
    brands,
    motorcycleModels,
    faqs,
    featured,
    bestsellers,
    newProducts,
    promotions,
    launches,
    recommended,
  ] = await Promise.all([
    getCategories(),
    getBrands(12),
    getMotorcycleModels(),
    getFAQs(),
    getProducts({ featured: "featured", limit: 8 }),
    getProducts({ featured: "bestseller", limit: 8 }),
    getProducts({ featured: "new", limit: 8 }),
    getProducts({ featured: "promotion", limit: 8 }),
    getProducts({ featured: "launch", limit: 8 }),
    getProducts({ featured: "recommended", limit: 8 }),
  ]);

  return (
    <>
      {faqs.length > 0 && <JsonLd data={generateFAQJsonLd(faqs)} />}

      <HeroSection motorcycleModels={motorcycleModels} />

      <div className="container mx-auto px-4">
        {categories.length > 0 && (
          <section className="py-12 border-t border-border/40">
            <h2 className="section-title mb-8">
              Nossas <span className="section-title-accent">Categorias</span>
            </h2>
            <CategoryGrid categories={categories} />
          </section>
        )}

        {brands.length > 0 && (
          <section className="py-12 border-t border-border/40">
            <div className="flex items-end justify-between mb-8 gap-4">
              <h2 className="section-title">
                Marcas mais <span className="section-title-accent">Procuradas</span>
              </h2>
              <Button
                variant="ghost"
                asChild
                className="hidden sm:flex gap-1 text-primary hover:text-primary shrink-0"
              >
                <Link href="/marcas">
                  Ver todas as marcas
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <BrandCarousel brands={brands} />
            <div className="mt-6 text-center sm:hidden">
              <Button variant="outline" asChild className="border-primary/30 text-primary">
                <Link href="/marcas">Ver todas as marcas</Link>
              </Button>
            </div>
          </section>
        )}

        <ProductSection
          title="Produtos em Destaque"
          products={featured.products}
          viewAllHref="/produtos?featured=featured"
        />

        <ProductSection
          title="Mais Vendidos"
          subtitle="As peças preferidas dos motociclistas"
          products={bestsellers.products}
          viewAllHref="/produtos?featured=bestseller"
        />

        <ProductSection
          title="Recém Adicionados"
          products={newProducts.products}
          viewAllHref="/produtos?featured=new"
        />

        <ProductSection
          title="Promoções"
          subtitle="Ofertas imperdíveis"
          products={promotions.products}
          viewAllHref="/produtos?featured=promotion"
        />

        <ProductSection
          title="Lançamentos"
          products={launches.products}
          viewAllHref="/produtos?featured=launch"
        />

        <ProductSection
          title="Recomendados"
          products={recommended.products}
          viewAllHref="/produtos?featured=recommended"
        />

        <BenefitsSection />
        <FAQSection faqs={faqs} />
      </div>
    </>
  );
}
