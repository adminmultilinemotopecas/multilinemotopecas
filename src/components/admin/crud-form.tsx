"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { adminFetch, AdminApiError } from "@/lib/admin/client";
import { Loader2, Save } from "lucide-react";

interface Field {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "url" | "checkbox";
  required?: boolean;
}

interface CrudFormProps {
  apiEndpoint: string;
  fields: Field[];
  initialData?: Record<string, unknown>;
  id?: string;
  redirectTo: string;
}

export function CrudForm({
  apiEndpoint,
  fields,
  initialData = {},
  id,
  redirectTo,
}: CrudFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string | boolean>>(
    fields.reduce(
      (acc, field) => ({
        ...acc,
        [field.name]:
          field.type === "checkbox"
            ? Boolean(initialData[field.name] ?? true)
            : String(initialData[field.name] ?? ""),
      }),
      {}
    )
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const data: Record<string, unknown> = {};

    fields.forEach((field) => {
      if (field.type === "checkbox") {
        data[field.name] = Boolean(form[field.name]);
        return;
      }

      const value = String(form[field.name] ?? "").trim();

      if (field.type === "number") {
        data[field.name] = value ? parseFloat(value) : 0;
        return;
      }

      data[field.name] = value || null;
    });

    try {
      if (id) {
        await adminFetch(`${apiEndpoint}/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        await adminFetch(apiEndpoint, {
          method: "POST",
          body: JSON.stringify(data),
        });
      }

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {fields.map((field) => (
            <div key={field.name}>
              <Label>
                {field.label}
                {field.required && " *"}
              </Label>
              {field.type === "textarea" ? (
                <textarea
                  value={String(form[field.name] ?? "")}
                  onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                  required={field.required}
                  className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                />
              ) : field.type === "checkbox" ? (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(form[field.name])}
                    onChange={(e) =>
                      setForm({ ...form, [field.name]: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm text-muted-foreground">Sim</span>
                </div>
              ) : (
                <Input
                  type={field.type || "text"}
                  value={String(form[field.name] ?? "")}
                  onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                  required={field.required}
                  className="mt-1"
                />
              )}
            </div>
          ))}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
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
