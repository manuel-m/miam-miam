// Types recopiés depuis api/app/schemas.py (à garder synchronisés).

export type Difficulty = "facile" | "moyen" | "difficile";

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "facile", label: "Facile" },
  { value: "moyen", label: "Moyen" },
  { value: "difficile", label: "Difficile" },
];

export interface Ingredient {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  position: number;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Recipe {
  id: number;
  title: string;
  source_url: string | null;
  difficulty: Difficulty | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  servings: number | null;
  steps: string[];
  notes: string | null;
  ingredients: Ingredient[];
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

export interface IngredientInput {
  name: string;
  quantity: number | null;
  unit: string | null;
}

/** Corps envoyé en POST /recipes et PUT /recipes/{id} (RecipeCreate). */
export interface RecipeInput {
  title: string;
  source_url: string | null;
  difficulty: Difficulty | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  servings: number | null;
  steps: string[];
  notes: string | null;
  ingredients: IngredientInput[];
  tags: string[];
}

export interface RecipeFilters {
  q?: string;
  difficulty?: Difficulty;
  tag?: string;
  ingredient?: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}
