import { CategoryForm } from "@/components/admin/category-form";
import { getCategories } from "@/lib/queries/catalog";

export default async function NewCategoryPage() {
  const categories = await getCategories();
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Nova Categoria</h1>
      <CategoryForm parentCategories={categories} />
    </div>
  );
}
