# services.jonathanlafleur.ca — design

Date: 2026-10-16. Status: approved in conversation, pending written-spec review.

## Goal

A bilingual (French at `/`, English at `/en/`) site for a PC and Mac technician side business in the
Baie-des-Chaleurs (Gaspésie, Québec). A visitor understands what is offered, what it costs, and calls or texts to book.
Many clients are elders: large readable text, a font-size control, large tap targets, plain language.

Success: on a phone, a visitor finds the price of a job and reaches the call/text button in two taps, in either language,
at any font size, in light or dark mode.

## Constraints

- Code standards follow the `kohai` repository (same author): static, no build step, no framework, no npm; plain HTML,
  CSS and one JavaScript file; content in HTML fragments loaded with `fetch`; French and English twin files; visible text
  editable in HTML, never in `app.js`; one source per fact; `localStorage` for preferences only, no cookies; conventional
  commit messages in English; Québec French and Canadian English conventions.
- Served by GitHub Pages from `main` of `jonathanlaf/services` (custom domain already configured, HTTPS enforced).
- Service delivery: remote support and drop-off only (no home visits). The drop-off address is never published; it is
  given when booking.
- Contact: phone call and text only, [contact value decoded in browser], via `tel:` and `sms:` links. No form, no third-party service.
- The phone number appears only in site content (`shared/libelles*.html` / contact pages), never in `AGENTS.md`/`CLAUDE.md`.
- Taxes: small supplier (petit fournisseur), no GST/QST charged. Prices are final.
- Fonts: system fonts only (no external requests; fast on rural connections).

## Structure

```
index.html, en/index.html       French / English app shells (always changed together)
assets/app.js                   hash router, menu, theme, font size, language link; logic only
assets/style.css                coastal theme, light/dark tokens, font-size steps
shared/accueil(.en).html        home
shared/services(.en).html       services, one card per service, four groups
shared/tarifs(.en).html         prices: introduction and billing rules; table slot [data-tarifs]
shared/contact(.en).html        phone, area served, by appointment, drop-off note
shared/libelles(.en).html       menu and interface labels (<span data-text="key">)
shared/tarifs.json              the one source of prices
shared/slugs.json               French URL word → English URL word (+ aliases)
.githooks/pre-commit            runs check-i18n.py --staged
.githooks/check-i18n.py         language-parity check, trimmed from kohai
tests/test_check_i18n.py        unit tests of the check
tests/cdp.mjs                   headless Chrome driver (copied from kohai, no packages, Node 22+)
AGENTS.md, CLAUDE.md            kohai's rules adapted; CLAUDE.md is `@AGENTS.md`
CNAME, .nojekyll
```

Routes (French ids everywhere in files and code; `slugs.json` gives the English words):

| French | English | Content |
|---|---|---|
| `#/` | `#/` | `shared/accueil` |
| `#/services` | `#/services` | `shared/services` |
| `#/tarifs` | `#/prices` | `shared/tarifs` + table from `tarifs.json` |
| `#/contact` | `#/contact` | `shared/contact` |

`app.js` keeps kohai's shape at this scale: a `PAGES` list is the one source of the site order (menu reads it),
`resolveRoute()` is the only route table, `frame()` sets what every page sets (menu state, top-bar label, tab title),
one view function per kind of page, one task per function. New sections are added to `PAGES` plus a twin pair of HTML
files. Dropped from kohai: print/Paged.js, games, kata machinery, public changelog page.

## Content

- **Home:** "Jonathan Lafleur — Technicien PC et Mac / PC and Mac technician", Baie-des-Chaleurs, remote help or drop-off,
  a prominent "Appelez ou textez / Call or text" button, short links to Services and Tarifs.
- **Services:** four groups — Dépannage et nettoyage (slow computer, viruses, OS reinstall, updates); Matériel (SSD/RAM
  upgrades, part replacement, new PC setup, custom PC assembly); Données et sauvegarde (transfer to a new computer, backup
  setup, data recovery); Configuration et réseau (printers, Wi-Fi, email/accounts, learning to use your device).
  Mac and PC for all.
- **Tarifs:** billing rules in prose, then the table drawn from `tarifs.json`, then "Taxes non applicables / No taxes
  charged" and "Mac et PC : mêmes tarifs / Mac and PC: same rates".
- **Contact:** [contact value decoded in browser] as large `tel:` and `sms:` buttons, "Sur rendez-vous / By appointment", remote or drop-off,
  "L'adresse de dépôt est donnée à la prise de rendez-vous / The drop-off address is given when you book".
- The call/text button is reachable from every page on phones (top bar or sticky bottom bar).

## Prices (`shared/tarifs.json`)

Text fields are `{"fr", "en"}` HTML, both non-empty. Amounts are numbers in CAD; `unite` is `heure`, `forfait`
or absent (quote after review). Shape:

```json
{ "groupes": [ { "id": "main-oeuvre", "titre": {"fr": "…", "en": "…"},
  "lignes": [ { "id": "taux-horaire", "nom": {"fr": "…", "en": "…"}, "prix": 35, "unite": "heure",
                "note": {"fr": "…", "en": "…"} } ] } ] }
```

| Group | Line | Price |
|---|---|---|
| Main-d'œuvre / Labour | Taux horaire / Hourly rate | $35/h — minimum 1 h, then by 30-minute steps ($17.50) |
| | Petit travail (moins de 30 min) / Small job (under 30 min) | $20 flat |
| Forfaits / Flat rates | Diagnostic | free if the work goes ahead, otherwise $50 |
| | Retrait de virus / Virus removal | $90 |
| | Réinstallation du système / OS reinstall | $70 |
| | Réinstallation + transfert de données / OS reinstall + data transfer | $100 |
| | Transfert de données / Data transfer | $70 |
| À l'heure / Hourly | Nettoyage (interne et logiciel) / Cleaning | hourly rate |
| | Assemblage d'ordinateur / PC assembly | hourly rate |
| | Mises à niveau (SSD, RAM…), pièces au coût / Upgrades, parts at cost | hourly rate (small-job rate if under 30 min) |
| | Soutien à distance / Remote support | hourly rate (small-job rate if under 30 min) |
| | Configuration et réseau / Setup and network | hourly rate |
| Sur évaluation / Quote after review | Récupération de données / Data recovery | case by case |

Formatting: French `35 $`, `17,50 $` (non-breaking space before `$`); English `$35`, `$17.50`.
Price research (2026-10-16, for reference only, not shown on the site): local benchmark $30/h residential (Feb 2025 list);
Canada Computers Québec flat rates (diagnostic $49.99, virus $149.99, OS $69.99, OS + data $99.99, data transfer $69.99).

## Theme

Coastal, warm. Tokens on `:root` with a dark set under `prefers-color-scheme: dark` (guarded by
`:root:not([data-theme="light"])`) and again under `:root[data-theme="dark"]`, as in kohai.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f7f1e6` sand | `#0f1c2b` deep navy |
| `--surface` | `#fffaf1` | `#172a3d` |
| `--fg` | `#13263a` navy | `#ede6d8` |
| `--muted` | `#4d5b69` | `#a9b4bf` |
| `--line` | `#e2d7c4` | `#2a3f55` |
| `--accent` | `#1f7a6d` sea green | `#4fb3a2` |
| `--accent-2` | `#d9714e` sunset coral | `#e88b6b` |

Rounded cards, a subtle wave divider under the top bar (inline SVG using `currentColor`/tokens). All text/background
pairs meet WCAG AA (4.5:1 for body text); verify with a contrast check before committing.

## Accessibility for elders

- Base font size 18px; line height 1.6; all sizes in `rem` so the font-size control scales everything.
- Font-size control in the top bar: three buttons "A", "A+", "A++" (labels in `libelles`, with accessible names
  "Taille du texte : normale / grande / très grande"), setting `data-taille` on `<html>` → root font size 100 %, 125 %,
  150 %. Choice saved in `localStorage` (`services-taille`); default normal. The layout must not break or scroll
  horizontally at 150 % on a 360px-wide phone.
- Theme toggle (auto / light / dark) saved in `services-theme`; language choice in `services-lang`.
- Tap targets at least 48×48px; visible focus outline; links underlined; no text in images; no hover-only content.
- Plain language; prices written in full sentences where a rule needs explaining.

## Two languages

As in kohai: every `shared/*.html` has an `.en.html` twin keeping the French ids (`data-view`, `h2`/`h3` ids, anchors,
`data-text` keys); only visible text changes. Both shells change together. The root shell sends `/` to `/en/` when the
reader's saved or browser language is English; deep links keep their language. `check-i18n.py` checks twins, label
keys, `tarifs.json` text fields (both non-empty), and `slugs.json` (clean words, one English word per French word).

## Testing

- `python3 -m unittest tests/test_check_i18n.py`; the pre-commit hook runs the check (`git config core.hooksPath .githooks`).
- `node tests/cdp.mjs` against a local server (`python3 -m http.server 8765`): `/` and `/en/` load; each route renders;
  the price table has one row per `tarifs.json` line with correctly formatted amounts; the language link keeps the page;
  `tel:`/`sms:` hrefs are `tel:[contact value decoded in browser]` / `sms:[contact value decoded in browser]`; each font-size step applies and causes no horizontal
  scroll at 360px.
- Manual: phone and desktop widths, light and dark, three font sizes, both languages.

## Out of scope

Online booking, forms, payments, home visits, a public changelog, print layouts, analytics.
