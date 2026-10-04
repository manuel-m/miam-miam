import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.config import get_settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def authenticate(username: str, password: str) -> bool:
    settings = get_settings()
    # On vérifie toujours le mot de passe, même si le login est faux,
    # pour ne pas révéler par le temps de réponse quel champ est incorrect.
    username_ok = secrets.compare_digest(username.encode(), settings.app_username.encode())
    password_ok = verify_password(password, settings.app_password_hash)
    return username_ok and password_ok


def create_access_token(username: str) -> str:
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> str:
    settings = get_settings()
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.InvalidTokenError:
        raise unauthorized
    username = payload.get("sub")
    if username != settings.app_username:
        raise unauthorized
    return username


CurrentUser = Annotated[str, Depends(get_current_user)]
