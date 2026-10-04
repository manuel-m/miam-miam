"""Complète les recettes (ingrédients, étapes, portions) depuis leur page vegan-pratique.fr.

Ne touche qu'aux recettes sans ingrédients ni étapes : relançable sans risque.

Usage : make fetch-details
        uv run python -m scripts.fetch_details
"""

import html
import re
import time
import urllib.request

from sqlalchemy import select

from app import crud, models, schemas
from app.database import SessionLocal, init_db

FRACTIONS = {"½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3}
UNITS = r"kg|mg|g|cl|ml|l|litres?|càs|càc|pincées?"
INGREDIENT_RE = re.compile(
    rf"^(?P<qty>\d+(?:[.,]\d+)?|[{''.join(FRACTIONS)}])\s+"
    rf"(?:(?P<unit>{UNITS})\s+(?:de\s+|d['’])?)?(?P<name>\S.*)$"
)


def parse_ingredient(line: str) -> schemas.IngredientIn:
    """Découpe une ligne d'ingrédient en quantité, unité et nom.

    >>> parse_ingredient("1,2 kg d’aubergines")
    IngredientIn(name='aubergines', quantity=1.2, unit='kg')
    >>> parse_ingredient("½ càc de cumin (en poudre)")
    IngredientIn(name='cumin (en poudre)', quantity=0.5, unit='càc')
    >>> parse_ingredient("4 gousses d’ail")
    IngredientIn(name='gousses d’ail', quantity=4.0, unit=None)
    >>> parse_ingredient("350 g de haché végétal")
    IngredientIn(name='haché végétal', quantity=350.0, unit='g')
    >>> parse_ingredient("2 à 3 aubergines selon la taille")
    IngredientIn(name='2 à 3 aubergines selon la taille', quantity=None, unit=None)
    >>> parse_ingredient("6-7 tomates juteuses")
    IngredientIn(name='6-7 tomates juteuses', quantity=None, unit=None)
    >>> parse_ingredient("Mesclun")
    IngredientIn(name='Mesclun', quantity=None, unit=None)
    """
    line = " ".join(line.split())  # espaces insécables / fines -> espace simple
    m = INGREDIENT_RE.match(line)
    if not m or re.match(r"(à|-)\s*\d|-\d", m["name"]):  # fourchette "2 à 3", "6-7"
        return schemas.IngredientIn(name=line[:200])
    qty = m["qty"]
    quantity = FRACTIONS.get(qty) or float(qty.replace(",", "."))
    return schemas.IngredientIn(name=m["name"][:200], quantity=quantity, unit=m["unit"])


def _text(fragment: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", fragment)).split())


def _block(page: str, name: str) -> str:
    m = re.search(rf"<!-- start {name} -->(.*?)<!-- end {name} -->", page, re.S)
    return m.group(1) if m else ""


def _items(block: str, tag: str) -> list[str]:
    return [t for t in (_text(x) for x in re.findall(rf"<{tag}[^>]*>(.*?)</{tag}>", block, re.S)) if t]


def extract(page: str) -> tuple[list[schemas.IngredientIn], list[str], int | None]:
    ingredients = [parse_ingredient(t) for t in _items(_block(page, "Ingredients"), "li")]
    instructions = _block(page, "Instructions")
    steps = _items(instructions, "li") or _items(instructions, "p")
    servings = re.search(r'"recipeYield":"(\d+)', page)
    return ingredients, steps, int(servings.group(1)) if servings else None


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="replace")


def main() -> None:
    init_db()
    done = skipped = failed = 0
    with SessionLocal() as db:
        for recipe in db.scalars(select(models.Recipe).order_by(models.Recipe.id)):
            if not recipe.source_url or recipe.ingredients or recipe.steps:
                skipped += 1
                continue
            try:
                ingredients, steps, servings = extract(fetch(recipe.source_url))
            except OSError as e:
                print(f"✗ {recipe.title} : {e}")
                failed += 1
                continue
            if not ingredients:
                print(f"✗ {recipe.title} : aucun ingrédient trouvé")
                failed += 1
                continue
            recipe.ingredients = crud._build_ingredients(ingredients)
            recipe.steps = steps
            recipe.servings = recipe.servings or servings
            db.commit()
            done += 1
            print(f"✓ {recipe.title} : {len(ingredients)} ingrédients, {len(steps)} étapes")
            time.sleep(0.5)  # politesse envers le site
    print(f"{done} complétée(s), {skipped} ignorée(s), {failed} échec(s).")


if __name__ == "__main__":
    main()
