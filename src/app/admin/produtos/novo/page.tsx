import { ProductForm } from "@/components/admin/product-form";
import { getBrands, getCategories, getMotorcycleModels } from "@/lib/queries/catalog";
import { peekNextProductInternalCode } from "@/lib/queries/admin";

export default async function NewProductPage() {
  const [brands, categories, motorcycleModels, suggestedInternalCode] = await Promise.all([
    getBrands(),
    getCategories(),
    getMotorcycleModels(),
    peekNextProductInternalCode(),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Novo Produto</h1>
      <ProductForm
        brands={brands}
        categories={categories}
        motorcycleModels={motorcycleModels}
        suggestedInternalCode={suggestedInternalCode || undefined}
      />
    </div>
  );
}
