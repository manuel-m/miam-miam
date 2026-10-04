UV   ?= uv
APP  ?= app/main.py
PORT ?= 8000
DB   ?= recettes.db

.PHONY: help install dev run import reset-db export hash-password secret clean

install:    ## Installer / synchroniser les dépendances (uv sync)
	$(UV) sync

dev:        ## Lancer l'API en mode dev, rechargement auto (PORT=8000 -> /docs)
	$(UV) run fastapi dev $(APP) --port $(PORT)

run:        ## Lancer l'API en mode production
	$(UV) run fastapi run $(APP) --port $(PORT)

import:     ## Importer les liens de recettes.md dans la base (idempotent)
	$(UV) run python -m scripts.import_markdown

reset-db:   ## Supprimer la base puis réimporter recettes.md
	rm -f $(DB)
	$(MAKE) import

export:     ## Exporter la base en JSON dans exports/
	$(UV) run python -m scripts.export_json

hash-password: ## Générer le hash bcrypt du mot de passe (à coller dans .env)
	@$(UV) run python -m scripts.hash_password

secret:     ## Générer un JWT_SECRET aléatoire (à coller dans .env)
	@echo "JWT_SECRET=$$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"

clean:      ## Supprimer caches Python et .venv (garde la base)
	find . -type d -name __pycache__ -not -path './.venv/*' -exec rm -rf {} +
	rm -rf .venv

help:       ## Afficher cette aide
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*##"}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
