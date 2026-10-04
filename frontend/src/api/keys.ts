import type { RecipeFilters } from "./types";

/** Clés TanStack Query, centralisées pour invalider les bons caches après une mutation. */
export const keys = {
  recipes: ["recipes"] as const,
  recipeList: (filters: RecipeFilters) => ["recipes", filters] as const,
  recipe: (id: number) => ["recipe", id] as const,
  tags: ["tags"] as const,
  favorites: ["favorites"] as const,
  meals: ["meals"] as const,
  mealList: (username: string | null, recipeId?: number) => ["meals", username, recipeId ?? "all"] as const,
};
