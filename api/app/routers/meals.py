from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/me/meals", tags=["meals"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[schemas.MealRead])
def list_meals(username: CurrentUser, db: DbSession, recipe_id: int | None = None):
    stmt = select(models.Meal).where(models.Meal.username == username)
    if recipe_id is not None:
        stmt = stmt.where(models.Meal.recipe_id == recipe_id)
    return db.scalars(stmt.order_by(models.Meal.eaten_on.desc(), models.Meal.id.desc())).all()


@router.post("", response_model=schemas.MealRead, status_code=status.HTTP_201_CREATED)
def add_meal(meal: schemas.MealIn, username: CurrentUser, db: DbSession):
    if crud.get_recipe(db, meal.recipe_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recette introuvable")
    row = models.Meal(username=username, **meal.model_dump())
    db.add(row)
    db.commit()
    return row


@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_meal(meal_id: int, username: CurrentUser, db: DbSession):
    row = db.get(models.Meal, meal_id)
    if row is None or row.username != username:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Repas introuvable")
    db.delete(row)
    db.commit()
