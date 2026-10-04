import { Link } from "react-router-dom";
import { useFavorites } from "../api/queries";
import { RecipeGrid, RecipeGridSkeleton } from "../components/RecipeGrid";
import { EmptyState, ErrorState } from "../components/States";

export function FavoritesPage() {
  const { data: favorites, isPending, isError, error, refetch } = useFavorites();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mes favoris</h1>
      {isPending ? (
        <RecipeGridSkeleton count={4} />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : favorites.length === 0 ? (
        <EmptyState title="Pas encore de favoris">
          <p className="text-sm text-stone-500">Touche ♡ sur une recette pour la retrouver ici.</p>
          <Link to="/" className="btn-primary">
            Parcourir les recettes
          </Link>
        </EmptyState>
      ) : (
        <RecipeGrid recipes={favorites} />
      )}
    </div>
  );
}
