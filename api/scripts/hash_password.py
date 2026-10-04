"""Génère le hash bcrypt d'un mot de passe, à coller dans .env.

Usage : make hash-password
"""

import sys
from getpass import getpass

from app.auth import hash_password


def main() -> None:
    password = getpass("Mot de passe : ")
    if not password:
        sys.exit("Mot de passe vide.")
    if getpass("Confirmer : ") != password:
        sys.exit("Les mots de passe ne correspondent pas.")
    # Guillemets simples : le hash contient des '$' qui ne doivent pas être interprétés.
    print(f"APP_PASSWORD_HASH='{hash_password(password)}'")


if __name__ == "__main__":
    main()
