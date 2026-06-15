import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { createClient } from "@/lib/supabase/server";
import { getBrands, getCategories, getMotorcycleModels } from "@/lib/queries/catalog";
import type { Product } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!product) notFound();

  const { data: compatibilities } = await supabase
    .from("product_motorcycle_compatibility")
    .select("motorcycle_model_id, year, year_end")
    .eq("product_id", id);

  const { data: images } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", id)
    .order("sort_order", { ascending: true });

  const [brands, categories, motorcycleModels] = await Promise.all([
    getBrands(),
    getCategories(),
    getMotorcycleModels(),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Editar Produto</h1>
      <ProductForm
        product={product as Product}
        brands={brands}
        categories={categories}
        motorcycleModels={motorcycleModels}
        selectedCompatibilities={
          compatibilities?.map((c) => ({
            modelId: c.motorcycle_model_id,
            year: c.year ?? new Date().getFullYear(),
            yearEnd: c.year_end ?? c.year ?? new Date().getFullYear(),
          })) || []
        }
        initialImages={images || []}
      />
    </div>
  );
}
