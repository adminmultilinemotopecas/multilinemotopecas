import { CrudForm } from "@/components/admin/crud-form";

export default function NewFaqPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Nova FAQ</h1>
      <CrudForm
        apiEndpoint="/api/admin/faqs"
        redirectTo="/admin/faqs"
        fields={[
          { name: "question", label: "Pergunta", type: "textarea", required: true },
          { name: "answer", label: "Resposta", type: "textarea", required: true },
          { name: "sort_order", label: "Ordem", type: "number" },
        ]}
      />
    </div>
  );
}
