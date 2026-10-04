import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { keys } from "../api/keys";
import { useDeleteRecipe, useRecipe } from "../api/queries";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { FavoriteButton } from "../components/FavoriteButton";
import { IngredientChecklist } from "../components/IngredientChecklist";
import { ErrorState } from "../components/States";
import { useToast } from "../components/Toast";
import { formatDuration, isIncomplete, sourceDomain } from "../lib/format";
import { useRequireLogin } from "../lib/navigation";
import { NotFoundPage } from "./NotFoundPage";

export function RecipePage() {
  const id = Number(useParams().id);
  const { data: recipe, isPending, isError, error, refetch } = useRecipe(id);
  const deleteRecipe = useDeleteRecipe();
  const requireLogin = useRequireLogin();
  const navigate = useNavigate();
  const { show } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();

  if (isPending) return <div className="h-64 animate-pulse rounded-2xl bg-stone-200/70" />;
  if (isError) {
    if (error instanceof ApiError && error.status === 404) return <NotFoundPage message="Recette introuvable." />;
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  }

  const editPath = `/recettes/${recipe.id}/modifier`;
  const onDelete = () => {
    setConfirmDelete(false);
    deleteRecipe.mutate(recipe.id, {
      onSuccess: () => {
        show("Recette supprimée");
        navigate("/");
        queryClient.removeQueries({ queryKey: keys.recipe(recipe.id) });
      },
      onError: () => show("La suppression a échoué"),
    });
  };

  return (
    <article className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => navigate(-1)} className="text-sm text-stone-500 hover:text-stone-800">
          ← Retour
        </button>
        <div className="flex items-center gap-1">
          <FavoriteButton recipe={recipe} size="lg" />
          <button type="button" className="btn-secondary" onClick={() => requireLogin() && navigate(editPath)}>
            ✎ Modifier
          </button>
          <button
            type="button"
            className="btn-secondary text-rose-600"
            aria-label="Supprimer la recette"
            onClick={() => requireLogin() && setConfirmDelete(true)}
          >
            🗑
          </button>
        </div>
      </div>

      <header className="space-y-3">
        <h1 className="text-3xl font-bold leading-tight">{recipe.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-stone-600">
          <DifficultyBadge difficulty={recipe.difficulty} />
          {recipe.prep_time_min != null && <span>⏱ Prépa {formatDuration(recipe.prep_time_min)}</span>}
          {recipe.cook_time_min != null && <span>🔥 Cuisson {formatDuration(recipe.cook_time_min)}</span>}
          {recipe.tags.map((tag) => (
            <Link key={tag.id} to={`/?tag=${encodeURIComponent(tag.name)}`} className="text-stone-500 hover:text-brand-600">
              #{tag.name}
            </Link>
          ))}
        </div>
        {recipe.source_url && (
          <a href={recipe.source_url} target="_blank" rel="noreferrer" className="inline-block text-sm text-brand-600 hover:underline">
            Voir la recette originale ↗ <span className="text-stone-400">({sourceDomain(recipe.source_url)})</span>
          </a>
        )}
      </header>

      {isIncomplete(recipe) ? (
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <p className="text-lg font-medium">Cette recette n'a pas encore de détails</p>
          <p className="max-w-md text-sm text-stone-500">
            Ajoute les ingrédients et les étapes pour pouvoir cuisiner directement depuis cette page.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {recipe.source_url && (
              <a href={recipe.source_url} target="_blank" rel="noreferrer" className="btn-secondary">
                Voir l'originale ↗
              </a>
            )}
            <button type="button" className="btn-primary" onClick={() => requireLogin() && navigate(editPath)}>
              Compléter la recette
            </button>
          </div>
        </section>
      ) : (
        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {recipe.ingredients.length > 0 ? (
            <IngredientChecklist key={recipe.id} ingredients={recipe.ingredients} servings={recipe.servings} />
          ) : (
            <div />
          )}
          {recipe.steps.length > 0 && (
            <section className="rounded-2xl border border-stone-200 bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold">Étapes</h2>
              <ol className="space-y-4">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                      {i + 1}
                    </span>
                    <p className="pt-0.5 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}

      {recipe.notes && (
        <section className="rounded-2xl bg-amber-50 p-5 text-amber-900">
          <h2 className="mb-1 font-semibold">Notes</h2>
          <p className="whitespace-pre-line">{recipe.notes}</p>
        </section>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer cette recette ?"
        message={`« ${recipe.title} » sera définitivement supprimée.`}
        confirmLabel="Supprimer"
        danger
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </article>
  );
}
