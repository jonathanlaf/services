# AGENTS.md — Services

Context and rules for AI coding agents working on this repository.

## Hard rule: nothing private in agent files

This file (and `CLAUDE.md`) is committed and public. Never write in it: personal information (phone numbers, addresses,
emails, client names), credentials, tokens, internal URLs, local machine paths, or anything learned from private
conversations. Describe rules and conventions only. Content the site publishes (the phone number, the email) lives in the site's
HTML files (`shared/libelles*.html`), not here. The drop-off address is never published anywhere in the repo.

## What the project is

A static, bilingual site for a PC and Mac technician (by appointment: remote anywhere, drop-off, or home visits for setup within the Baie-des-Chaleurs), French at `/`
and English at `/en/`, served by GitHub Pages from `main` (custom domain in `CNAME`). No build step, no framework, no npm:
plain HTML, CSS and one JavaScript file. Pages are loaded with `fetch`, so test through a local server
(`python3 -m http.server 8765`), not `file://`. Code standards follow the sibling `kohai` project.

## Layout

- `index.html` — French app shell: top bar (brand, menu, language link, font size, theme), `<main id="view">`, call bar, footer.
- `en/index.html` — English app shell (`lang="en" data-root="../"`), same `app.js`. A change to one shell is made in the other.
- `assets/app.js` — hash router (`#/`, `#/services`, `#/tarifs`, `#/contact`; French words in files and code,
  `shared/slugs.json` gives the English word, so English readers see `#/prices`), menu, theme, font size, language link,
  phone links, prices table. Logic only: user-facing text lives in the HTML files below.
- `assets/style.css` — screen styles, light/dark tokens, font-size steps. The shells load it and `app.js` with one shared
  `?v=YYYYMMDD<letter>`: bump it on both files in both shells whenever one of them changes.
- `shared/<page>.html` + `shared/<page>.en.html` — one page each: `accueil`, `services`, `tarifs`, `contact`. Each holds one
  `<section data-view="<page>" data-title="…">`.
- `shared/libelles.html` (+ `.en.html`) — menu and interface labels as `<span data-text="key">…</span>`, the phone
  number (`tel`: as displayed, `tel-lien`: `+1` and digits only) and the email (`courriel`). These three values
  use `data-encoding="base64"`; decode them for validation and editing. Decoded values match in both languages.
  Keep contact literals out of other source files, including fallbacks and design notes.
- `shared/tarifs.json` — every price, in both languages: the one source of the prices table (`[data-tarifs]` slot in
  `shared/tarifs.html`). A line has `prix` + `unite` (`heure` or `forfait`), or `"taux": "horaire"` (shown as the hourly
  rate, taken from the line `taux-horaire`), or `"evaluation": true` (quote after review). Change a price here only.
- `.githooks/pre-commit` runs `.githooks/check-i18n.py --staged`. Enable once per clone: `git config core.hooksPath .githooks`.
- `tests/` — `test_check_i18n.py`, `test_contrast.py` (`python3 -m unittest discover tests`), and `cdp.mjs`, a headless
  Chrome driver with no packages (Node 22+): `node tests/cdp.mjs <url> [js-expression …]`.

## Code (app.js)

One source per fact: `ORDER` is the site order (the menu reads it), `PAGES` the page files, `resolveRoute()` the only
route table, `frame()` sets what every page sets (menu state, tab title, focus). Keep functions to one task. A new page is a
new entry in `PAGES` and `ORDER`, a twin pair of HTML files, a menu label `menu-<id>` in both label files, and its English
word in `slugs.json`.

## Two languages (required)

Every page exists in French and in English; a commit is refused unless both are in step. Twins keep the French ids;
`tarifs.json` text fields are `{"fr", "en"}`, both non-empty; both shells change together. `.githooks/check-i18n.py`
checks twins, label keys, the phone values, `data-view` lists, `tarifs.json` and `slugs.json`. The root shell sends `/` to
`/en/` when the reader's saved language (`services-lang`), else their browser's, is English; deep links keep their language.

## Preferences

`localStorage` only (no cookies): `services-theme` (light/auto/dark), `services-taille` (normale/grande/tres-grande),
`services-lang`. Many readers are elders: keep text large (base 18px, sizes in `rem`), tap targets at least 48px, links
underlined, no hover-only content, and check that nothing scrolls sideways at the largest font size on a 360px screen.

## Writing conventions

- French: Québec French. Non-breaking space (`&nbsp;`) before `: ; ! ?` and `$`, and inside « ». Prices `35&nbsp;$`, `17,50&nbsp;$`.
- English: Canadian spelling (colour, centre); no space before `: ; ! ?`; quotes “ ”. Prices `$35`, `$17.50`.
- Plain language: short sentences, no jargon without an explanation.

## Before committing

`python3 -m unittest discover tests`; with a local server running, check `/` and `/en/` load, every menu entry, the
language link, the three font sizes and both themes, at 360px and desktop width. Write commit messages in English,
conventional style (`feat:`, `fix:`, `docs:`…).
