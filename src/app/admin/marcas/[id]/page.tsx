import { notFound } from "next/navigation";
import { CrudForm } from "@/components/admin/crud-form";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBrandPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("brands").select("*").eq("id", id).single();
  if (!data) notFound();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Editar Marca</h1>
      <CrudForm
        table="brands"
        id={id}
        initialData={data}
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
