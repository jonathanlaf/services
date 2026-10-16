# Services

PC and Mac technician site, served at https://services.jonathanlafleur.ca (GitHub Pages, no build step).
French at `/`, English at `/en/`. Rules and layout: see `AGENTS.md`.

## Change a price

Edit `shared/tarifs.json` (both `fr` and `en` text), then run `python3 .githooks/check-i18n.py`.

## Run locally

    python3 -m http.server 8765    # then open http://localhost:8765/
    python3 -m unittest discover tests

Enable the pre-commit check once per clone: `git config core.hooksPath .githooks`.
