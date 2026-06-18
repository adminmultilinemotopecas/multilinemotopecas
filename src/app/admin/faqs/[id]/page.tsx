import { notFound } from "next/navigation";
import { CrudForm } from "@/components/admin/crud-form";
import { prisma } from "@/lib/prisma";
import { mapFAQ } from "@/lib/db/mappers";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFaqPage({ params }: PageProps) {
  const { id } = await params;
  const record = await prisma.faqs.findUnique({ where: { id } });
  if (!record) notFound();

  const faq = mapFAQ(record);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Editar FAQ</h1>
      <CrudForm
        apiEndpoint="/api/admin/faqs"
        id={id}
        initialData={{
          question: faq.question,
          answer: faq.answer,
          sort_order: String(faq.sort_order),
          is_active: faq.is_active,
        }}
        redirectTo="/admin/faqs"
        fields={[
          { name: "question", label: "Pergunta", type: "textarea", required: true },
          { name: "answer", label: "Resposta", type: "textarea", required: true },
          { name: "sort_order", label: "Ordem", type: "number" },
          { name: "is_active", label: "Ativa", type: "checkbox" },
        ]}
      />
    </div>
  );
}
