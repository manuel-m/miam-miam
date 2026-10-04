from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import init_db
from app.routers import auth, export, favorites, recipes, tags


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Recettes", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(recipes.router)
app.include_router(favorites.router)
app.include_router(tags.router)
app.include_router(export.router)
