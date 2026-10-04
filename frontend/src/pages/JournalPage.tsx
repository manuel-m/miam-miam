import { Link } from "react-router-dom";
import { useMeals } from "../api/queries";
import { MealList } from "../components/MealLog";
import { EmptyState, ErrorState } from "../components/States";

export function JournalPage() {
  const { data: meals, isPending, isError, error, refetch } = useMeals();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mon journal</h1>
      {isPending ? (
        <div className="h-40 animate-pulse rounded-2xl bg-stone-200/70" />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : meals.length === 0 ? (
        <EmptyState title="Aucun repas enregistré">
          <p className="text-sm text-stone-500">Sur une fiche recette, utilise « J'en ai mangé ».</p>
          <Link to="/" className="btn-primary">
            Parcourir les recettes
          </Link>
        </EmptyState>
      ) : (
        <section className="rounded-2xl border border-stone-200 bg-white px-5 pb-2 [&>ul]:mt-0 [&>ul]:border-t-0">
          <MealList meals={meals} withRecipe />
        </section>
      )}
    </div>
  );
}
