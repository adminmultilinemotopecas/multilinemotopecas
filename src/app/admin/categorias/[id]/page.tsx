import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/category-form";
import { getCategories } from "@/lib/queries/catalog";
import { prisma } from "@/lib/prisma";
import { mapCategory } from "@/lib/db/mappers";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: PageProps) {
  const { id } = await params;
  const record = await prisma.categories.findUnique({ where: { id } });
  if (!record) notFound();

  const categories = await getCategories();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Editar Categoria</h1>
      <CategoryForm category={mapCategory(record)} parentCategories={categories} />
    </div>
  );
}
