import { ProductForm } from "@/components/admin/product-form";
import { getBrands, getCategories, getMotorcycleModels } from "@/lib/queries/catalog";
import { requireAdmin } from "@/lib/admin-auth";
import { peekNextProductInternalCodeForAdmin } from "@/lib/queries/admin";

export default async function NewProductPage() {
  const { user } = await requireAdmin();

  const [brands, categories, motorcycleModels, suggestedInternalCode] = await Promise.all([
    getBrands(),
    getCategories(),
    getMotorcycleModels(),
    user ? peekNextProductInternalCodeForAdmin(user.id) : Promise.resolve(null),
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
