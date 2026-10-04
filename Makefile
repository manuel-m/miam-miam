UV        ?= uv
PNPM      ?= pnpm
API_DIR   := api
FRONT_DIR := frontend
PORT      ?= 8000
FRONT_PORT ?= 5173

.PHONY: fetch-details restore help install dev run import reset-db export hash-password secret clean \
        front-install front-dev front-build dev-all

# --- API (FastAPI, dossier api/) ---------------------------------------------

install:    ## Installer les dépendances de l'API (uv sync)
	cd $(API_DIR) && $(UV) sync

dev:        ## Lancer l'API en mode dev, rechargement auto (PORT=8000 -> /docs)
	cd $(API_DIR) && $(UV) run fastapi dev app/main.py --port $(PORT)

run:        ## Lancer l'API en mode production
	cd $(API_DIR) && $(UV) run fastapi run app/main.py --port $(PORT)

import:     ## Importer les liens de recettes.md dans la base (idempotent)
	cd $(API_DIR) && $(UV) run python -m scripts.import_markdown

fetch-details: ## Compléter ingrédients, étapes et portions depuis les pages sources
	cd $(API_DIR) && $(UV) run python -m scripts.fetch_details

reset-db:   ## Supprimer la base puis réimporter recettes.md
	rm -f $(API_DIR)/recettes.db
	$(MAKE) import

export:     ## Exporter la base en JSON dans api/exports/
	cd $(API_DIR) && $(UV) run python -m scripts.export_json

restore:    ## Restaurer la base depuis un export JSON (FILE=… sinon le dernier de api/exports/)
	cd $(API_DIR) && $(UV) run python -m scripts.restore_json $(FILE)

hash-password: ## Générer le hash bcrypt du mot de passe (à coller dans api/.env)
	@cd $(API_DIR) && $(UV) run python -m scripts.hash_password

secret:     ## Générer un JWT_SECRET aléatoire (à coller dans api/.env)
	@echo "JWT_SECRET=$$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"

# --- Frontend (React + Vite, dossier frontend/) ------------------------------

front-install: ## Installer les dépendances du frontend (pnpm)
	$(PNPM) -C $(FRONT_DIR) install

front-dev:  ## Lancer le frontend en mode dev -> http://localhost:5173
	$(PNPM) -C $(FRONT_DIR) dev --port $(FRONT_PORT)

front-build: ## Compiler le frontend (vérif TypeScript + build dans frontend/dist)
	$(PNPM) -C $(FRONT_DIR) build

dev-all:    ## Lancer API + frontend ensemble
	$(MAKE) -j2 dev front-dev

# --- Divers ------------------------------------------------------------------

clean:      ## Supprimer caches, .venv, node_modules et dist (garde la base)
	find . -type d -name __pycache__ -not -path '*/.venv/*' -not -path '*/node_modules/*' -exec rm -rf {} +
	rm -rf $(API_DIR)/.venv $(FRONT_DIR)/node_modules $(FRONT_DIR)/dist

help:       ## Afficher cette aide
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*##"}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
