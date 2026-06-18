import { CrudForm } from "@/components/admin/crud-form";

export default function NewBrandPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Nova Marca</h1>
      <CrudForm
        apiEndpoint="/api/admin/brands"
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
