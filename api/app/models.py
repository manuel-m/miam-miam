import enum
from datetime import date, datetime

from sqlalchemy import JSON, Column, Date, DateTime, Enum, ForeignKey, String, Table, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Difficulty(str, enum.Enum):
    facile = "facile"
    moyen = "moyen"
    difficile = "difficile"


recipe_tag = Table(
    "recipe_tag",
    Base.metadata,
    Column("recipe_id", ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    source_url: Mapped[str | None] = mapped_column(String(500), unique=True)
    difficulty: Mapped[Difficulty | None] = mapped_column(Enum(Difficulty))
    prep_time_min: Mapped[int | None]
    cook_time_min: Mapped[int | None]
    servings: Mapped[int | None]
    steps: Mapped[list[str]] = mapped_column(JSON, default=list)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    ingredients: Mapped[list["Ingredient"]] = relationship(
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="Ingredient.position",
    )
    tags: Mapped[list["Tag"]] = relationship(secondary=recipe_tag, back_populates="recipes")


class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(200), index=True)
    quantity: Mapped[float | None]
    unit: Mapped[str | None] = mapped_column(String(50))
    position: Mapped[int] = mapped_column(default=0)

    recipe: Mapped[Recipe] = relationship(back_populates="ingredients")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)

    recipes: Mapped[list[Recipe]] = relationship(secondary=recipe_tag, back_populates="tags")


class Favorite(Base):
    """Recette favorite d'un utilisateur (identifié par son login en V1, pas de table users)."""

    __tablename__ = "favorites"

    username: Mapped[str] = mapped_column(String(100), primary_key=True)
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Meal(Base):
    """Un repas : recette consommée par un utilisateur, avec date, note en étoiles et commentaire."""

    __tablename__ = "meals"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), index=True)
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id", ondelete="CASCADE"))
    eaten_on: Mapped[date] = mapped_column(Date)
    rating: Mapped[int | None]
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    recipe: Mapped[Recipe] = relationship(lazy="joined")

    @property
    def recipe_title(self) -> str:
        return self.recipe.title
