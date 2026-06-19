import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapProduct, productInclude } from "@/lib/db/mappers";
import { slugify } from "@/lib/utils";
import type { ProductStatus, ListingStatus } from "@/types/database";

export interface ProductImageInput {
  url: string;
  alt_text?: string;
}

export interface ModelCompatibilityInput {
  modelId: string;
  year: number;
  yearEnd: number;
}

export interface SaveProductInput {
  name: string;
  sku: string;
  internal_code?: string | null;
  brand_id?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  price: number;
  promotional_price?: number | null;
  stock?: number;
  weight?: number | null;
  dimensions?: string | null;
  short_description?: string | null;
  full_description?: string | null;
  applications?: string | null;
  compatibilities?: string | null;
  product_references?: string | null;
  tags?: string[];
  seo_keywords?: string[];
  mercado_livre_url?: string | null;
  mercado_livre_id?: string | null;
  ml_source_url?: string | null;
  price_sync_enabled?: boolean;
  listing_status?: ListingStatus;
  status?: ProductStatus;
  is_featured?: boolean;
  is_bestseller?: boolean;
  is_new?: boolean;
  is_promotion?: boolean;
  is_launch?: boolean;
  is_recommended?: boolean;
  images?: ProductImageInput[];
  modelCompat?: ModelCompatibilityInput[];
}

function buildProductData(input: SaveProductInput, slug: string, isNew: boolean) {
  return {
    name: input.name.trim(),
    slug,
    sku: input.sku.trim(),
    internal_code: isNew ? null : input.internal_code?.trim() || null,
    brand_id: input.brand_id || null,
    category_id: input.category_id || null,
    subcategory_id: input.subcategory_id || null,
    price: input.price,
    promotional_price: input.promotional_price ?? null,
    stock: input.stock ?? 0,
    weight: input.weight ?? null,
    dimensions: input.dimensions?.trim() || null,
    short_description: input.short_description?.trim() || null,
    full_description: input.full_description?.trim() || null,
    applications: input.applications?.trim() || null,
    compatibilities: input.compatibilities?.trim() || null,
    product_references: input.product_references?.trim() || null,
    tags: input.tags ?? [],
    seo_keywords: input.seo_keywords ?? [],
    mercado_livre_url: input.mercado_livre_url?.trim() || null,
    mercado_livre_id: input.mercado_livre_id?.trim() || null,
    ml_source_url: input.ml_source_url?.trim() || null,
    price_sync_enabled: input.price_sync_enabled ?? true,
    listing_status: input.listing_status ?? "not_listed",
    status: input.status ?? "draft",
    is_featured: input.is_featured ?? false,
    is_bestseller: input.is_bestseller ?? false,
    is_new: input.is_new ?? false,
    is_promotion: input.is_promotion ?? false,
    is_launch: input.is_launch ?? false,
    is_recommended: input.is_recommended ?? false,
  };
}

export async function listAdminProducts() {
  const records = await prisma.products.findMany({
    include: productInclude,
    orderBy: { created_at: "desc" },
  });

  return records;
}

export async function listCatalogProducts() {
  const records = await prisma.products.findMany({
    include: productInclude,
    orderBy: { name: "asc" },
  });

  return records;
}

export async function getAdminProductById(id: string) {
  const record = await prisma.products.findUnique({
    where: { id },
    include: {
      ...productInclude,
      product_motorcycle_compatibility: {
        select: { motorcycle_model_id: true, year: true, year_end: true },
      },
    },
  });

  return record;
}

export async function saveProduct(input: SaveProductInput, productId?: string) {
  const slug = slugify(input.name);

  try {
    const product = productId
      ? await prisma.products.update({
          where: { id: productId },
          data: buildProductData(input, slug, false),
        })
      : await prisma.products.create({
          data: buildProductData(input, slug, true),
        });

    const validImages = (input.images ?? [])
      .map((image) => ({
        url: image.url.trim(),
        alt_text: image.alt_text?.trim() || input.name.trim(),
      }))
      .filter((image) => image.url.length > 0);

    await prisma.product_images.deleteMany({ where: { product_id: product.id } });

    if (validImages.length > 0) {
      await prisma.product_images.createMany({
        data: validImages.map((image, index) => ({
          product_id: product.id,
          url: image.url,
          alt_text: image.alt_text,
          sort_order: index,
          is_primary: index === 0,
        })),
      });
    }

    await prisma.product_motorcycle_compatibility.deleteMany({
      where: { product_id: product.id },
    });

    if (input.modelCompat && input.modelCompat.length > 0) {
      await prisma.product_motorcycle_compatibility.createMany({
        data: input.modelCompat.map((item) => ({
          product_id: product.id,
          motorcycle_model_id: item.modelId,
          year: item.year,
          year_end: item.yearEnd,
        })),
      });
    }

    const saved = await prisma.products.findUnique({
      where: { id: product.id },
      include: productInclude,
    });

    return { product: saved ? mapProduct(saved) : null };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Registro duplicado. Verifique nome, slug ou SKU.");
    }
    throw error;
  }
}

export async function deleteProduct(id: string) {
  await prisma.products.delete({ where: { id } });
}
