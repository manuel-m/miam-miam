from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app import schemas
from app.auth import CurrentUser
from app.database import get_db
from app.export import build_export, export_filename

router = APIRouter(prefix="/export", tags=["export"])


@router.get("", response_model=schemas.ExportData)
def export_database(
    response: Response, _user: CurrentUser, db: Annotated[Session, Depends(get_db)]
):
    response.headers["Content-Disposition"] = f'attachment; filename="{export_filename()}"'
    return build_export(db)
