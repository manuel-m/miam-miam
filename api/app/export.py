from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app import crud, schemas


def build_export(db: Session) -> schemas.ExportData:
    """Toute la base : recettes (ingrédients et tags imbriqués) + favoris."""
    return schemas.ExportData(
        exported_at=datetime.now(UTC),
        recipes=[schemas.RecipeRead.model_validate(r) for r in crud.list_recipes(db, limit=None)],
        favorites=[schemas.FavoriteExport.model_validate(f) for f in crud.list_all_favorites(db)],
    )


def export_filename() -> str:
    return f"recettes-{datetime.now():%Y%m%d-%H%M%S}.json"
