import { useState, type KeyboardEvent } from "react";

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  id?: string;
}

const normalize = (tag: string) => tag.trim().toLowerCase();

export function TagInput({ value, onChange, suggestions, id }: Props) {
  const [text, setText] = useState("");

  const add = (raw: string) => {
    const tag = normalize(raw);
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setText("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(text);
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const query = normalize(text);
  const matches = query
    ? suggestions.filter((s) => s.includes(query) && !value.includes(s)).slice(0, 6)
    : [];

  return (
    <div>
      <div className="input flex flex-wrap items-center gap-1.5 py-1.5">
        {value.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-sm text-brand-700">
            #{tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`Retirer le tag ${tag}`}
              className="text-brand-700/60 hover:text-brand-700"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => text && add(text)}
          placeholder={value.length ? "" : "rapide, hiver… (Entrée pour valider)"}
          className="min-w-32 flex-1 bg-transparent py-0.5 outline-none"
        />
      </div>
      {matches.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {matches.map((s) => (
            <button
              key={s}
              type="button"
              // onMouseDown : passe avant le onBlur de l'input
              onMouseDown={(e) => {
                e.preventDefault();
                add(s);
              }}
              className="rounded-full border border-stone-300 px-2.5 py-0.5 text-sm text-stone-600 hover:border-brand-500"
            >
              #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
