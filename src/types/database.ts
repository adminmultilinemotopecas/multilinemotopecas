export type ProductStatus = "active" | "inactive" | "draft" | "out_of_stock";
export type ListingStatus = "active" | "paused" | "closed" | "not_listed";
export type PriceSyncStatus =
  | "success"
  | "failed"
  | "skipped"
  | "low_confidence"
  | "no_url"
  | "blocked"
  | "unavailable"
  | "inactive";
export type AnalyticsEventType =
  | "purchase_click"
  | "product_view"
  | "search"
  | "share"
  | "whatsapp_click";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: Category[];
}

export interface MotorcycleModel {
  id: string;
  motorcycle_brand: string;
  model: string;
  displacement: string | null;
  year_start: number | null;
  year_end: number | null;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  compatibility_year?: number | null;
  compatibility_year_end?: number | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  internal_code: string | null;
  brand_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  price: number;
  promotional_price: number | null;
  stock: number;
  weight: number | null;
  dimensions: string | null;
  short_description: string | null;
  full_description: string | null;
  technical_specs: TechnicalSpec[];
  applications: string | null;
  compatibilities: string | null;
  product_references: string | null;
  tags: string[];
  seo_keywords: string[];
  mercado_livre_url: string | null;
  mercado_livre_id: string | null;
  ml_source_url: string | null;
  last_price_sync_at: string | null;
  last_price_sync_status: PriceSyncStatus | null;
  last_price_sync_error: string | null;
  last_synced_price: number | null;
  price_sync_enabled: boolean;
  listing_status: ListingStatus;
  status: ProductStatus;
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
  ml_verified_at: string | null;
  created_at: string;
  updated_at: string;
  brand?: Brand | null;
  category?: Category | null;
  subcategory?: Category | null;
  images?: ProductImage[];
  motorcycle_models?: MotorcycleModel[];
  reviews?: ProductReview[];
}

export interface TechnicalSpec {
  label: string;
  value: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductReview {
  id: string;
  product_id: string;
  author_name: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
}

export interface SearchResult {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  promotional_price: number | null;
  short_description: string | null;
  mercado_livre_url: string | null;
  brand_name: string | null;
  category_name: string | null;
  primary_image_url: string | null;
  relevance: number;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "editor";
}

export interface ProductFilters {
  brand_id?: string;
  category_id?: string;
  subcategory_id?: string;
  motorcycle_model_id?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  is_promotion?: boolean;
  search?: string;
}

export type ProductSort =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "bestseller"
  | "name_asc";
