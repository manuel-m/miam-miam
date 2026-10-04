from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/recipes", tags=["recipes"])

DbSession = Annotated[Session, Depends(get_db)]


def _get_or_404(db: Session, recipe_id: int) -> models.Recipe:
    recipe = crud.get_recipe(db, recipe_id)
    if recipe is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recette introuvable")
    return recipe


def _conflict(db: Session) -> HTTPException:
    db.rollback()
    return HTTPException(status.HTTP_409_CONFLICT, "Une recette avec cette source_url existe déjà")


@router.get("", response_model=list[schemas.RecipeRead])
def list_recipes(
    db: DbSession,
    q: str | None = None,
    difficulty: models.Difficulty | None = None,
    tag: str | None = None,
    ingredient: str | None = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
):
    return crud.list_recipes(db, q, difficulty, tag, ingredient, skip, limit)


@router.get("/{recipe_id}", response_model=schemas.RecipeRead)
def get_recipe(recipe_id: int, db: DbSession):
    return _get_or_404(db, recipe_id)


@router.post("", response_model=schemas.RecipeRead, status_code=status.HTTP_201_CREATED)
def create_recipe(data: schemas.RecipeCreate, db: DbSession, _user: CurrentUser):
    try:
        return crud.create_recipe(db, data)
    except IntegrityError:
        raise _conflict(db)


@router.put("/{recipe_id}", response_model=schemas.RecipeRead)
def replace_recipe(recipe_id: int, data: schemas.RecipeCreate, db: DbSession, _user: CurrentUser):
    recipe = _get_or_404(db, recipe_id)
    # PUT = remplacement complet : on envoie tous les champs, y compris les valeurs par défaut.
    full = schemas.RecipeUpdate(**data.model_dump())
    try:
        return crud.update_recipe(db, recipe, full)
    except IntegrityError:
        raise _conflict(db)


@router.patch("/{recipe_id}", response_model=schemas.RecipeRead)
def patch_recipe(recipe_id: int, data: schemas.RecipeUpdate, db: DbSession, _user: CurrentUser):
    recipe = _get_or_404(db, recipe_id)
    try:
        return crud.update_recipe(db, recipe, data)
    except IntegrityError:
        raise _conflict(db)


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(recipe_id: int, db: DbSession, _user: CurrentUser):
    crud.delete_recipe(db, _get_or_404(db, recipe_id))
