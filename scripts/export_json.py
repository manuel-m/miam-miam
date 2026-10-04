"""Exporte toute la base dans un fichier JSON.

Usage : make export
        uv run python -m scripts.export_json [chemin/du/fichier.json]
"""

import sys
from pathlib import Path

from app.database import SessionLocal, init_db
from app.export import build_export, export_filename

EXPORT_DIR = Path(__file__).resolve().parent.parent / "exports"


def main() -> None:
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else EXPORT_DIR / export_filename()
    output.parent.mkdir(parents=True, exist_ok=True)

    init_db()
    with SessionLocal() as db:
        data = build_export(db)

    output.write_text(data.model_dump_json(indent=2), encoding="utf-8")
    print(f"{len(data.recipes)} recette(s), {len(data.favorites)} favori(s) exporté(s) -> {output}")


if __name__ == "__main__":
    main()
