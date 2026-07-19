export const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
] as const;

export const monthName = (m: number) => MONTHS_FR[m - 1] ?? "—";

export const YEARS = Array.from({ length: 2030 - 2017 + 1 }, (_, i) => 2017 + i);
