from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import models, schemas


def _get_or_create_tags(db: Session, names: list[str]) -> list[models.Tag]:
    clean = sorted({n.strip().lower() for n in names if n.strip()})
    if not clean:
        return []
    existing = {t.name: t for t in db.scalars(select(models.Tag).where(models.Tag.name.in_(clean)))}
    tags = []
    for name in clean:
        tag = existing.get(name)
        if tag is None:
            tag = models.Tag(name=name)
            db.add(tag)
        tags.append(tag)
    return tags


def _build_ingredients(items: list[schemas.IngredientIn]) -> list[models.Ingredient]:
    return [models.Ingredient(**item.model_dump(), position=i) for i, item in enumerate(items)]


def list_recipes(
    db: Session,
    q: str | None = None,
    difficulty: models.Difficulty | None = None,
    tag: str | None = None,
    ingredient: str | None = None,
    skip: int = 0,
    limit: int | None = 50,
) -> list[models.Recipe]:
    """limit=None : toutes les recettes."""
    stmt = select(models.Recipe).options(
        selectinload(models.Recipe.ingredients), selectinload(models.Recipe.tags)
    )
    if q:
        stmt = stmt.where(models.Recipe.title.ilike(f"%{q}%"))
    if difficulty:
        stmt = stmt.where(models.Recipe.difficulty == difficulty)
    if tag:
        stmt = stmt.where(models.Recipe.tags.any(models.Tag.name == tag.strip().lower()))
    if ingredient:
        stmt = stmt.where(models.Recipe.ingredients.any(models.Ingredient.name.ilike(f"%{ingredient}%")))
    stmt = stmt.order_by(models.Recipe.title).offset(skip).limit(limit)
    return list(db.scalars(stmt))


def get_recipe(db: Session, recipe_id: int) -> models.Recipe | None:
    return db.get(models.Recipe, recipe_id)


def get_recipe_by_url(db: Session, url: str) -> models.Recipe | None:
    return db.scalar(select(models.Recipe).where(models.Recipe.source_url == url))


def create_recipe(db: Session, data: schemas.RecipeCreate) -> models.Recipe:
    recipe = models.Recipe(**data.model_dump(exclude={"ingredients", "tags"}))
    recipe.ingredients = _build_ingredients(data.ingredients)
    recipe.tags = _get_or_create_tags(db, data.tags)
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


def update_recipe(db: Session, recipe: models.Recipe, data: schemas.RecipeUpdate) -> models.Recipe:
    """Met à jour uniquement les champs envoyés (sert au PATCH et au PUT)."""
    values = data.model_dump(exclude_unset=True, exclude={"ingredients", "tags"})
    for field, value in values.items():
        setattr(recipe, field, value)
    if data.ingredients is not None:
        recipe.ingredients = _build_ingredients(data.ingredients)
    if data.tags is not None:
        recipe.tags = _get_or_create_tags(db, data.tags)
    db.commit()
    db.refresh(recipe)
    return recipe


def delete_recipe(db: Session, recipe: models.Recipe) -> None:
    db.delete(recipe)
    db.commit()


def list_tags(db: Session) -> list[models.Tag]:
    return list(db.scalars(select(models.Tag).order_by(models.Tag.name)))


def list_favorites(db: Session, username: str) -> list[models.Recipe]:
    stmt = (
        select(models.Recipe)
        .join(models.Favorite, models.Favorite.recipe_id == models.Recipe.id)
        .where(models.Favorite.username == username)
        .options(selectinload(models.Recipe.ingredients), selectinload(models.Recipe.tags))
        .order_by(models.Recipe.title)
    )
    return list(db.scalars(stmt))


def add_favorite(db: Session, username: str, recipe_id: int) -> None:
    if db.get(models.Favorite, (username, recipe_id)) is None:
        db.add(models.Favorite(username=username, recipe_id=recipe_id))
        db.commit()


def remove_favorite(db: Session, username: str, recipe_id: int) -> None:
    favorite = db.get(models.Favorite, (username, recipe_id))
    if favorite is not None:
        db.delete(favorite)
        db.commit()


def list_all_favorites(db: Session) -> list[models.Favorite]:
    stmt = select(models.Favorite).order_by(models.Favorite.username, models.Favorite.recipe_id)
    return list(db.scalars(stmt))
