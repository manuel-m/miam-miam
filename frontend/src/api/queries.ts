import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "./client";
import { keys } from "./keys";
import type { Meal, MealInput, Recipe, RecipeFilters, RecipeInput, Tag } from "./types";

export const PAGE_SIZE = 24;

function recipesQueryString(filters: RecipeFilters, skip: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  params.set("skip", String(skip));
  params.set("limit", String(PAGE_SIZE + 1)); // +1 : pour savoir s'il reste une page
  return params.toString();
}

interface RecipePage {
  recipes: Recipe[];
  hasMore: boolean;
}

// --- Lectures -----------------------------------------------------------------

export function useRecipes(filters: RecipeFilters) {
  return useInfiniteQuery({
    queryKey: keys.recipeList(filters),
    queryFn: async ({ pageParam }): Promise<RecipePage> => {
      const recipes = await apiFetch<Recipe[]>(`/recipes?${recipesQueryString(filters, pageParam)}`);
      return { recipes: recipes.slice(0, PAGE_SIZE), hasMore: recipes.length > PAGE_SIZE };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length * PAGE_SIZE : undefined,
  });
}

export function useRecipe(id: number) {
  return useQuery({
    queryKey: keys.recipe(id),
    queryFn: () => apiFetch<Recipe>(`/recipes/${id}`),
    enabled: Number.isInteger(id),
  });
}

export function useTags() {
  return useQuery({
    queryKey: keys.tags,
    queryFn: () => apiFetch<Tag[]>("/tags"),
    staleTime: 5 * 60_000,
  });
}

export function useFavorites() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: keys.favorites,
    queryFn: () => apiFetch<Recipe[]>("/me/favorites"),
    enabled: isAuthenticated,
  });
}

/** Ids des recettes favorites, pour afficher ♥ / ♡ sur les cartes. */
export function useFavoriteIds(): Set<number> {
  const { data } = useFavorites();
  return useMemo(() => new Set(data?.map((r) => r.id)), [data]);
}

// --- Écritures ----------------------------------------------------------------

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipe, favorite }: { recipe: Recipe; favorite: boolean }) =>
      apiFetch<void>(`/me/favorites/${recipe.id}`, { method: favorite ? "PUT" : "DELETE" }),

    // Mise à jour optimiste : le cœur change tout de suite…
    onMutate: async ({ recipe, favorite }) => {
      await queryClient.cancelQueries({ queryKey: keys.favorites });
      const previous = queryClient.getQueryData<Recipe[]>(keys.favorites);
      queryClient.setQueryData<Recipe[]>(keys.favorites, (old = []) => {
        const others = old.filter((r) => r.id !== recipe.id);
        return favorite ? [...others, recipe] : others;
      });
      return { previous };
    },
    // …et revient en arrière si le serveur refuse.
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(keys.favorites, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.favorites }),
  });
}

export function useSaveRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: RecipeInput }) =>
      apiFetch<Recipe>(id ? `/recipes/${id}` : "/recipes", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (recipe) => {
      queryClient.setQueryData(keys.recipe(recipe.id), recipe);
      queryClient.invalidateQueries({ queryKey: keys.recipes });
      queryClient.invalidateQueries({ queryKey: keys.tags });
      queryClient.invalidateQueries({ queryKey: keys.favorites });
      queryClient.invalidateQueries({ queryKey: keys.meals });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/recipes/${id}`, { method: "DELETE" }),
    // Le cache de la fiche supprimée est retiré par la page, après avoir quitté la fiche
    // (sinon la fiche encore affichée la recharge et reçoit un 404).
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.recipes });
      queryClient.invalidateQueries({ queryKey: keys.favorites });
      queryClient.invalidateQueries({ queryKey: keys.meals });
    },
  });
}

/** Repas d'une recette, ou tous les repas (journal) sans recipeId. */
export function useMeals(recipeId?: number) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: keys.mealList(recipeId),
    queryFn: () => apiFetch<Meal[]>(recipeId ? `/me/meals?recipe_id=${recipeId}` : "/me/meals"),
    enabled: isAuthenticated,
  });
}

export function useAddMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MealInput) => apiFetch<Meal>("/me/meals", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.meals }),
  });
}

export function useDeleteMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/me/meals/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.meals }),
  });
}
