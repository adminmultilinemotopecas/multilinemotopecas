"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MotorcycleModel } from "@/types/database";

interface SmartSearchCardProps {
  motorcycleModels: MotorcycleModel[];
}

interface ModelGroup {
  key: string;
  model: string;
  displacement: string | null;
  yearStart: number;
  yearEnd: number;
  versionIds: string[];
}

const CURRENT_YEAR = new Date().getFullYear();

function buildModelGroups(models: MotorcycleModel[], brand: string): ModelGroup[] {
  const map = new Map<string, ModelGroup>();

  for (const m of models.filter((x) => x.motorcycle_brand === brand)) {
    const key = `${m.model}|${m.displacement ?? ""}`;
    const end = m.year_end ?? CURRENT_YEAR;
    const start = m.year_start ?? end;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        model: m.model,
        displacement: m.displacement,
        yearStart: start,
        yearEnd: end,
        versionIds: [m.id],
      });
    } else {
      existing.yearStart = Math.min(existing.yearStart, start);
      existing.yearEnd = Math.max(existing.yearEnd, end);
      existing.versionIds.push(m.id);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.model.localeCompare(b.model));
}

function buildYearRange(start: number, end: number): number[] {
  const years: number[] = [];
  for (let y = end; y >= start; y--) {
    years.push(y);
  }
  return years;
}

function resolveModelId(
  models: MotorcycleModel[],
  group: ModelGroup,
  year: number
): string | null {
  const match = models.find(
    (m) =>
      group.versionIds.includes(m.id) &&
      (m.year_start ?? 0) <= year &&
      (m.year_end ?? CURRENT_YEAR) >= year
  );
  return match?.id ?? group.versionIds[0] ?? null;
}

export function SmartSearchCard({ motorcycleModels }: SmartSearchCardProps) {
  const router = useRouter();

  const brands = useMemo(
    () => [...new Set(motorcycleModels.map((m) => m.motorcycle_brand))].sort(),
    [motorcycleModels]
  );

  const [brand, setBrand] = useState("");
  const [modelKey, setModelKey] = useState("");
  const [year, setYear] = useState("");

  const modelGroups = useMemo(
    () => (brand ? buildModelGroups(motorcycleModels, brand) : []),
    [motorcycleModels, brand]
  );

  const selectedGroup = useMemo(
    () => modelGroups.find((g) => g.key === modelKey) ?? null,
    [modelGroups, modelKey]
  );

  const availableYears = useMemo(
    () => (selectedGroup ? buildYearRange(selectedGroup.yearStart, selectedGroup.yearEnd) : []),
    [selectedGroup]
  );

  useEffect(() => {
    if (!brand && brands.length > 0) {
      setBrand(brands[0]);
    }
  }, [brands, brand]);

  useEffect(() => {
    if (availableYears.length > 0) {
      setYear(String(availableYears[0]));
    } else {
      setYear("");
    }
  }, [modelKey, availableYears]);

  function handleBrandChange(value: string) {
    setBrand(value);
    setModelKey("");
    setYear("");
  }

  function handleModelChange(value: string) {
    setModelKey(value);
  }

  function formatModelLabel(group: ModelGroup) {
    return group.displacement ? `${group.model} (${group.displacement})` : group.model;
  }

  function handleSearch() {
    if (!selectedGroup) {
      if (brand) {
        router.push(`/busca?q=${encodeURIComponent(brand)}`);
      }
      return;
    }

    const yearNum = year ? parseInt(year, 10) : null;
    const modelId =
      yearNum !== null
        ? resolveModelId(motorcycleModels, selectedGroup, yearNum)
        : selectedGroup.versionIds[0];

    if (modelId) {
      const params = new URLSearchParams({ moto: modelId });
      if (yearNum) params.set("ano", String(yearNum));
      router.push(`/produtos?${params.toString()}`);
      return;
    }

    const query = [brand, selectedGroup.model, year].filter(Boolean).join(" ");
    router.push(`/busca?q=${encodeURIComponent(query)}`);
  }

  if (brands.length === 0) {
    return (
      <div className="rounded-2xl border border-border/80 bg-card/90 p-8 text-center text-muted-foreground text-sm">
        Cadastre modelos de motos no painel admin para ativar a busca inteligente.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-6 md:p-8 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 mb-6">
        <Search className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Busca Inteligente</h2>
      </div>

      <div className="space-y-5">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            1. Marca da Moto
          </Label>
          <Select value={brand} onValueChange={handleBrandChange}>
            <SelectTrigger className="mt-2 h-12 bg-secondary border-border/60 rounded-xl">
              <SelectValue placeholder="Selecione a marca" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            2. Modelo
          </Label>
          <Select value={modelKey} onValueChange={handleModelChange}>
            <SelectTrigger className="mt-2 h-12 bg-secondary border-border/60 rounded-xl">
              <SelectValue placeholder="Selecione o modelo" />
            </SelectTrigger>
            <SelectContent>
              {modelGroups.map((group) => (
                <SelectItem key={group.key} value={group.key}>
                  {formatModelLabel(group)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            3. Ano da Moto
          </Label>
          <Select
            value={year}
            onValueChange={setYear}
            disabled={!selectedGroup || availableYears.length === 0}
          >
            <SelectTrigger className="mt-2 h-12 bg-secondary border-border/60 rounded-xl">
              <SelectValue
                placeholder={
                  selectedGroup ? "Selecione o ano" : "Selecione o modelo primeiro"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedGroup && (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Fabricação: {selectedGroup.yearStart}
              {selectedGroup.yearEnd >= CURRENT_YEAR
                ? " até atual"
                : ` até ${selectedGroup.yearEnd}`}
            </p>
          )}
        </div>

        <Button
          onClick={handleSearch}
          size="lg"
          disabled={!selectedGroup}
          className="w-full h-14 rounded-xl font-extrabold uppercase tracking-widest text-base mt-2"
        >
          Encontrar Peças
        </Button>
      </div>
    </div>
  );
}
