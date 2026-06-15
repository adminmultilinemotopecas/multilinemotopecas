import { Metadata } from "next";
import { SITE_CONFIG } from "./constants";
import type { Product, FAQ, Brand, Category } from "@/types/database";

export function generateSiteMetadata(overrides?: Partial<Metadata>): Metadata {
  return {
    metadataBase: new URL(SITE_CONFIG.url),
    title: {
      default: `${SITE_CONFIG.name} | Peças para Motos`,
      template: `%s | ${SITE_CONFIG.name}`,
    },
    description: SITE_CONFIG.description,
    keywords: SITE_CONFIG.keywords,
    authors: [{ name: SITE_CONFIG.name }],
    creator: SITE_CONFIG.name,
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: SITE_CONFIG.url,
      siteName: SITE_CONFIG.name,
      title: SITE_CONFIG.name,
      description: SITE_CONFIG.description,
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_CONFIG.name,
      description: SITE_CONFIG.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: SITE_CONFIG.url,
    },
    icons: {
      icon: [
        { url: "/favicon.png", type: "image/png" },
      ],
      apple: "/apple-icon.png",
    },
    ...overrides,
  };
}

export function generateProductMetadata(product: Product): Metadata {
  const image = product.images?.find((i) => i.is_primary)?.url || product.images?.[0]?.url;
  const price = product.promotional_price || product.price;
  const description =
    product.short_description ||
    `Compre ${product.name} com segurança no Mercado Livre. ${SITE_CONFIG.name}`;

  return {
    title: product.name,
    description,
    keywords: [
      product.name,
      product.sku,
      ...(product.seo_keywords || []),
      ...(product.tags || []),
    ],
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: `${SITE_CONFIG.url}/produtos/${product.slug}`,
      siteName: SITE_CONFIG.name,
      title: `${product.name} - ${formatPrice(price)}`,
      description,
      images: image
        ? [{ url: image, width: 1200, height: 630, alt: product.name }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: image ? [image] : [],
    },
    alternates: {
      canonical: `${SITE_CONFIG.url}/produtos/${product.slug}`,
    },
  };
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
}

export function generateProductJsonLd(product: Product) {
  const image = product.images?.find((i) => i.is_primary)?.url || product.images?.[0]?.url;
  const price = product.promotional_price || product.price;
  const avgRating =
    product.reviews && product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description || product.full_description,
    sku: product.sku,
    mpn: product.internal_code,
    image: product.images?.map((i) => i.url) || [],
    brand: product.brand
      ? { "@type": "Brand", name: product.brand.name }
      : undefined,
    category: product.category?.name,
    offers: {
      "@type": "Offer",
      url: product.mercado_livre_url || `${SITE_CONFIG.url}/produtos/${product.slug}`,
      priceCurrency: "BRL",
      price: price,
      availability:
        product.status === "active"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: SITE_CONFIG.name,
      },
    },
    ...(avgRating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: avgRating.toFixed(1),
        reviewCount: product.reviews!.length,
      },
    }),
    ...(image && { image }),
  };
}

export function generateOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    description: SITE_CONFIG.description,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: "Portuguese",
    },
  };
}

export function generateBreadcrumbJsonLd(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateFAQJsonLd(faqs: FAQ[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function generateCategoryMetadata(category: Category): Metadata {
  return {
    title: category.name,
    description:
      category.description ||
      `Encontre ${category.name} para sua moto. Compre com segurança no Mercado Livre.`,
    openGraph: {
      title: category.name,
      description: category.description || undefined,
      images: category.image_url ? [{ url: category.image_url }] : [],
    },
    alternates: {
      canonical: `${SITE_CONFIG.url}/categorias/${category.slug}`,
    },
  };
}

export function generateBrandMetadata(brand: Brand): Metadata {
  return {
    title: `Peças ${brand.name}`,
    description:
      brand.description ||
      `Todas as peças da marca ${brand.name} para sua motocicleta.`,
    openGraph: {
      title: `Peças ${brand.name}`,
      images: brand.logo_url ? [{ url: brand.logo_url }] : [],
    },
    alternates: {
      canonical: `${SITE_CONFIG.url}/marcas/${brand.slug}`,
    },
  };
}
