import { notFound } from "next/navigation";
import { MotorcycleModelForm } from "@/components/admin/motorcycle-model-form";
import { createClient } from "@/lib/supabase/server";
import type { MotorcycleModel } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditModelPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("motorcycle_models").select("*").eq("id", id).single();
  if (!data) notFound();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Editar Modelo</h1>
      <MotorcycleModelForm model={data as MotorcycleModel} />
    </div>
  );
}
