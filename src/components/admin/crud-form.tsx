"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { Loader2, Save } from "lucide-react";

interface Field {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "url";
  required?: boolean;
}

interface CrudFormProps {
  table: string;
  fields: Field[];
  initialData?: Record<string, unknown>;
  id?: string;
  slugField?: string;
  redirectTo: string;
}

export function CrudForm({
  table,
  fields,
  initialData = {},
  id,
  slugField = "name",
  redirectTo,
}: CrudFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(
    fields.reduce(
      (acc, f) => ({
        ...acc,
        [f.name]: String(initialData[f.name] ?? ""),
      }),
      {}
    )
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const data: Record<string, unknown> = { ...form };

    if (!id && slugField && form[slugField]) {
      data.slug = slugify(form[slugField]);
    }

    fields.forEach((f) => {
      if (f.type === "number" && form[f.name]) {
        data[f.name] = parseFloat(form[f.name]);
      }
      if (!form[f.name]) data[f.name] = null;
    });

    if (id) {
      await supabase.from(table).update(data).eq("id", id);
    } else {
      await supabase.from(table).insert(data);
    }

    setLoading(false);
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          {fields.map((field) => (
            <div key={field.name}>
              <Label>{field.label}{field.required && " *"}</Label>
              {field.type === "textarea" ? (
                <textarea
                  value={form[field.name]}
                  onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                  required={field.required}
                  className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                />
              ) : (
                <Input
                  type={field.type || "text"}
                  value={form[field.name]}
                  onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                  required={field.required}
                  className="mt-1"
                />
              )}
            </div>
          ))}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
