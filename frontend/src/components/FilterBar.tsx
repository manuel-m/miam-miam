import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTags } from "../api/queries";
import { DIFFICULTIES } from "../api/types";
import { useDebouncedValue } from "../lib/useDebouncedValue";

/** Champ texte dont la valeur est synchronisée (avec un délai) avec un paramètre d'URL. */
function useDebouncedParam(name: string) {
  const [params, setParams] = useSearchParams();
  const paramValue = params.get(name) ?? "";
  const [value, setValue] = useState(paramValue);
  const debounced = useDebouncedValue(value);

  // URL -> champ (bouton précédent, "Effacer"…)
  useEffect(() => setValue(paramValue), [paramValue]);

  // champ -> URL, 300 ms après la dernière frappe. Le ref évite de ré-écrire une
  // ancienne valeur quand l'URL change par ailleurs (ex. "Effacer les filtres").
  const lastPushed = useRef(debounced);
  useEffect(() => {
    if (lastPushed.current === debounced) return;
    lastPushed.current = debounced;
    setParams(
      (prev) => {
        if ((prev.get(name) ?? "") === debounced.trim()) return prev;
        const next = new URLSearchParams(prev);
        if (debounced.trim()) next.set(name, debounced.trim());
        else next.delete(name);
        return next;
      },
      { replace: true },
    );
  }, [debounced, name, setParams]);

  return [value, setValue] as const;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-sm transition ${
        active
          ? "border-brand-500 bg-brand-500 text-white"
          : "border-stone-300 bg-white text-stone-700 hover:border-brand-500"
      }`}
    >
      {children}
    </button>
  );
}

export function FilterBar() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useDebouncedParam("q");
  const [ingredient, setIngredient] = useDebouncedParam("ingredient");
  const { data: tags = [] } = useTags();

  const difficulty = params.get("difficulty");
  const tag = params.get("tag");
  const hasFilters = [...params.keys()].length > 0;

  const toggleParam = (name: string, value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (next.get(name) === value) next.delete(name);
        else next.set(name, value);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <section className="space-y-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍  Rechercher une recette…"
        aria-label="Rechercher une recette"
        className="input w-full py-3 text-base"
      />

      <div className="flex flex-wrap items-center gap-2">
        {DIFFICULTIES.map((d) => (
          <Chip key={d.value} active={difficulty === d.value} onClick={() => toggleParam("difficulty", d.value)}>
            {d.label}
          </Chip>
        ))}
        <input
          type="search"
          value={ingredient}
          onChange={(e) => setIngredient(e.target.value)}
          placeholder="Ingrédient…"
          aria-label="Filtrer par ingrédient"
          className="input w-40 py-1 text-sm"
        />
        {hasFilters && (
          <button
            type="button"
            onClick={() => setParams({}, { replace: true })}
            className="ml-auto text-sm text-stone-500 underline-offset-2 hover:text-brand-600 hover:underline"
          >
            Effacer les filtres
          </button>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Chip key={t.id} active={tag === t.name} onClick={() => toggleParam("tag", t.name)}>
              {`#${t.name}`}
            </Chip>
          ))}
        </div>
      )}
    </section>
  );
}
