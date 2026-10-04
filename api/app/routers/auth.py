from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app import schemas
from app.auth import CurrentUser, authenticate, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token", response_model=schemas.Token)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]):
    if not authenticate(form.username, form.password):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Login ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return schemas.Token(access_token=create_access_token(form.username))


@router.get("/me", response_model=schemas.UserRead)
def me(username: CurrentUser):
    return schemas.UserRead(username=username)
