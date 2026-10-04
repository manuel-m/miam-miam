import { useState } from "react";
import type { Ingredient } from "../api/types";
import { formatQuantity } from "../lib/format";

interface Props {
  ingredients: Ingredient[];
  servings: number | null;
}

/** Liste à cocher pendant qu'on cuisine + ajusteur de portions (non enregistrés). */
export function IngredientChecklist({ ingredients, servings }: Props) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [portions, setPortions] = useState(servings ?? 0);
  const factor = servings ? portions / servings : 1;

  const toggle = (id: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Ingrédients</h2>
        {servings != null && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-stone-500">Portions</span>
            <button
              type="button"
              className="btn-icon"
              onClick={() => setPortions((p) => Math.max(1, p - 1))}
              aria-label="Une portion de moins"
            >
              −
            </button>
            <span className="w-6 text-center font-semibold tabular-nums">{portions}</span>
            <button type="button" className="btn-icon" onClick={() => setPortions((p) => p + 1)} aria-label="Une portion de plus">
              +
            </button>
          </div>
        )}
      </div>

      <ul className="space-y-1">
        {ingredients.map((ing) => {
          const done = checked.has(ing.id);
          return (
            <li key={ing.id}>
              <label className="flex cursor-pointer items-baseline gap-3 rounded-lg px-2 py-1.5 hover:bg-stone-50">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggle(ing.id)}
                  className="size-4 translate-y-0.5 accent-brand-500"
                />
                <span className={done ? "text-stone-400 line-through" : ""}>
                  {ing.quantity != null && (
                    <span className="font-medium tabular-nums">{formatQuantity(ing.quantity * factor)} </span>
                  )}
                  {ing.unit && <span className="font-medium">{ing.unit} </span>}
                  {ing.name}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
