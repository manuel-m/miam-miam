from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[schemas.TagRead])
def list_tags(db: Annotated[Session, Depends(get_db)]):
    return crud.list_tags(db)
