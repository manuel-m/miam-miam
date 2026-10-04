import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAddMeal, useDeleteMeal, useMeals } from "../api/queries";
import { useAuth } from "../auth/AuthProvider";
import { useRequireLogin } from "../lib/navigation";
import type { Meal } from "../api/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";

const today = () => new Date().toLocaleDateString("sv-SE"); // AAAA-MM-JJ en heure locale
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

/** « J'en ai mangé » : saisie d'un repas (date, étoiles, commentaire) + historique pour cette recette. */
export function MealLog({ recipeId }: { recipeId: number }) {
  const { isAuthenticated } = useAuth();
  const requireLogin = useRequireLogin();
  const { data: meals = [] } = useMeals(recipeId);
  const addMeal = useAddMeal();
  const { show } = useToast();
  const [eatenOn, setEatenOn] = useState(today);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!requireLogin()) return;
    addMeal.mutate(
      { recipe_id: recipeId, eaten_on: eatenOn, rating, comment: comment.trim() || null },
      {
        onSuccess: () => {
          show("Repas enregistré");
          setRating(null);
          setComment("");
        },
        onError: () => show("L'enregistrement a échoué"),
      },
    );
  };

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">J'en ai mangé</h2>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[auto_auto_1fr_auto] sm:items-end">
        <label>
          <span className="label">Date</span>
          <input type="date" required max={today()} value={eatenOn} onChange={(e) => setEatenOn(e.target.value)} className="input" />
        </label>
        <fieldset>
          <legend className="label">Note</legend>
          <div className="flex text-2xl leading-9">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="cursor-pointer text-amber-400 has-focus-visible:outline-2">
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  checked={rating === n}
                  onChange={() => setRating(n)}
                  onClick={() => rating === n && setRating(null)} // re-cliquer efface la note
                  className="sr-only"
                  aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                />
                {rating != null && n <= rating ? "★" : "☆"}
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          <span className="label">Commentaire</span>
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Un peu trop salé…" className="input w-full" />
        </label>
        <button type="submit" className="btn-primary" disabled={addMeal.isPending}>
          Enregistrer
        </button>
      </form>

      {isAuthenticated && <MealList meals={meals} />}
    </section>
  );
}

/** Liste de repas ; withRecipe ajoute le lien vers la recette (page Journal). */
export function MealList({ meals, withRecipe = false }: { meals: Meal[]; withRecipe?: boolean }) {
  const deleteMeal = useDeleteMeal();
  const { show } = useToast();
  const [toDelete, setToDelete] = useState<Meal | null>(null);
  if (meals.length === 0) return null;

  return (
    <>
      <ul className="mt-5 divide-y divide-stone-100 border-t border-stone-100">
        {meals.map((meal) => (
          <li key={meal.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-3 text-sm">
            <span className="w-24 shrink-0 text-stone-500">
              {new Date(meal.eaten_on + "T00:00").toLocaleDateString("fr-FR")}
            </span>
            {meal.rating != null && (
              <span className="shrink-0 text-amber-400" aria-label={`${meal.rating} sur 5`}>
                {stars(meal.rating)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              {withRecipe && (
                <Link to={`/recettes/${meal.recipe_id}`} className="font-medium hover:text-brand-600">
                  {meal.recipe_title}
                </Link>
              )}
              <p className="whitespace-pre-line text-stone-700">{meal.comment}</p>
            </div>
            <button
              type="button"
              aria-label="Supprimer ce repas"
              className="text-stone-400 hover:text-rose-600"
              onClick={() => setToDelete(meal)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={toDelete != null}
        title="Supprimer ce repas ?"
        message={toDelete ? `${toDelete.recipe_title}, le ${new Date(toDelete.eaten_on + "T00:00").toLocaleDateString("fr-FR")}, sera définitivement supprimé.` : ""}
        confirmLabel="Supprimer"
        danger
        onConfirm={() => {
          if (toDelete) deleteMeal.mutate(toDelete.id, { onSuccess: () => show("Repas supprimé"), onError: () => show("La suppression a échoué") });
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
