import { createClient } from "@/lib/supabase/server";
import type { Brand, Category, MotorcycleModel, FAQ } from "@/types/database";

export async function getBrands(limit?: number): Promise<Brand[]> {
  const supabase = await createClient();
  let query = supabase
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (limit) query = query.limit(limit);

  const { data } = await query;
  return (data as Brand[]) || [];
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  return data as Brand | null;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .is("parent_id", null)
    .order("sort_order", { ascending: true });

  if (!data) return [];

  const categories = data as Category[];
  const { data: children } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .not("parent_id", "is", null)
    .order("sort_order", { ascending: true });

  const childMap = new Map<string, Category[]>();
  (children as Category[] || []).forEach((child) => {
    if (child.parent_id) {
      const existing = childMap.get(child.parent_id) || [];
      existing.push(child);
      childMap.set(child.parent_id, existing);
    }
  });

  return categories.map((cat) => ({
    ...cat,
    children: childMap.get(cat.id) || [],
  }));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  return data as Category | null;
}

export async function getMotorcycleModels(): Promise<MotorcycleModel[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("motorcycle_models")
    .select("*")
    .eq("is_active", true)
    .order("motorcycle_brand", { ascending: true });
  return (data as MotorcycleModel[]) || [];
}

export async function getFAQs(): Promise<FAQ[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("faqs")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data as FAQ[]) || [];
}

export async function getAllCategorySlugs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("slug, updated_at")
    .eq("is_active", true);
  return data || [];
}

export async function getAllBrandSlugs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brands")
    .select("slug, updated_at")
    .eq("is_active", true);
  return data || [];
}
