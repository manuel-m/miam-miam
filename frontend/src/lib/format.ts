import type { Recipe } from "../api/types";

const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function formatQuantity(value: number): string {
  return numberFormat.format(value);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

export function totalTime(recipe: Recipe): number | null {
  const { prep_time_min: prep, cook_time_min: cook } = recipe;
  if (prep == null && cook == null) return null;
  return (prep ?? 0) + (cook ?? 0);
}

export function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function isIncomplete(recipe: Recipe): boolean {
  return recipe.ingredients.length === 0 && recipe.steps.length === 0;
}

/** Teinte stable dérivée du titre, pour colorer les cartes sans photo. */
export function titleHue(title: string): number {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

/** "1,5" ou "1.5" -> 1.5 ; "" -> null ; texte invalide -> NaN. */
export function parseNumber(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  return Number(trimmed);
}
