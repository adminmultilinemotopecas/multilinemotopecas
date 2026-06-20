"use client";

import { useMemo, useState } from "react";
import { Bike, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MotorcycleModelForm } from "@/components/admin/motorcycle-model-form";
import { cn } from "@/lib/utils";
import {
  formatModelYearSpan,
  getCurrentToLatestCompatibilityYears,
  getFullModelYearCompatibility,
  getModelYearRange,
  isFullModelYearRange,
  matchesMotorcycleModelSearch,
  type ModelCompatibilitySelection,
} from "@/lib/motorcycle-utils";
import type { MotorcycleModel } from "@/types/database";

interface ProductCompatibilitySectionProps {
  motorcycleModels: MotorcycleModel[];
  modelCompat: ModelCompatibilitySelection[];
  onModelCompatChange: (value: ModelCompatibilitySelection[]) => void;
  onModelsAdded: (models: MotorcycleModel[]) => void;
}

export function ProductCompatibilitySection({
  motorcycleModels,
  modelCompat,
  onModelCompatChange,
  onModelsAdded,
}: ProductCompatibilitySectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const sortedMotorcycleModels = useMemo(
    () =>
      [...motorcycleModels].sort((a, b) => {
        const brand = a.motorcycle_brand.localeCompare(b.motorcycle_brand, "pt-BR");
        if (brand !== 0) return brand;
        return a.model.localeCompare(b.model, "pt-BR");
      }),
    [motorcycleModels]
  );

  const existingBrands = useMemo(
    () => [...new Set(motorcycleModels.map((model) => model.motorcycle_brand))],
    [motorcycleModels]
  );

  const filteredModels = useMemo(
    () =>
      sortedMotorcycleModels.filter((model) =>
        matchesMotorcycleModelSearch(model, searchQuery)
      ),
    [sortedMotorcycleModels, searchQuery]
  );

  function toggleModel(model: MotorcycleModel, checked: boolean) {
    if (checked) {
      onModelCompatChange([
        ...modelCompat,
        { modelId: model.id, ...getCurrentToLatestCompatibilityYears(model) },
      ]);
      return;
    }

    onModelCompatChange(modelCompat.filter((item) => item.modelId !== model.id));
  }

  function updateSelection(
    modelId: string,
    updater: (current: ModelCompatibilitySelection) => ModelCompatibilitySelection
  ) {
    onModelCompatChange(
      modelCompat.map((item) => (item.modelId === modelId ? updater(item) : item))
    );
  }

  function handleModelCreated(model: MotorcycleModel) {
    onModelsAdded([model]);
    onModelCompatChange([
      ...modelCompat.filter((item) => item.modelId !== model.id),
      { modelId: model.id, ...getCurrentToLatestCompatibilityYears(model) },
    ]);
    setDialogOpen(false);
    setSearchQuery("");
  }

  return (
    <>
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bike className="h-5 w-5" />
                Modelos de Motos Compatíveis
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Busque por marca ou modelo, marque a compatibilidade e use &quot;Todos os
                anos&quot; quando a peça servir em toda a linha de fabricação.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Nova marca/modelo
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar marca ou modelo (ex: honda, factor, 150)..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{modelCompat.length} selecionado(s)</span>
            <span>
              {filteredModels.length} de {sortedMotorcycleModels.length} modelo(s)
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-hide">
            {filteredModels.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum modelo encontrado para &quot;{searchQuery.trim()}&quot;.
                <Button
                  type="button"
                  variant="link"
                  className="mt-2 h-auto p-0"
                  onClick={() => setDialogOpen(true)}
                >
                  Cadastrar nova marca/modelo
                </Button>
              </div>
            ) : (
              filteredModels.map((model) => {
                const selection = modelCompat.find((item) => item.modelId === model.id);
                const isSelected = Boolean(selection);
                const years = getModelYearRange(model);
                const allYearsSelected =
                  isSelected && selection
                    ? isFullModelYearRange(model, selection)
                    : false;

                return (
                  <div
                    key={model.id}
                    className={cn(
                      "flex flex-col gap-2 p-3 rounded-lg border transition-colors",
                      isSelected
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/60 hover:bg-muted/30"
                    )}
                  >
                    <label className="flex items-center gap-2 text-sm cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleModel(model, e.target.checked)}
                        className="rounded shrink-0"
                      />
                      <span className="truncate">
                        <span className="font-semibold text-foreground">
                          {model.motorcycle_brand}
                        </span>{" "}
                        {model.model}
                        {model.displacement && ` ${model.displacement}`}
                        {model.year_start && (
                          <span className="text-muted-foreground text-xs ml-1">
                            ({formatModelYearSpan(model)})
                          </span>
                        )}
                      </span>
                    </label>

                    {isSelected && selection && (
                      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 pl-6">
                        <div className="w-28">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Ano inicial
                          </Label>
                          <Select
                            value={String(selection.year)}
                            onValueChange={(value) => {
                              const newStart = parseInt(value, 10);
                              updateSelection(model.id, (item) => ({
                                ...item,
                                year: newStart,
                                yearEnd: item.yearEnd < newStart ? newStart : item.yearEnd,
                              }));
                            }}
                          >
                            <SelectTrigger className="mt-1 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {years.map((year) => (
                                <SelectItem key={year} value={String(year)}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-28">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Ano final
                          </Label>
                          <Select
                            value={String(selection.yearEnd)}
                            onValueChange={(value) => {
                              const newEnd = parseInt(value, 10);
                              updateSelection(model.id, (item) => ({
                                ...item,
                                year: item.year > newEnd ? newEnd : item.year,
                                yearEnd: newEnd,
                              }));
                            }}
                          >
                            <SelectTrigger className="mt-1 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {years
                                .filter((year) => year >= selection.year)
                                .map((year) => (
                                  <SelectItem key={year} value={String(year)}>
                                    {year}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <label className="flex items-center gap-2 text-xs cursor-pointer shrink-0 pb-1">
                          <input
                            type="checkbox"
                            checked={allYearsSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                updateSelection(model.id, (item) => ({
                                  ...item,
                                  ...getFullModelYearCompatibility(model),
                                }));
                              } else {
                                updateSelection(model.id, (item) => ({
                                  ...item,
                                  ...getCurrentToLatestCompatibilityYears(model),
                                }));
                              }
                            }}
                            className="rounded"
                          />
                          Todos os anos
                        </label>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar marca e modelo</DialogTitle>
            <DialogDescription>
              O novo modelo ficará disponível imediatamente nesta lista de compatibilidade.
            </DialogDescription>
          </DialogHeader>
          <MotorcycleModelForm
            embedded
            existingBrands={existingBrands}
            onSuccess={handleModelCreated}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
