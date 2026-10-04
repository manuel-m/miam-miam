import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { useRecipe, useSaveRecipe, useTags } from "../api/queries";
import { DIFFICULTIES, type Difficulty, type Recipe, type RecipeInput } from "../api/types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ErrorState } from "../components/States";
import { TagInput } from "../components/TagInput";
import { useToast } from "../components/Toast";
import { parseNumber } from "../lib/format";
import { NotFoundPage } from "./NotFoundPage";

// --- État du formulaire ---------------------------------------------------------
// Les nombres restent des chaînes pendant la saisie (champ vide, "1,5"…) et ne sont
// convertis qu'à l'enregistrement. Chaque ligne a une `key` stable pour React.

interface IngredientRow {
  key: string;
  quantity: string;
  unit: string;
  name: string;
}

interface StepRow {
  key: string;
  text: string;
}

interface FormState {
  title: string;
  source_url: string;
  difficulty: Difficulty | "";
  prep_time_min: string;
  cook_time_min: string;
  servings: string;
  ingredients: IngredientRow[];
  steps: StepRow[];
  tags: string[];
  notes: string;
}

type Errors = Partial<Record<"title" | "source_url" | "numbers" | "ingredients" | "form", string>>;

const newKey = () => crypto.randomUUID();
const emptyIngredient = (): IngredientRow => ({ key: newKey(), quantity: "", unit: "", name: "" });
const emptyStep = (): StepRow => ({ key: newKey(), text: "" });

function toFormState(recipe?: Recipe): FormState {
  return {
    title: recipe?.title ?? "",
    source_url: recipe?.source_url ?? "",
    difficulty: recipe?.difficulty ?? "",
    prep_time_min: recipe?.prep_time_min?.toString() ?? "",
    cook_time_min: recipe?.cook_time_min?.toString() ?? "",
    servings: recipe?.servings?.toString() ?? "",
    ingredients: recipe?.ingredients.length
      ? recipe.ingredients.map((i) => ({
          key: newKey(),
          quantity: i.quantity?.toString().replace(".", ",") ?? "",
          unit: i.unit ?? "",
          name: i.name,
        }))
      : [emptyIngredient()],
    steps: recipe?.steps.length ? recipe.steps.map((text) => ({ key: newKey(), text })) : [emptyStep()],
    tags: recipe?.tags.map((t) => t.name) ?? [],
    notes: recipe?.notes ?? "",
  };
}

/** Comparaison sans les `key` (qui changent à chaque création de ligne). */
function snapshot(state: FormState): string {
  return JSON.stringify({
    ...state,
    ingredients: state.ingredients.map(({ key: _key, ...rest }) => rest),
    steps: state.steps.map((s) => s.text),
  });
}

function validate(state: FormState): { input?: RecipeInput; errors: Errors } {
  const errors: Errors = {};
  if (!state.title.trim()) errors.title = "Le titre est obligatoire.";

  const numbers = {
    prep_time_min: parseNumber(state.prep_time_min),
    cook_time_min: parseNumber(state.cook_time_min),
    servings: parseNumber(state.servings),
  };
  if (Object.values(numbers).some((n) => n !== null && (!Number.isInteger(n) || n < 0))) {
    errors.numbers = "Les temps et les portions doivent être des nombres entiers positifs.";
  } else if (numbers.servings === 0) {
    errors.numbers = "Il faut au moins 1 portion.";
  }

  const ingredientRows = state.ingredients.filter((r) => r.name.trim() || r.quantity.trim() || r.unit.trim());
  const ingredients = ingredientRows.map((r) => ({
    name: r.name.trim(),
    quantity: parseNumber(r.quantity),
    unit: r.unit.trim() || null,
  }));
  if (ingredients.some((i) => !i.name)) {
    errors.ingredients = "Chaque ingrédient doit avoir un nom.";
  } else if (ingredients.some((i) => i.quantity !== null && (Number.isNaN(i.quantity) || i.quantity < 0))) {
    errors.ingredients = "Les quantités doivent être des nombres positifs (ex. 1,5).";
  }

  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    input: {
      title: state.title.trim(),
      source_url: state.source_url.trim() || null,
      difficulty: state.difficulty || null,
      ...numbers,
      steps: state.steps.map((s) => s.text.trim()).filter(Boolean),
      notes: state.notes.trim() || null,
      ingredients,
      tags: state.tags,
    },
  };
}

function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// --- Composants -------------------------------------------------------------------

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-sm text-rose-600">{message}</p> : null;
}

function RowActions({ index, count, onMove, onRemove, label }: {
  index: number;
  count: number;
  onMove: (delta: number) => void;
  onRemove: () => void;
  label: string;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <button type="button" className="btn-icon" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Monter ${label}`}>↑</button>
      <button type="button" className="btn-icon" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Descendre ${label}`}>↓</button>
      <button type="button" className="btn-icon hover:text-rose-600" onClick={onRemove} aria-label={`Supprimer ${label}`}>✕</button>
    </div>
  );
}

function RecipeForm({ recipe }: { recipe?: Recipe }) {
  const [state, setState] = useState(() => toFormState(recipe));
  const [initial] = useState(() => snapshot(toFormState(recipe)));
  const [errors, setErrors] = useState<Errors>({});
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const save = useSaveRecipe();
  const { data: tags = [] } = useTags();
  const navigate = useNavigate();
  const { show } = useToast();
  const leaving = useRef(false); // vrai juste après un enregistrement réussi

  const dirty = snapshot(state) !== initial;

  // Modifications non enregistrées : confirmation avant de quitter la page…
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname,
  );
  // …ou de fermer l'onglet.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setState((s) => ({ ...s, [field]: value }));

  const updateIngredient = (key: string, patch: Partial<IngredientRow>) =>
    set("ingredients", state.ingredients.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addIngredient = () => {
    const row = emptyIngredient();
    set("ingredients", [...state.ingredients, row]);
    setFocusKey(row.key);
  };

  const addStep = () => {
    const row = emptyStep();
    set("steps", [...state.steps, row]);
    setFocusKey(row.key);
  };

  // Entrée dans le dernier ingrédient = nouvelle ligne (au lieu d'envoyer le formulaire).
  const onIngredientKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (index === state.ingredients.length - 1) addIngredient();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (save.isPending) return;
    const { input, errors } = validate(state);
    setErrors(errors);
    if (!input) return;

    save.mutate(
      { id: recipe?.id, input },
      {
        onSuccess: (saved) => {
          leaving.current = true;
          show(recipe ? "Recette enregistrée" : "Recette créée");
          navigate(`/recettes/${saved.id}`, { replace: !recipe });
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            setErrors({ source_url: "Une recette avec cette URL existe déjà." });
          } else {
            setErrors({ form: error.message });
          }
        },
      },
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 pb-24" noValidate>
      <fieldset disabled={save.isPending} className="min-w-0 space-y-5" aria-busy={save.isPending}>
      <h1 className="text-2xl font-bold">{recipe ? "Modifier la recette" : "Nouvelle recette"}</h1>

      <Section title="Infos">
        <div>
          <label htmlFor="title" className="label">Titre *</label>
          <input id="title" className="input w-full" value={state.title} onChange={(e) => set("title", e.target.value)} autoFocus={!recipe} />
          <FieldError message={errors.title} />
        </div>
        <div>
          <label htmlFor="source_url" className="label">URL source</label>
          <input
            id="source_url"
            type="url"
            className="input w-full"
            placeholder="https://…"
            value={state.source_url}
            onChange={(e) => set("source_url", e.target.value)}
          />
          <FieldError message={errors.source_url} />
        </div>
        <div>
          <span className="label">Difficulté</span>
          <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5" role="radiogroup">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                role="radio"
                aria-checked={state.difficulty === d.value}
                onClick={() => set("difficulty", state.difficulty === d.value ? "" : d.value)}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  state.difficulty === d.value ? "bg-brand-500 font-semibold text-white" : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["prep_time_min", "Préparation (min)"],
              ["cook_time_min", "Cuisson (min)"],
              ["servings", "Portions"],
            ] as const
          ).map(([field, label]) => (
            <div key={field}>
              <label htmlFor={field} className="label">{label}</label>
              <input
                id={field}
                inputMode="numeric"
                className="input w-full"
                value={state[field]}
                onChange={(e) => set(field, e.target.value)}
              />
            </div>
          ))}
        </div>
        <FieldError message={errors.numbers} />
      </Section>

      <Section title="Ingrédients">
        <div className="hidden grid-cols-[5rem_6rem_1fr_auto] gap-2 px-0.5 text-xs font-medium text-stone-500 sm:grid">
          <span>Quantité</span>
          <span>Unité</span>
          <span>Ingrédient</span>
        </div>
        <ul className="space-y-2">
          {state.ingredients.map((row, i) => (
            <li key={row.key} className="grid grid-cols-[4.5rem_5rem_1fr] gap-2 sm:grid-cols-[5rem_6rem_1fr_auto]">
              <input
                className="input min-w-0"
                inputMode="decimal"
                placeholder="200"
                aria-label="Quantité"
                value={row.quantity}
                onChange={(e) => updateIngredient(row.key, { quantity: e.target.value })}
                onKeyDown={(e) => onIngredientKeyDown(e, i)}
                autoFocus={row.key === focusKey}
              />
              <input
                className="input min-w-0"
                placeholder="g"
                aria-label="Unité"
                value={row.unit}
                onChange={(e) => updateIngredient(row.key, { unit: e.target.value })}
                onKeyDown={(e) => onIngredientKeyDown(e, i)}
              />
              <input
                className="input min-w-0"
                placeholder="lentilles corail"
                aria-label="Ingrédient"
                value={row.name}
                onChange={(e) => updateIngredient(row.key, { name: e.target.value })}
                onKeyDown={(e) => onIngredientKeyDown(e, i)}
              />
              <div className="col-span-3 flex justify-end sm:col-span-1">
                <RowActions
                  index={i}
                  count={state.ingredients.length}
                  label="l'ingrédient"
                  onMove={(delta) => set("ingredients", move(state.ingredients, i, delta))}
                  onRemove={() => set("ingredients", state.ingredients.filter((r) => r.key !== row.key))}
                />
              </div>
            </li>
          ))}
        </ul>
        <FieldError message={errors.ingredients} />
        <button type="button" className="btn-secondary" onClick={addIngredient}>
          + Ajouter un ingrédient
        </button>
      </Section>

      <Section title="Étapes">
        <ol className="space-y-3">
          {state.steps.map((row, i) => (
            <li key={row.key} className="flex gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {i + 1}
              </span>
              <textarea
                className="input min-h-20 flex-1"
                aria-label={`Étape ${i + 1}`}
                value={row.text}
                onChange={(e) => set("steps", state.steps.map((s) => (s.key === row.key ? { ...s, text: e.target.value } : s)))}
                autoFocus={row.key === focusKey}
              />
              <div className="flex flex-col">
                <RowActions
                  index={i}
                  count={state.steps.length}
                  label="l'étape"
                  onMove={(delta) => set("steps", move(state.steps, i, delta))}
                  onRemove={() => set("steps", state.steps.filter((s) => s.key !== row.key))}
                />
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="btn-secondary" onClick={addStep}>
          + Ajouter une étape
        </button>
      </Section>

      <Section title="Tags et notes">
        <div>
          <label htmlFor="tags" className="label">Tags</label>
          <TagInput id="tags" value={state.tags} onChange={(t) => set("tags", t)} suggestions={tags.map((t) => t.name)} />
        </div>
        <div>
          <label htmlFor="notes" className="label">Notes</label>
          <textarea id="notes" className="input min-h-24 w-full" value={state.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </Section>

      {errors.form && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{errors.form}</p>}

      {/* Barre d'actions collée en bas (au-dessus de la barre d'onglets mobile). */}
      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-stone-200 bg-white/95 backdrop-blur sm:bottom-0">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-2 px-4 py-3">
          {dirty && <span className="mr-auto text-sm text-stone-500">Modifications non enregistrées</span>}
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      </fieldset>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        title="Quitter sans enregistrer ?"
        message="Tes modifications seront perdues."
        confirmLabel="Quitter"
        danger
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </form>
  );
}

/** /recettes/nouvelle et /recettes/:id/modifier */
export function RecipeFormPage() {
  const { id } = useParams();
  const recipeId = Number(id);
  const query = useRecipe(recipeId);

  if (!id) return <RecipeForm />;
  if (!Number.isInteger(recipeId)) return <NotFoundPage message="Recette introuvable." />;
  if (query.isPending) return <div className="h-64 animate-pulse rounded-2xl bg-stone-200/70" />;
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) return <NotFoundPage message="Recette introuvable." />;
    return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />;
  }
  // key : un formulaire neuf si on passe d'une recette à une autre.
  return <RecipeForm key={query.data.id} recipe={query.data} />;
}
