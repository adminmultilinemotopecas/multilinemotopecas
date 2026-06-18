import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { getBrands, getCategories, getMotorcycleModels } from "@/lib/queries/catalog";
import { getAdminProductById } from "@/lib/db/products-admin";
import { mapProduct } from "@/lib/db/mappers";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  const record = await getAdminProductById(id);

  if (!record) notFound();

  const product = mapProduct(record);

  const [brands, categories, motorcycleModels] = await Promise.all([
    getBrands(),
    getCategories(),
    getMotorcycleModels(),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Editar Produto</h1>
      <ProductForm
        product={product}
        brands={brands}
        categories={categories}
        motorcycleModels={motorcycleModels}
        selectedCompatibilities={record.product_motorcycle_compatibility.map((c) => ({
          modelId: c.motorcycle_model_id,
          year: c.year ?? new Date().getFullYear(),
          yearEnd: c.year_end ?? c.year ?? new Date().getFullYear(),
        }))}
        initialImages={product.images || []}
      />
    </div>
  );
}
