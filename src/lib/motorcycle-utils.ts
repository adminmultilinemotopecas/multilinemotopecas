import type { MotorcycleModel } from "@/types/database";

export const CURRENT_YEAR = new Date().getFullYear();

export function buildYearRange(start: number, end: number): number[] {
  const years: number[] = [];
  for (let y = end; y >= start; y--) {
    years.push(y);
  }
  return years;
}

export function getModelYearRange(model: MotorcycleModel): number[] {
  const end = model.year_end ?? CURRENT_YEAR;
  const start = model.year_start ?? end;
  return buildYearRange(start, end);
}

export function getDefaultModelYear(model: MotorcycleModel): number {
  const years = getModelYearRange(model);
  return years[years.length - 1] ?? CURRENT_YEAR;
}

export function getDefaultModelYearEnd(model: MotorcycleModel): number {
  const years = getModelYearRange(model);
  return years[0] ?? CURRENT_YEAR;
}

export function getDefaultCompatibilityYears(model: MotorcycleModel): {
  year: number;
  yearEnd: number;
} {
  return {
    year: getDefaultModelYear(model),
    yearEnd: getDefaultModelYearEnd(model),
  };
}

export function getFullModelYearCompatibility(model: MotorcycleModel): {
  year: number;
  yearEnd: number;
} {
  const years = getModelYearRange(model);
  return {
    year: years[years.length - 1] ?? CURRENT_YEAR,
    yearEnd: years[0] ?? CURRENT_YEAR,
  };
}

export function isFullModelYearRange(
  model: MotorcycleModel,
  selection: { year: number; yearEnd: number }
): boolean {
  const full = getFullModelYearCompatibility(model);
  return selection.year === full.year && selection.yearEnd === full.yearEnd;
}

export function formatModelYearSpan(model: MotorcycleModel): string {
  if (!model.year_start) return "";
  if (model.year_end && model.year_end >= CURRENT_YEAR) {
    return `${model.year_start}+`;
  }
  if (model.year_end) {
    return `${model.year_start}-${model.year_end}`;
  }
  return String(model.year_start);
}

export function matchesMotorcycleModelSearch(
  model: MotorcycleModel,
  query: string
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    model.motorcycle_brand,
    model.model,
    model.displacement ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

export interface ModelCompatibilitySelection {
  modelId: string;
  year: number;
  yearEnd: number;
}
