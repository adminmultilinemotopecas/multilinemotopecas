"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import type { Brand, Category, MotorcycleModel } from "@/types/database";

interface CatalogFiltersProps {
  brands: Brand[];
  categories: Category[];
  motorcycleModels: MotorcycleModel[];
}

export function CatalogFilters({
  brands,
  categories,
  motorcycleModels,
}: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  function clearFilters() {
    router.push(pathname);
  }

  const hasFilters = Array.from(searchParams.keys()).some(
    (k) => !["page", "sort", "q"].includes(k)
  );

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filtros</h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs">
            <X className="h-3 w-3" />
            Limpar
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Marca</Label>
          <Select
            value={searchParams.get("brand") || ""}
            onValueChange={(v) => updateFilter("brand", v || null)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Todas as marcas" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Categoria</Label>
          <Select
            value={searchParams.get("category") || ""}
            onValueChange={(v) => updateFilter("category", v || null)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Modelo da Moto</Label>
          <Select
            value={searchParams.get("moto") || ""}
            onValueChange={(v) => updateFilter("moto", v || null)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Todos os modelos" />
            </SelectTrigger>
            <SelectContent>
              {motorcycleModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.motorcycle_brand} {model.model}{" "}
                  {model.displacement && `(${model.displacement})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Preço mín.</Label>
            <Input
              type="number"
              placeholder="R$ 0"
              className="mt-1"
              defaultValue={searchParams.get("min_price") || ""}
              onBlur={(e) => updateFilter("min_price", e.target.value || null)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Preço máx.</Label>
            <Input
              type="number"
              placeholder="R$ 999"
              className="mt-1"
              defaultValue={searchParams.get("max_price") || ""}
              onBlur={(e) => updateFilter("max_price", e.target.value || null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
