"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminFetch, AdminApiError } from "@/lib/admin/client";
import type { Category } from "@/types/database";
import { Loader2, Save } from "lucide-react";

interface CategoryFormProps {
  category?: Category;
  parentCategories: Category[];
}

export function CategoryForm({ category, parentCategories }: CategoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: category?.name || "",
    description: category?.description || "",
    image_url: category?.image_url || "",
    parent_id: category?.parent_id || "none",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const data = {
      name: form.name,
      description: form.description || null,
      image_url: form.image_url || null,
      parent_id: form.parent_id === "none" ? null : form.parent_id,
    };

    try {
      if (category) {
        await adminFetch(`/api/admin/categories/${category.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        await adminFetch("/api/admin/categories", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }

      router.push("/admin/categorias");
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
          <div>
            <Label>Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
            />
          </div>
          <div>
            <Label>URL da Imagem</Label>
            <Input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Categoria Pai</Label>
            <Select
              value={form.parent_id}
              onValueChange={(v) => setForm({ ...form, parent_id: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Nenhuma (categoria principal)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {parentCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
