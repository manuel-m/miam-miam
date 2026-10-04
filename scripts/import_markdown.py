"""Importe les liens de recettes.md dans la base.

Usage : uv run python -m scripts.import_markdown
"""

import re
from pathlib import Path
from urllib.parse import urlparse

from app import crud, schemas
from app.database import SessionLocal, init_db
from app.models import Difficulty

MARKDOWN_PATH = Path(__file__).resolve().parent.parent / "recettes.md"


def title_from_url(url: str) -> str:
    slug = urlparse(url).path.rstrip("/").split("/")[-1]
    slug = re.sub(r"-\d+$", "", slug)  # "bolognaise-de-lentilles-2" -> "bolognaise-de-lentilles"
    return slug.replace("-", " ").capitalize()


def parse_markdown(text: str) -> list[tuple[str, Difficulty | None]]:
    """Renvoie les couples (url, difficulté) trouvés dans les sections '## Liste ...'."""
    results = []
    in_list = False
    difficulty = None
    for raw in text.splitlines():
        line = raw.strip()
        if line.startswith("## "):
            in_list = line[3:].lower().startswith("liste")
            difficulty = None
        elif not in_list or not line:
            continue
        elif line.startswith("- "):
            url = line[2:].strip()
            if url.startswith("http"):
                results.append((url, difficulty))
        elif line.lower() in Difficulty.__members__:
            difficulty = Difficulty(line.lower())
    return results


def main() -> None:
    init_db()
    entries = parse_markdown(MARKDOWN_PATH.read_text(encoding="utf-8"))
    created = skipped = 0
    with SessionLocal() as db:
        for url, difficulty in entries:
            if crud.get_recipe_by_url(db, url):
                skipped += 1
                continue
            crud.create_recipe(
                db,
                schemas.RecipeCreate(title=title_from_url(url), source_url=url, difficulty=difficulty),
            )
            created += 1
    print(f"{created} recette(s) créée(s), {skipped} ignorée(s) (déjà présentes).")


if __name__ == "__main__":
    main()
