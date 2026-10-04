import { Link } from "react-router-dom";
import type { Recipe } from "../api/types";
import { formatDuration, isIncomplete, sourceDomain, titleHue, totalTime } from "../lib/format";
import { DifficultyBadge } from "./DifficultyBadge";
import { FavoriteButton } from "./FavoriteButton";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const hue = titleHue(recipe.title);
  const time = totalTime(recipe);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="flex h-20 items-center justify-between px-4"
        style={{ backgroundColor: `hsl(${hue} 70% 92%)`, color: `hsl(${hue} 45% 35%)` }}
        aria-hidden="true"
      >
        <span className="text-4xl font-bold opacity-70">{recipe.title.charAt(0).toUpperCase()}</span>
        {isIncomplete(recipe) && (
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-stone-600" title="Ni ingrédients ni étapes">
            à compléter
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold leading-snug">
          {/* Lien "étiré" : toute la carte est cliquable, sans imbriquer de bouton dans un lien. */}
          <Link to={`/recettes/${recipe.id}`} className="after:absolute after:inset-0 focus:outline-none">
            {recipe.title}
          </Link>
        </h3>

        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
          <DifficultyBadge difficulty={recipe.difficulty} />
          {time != null && <span>⏱ {formatDuration(time)}</span>}
        </div>

        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.tags.map((tag) => (
              <span key={tag.id} className="text-xs text-stone-500">#{tag.name}</span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          {recipe.source_url ? (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noreferrer"
              className="relative z-10 truncate text-xs text-stone-400 hover:text-brand-600 hover:underline"
            >
              {sourceDomain(recipe.source_url)} ↗
            </a>
          ) : (
            <span />
          )}
          <FavoriteButton recipe={recipe} />
        </div>
      </div>
    </article>
  );
}
