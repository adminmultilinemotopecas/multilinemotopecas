"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Phone } from "lucide-react";
import { SearchBar } from "@/components/search/search-bar";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import {
  NavMegaMenu,
  BrandsMenuPanel,
  CategoriesMenuPanel,
  MobileNavSection,
} from "@/components/layout/nav-mega-menu";
import { cn, getWhatsAppLink } from "@/lib/utils";
import { SITE_CONFIG } from "@/lib/constants";
import type { Brand, Category } from "@/types/database";

const SIMPLE_NAV_LINKS = [
  { href: "/", label: "Início", exact: true },
  { href: "/produtos", label: "Catálogo" },
];

interface HeaderProps {
  brands: Brand[];
  categories: Category[];
}

export function Header({ brands, categories }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const contactUrl = getWhatsAppLink(
    `Olá! Vim pelo site ${SITE_CONFIG.name} e gostaria de falar com a equipe.`
  );

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 lg:h-[72px] items-center gap-4 lg:gap-8">
          <Logo size="md" />

          <nav className="hidden lg:flex items-center gap-1">
            {SIMPLE_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors rounded-md",
                  isActive(link.href, link.exact)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}

            {brands.length > 0 && (
              <NavMegaMenu label="Marcas" isActive={isActive("/marcas")}>
                <BrandsMenuPanel brands={brands} />
              </NavMegaMenu>
            )}

            {categories.length > 0 && (
              <NavMegaMenu label="Categorias" isActive={isActive("/categorias")}>
                <CategoriesMenuPanel categories={categories} />
              </NavMegaMenu>
            )}
          </nav>

          <div className="hidden md:flex flex-1 max-w-md lg:max-w-lg">
            <SearchBar variant="header" placeholder="Busque por peça ou SKU..." />
          </div>

          <Button
            variant="default"
            className="hidden sm:flex rounded-full px-5 font-bold uppercase tracking-wide"
            asChild
          >
            <a href={contactUrl} target="_blank" rel="noopener noreferrer">
              <Phone className="h-4 w-4" />
              Contato
            </a>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden ml-auto"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <div className="md:hidden pb-3">
          <SearchBar variant="header" placeholder="Busque por peça ou SKU..." />
        </div>
      </div>

      <div
        className={cn(
          "lg:hidden border-t border-border/60 bg-background overflow-hidden transition-all",
          mobileMenuOpen ? "max-h-[85vh] opacity-100 overflow-y-auto" : "max-h-0 opacity-0"
        )}
      >
        <nav className="container mx-auto px-4 py-3 flex flex-col gap-1">
          {SIMPLE_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "px-3 py-2.5 text-sm font-semibold uppercase tracking-wide rounded-md",
                isActive(link.href, link.exact) ? "text-primary" : "hover:bg-accent"
              )}
            >
              {link.label}
            </Link>
          ))}

          {brands.length > 0 && (
            <MobileNavSection title="Marcas" viewAllHref="/marcas">
              {brands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/marcas/${brand.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-primary rounded-md"
                >
                  {brand.name}
                </Link>
              ))}
            </MobileNavSection>
          )}

          {categories.length > 0 && (
            <MobileNavSection title="Categorias" viewAllHref="/categorias">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categorias/${category.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-primary rounded-md"
                >
                  {category.name}
                </Link>
              ))}
            </MobileNavSection>
          )}

          <a
            href={contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2.5 text-sm font-semibold text-primary uppercase"
          >
            Contato
          </a>
        </nav>
      </div>
    </header>
  );
}
