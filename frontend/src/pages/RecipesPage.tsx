import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useRecipes } from "../api/queries";
import type { Difficulty, RecipeFilters } from "../api/types";
import { FilterBar } from "../components/FilterBar";
import { RecipeGrid, RecipeGridSkeleton } from "../components/RecipeGrid";
import { EmptyState, ErrorState } from "../components/States";

export function RecipesPage() {
  const [params, setParams] = useSearchParams();

  // Les filtres viennent de l'URL : partageables et compatibles avec "précédent".
  const filters = useMemo<RecipeFilters>(
    () => ({
      q: params.get("q") ?? undefined,
      difficulty: (params.get("difficulty") as Difficulty | null) ?? undefined,
      tag: params.get("tag") ?? undefined,
      ingredient: params.get("ingredient") ?? undefined,
    }),
    [params],
  );

  const { data, isPending, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useRecipes(filters);
  const recipes = data?.pages.flatMap((page) => page.recipes) ?? [];

  return (
    <div className="space-y-6">
      <FilterBar />

      {isPending ? (
        <RecipeGridSkeleton />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : recipes.length === 0 ? (
        <EmptyState title="Aucune recette ne correspond">
          <button type="button" className="btn-secondary" onClick={() => setParams({})}>
            Effacer les filtres
          </button>
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-stone-500">
            {recipes.length}
            {hasNextPage ? "+" : ""} recette{recipes.length > 1 ? "s" : ""}
          </p>
          <RecipeGrid recipes={recipes} />
          {hasNextPage && (
            <div className="flex justify-center">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Chargement…" : "Charger plus"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
