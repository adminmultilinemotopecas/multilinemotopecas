import { notFound } from "next/navigation";
import { CrudForm } from "@/components/admin/crud-form";
import { prisma } from "@/lib/prisma";
import { mapBrand } from "@/lib/db/mappers";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBrandPage({ params }: PageProps) {
  const { id } = await params;
  const record = await prisma.brands.findUnique({ where: { id } });
  if (!record) notFound();

  const brand = mapBrand(record);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Editar Marca</h1>
      <CrudForm
        apiEndpoint="/api/admin/brands"
        id={id}
        initialData={{
          name: brand.name,
          description: brand.description ?? "",
          logo_url: brand.logo_url ?? "",
        }}
        redirectTo="/admin/marcas"
        fields={[
          { name: "name", label: "Nome", required: true },
          { name: "description", label: "Descrição", type: "textarea" },
          { name: "logo_url", label: "URL do Logo", type: "url" },
        ]}
      />
    </div>
  );
}
