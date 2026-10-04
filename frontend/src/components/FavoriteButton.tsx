import { useFavoriteIds, useToggleFavorite } from "../api/queries";
import type { Recipe } from "../api/types";
import { useRequireLogin } from "../lib/navigation";
import { useToast } from "./Toast";

export function FavoriteButton({ recipe, size = "md" }: { recipe: Recipe; size?: "md" | "lg" }) {
  const favoriteIds = useFavoriteIds();
  const toggle = useToggleFavorite();
  const requireLogin = useRequireLogin();
  const { show } = useToast();
  const isFavorite = favoriteIds.has(recipe.id);

  const onClick = () => {
    if (!requireLogin()) return;
    const favorite = !isFavorite;
    toggle.mutate(
      { recipe, favorite },
      { onError: () => show("Impossible de modifier les favoris") },
    );
    if (!favorite) {
      show("Retiré des favoris", {
        label: "Annuler",
        onClick: () => toggle.mutate({ recipe, favorite: true }),
      });
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={`relative z-10 grid place-items-center rounded-full transition hover:bg-rose-50 active:scale-90 ${
        size === "lg" ? "size-11 text-2xl" : "size-9 text-xl"
      } ${isFavorite ? "text-rose-500" : "text-stone-400 hover:text-rose-400"}`}
    >
      {isFavorite ? "♥" : "♡"}
    </button>
  );
}
