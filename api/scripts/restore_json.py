"""Restaure la base depuis un export JSON (make export) : remplace tout son contenu.

L'état actuel est d'abord sauvegardé dans exports/, puis la restauration se fait en une
seule transaction (en cas d'erreur, la base reste intacte). Les ids d'origine sont conservés.

Usage : make restore                      (dernier export de api/exports/)
        make restore FILE=chemin/export.json
"""

import sys
from pathlib import Path

from sqlalchemy import delete, func, select

from app import models, schemas
from app.database import SessionLocal, init_db
from app.export import build_export, export_filename
from scripts.export_json import EXPORT_DIR


def main() -> None:
    if len(sys.argv) > 1:
        source = Path(sys.argv[1])
    else:
        exports = sorted(EXPORT_DIR.glob("recettes-*.json"))
        if not exports:
            sys.exit(f"Aucun export dans {EXPORT_DIR}.")
        source = exports[-1]
    data = schemas.ExportData.model_validate_json(source.read_text(encoding="utf-8"))

    init_db()
    with SessionLocal() as db:
        current = db.scalar(select(func.count()).select_from(models.Recipe))
        print(f"{source.name} : {len(data.recipes)} recette(s), {len(data.favorites)} favori(s), {len(data.meals)} repas.")
        answer = input(f"La base actuelle ({current} recette(s)) sera remplacée. Continuer ? [o/N] ")
        if answer.strip().lower() not in ("o", "oui"):
            sys.exit("Annulé.")

        backup = EXPORT_DIR / f"avant-restauration-{export_filename()}"
        backup.parent.mkdir(parents=True, exist_ok=True)
        backup.write_text(build_export(db).model_dump_json(indent=2), encoding="utf-8")
        print(f"État actuel sauvegardé -> {backup}")

        for table in (models.Meal, models.Favorite, models.recipe_tag, models.Ingredient, models.Recipe, models.Tag):
            db.execute(delete(table))

        tags: dict[int, models.Tag] = {}
        for r in data.recipes:
            recipe = models.Recipe(**r.model_dump(exclude={"ingredients", "tags"}))
            recipe.ingredients = [models.Ingredient(**i.model_dump()) for i in r.ingredients]
            recipe.tags = [tags.setdefault(t.id, models.Tag(id=t.id, name=t.name)) for t in r.tags]
            db.add(recipe)
        db.flush()  # recettes d'abord : favoris et repas n'ont pas de relation ORM pour ordonner les INSERT
        db.add_all(models.Favorite(**f.model_dump()) for f in data.favorites)
        db.add_all(models.Meal(**m.model_dump(exclude={"recipe_title"})) for m in data.meals)
        db.commit()

    print("Restauration terminée.")


if __name__ == "__main__":
    main()
