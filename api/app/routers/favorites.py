from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, schemas
from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/me/favorites", tags=["favorites"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[schemas.RecipeRead])
def list_favorites(username: CurrentUser, db: DbSession):
    return crud.list_favorites(db, username)


@router.put("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def add_favorite(recipe_id: int, username: CurrentUser, db: DbSession):
    if crud.get_recipe(db, recipe_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recette introuvable")
    crud.add_favorite(db, username, recipe_id)


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(recipe_id: int, username: CurrentUser, db: DbSession):
    crud.remove_favorite(db, username, recipe_id)
