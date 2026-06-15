import { createClient } from "@/lib/supabase/server";
import type {
  Product,
  ProductFilters,
  ProductSort,
  SearchResult,
  MotorcycleModel,
} from "@/types/database";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";

const PRODUCT_SELECT = `
  *,
  brand:brands(*),
  category:categories!category_id(*),
  subcategory:categories!subcategory_id(*),
  images:product_images(*),
  reviews:product_reviews(*)
`;

export async function getProducts(options: {
  filters?: ProductFilters;
  sort?: ProductSort;
  page?: number;
  limit?: number;
  featured?: string;
}) {
  const supabase = await createClient();
  const { filters = {}, sort = "newest", page = 1, limit = PRODUCTS_PER_PAGE, featured } = options;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .eq("status", "active");

  if (featured === "featured") query = query.eq("is_featured", true);
  if (featured === "bestseller") query = query.eq("is_bestseller", true);
  if (featured === "new") query = query.eq("is_new", true);
  if (featured === "promotion") query = query.eq("is_promotion", true);
  if (featured === "launch") query = query.eq("is_launch", true);
  if (featured === "recommended") query = query.eq("is_recommended", true);

  if (filters.brand_id) query = query.eq("brand_id", filters.brand_id);
  if (filters.category_id) query = query.eq("category_id", filters.category_id);
  if (filters.subcategory_id) query = query.eq("subcategory_id", filters.subcategory_id);
  if (filters.min_price) query = query.gte("price", filters.min_price);
  if (filters.max_price) query = query.lte("price", filters.max_price);
  if (filters.is_promotion) query = query.eq("is_promotion", true);
  if (filters.in_stock) query = query.gt("stock", 0);

  if (filters.motorcycle_model_id) {
    const { data: compatIds } = await supabase
      .from("product_motorcycle_compatibility")
      .select("product_id")
      .eq("motorcycle_model_id", filters.motorcycle_model_id);

    if (compatIds?.length) {
      query = query.in(
        "id",
        compatIds.map((c) => c.product_id)
      );
    } else {
      return { products: [], total: 0, totalPages: 0 };
    }
  }

  switch (sort) {
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    case "bestseller":
      query = query.order("purchase_click_count", { ascending: false });
      break;
    case "name_asc":
      query = query.order("name", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching products:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { products: [], total: 0, totalPages: 0 };
  }

  const total = count || 0;
  return {
    products: (data as Product[]) || [],
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(`
      ${PRODUCT_SELECT},
      motorcycle_models:product_motorcycle_compatibility(
        year,
        year_end,
        motorcycle_model:motorcycle_models(*)
      )
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (error || !data) return null;

  type CompatibilityEntry = {
    year: number | null;
    year_end: number | null;
    motorcycle_model: MotorcycleModel | null;
  };

  const productRecord = data as unknown as Omit<Product, "motorcycle_models"> & {
    motorcycle_models?: CompatibilityEntry[];
  };

  const motorcycleModels = productRecord.motorcycle_models
    ?.map((entry) => {
      if (!entry.motorcycle_model) return null;
      return {
        ...entry.motorcycle_model,
        compatibility_year: entry.year,
        compatibility_year_end: entry.year_end,
      };
    })
    .filter(Boolean) as Product["motorcycle_models"];

  return {
    ...productRecord,
    motorcycle_models: motorcycleModels,
    reviews: productRecord.reviews?.filter((r) => r.is_approved),
  };
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string | null,
  brandId: string | null,
  limit = 8
): Promise<Product[]> {
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "active")
    .neq("id", productId)
    .limit(limit);

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  } else if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  const { data } = await query;
  return (data as Product[]) || [];
}

export async function searchProducts(
  query: string,
  limit = 20,
  offset = 0
): Promise<SearchResult[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("search_products", {
    search_query: query,
    result_limit: limit,
    result_offset: offset,
  });

  if (error) {
    console.error("Search error:", error);
    return [];
  }

  return (data as SearchResult[]) || [];
}

export async function incrementProductView(productId: string) {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("view_count")
    .eq("id", productId)
    .single();

  if (product) {
    await supabase
      .from("products")
      .update({ view_count: (product.view_count || 0) + 1 })
      .eq("id", productId);
  }
}

export async function getAllProductSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("status", "active");
  return data || [];
}
