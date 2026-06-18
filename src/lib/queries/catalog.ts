import { prisma } from "@/lib/prisma";
import { mapBrand, mapCategory, mapFAQ, mapMotorcycleModel } from "@/lib/db/mappers";
import type { Brand, Category, FAQ, MotorcycleModel } from "@/types/database";

export async function getBrands(limit?: number): Promise<Brand[]> {
  const records = await prisma.brands.findMany({
    where: { is_active: true },
    orderBy: { sort_order: "asc" },
    take: limit,
  });

  return records.map(mapBrand);
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const record = await prisma.brands.findFirst({
    where: { slug, is_active: true },
  });

  return record ? mapBrand(record) : null;
}

export async function getCategories(): Promise<Category[]> {
  const records = await prisma.categories.findMany({
    where: { is_active: true, parent_id: null },
    orderBy: { sort_order: "asc" },
  });

  const children = await prisma.categories.findMany({
    where: { is_active: true, parent_id: { not: null } },
    orderBy: { sort_order: "asc" },
  });

  const childMap = new Map<string, Category[]>();
  children.forEach((child) => {
    if (!child.parent_id) return;
    const mapped = mapCategory(child);
    const existing = childMap.get(child.parent_id) || [];
    existing.push(mapped);
    childMap.set(child.parent_id, existing);
  });

  return records.map((category) => ({
    ...mapCategory(category),
    children: childMap.get(category.id) || [],
  }));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const record = await prisma.categories.findFirst({
    where: { slug, is_active: true },
  });

  return record ? mapCategory(record) : null;
}

export async function getMotorcycleModels(): Promise<MotorcycleModel[]> {
  const records = await prisma.motorcycle_models.findMany({
    where: { is_active: true },
    orderBy: { motorcycle_brand: "asc" },
  });

  return records.map(mapMotorcycleModel);
}

export async function getFAQs(): Promise<FAQ[]> {
  const records = await prisma.faqs.findMany({
    where: { is_active: true },
    orderBy: { sort_order: "asc" },
  });

  return records.map(mapFAQ);
}

export async function getAllCategorySlugs() {
  const records = await prisma.categories.findMany({
    where: { is_active: true },
    select: { slug: true, updated_at: true },
  });

  return records.map((record) => ({
    slug: record.slug,
    updated_at: record.updated_at.toISOString(),
  }));
}

export async function getAllBrandSlugs() {
  const records = await prisma.brands.findMany({
    where: { is_active: true },
    select: { slug: true, updated_at: true },
  });

  return records.map((record) => ({
    slug: record.slug,
    updated_at: record.updated_at.toISOString(),
  }));
}
