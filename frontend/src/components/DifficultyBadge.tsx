import { DIFFICULTIES, type Difficulty } from "../api/types";

const STYLES: Record<Difficulty, string> = {
  facile: "bg-emerald-100 text-emerald-800",
  moyen: "bg-amber-100 text-amber-800",
  difficile: "bg-rose-100 text-rose-800",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty | null }) {
  if (!difficulty) return null;
  const label = DIFFICULTIES.find((d) => d.value === difficulty)?.label;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[difficulty]}`}>{label}</span>
  );
}
