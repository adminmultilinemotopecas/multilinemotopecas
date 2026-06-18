import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decimalToNumber, mapProduct, productInclude } from "@/lib/db/mappers";
import type {
  MotorcycleModel,
  Product,
  ProductFilters,
  ProductSort,
  SearchResult,
} from "@/types/database";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";

function buildProductOrderBy(sort: ProductSort): Prisma.productsOrderByWithRelationInput {
  switch (sort) {
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "bestseller":
      return { purchase_click_count: "desc" };
    case "name_asc":
      return { name: "asc" };
    default:
      return { created_at: "desc" };
  }
}

export async function getProducts(options: {
  filters?: ProductFilters;
  sort?: ProductSort;
  page?: number;
  limit?: number;
  featured?: string;
}) {
  const { filters = {}, sort = "newest", page = 1, limit = PRODUCTS_PER_PAGE, featured } = options;
  const offset = (page - 1) * limit;

  const where: Prisma.productsWhereInput = {
    status: "active",
  };

  if (featured === "featured") where.is_featured = true;
  if (featured === "bestseller") where.is_bestseller = true;
  if (featured === "new") where.is_new = true;
  if (featured === "promotion") where.is_promotion = true;
  if (featured === "launch") where.is_launch = true;
  if (featured === "recommended") where.is_recommended = true;

  if (filters.brand_id) where.brand_id = filters.brand_id;
  if (filters.category_id) where.category_id = filters.category_id;
  if (filters.subcategory_id) where.subcategory_id = filters.subcategory_id;
  if (filters.min_price != null || filters.max_price != null) {
    where.price = {
      ...(filters.min_price != null ? { gte: filters.min_price } : {}),
      ...(filters.max_price != null ? { lte: filters.max_price } : {}),
    };
  }
  if (filters.is_promotion) where.is_promotion = true;
  if (filters.in_stock) where.stock = { gt: 0 };

  if (filters.motorcycle_model_id) {
    const compatIds = await prisma.product_motorcycle_compatibility.findMany({
      where: { motorcycle_model_id: filters.motorcycle_model_id },
      select: { product_id: true },
    });

    if (compatIds.length === 0) {
      return { products: [], total: 0, totalPages: 0 };
    }

    where.id = { in: compatIds.map((entry) => entry.product_id) };
  }

  try {
    const [records, total] = await Promise.all([
      prisma.products.findMany({
        where,
        include: productInclude,
        orderBy: buildProductOrderBy(sort),
        skip: offset,
        take: limit,
      }),
      prisma.products.count({ where }),
    ]);

    return {
      products: records.map(mapProduct),
      total,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { products: [], total: 0, totalPages: 0 };
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const record = await prisma.products.findFirst({
    where: { slug, status: "active" },
    include: {
      ...productInclude,
      product_motorcycle_compatibility: {
        include: {
          motorcycle_models: true,
        },
      },
    },
  });

  if (!record) return null;

  const product = mapProduct(record);

  const motorcycleModels = record.product_motorcycle_compatibility
    .map((entry) => {
      if (!entry.motorcycle_models) return null;
      return {
        ...entry.motorcycle_models,
        compatibility_year: entry.year,
        compatibility_year_end: entry.year_end,
        created_at: entry.motorcycle_models.created_at.toISOString(),
        updated_at: entry.motorcycle_models.updated_at.toISOString(),
      };
    })
    .filter(Boolean) as MotorcycleModel[];

  return {
    ...product,
    motorcycle_models: motorcycleModels,
    reviews: product.reviews?.filter((review) => review.is_approved),
  };
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string | null,
  brandId: string | null,
  limit = 8
): Promise<Product[]> {
  const where: Prisma.productsWhereInput = {
    status: "active",
    id: { not: productId },
  };

  if (categoryId) {
    where.category_id = categoryId;
  } else if (brandId) {
    where.brand_id = brandId;
  }

  const records = await prisma.products.findMany({
    where,
    include: productInclude,
    take: limit,
  });

  return records.map(mapProduct);
}

type SearchProductsRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: Prisma.Decimal;
  promotional_price: Prisma.Decimal | null;
  short_description: string | null;
  mercado_livre_url: string | null;
  brand_name: string | null;
  category_name: string | null;
  primary_image_url: string | null;
  relevance: number;
};

export async function searchProducts(
  query: string,
  limit = 20,
  offset = 0
): Promise<SearchResult[]> {
  try {
    const rows = await prisma.$queryRaw<SearchProductsRow[]>`
      SELECT *
      FROM search_products(${query}::text, ${limit}::integer, ${offset}::integer)
    `;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      price: decimalToNumber(row.price) ?? 0,
      promotional_price: decimalToNumber(row.promotional_price),
      short_description: row.short_description,
      mercado_livre_url: row.mercado_livre_url,
      brand_name: row.brand_name,
      category_name: row.category_name,
      primary_image_url: row.primary_image_url,
      relevance: Number(row.relevance),
    }));
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

export async function incrementProductView(productId: string) {
  try {
    await prisma.products.update({
      where: { id: productId },
      data: { view_count: { increment: 1 } },
    });
  } catch (error) {
    console.error("Error incrementing product view:", error);
  }
}

export async function getAllProductSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  const records = await prisma.products.findMany({
    where: { status: "active" },
    select: { slug: true, updated_at: true },
  });

  return records.map((record) => ({
    slug: record.slug,
    updated_at: record.updated_at.toISOString(),
  }));
}
