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

export interface ModelCompatibilitySelection {
  modelId: string;
  year: number;
  yearEnd: number;
}
