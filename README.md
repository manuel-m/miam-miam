# Miam-miam

- `api/` : backend FastAPI + SQLAlchemy 2.0, stockage SQLite (`api/recettes.db`, créé automatiquement)
- `frontend/` : React + Vite + TanStack Query + Tailwind (pnpm)

## Lancer

Toutes les commandes passent par le `Makefile` (`make` seul affiche l'aide) :

`api/recettes.md` (liste de liens de recettes lue par `make import`) est un fichier local, non versionné.

```bash
make install    # uv sync
cp api/.env.example api/.env   # puis remplir (voir Authentification)
make import     # importe les liens de recettes.md (idempotent)
make dev        # API en mode dev -> http://127.0.0.1:8000/docs  (make dev PORT=8001)
make run        # API en mode production
make reset-db   # supprime recettes.db puis réimporte
make export     # exporte la base en JSON -> api/exports/recettes-AAAAMMJJ-HHMMSS.json
make clean      # supprime .venv et les caches (garde la base)

make front-install   # pnpm install
make front-dev       # http://localhost:5173 (proxy /api -> API sur :8000)
make front-build     # build de prod -> frontend/dist
make dev-all         # API + frontend en parallèle
```

## Authentification

Un seul utilisateur, défini dans `api/.env` (non versionné, modèle : `.env.example`) :

```bash
make hash-password   # -> APP_PASSWORD_HASH='...'  à coller dans api/.env
make secret          # -> JWT_SECRET=...           à coller dans api/.env
```

Obtenir un token puis l'utiliser dans le header `Authorization` :

```bash
TOKEN=$(curl -s -X POST localhost:8000/auth/token -d username=gal -d password=xxx | jq -r .access_token)
curl -H "Authorization: Bearer $TOKEN" localhost:8000/me/favorites
```

Dans `/docs`, le bouton **Authorize** fait la même chose.

La lecture (`GET /recipes`, `GET /tags`) est publique ; la création/modification/suppression
de recettes et les favoris exigent le token.

## Endpoints

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/recipes?q=&difficulty=&tag=&ingredient=&skip=&limit=` | liste filtrée |
| GET | `/recipes/{id}` | détail |
| POST | `/recipes` | création |
| PUT | `/recipes/{id}` | remplacement complet |
| PATCH | `/recipes/{id}` | mise à jour partielle |
| DELETE | `/recipes/{id}` | suppression |
| GET | `/tags` | liste des tags |
| POST | `/auth/token` | connexion (formulaire `username`/`password`) → JWT |
| GET | `/auth/me` 🔒 | utilisateur connecté |
| GET | `/me/favorites` 🔒 | mes recettes favorites |
| PUT | `/me/favorites/{id}` 🔒 | ajouter aux favoris |
| DELETE | `/me/favorites/{id}` 🔒 | retirer des favoris |
| GET | `/me/meals?recipe_id=` 🔒 | mes repas (journal ; filtrable par recette) |
| POST | `/me/meals` 🔒 | enregistrer un repas |
| DELETE | `/me/meals/{id}` 🔒 | supprimer un repas |
| GET | `/export` 🔒 | export JSON de la base (téléchargement) |

🔒 = token requis (ainsi que POST/PUT/PATCH/DELETE sur `/recipes`).

## Structure (`api/`)

- `app/database.py` – moteur SQLite, session, `Base`
- `app/models.py` – tables (Recipe, Ingredient, Tag)
- `app/schemas.py` – schémas Pydantic (entrée/sortie de l'API)
- `app/config.py` – lecture du `.env`
- `app/auth.py` – mot de passe (bcrypt), JWT, dépendance `CurrentUser`
- `app/crud.py` – accès aux données
- `app/routers/` – routes HTTP
- `scripts/import_markdown.py` – import de `recettes.md`
- `app/export.py` – construction de l'export JSON
- `scripts/export_json.py` – export JSON en ligne de commande
- `scripts/hash_password.py` – génération du hash du mot de passe

Frontend : `frontend/src/{api,auth,components,pages,lib}` (client HTTP + hooks TanStack Query, auth JWT, composants, pages).
