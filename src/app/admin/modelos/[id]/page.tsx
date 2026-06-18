import { notFound } from "next/navigation";
import { MotorcycleModelForm } from "@/components/admin/motorcycle-model-form";
import { prisma } from "@/lib/prisma";
import { mapMotorcycleModel } from "@/lib/db/mappers";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMotorcycleModelPage({ params }: PageProps) {
  const { id } = await params;
  const record = await prisma.motorcycle_models.findUnique({ where: { id } });
  if (!record) notFound();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Editar Modelo</h1>
      <MotorcycleModelForm model={mapMotorcycleModel(record)} />
    </div>
  );
}
