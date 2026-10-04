from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import Difficulty


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    username: str


class IngredientIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    quantity: float | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=50)


class IngredientOut(IngredientIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    position: int


class TagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class RecipeBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    source_url: str | None = Field(default=None, max_length=500)
    difficulty: Difficulty | None = None
    prep_time_min: int | None = Field(default=None, ge=0)
    cook_time_min: int | None = Field(default=None, ge=0)
    servings: int | None = Field(default=None, ge=1)
    steps: list[str] = []
    notes: str | None = None


class RecipeCreate(RecipeBase):
    ingredients: list[IngredientIn] = []
    tags: list[str] = []


class RecipeUpdate(BaseModel):
    """Tous les champs optionnels : seuls ceux envoyés sont modifiés (PATCH)."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    source_url: str | None = Field(default=None, max_length=500)
    difficulty: Difficulty | None = None
    prep_time_min: int | None = Field(default=None, ge=0)
    cook_time_min: int | None = Field(default=None, ge=0)
    servings: int | None = Field(default=None, ge=1)
    steps: list[str] | None = None
    notes: str | None = None
    ingredients: list[IngredientIn] | None = None
    tags: list[str] | None = None


class RecipeRead(RecipeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ingredients: list[IngredientOut]
    tags: list[TagRead]
    created_at: datetime
    updated_at: datetime


class FavoriteExport(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    username: str
    recipe_id: int
    created_at: datetime


class ExportData(BaseModel):
    version: int = 1
    exported_at: datetime
    recipes: list[RecipeRead]
    favorites: list[FavoriteExport]
