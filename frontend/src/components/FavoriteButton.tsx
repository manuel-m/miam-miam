import { useState } from "react";
import { useFavoriteIds, useToggleFavorite } from "../api/queries";
import type { Recipe } from "../api/types";
import { useRequireLogin } from "../lib/navigation";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";

export function FavoriteButton({ recipe, size = "md" }: { recipe: Recipe; size?: "md" | "lg" }) {
  const favoriteIds = useFavoriteIds();
  const toggle = useToggleFavorite();
  const requireLogin = useRequireLogin();
  const { show } = useToast();
  const isFavorite = favoriteIds.has(recipe.id);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const setFavorite = (favorite: boolean) =>
    toggle.mutate(
      { recipe, favorite },
      {
        onSuccess: () => !favorite && show("Retiré des favoris"),
        onError: () => show("Impossible de modifier les favoris"),
      },
    );

  const onClick = () => {
    if (!requireLogin()) return;
    if (isFavorite) setConfirmRemove(true);
    else setFavorite(true);
  };

  return (
    <>
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
      <ConfirmDialog
        open={confirmRemove}
        title="Retirer des favoris ?"
        message={`« ${recipe.title} » ne sera plus dans tes favoris.`}
        confirmLabel="Retirer"
        danger
        onConfirm={() => {
          setConfirmRemove(false);
          setFavorite(false);
        }}
        onCancel={() => setConfirmRemove(false)}
      />
    </>
  );
}
