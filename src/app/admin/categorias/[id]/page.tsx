import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/category-form";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/queries/catalog";
import type { Category } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").eq("id", id).single();
  if (!data) notFound();
  const categories = await getCategories();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Editar Categoria</h1>
      <CategoryForm category={data as Category} parentCategories={categories} />
    </div>
  );
}
