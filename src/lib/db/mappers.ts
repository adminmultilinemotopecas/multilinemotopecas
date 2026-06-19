import type { Prisma } from "@prisma/client";
import type {
  Brand,
  Category,
  FAQ,
  MotorcycleModel,
  Product,
  ProductImage,
  ProductReview,
  TechnicalSpec,
} from "@/types/database";

export function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value == null) return null;
  return typeof value === "number" ? value : Number(value);
}

export function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export function mapBrand(record: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}): Brand {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    description: record.description,
    logo_url: record.logo_url,
    is_active: record.is_active,
    sort_order: record.sort_order,
    created_at: toIsoString(record.created_at),
    updated_at: toIsoString(record.updated_at),
  };
}

export function mapCategory(record: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}): Category {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    description: record.description,
    image_url: record.image_url,
    parent_id: record.parent_id,
    is_active: record.is_active,
    sort_order: record.sort_order,
    created_at: toIsoString(record.created_at),
    updated_at: toIsoString(record.updated_at),
  };
}

export function mapMotorcycleModel(record: {
  id: string;
  motorcycle_brand: string;
  model: string;
  displacement: string | null;
  year_start: number | null;
  year_end: number | null;
  slug: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}): MotorcycleModel {
  return {
    id: record.id,
    motorcycle_brand: record.motorcycle_brand,
    model: record.model,
    displacement: record.displacement,
    year_start: record.year_start,
    year_end: record.year_end,
    slug: record.slug,
    is_active: record.is_active,
    created_at: toIsoString(record.created_at),
    updated_at: toIsoString(record.updated_at),
  };
}

export function mapProductImage(record: {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: Date;
}): ProductImage {
  return {
    id: record.id,
    product_id: record.product_id,
    url: record.url,
    alt_text: record.alt_text,
    sort_order: record.sort_order,
    is_primary: record.is_primary,
    created_at: toIsoString(record.created_at),
  };
}

export function mapProductReview(record: {
  id: string;
  product_id: string;
  author_name: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: Date;
}): ProductReview {
  return {
    id: record.id,
    product_id: record.product_id,
    author_name: record.author_name,
    rating: record.rating,
    comment: record.comment,
    is_approved: record.is_approved,
    created_at: toIsoString(record.created_at),
  };
}

export function mapFAQ(record: {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}): FAQ {
  return {
    id: record.id,
    question: record.question,
    answer: record.answer,
    sort_order: record.sort_order,
    is_active: record.is_active,
  };
}

type ProductRecord = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  internal_code: string | null;
  brand_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  price: Prisma.Decimal;
  promotional_price: Prisma.Decimal | null;
  stock: number;
  weight: Prisma.Decimal | null;
  dimensions: string | null;
  short_description: string | null;
  full_description: string | null;
  technical_specs: Prisma.JsonValue;
  applications: string | null;
  compatibilities: string | null;
  product_references: string | null;
  tags: string[];
  seo_keywords: string[];
  mercado_livre_url: string | null;
  mercado_livre_id: string | null;
  ml_source_url: string | null;
  last_price_sync_at: Date | null;
  last_price_sync_status: Product["last_price_sync_status"];
  last_price_sync_error: string | null;
  last_synced_price: Prisma.Decimal | null;
  price_sync_enabled: boolean;
  listing_status: Product["listing_status"];
  status: Product["status"];
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  is_promotion: boolean;
  is_launch: boolean;
  is_recommended: boolean;
  view_count: number;
  purchase_click_count: number;
  ml_verification_pending: boolean;
  ml_verification_message: string | null;
  ml_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
  brands?: Parameters<typeof mapBrand>[0] | null;
  categories?: Parameters<typeof mapCategory>[0] | null;
  subcategory?: Parameters<typeof mapCategory>[0] | null;
  product_images?: Parameters<typeof mapProductImage>[0][];
  product_reviews?: Parameters<typeof mapProductReview>[0][];
};

export function mapProduct(record: ProductRecord): Product {
  const technicalSpecs = Array.isArray(record.technical_specs)
    ? (record.technical_specs as unknown as TechnicalSpec[])
    : [];

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    sku: record.sku,
    internal_code: record.internal_code,
    brand_id: record.brand_id,
    category_id: record.category_id,
    subcategory_id: record.subcategory_id,
    price: decimalToNumber(record.price) ?? 0,
    promotional_price: decimalToNumber(record.promotional_price),
    stock: record.stock,
    weight: decimalToNumber(record.weight),
    dimensions: record.dimensions,
    short_description: record.short_description,
    full_description: record.full_description,
    technical_specs: technicalSpecs,
    applications: record.applications,
    compatibilities: record.compatibilities,
    product_references: record.product_references,
    tags: record.tags,
    seo_keywords: record.seo_keywords,
    mercado_livre_url: record.mercado_livre_url,
    mercado_livre_id: record.mercado_livre_id,
    ml_source_url: record.ml_source_url,
    last_price_sync_at: record.last_price_sync_at
      ? toIsoString(record.last_price_sync_at)
      : null,
    last_price_sync_status: record.last_price_sync_status,
    last_price_sync_error: record.last_price_sync_error,
    last_synced_price: decimalToNumber(record.last_synced_price),
    price_sync_enabled: record.price_sync_enabled,
    listing_status: record.listing_status,
    status: record.status,
    is_featured: record.is_featured,
    is_bestseller: record.is_bestseller,
    is_new: record.is_new,
    is_promotion: record.is_promotion,
    is_launch: record.is_launch,
    is_recommended: record.is_recommended,
    view_count: record.view_count,
    purchase_click_count: record.purchase_click_count,
    ml_verification_pending: record.ml_verification_pending,
    ml_verification_message: record.ml_verification_message,
    ml_verified_at: record.ml_verified_at ? toIsoString(record.ml_verified_at) : null,
    created_at: toIsoString(record.created_at),
    updated_at: toIsoString(record.updated_at),
    brand: record.brands ? mapBrand(record.brands) : null,
    category: record.categories ? mapCategory(record.categories) : null,
    subcategory: record.subcategory ? mapCategory(record.subcategory) : null,
    images: record.product_images?.map(mapProductImage),
    reviews: record.product_reviews?.map(mapProductReview),
  };
}

export const productInclude = {
  brands: true,
  categories: true,
  subcategory: true,
  product_images: { orderBy: { sort_order: "asc" as const } },
  product_reviews: true,
} satisfies Prisma.productsInclude;
