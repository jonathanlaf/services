# services.jonathanlafleur.ca Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder at services.jonathanlafleur.ca with a bilingual (FR `/`, EN `/en/`) site for a PC and Mac technician: home, services, prices drawn from one JSON file, contact by call/text, with theme and font-size controls for elder readers.

**Architecture:** Same shape as the `kohai` repo (`~/Codes/kohai`, read its `AGENTS.md`): two static HTML shells load one `assets/app.js` that hash-routes (`#/`, `#/services`, `#/tarifs`, `#/contact`) and fetches HTML fragments from `shared/` (French `x.html`, English twin `x.en.html`). Visible text lives in HTML (`shared/libelles*.html` labels read with `T()`); prices live once in `shared/tarifs.json`. A Python pre-commit check keeps both languages in step.

**Tech Stack:** Plain HTML/CSS/ES5-style JavaScript (no build, no npm), Python 3 (`unittest`) for the i18n check and the contrast test, Node 22+ `tests/cdp.mjs` (headless Chrome, no packages) for browser checks, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-16-services-site-design.md`

## Global Constraints

- No build step, no framework, no npm, no external requests (system fonts only, no CDN).
- French at `/`, English at `/en/` (`<html lang="en" data-root="../">`); both shells change together.
- Every `shared/*.html` has an `.en.html` twin keeping the French ids (`data-view`, `h2`/`h3` ids, `data-text` keys); only visible text, `data-title` change.
- All visible text editable in HTML, never only in `app.js`; `T('key', 'fallback')` fallback identical to the French file's text.
- One source per fact: page order in `ORDER` (app.js), prices in `shared/tarifs.json`, phone in `shared/libelles*.html` keys `tel` / `tel-lien`.
- Phone: display `418-391-1620`, link value `+14183911620` (`tel:+14183911620`, `sms:+14183911620`). Never in `AGENTS.md`/`CLAUDE.md`.
- No street address published. Taxes: none charged (small supplier).
- `localStorage` keys: `services-theme` (`light|auto|dark`), `services-taille` (`normale|grande|tres-grande`), `services-lang` (`fr|en`); every access in try/catch; no cookies.
- Base font 18px; font-size steps 100 % / 125 % / 150 % of that; sizes in `rem`; no horizontal scroll at 150 % on a 360px-wide viewport.
- Tap targets ≥ 48×48px; visible focus outline; body text contrast ≥ 4.5:1 in light and dark.
- Québec French (non-breaking space `&nbsp;` before `: ; ! ?` and `$`, inside « »); Canadian English (colour, centre; no space before `: ; ! ?`).
- Price formats: French `35&nbsp;$`, `17,50&nbsp;$`; English `$35`, `$17.50`.
- Commit messages in English, conventional style (`feat:`, `fix:`, `docs:`, `test:`), no AI attribution lines.
- Shell asset URLs carry one shared `?v=YYYYMMDD<letter>` (start `20261016a`); bump it on every asset in both shells when `app.js` or `style.css` changes.
- Do not push to GitHub until the user says so (pushing publishes the site).

## Review Focus

- A reader whose saved `services-taille` is a junk value (old version, hand-edited) → treated as `normale`, no broken layout. Pinned in Task 2 (cdp check).
- A visitor arriving at an English deep link `/en/#/prices` or a French word in the English shell `/en/#/tarifs` → lands on the prices page in English, address rewritten to `#/prices`. Pinned in Task 2/4 cdp checks.
- An unknown route `#/nimporte-quoi` → home page, no error message. Pinned in Task 2.
- `tarifs.json` fails to load (offline, typo) → the prices page still shows its prose and a readable error in the table slot, not a blank page. Pinned in Task 4.
- A tarifs line with a non-integer amount (`17.5`) → `17,50 $` / `$17.50`, never `17.5`. Pinned in Task 4 (unit test of `formatPrice` via cdp).

---

## File map

| File | Responsibility | Task |
|---|---|---|
| `AGENTS.md`, `CLAUDE.md` | rules for agents (public) | 1 |
| `.githooks/check-i18n.py`, `.githooks/pre-commit` | language-parity + tarifs + slugs + phone check | 1 |
| `tests/test_check_i18n.py` | unit tests of the check | 1 |
| `tests/cdp.mjs` | headless Chrome driver (copy of kohai's) | 2 |
| `tests/test_contrast.py` | WCAG contrast of theme tokens | 2 |
| `index.html`, `en/index.html` | shells: top bar, menu, tools, call bar, `<main id="view">` | 2 |
| `assets/style.css` | tokens, layout, font-size steps, components | 2 (+3, 4) |
| `assets/app.js` | router, labels, slugs, theme, font size, language link, phone links, prices table | 2 (+4) |
| `shared/libelles(.en).html` | menu + interface labels, phone | 2 |
| `shared/slugs.json` | French → English URL words | 2 |
| `shared/accueil(.en).html` | home | 2 |
| `shared/services(.en).html`, `shared/contact(.en).html` | services and contact pages | 3 |
| `shared/tarifs(.en).html`, `shared/tarifs.json` | prices page and data | 4 |
| `README.md` | short human readme | 5 |

---

### Task 1: Agent rules and the language-parity check

**Files:**
- Create: `AGENTS.md`, `CLAUDE.md`, `.githooks/check-i18n.py`, `.githooks/pre-commit`, `tests/test_check_i18n.py`

**Interfaces:**
- Produces: `check-i18n.py` functions `twin(path)`, `pair_problems(paths)`, `label_keys(html)`, `label_values(html) -> dict`, `view_ids(html)`, `both(v)`, `tarifs_problems(data) -> list[str]`, `slug_problems(data, live=frozenset())`, `phone_problems(read)`, `run(staged) -> list[str]`; constants `TWINNED = ('shared/',)`, `LABELS = 'shared/libelles.html'`, `TARIFS = 'shared/tarifs.json'`, `SLUGS = 'shared/slugs.json'`, `SAME_VALUE = ('tel', 'tel-lien')`, `UNITS = ('heure', 'forfait')`.
- `tarifs.json` shape enforced (used by Task 4): `{"groupes": [{"id", "titre": {fr,en}, "lignes": [{"id", "nom": {fr,en}, "note"?: {fr,en}, and exactly one of: "prix": number ≥ 0 with "unite" in UNITS | "taux": "horaire" | "evaluation": true}]}]}`; line ids unique across the file; group ids unique.

- [ ] **Step 1: Write `AGENTS.md` and `CLAUDE.md`**

`CLAUDE.md` contains exactly `@AGENTS.md`. `AGENTS.md`:

```markdown
# AGENTS.md — Services

Context and rules for AI coding agents working on this repository.

## Hard rule: nothing private in agent files

This file (and `CLAUDE.md`) is committed and public. Never write in it: personal information (phone numbers, addresses,
emails, client names), credentials, tokens, internal URLs, local machine paths, or anything learned from private
conversations. Describe rules and conventions only. Content the site publishes (the phone number) lives in the site's
HTML files (`shared/libelles*.html`), not here. The drop-off address is never published anywhere in the repo.

## What the project is

A static, bilingual site for a PC and Mac technician (remote support and drop-off, Baie-des-Chaleurs), French at `/`
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
- `shared/libelles.html` (+ `.en.html`) — menu and interface labels as `<span data-text="key">…</span>`, and the phone
  number (`tel`: as displayed, `tel-lien`: `+1` and digits only; identical in both files).
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
```

- [ ] **Step 2: Write the failing tests** — `tests/test_check_i18n.py`

```python
import importlib.util
import json
import os
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, '..', '.githooks', 'check-i18n.py')
spec = importlib.util.spec_from_file_location('check_i18n', SCRIPT)
ci = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ci)

FR_EN = {'fr': 'a', 'en': 'a'}
TARIFS = {'groupes': [
    {'id': 'main-oeuvre', 'titre': FR_EN, 'lignes': [
        {'id': 'taux-horaire', 'nom': FR_EN, 'prix': 35, 'unite': 'heure', 'note': FR_EN},
        {'id': 'nettoyage', 'nom': FR_EN, 'taux': 'horaire'},
        {'id': 'recuperation', 'nom': FR_EN, 'evaluation': True}]}]}


def tarifs(**change):
    data = json.loads(json.dumps(TARIFS))
    data['groupes'][0]['lignes'][0].update(change)
    return data


class Pure(unittest.TestCase):
    def test_twin(self):
        self.assertEqual(ci.twin('shared/a.html'), 'shared/a.en.html')
        self.assertEqual(ci.twin('shared/a.en.html'), 'shared/a.html')

    def test_pairs(self):
        self.assertEqual(ci.pair_problems(['shared/a.html', 'shared/a.en.html']), [])
        self.assertEqual(len(ci.pair_problems(['shared/a.html'])), 1)
        self.assertEqual(len(ci.pair_problems(['shared/b.en.html'])), 1)
        self.assertEqual(ci.pair_problems(['index.html', 'shared/tarifs.json']), [])

    def test_label_keys_skip_comments(self):
        html = '<!-- <span data-text="x">x</span> -->\n<span data-text="a">A</span><span data-text="b">B</span>'
        self.assertEqual(ci.label_keys(html), ['a', 'b'])

    def test_label_values(self):
        self.assertEqual(ci.label_values('<span data-text="tel"> 418-391-1620 </span>'), {'tel': '418-391-1620'})

    def test_view_ids(self):
        self.assertEqual(ci.view_ids('<section data-view="tarifs" data-title="T"></section>'), ['tarifs'])

    def test_tarifs_ok(self):
        self.assertEqual(ci.tarifs_problems(TARIFS), [])

    def test_tarifs_not_object(self):
        self.assertEqual(len(ci.tarifs_problems([])), 1)

    def test_tarifs_missing_english(self):
        self.assertEqual(len(ci.tarifs_problems(tarifs(nom={'fr': 'a', 'en': ''}))), 1)

    def test_tarifs_bad_unit(self):
        self.assertEqual(len(ci.tarifs_problems(tarifs(unite='jour'))), 1)

    def test_tarifs_negative_or_text_price(self):
        self.assertEqual(len(ci.tarifs_problems(tarifs(prix=-1))), 1)
        self.assertEqual(len(ci.tarifs_problems(tarifs(prix='35'))), 1)
        self.assertEqual(len(ci.tarifs_problems(tarifs(prix=True))), 1)

    def test_tarifs_needs_exactly_one_kind(self):
        self.assertEqual(len(ci.tarifs_problems(tarifs(taux='horaire'))), 1)
        line = {'id': 'x', 'nom': FR_EN}
        data = json.loads(json.dumps(TARIFS)); data['groupes'][0]['lignes'].append(line)
        self.assertEqual(len(ci.tarifs_problems(data)), 1)

    def test_tarifs_hourly_needs_rate_line(self):
        data = json.loads(json.dumps(TARIFS)); del data['groupes'][0]['lignes'][0]
        self.assertEqual(len(ci.tarifs_problems(data)), 1)

    def test_tarifs_duplicate_ids(self):
        data = json.loads(json.dumps(TARIFS)); data['groupes'][0]['lignes'][1]['id'] = 'taux-horaire'
        self.assertEqual(len(ci.tarifs_problems(data)), 1)

    def test_slugs_ok(self):
        self.assertEqual(ci.slug_problems({'en': {'tarifs': 'prices'}, 'aliases': {}}), [])

    def test_slugs_bad_word(self):
        self.assertEqual(len(ci.slug_problems({'en': {'tarifs': 'Prices!'}, 'aliases': {}})), 1)

    def test_slugs_duplicate_english(self):
        self.assertEqual(len(ci.slug_problems({'en': {'tarifs': 'prices', 'prix': 'prices'}, 'aliases': {}})), 1)

    def test_slugs_alias_is_live(self):
        self.assertEqual(len(ci.slug_problems({'en': {}, 'aliases': {'tarifs': 'contact'}}, frozenset({'tarifs'}))), 1)

    def test_phone_same_in_both(self):
        files = {'shared/libelles.html': '<span data-text="tel">418</span><span data-text="tel-lien">+1418</span>',
                 'shared/libelles.en.html': '<span data-text="tel">418</span><span data-text="tel-lien">+1418</span>'}
        self.assertEqual(ci.phone_problems(files.get), [])
        files['shared/libelles.en.html'] = files['shared/libelles.en.html'].replace('+1418', '+1419')
        self.assertEqual(len(ci.phone_problems(files.get)), 1)

    def test_phone_link_digits_only(self):
        files = {'shared/libelles.html': '<span data-text="tel">418</span><span data-text="tel-lien">418-391</span>'}
        files['shared/libelles.en.html'] = files['shared/libelles.html']
        self.assertEqual(len(ci.phone_problems(files.get)), 1)


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd ~/Codes/services && python3 -m unittest tests/test_check_i18n.py`
Expected: FAIL / ERROR — `FileNotFoundError` for `.githooks/check-i18n.py`.

- [ ] **Step 4: Write `.githooks/check-i18n.py`**

```python
#!/usr/bin/env python3
"""Both languages are required: every page has its English twin, and they stay in step.

Run by .githooks/pre-commit with --staged (reads the git index), or by hand on the working tree.
"""
import json
import os
import re
import subprocess
import sys

TWINNED = ('shared/',)
LABELS = 'shared/libelles.html'
TARIFS = 'shared/tarifs.json'
SLUGS = 'shared/slugs.json'
SAME_VALUE = ('tel', 'tel-lien')  # label keys whose text is identical in both languages
UNITS = ('heure', 'forfait')


def twin(path):
    return path[:-len('.en.html')] + '.html' if path.endswith('.en.html') else path[:-len('.html')] + '.en.html'


def pair_problems(paths):
    present = set(paths)
    return ['{} has no twin {}'.format(p, twin(p)) for p in sorted(present)
            if p.startswith(TWINNED) and p.endswith('.html') and twin(p) not in present]


def strip_comments(html):
    return re.sub(r'<!--.*?-->', '', html, flags=re.S)


def label_keys(html):
    return re.findall(r'data-text="([^"]+)"', strip_comments(html))


def label_values(html):
    return {k: v.strip() for k, v in re.findall(r'data-text="([^"]+)"[^>]*>(.*?)</', strip_comments(html), flags=re.S)}


def view_ids(html):
    return re.findall(r'<section\b[^>]*\bdata-view(?:="([^"]*)")?', strip_comments(html))


def both(v):
    return isinstance(v, dict) and all(isinstance(v.get(l), str) and v[l].strip() for l in ('fr', 'en'))


def text(v):
    return isinstance(v, str) and v.strip() != ''


def line_problems(line):
    if not isinstance(line, dict):
        return ['{} has a line that is not an object'.format(TARIFS)]
    where = '{} line {}'.format(TARIFS, line.get('id'))
    problems = [] if text(line.get('id')) else [where + ' needs a non-empty "id"']
    problems += ['{} "{}" needs non-empty "fr" and "en"'.format(where, f)
                 for f in ('nom',) + (('note',) if 'note' in line else ()) if not both(line.get(f))]
    kinds = [k for k in ('prix', 'taux', 'evaluation') if k in line]
    if len(kinds) != 1:
        return problems + [where + ' needs exactly one of "prix", "taux", "evaluation"']
    if 'prix' in line:
        p = line['prix']
        if isinstance(p, bool) or not isinstance(p, (int, float)) or p < 0:
            problems.append(where + ' "prix" must be a number, 0 or more')
        if line.get('unite') not in UNITS:
            problems.append('{} "unite" must be one of {}'.format(where, ', '.join(UNITS)))
    elif 'taux' in line and line['taux'] != 'horaire':
        problems.append(where + ' "taux" must be "horaire"')
    elif 'evaluation' in line and line['evaluation'] is not True:
        problems.append(where + ' "evaluation" must be true')
    return problems


def tarifs_problems(data):
    """shared/tarifs.json: groups and lines with French and English text, one kind of price per line, unique ids."""
    if not isinstance(data, dict) or not isinstance(data.get('groupes'), list):
        return [TARIFS + ' must be an object with a "groupes" list']
    problems, ids, gids = [], [], []
    for g in data['groupes']:
        if not isinstance(g, dict):
            problems.append(TARIFS + ' has a group that is not an object')
            continue
        gids.append(g.get('id'))
        if not text(g.get('id')):
            problems.append(TARIFS + ' group needs a non-empty "id"')
        if not both(g.get('titre')):
            problems.append('{} group {} "titre" needs non-empty "fr" and "en"'.format(TARIFS, g.get('id')))
        lines = g.get('lignes')
        if not isinstance(lines, list) or not lines:
            problems.append('{} group {} needs a non-empty "lignes" list'.format(TARIFS, g.get('id')))
            continue
        for line in lines:
            problems += line_problems(line)
            if isinstance(line, dict):
                ids.append(line.get('id'))
    problems += ['{} id {} appears more than once'.format(TARIFS, i)
                 for i in sorted({i for i in ids + gids if (ids + gids).count(i) > 1}, key=str)]
    hourly = any(isinstance(l, dict) and l.get('taux') == 'horaire'
                 for g in data['groupes'] if isinstance(g, dict) for l in (g.get('lignes') or []))
    if hourly and 'taux-horaire' not in ids:
        problems.append(TARIFS + ' has "taux": "horaire" lines but no line "taux-horaire"')
    return problems


def slug_problems(data, live=frozenset()):
    """shared/slugs.json: clean URL words; one English word per French word; old ids lead to a current one."""
    if not isinstance(data, dict) or not all(isinstance(data.get(k), dict) for k in ('en', 'aliases')):
        return [SLUGS + ' must be an object with "en" and "aliases" objects']
    en, aliases = data['en'], data['aliases']
    problems = ['{} "{}": "{}" is not a URL word (a-z, 0-9, -)'.format(SLUGS, k, v) for k, v in list(en.items()) + list(aliases.items())
                if not (isinstance(v, str) and re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', v))]
    values = list(en.values())
    problems += ['{} English word "{}" is used for more than one French word'.format(SLUGS, v)
                 for v in sorted({v for v in values if values.count(v) > 1}, key=str)]
    problems += ['{} English word "{}" (for "{}") is also a French word'.format(SLUGS, v, k) for k, v in en.items()
                 if v != k and v in en and en[v] != v]
    problems += ['{} old id "{}" is a current id: it would send that page elsewhere'.format(SLUGS, k) for k in aliases if k in live]
    problems += ['{} old id "{}" leads to "{}", which is itself an old id'.format(SLUGS, k, v) for k, v in aliases.items() if v in aliases]
    return problems


def phone_problems(read):
    """The phone number is the same in both label files, and its link value is + and digits only."""
    a, b = read(LABELS), read(twin(LABELS))
    if a is None or b is None:
        return []
    va, vb = label_values(a), label_values(b)
    problems = ['data-text "{}" differs between {} and {}'.format(k, LABELS, twin(LABELS)) for k in SAME_VALUE if va.get(k) != vb.get(k)]
    if 'tel-lien' in va and not re.fullmatch(r'\+\d{11}', va['tel-lien']):
        problems.append('data-text "tel-lien" must be + and 11 digits, like +14185550000')
    return problems


def live_ids(files, read):
    ids = set()
    for f in files:
        if f.startswith(TWINNED) and f.endswith('.html') and not f.endswith('.en.html'):
            ids.update(re.findall(r'\b(?:id|data-view)="([^"]+)"', read(f) or ''))
    return ids


def label_problems(read):
    a, b = read(LABELS), read(twin(LABELS))
    if a is None or b is None:
        return []
    ka, kb = label_keys(a), label_keys(b)
    problems = ['data-text "{}" is in {} only'.format(k, LABELS if k in ka else twin(LABELS)) for k in sorted(set(ka) ^ set(kb))]
    for name, keys in ((LABELS, ka), (twin(LABELS), kb)):
        problems += ['data-text "{}" appears more than once in {}'.format(k, name) for k in sorted({k for k in keys if keys.count(k) > 1})]
    return problems


def view_problems(files, read):
    problems = []
    for fr in files:
        if fr.startswith(TWINNED) and fr.endswith('.html') and not fr.endswith('.en.html') and twin(fr) in files:
            a, b = read(fr), read(twin(fr))
            if a is not None and b is not None and view_ids(a) != view_ids(b):
                problems.append('{} and {} have different data-view ids: {} / {}'.format(fr, twin(fr), view_ids(a), view_ids(b)))
    return problems


def json_file_problems(read, path, check):
    raw = read(path)
    if raw is None:
        return []
    try:
        return check(json.loads(raw))
    except ValueError as e:
        return ['{} is not valid JSON: {}'.format(path, e)]


def git(*args):
    r = subprocess.run(['git', *args], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def reader(staged):
    if staged:
        return [p for p in (git('ls-files', '-z') or '').split('\0') if p], lambda p: git('show', ':' + p)

    def read(p):
        try:
            with open(p, encoding='utf-8') as f:
                return f.read()
        except OSError:
            return None
    files = [os.path.relpath(os.path.join(d, f)).replace(os.sep, '/') for top in TWINNED for d, _, fs in os.walk(top) for f in fs]
    return files, read


def run(staged):
    top = git('rev-parse', '--show-toplevel')
    if top:
        os.chdir(top.strip())
    elif staged:
        return ['--staged needs a git work tree (git rev-parse failed)']
    files, read = reader(staged)
    problems = pair_problems([f for f in files if f.startswith(TWINNED)])
    problems += label_problems(read) + phone_problems(read) + view_problems(files, read)
    problems += json_file_problems(read, TARIFS, tarifs_problems)
    problems += json_file_problems(read, SLUGS, lambda d: slug_problems(d, live_ids(files, read)))
    return problems


def main():
    problems = run(staged='--staged' in sys.argv[1:])
    for p in problems:
        print('check-i18n: ' + p, file=sys.stderr)
    if problems:
        print('  See AGENTS.md (two languages).', file=sys.stderr)
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
```

`.githooks/pre-commit` (then `chmod +x .githooks/pre-commit .githooks/check-i18n.py`):

```bash
#!/bin/bash
# Both languages are required: see .githooks/check-i18n.py (twins, labels, phone, views, tarifs.json, slugs.json).
exec python3 "$(dirname "$0")/check-i18n.py" --staged
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `python3 -m unittest tests/test_check_i18n.py -v`
Expected: all tests `ok`.

- [ ] **Step 6: Enable the hook and commit**

```bash
git config core.hooksPath .githooks
git add AGENTS.md CLAUDE.md .githooks tests/test_check_i18n.py
git commit -m "feat: agent rules and the language-parity check"
```

---

### Task 2: Shells, theme, font size, router and home page

**Files:**
- Create: `tests/cdp.mjs` (copy `~/Codes/kohai/tests/cdp.mjs`, change the temp-dir prefix `kohai-cdp-` to `services-cdp-`), `tests/test_contrast.py`, `assets/style.css`, `assets/app.js`, `en/index.html`, `shared/libelles.html`, `shared/libelles.en.html`, `shared/slugs.json`, `shared/accueil.html`, `shared/accueil.en.html`, and stub twins `shared/services(.en).html`, `shared/tarifs(.en).html`, `shared/contact(.en).html` (one `<section data-view="<id>" data-title="…"><h1>…</h1></section>` each, filled in Tasks 3–4)
- Modify (replace): `index.html` (current placeholder)

**Interfaces:**
- Consumes: Task 1 check (runs at commit).
- Produces (app.js, used by Task 4): `LANG` (`'fr'|'en'`), `ROOT`, `localized(path)`, `L(v)`, `T(key, fallback)`, `fetchText(url)`, `fetchFragment(url) -> Promise<DocumentFragment>`, `escapeHtml(s)`, `link(hash)`, a hook object `FILL = { <pageId>: function (frag) -> Promise|undefined }` that `render()` calls on the fetched fragment before showing it (Task 4 adds `FILL.tarifs`). Page fragments' `[data-tel]` / `[data-sms]` links get `href` set and `[data-phone]` elements get the display number by `phoneLinks(node)`.
- CSS classes used by later tasks: `.page`, `.lead`, `.cards`, `.card`, `.btn`, `.btn-alt`, `.note`, `.wave`.

- [ ] **Step 1: Write the failing contrast test** — `tests/test_contrast.py`

```python
import os
import re
import unittest

CSS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'style.css')
# Text on background pairs that must reach WCAG AA for body text (4.5:1)
PAIRS = [('--fg', '--bg'), ('--fg', '--surface'), ('--muted', '--bg'), ('--muted', '--surface'),
         ('--accent', '--bg'), ('--accent', '--surface'), ('--on-accent', '--accent')]


def block(css, selector):
    m = re.search(re.escape(selector) + r'\s*\{([^}]*)\}', css)
    return dict(re.findall(r'(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})', m.group(1))) if m else {}


def luminance(hex_colour):
    def ch(c):
        c = int(c, 16) / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(hex_colour[i:i + 2]) for i in (1, 3, 5))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


class Contrast(unittest.TestCase):
    def setUp(self):
        with open(CSS, encoding='utf-8') as f:
            self.css = f.read()

    def check(self, tokens, name):
        for fg, bg in PAIRS:
            with self.subTest(theme=name, pair=(fg, bg)):
                self.assertIn(fg, tokens); self.assertIn(bg, tokens)
                self.assertGreaterEqual(ratio(tokens[fg], tokens[bg]), 4.5)

    def test_light(self):
        self.check(block(self.css, ':root'), 'light')

    def test_dark(self):
        self.check(block(self.css, ':root[data-theme="dark"]'), 'dark')

    def test_dark_blocks_match(self):
        auto = block(self.css, ':root:not([data-theme="light"])')
        self.assertEqual(auto, block(self.css, ':root[data-theme="dark"]'))


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python3 -m unittest tests/test_contrast.py`
Expected: ERROR — `FileNotFoundError` for `assets/style.css`.

- [ ] **Step 3: Write `assets/style.css`**

```css
/* Coastal theme: sand and navy, sea-green actions, sunset-coral highlights. Sizes in rem so the font-size control scales everything. */
:root {
  --bg: #f7f1e6; --surface: #fffaf1; --fg: #13263a; --muted: #4d5b69; --line: #e2d7c4;
  --accent: #1a6b5f; --on-accent: #ffffff; --accent-2: #b8532f; --bar: rgba(247, 241, 230, 0.94);
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --echelle: 1;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0f1c2b; --surface: #172a3d; --fg: #ede6d8; --muted: #a9b4bf; --line: #2a3f55;
    --accent: #4fb3a2; --on-accent: #0f1c2b; --accent-2: #e88b6b; --bar: rgba(15, 28, 43, 0.94);
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #0f1c2b; --surface: #172a3d; --fg: #ede6d8; --muted: #a9b4bf; --line: #2a3f55;
  --accent: #4fb3a2; --on-accent: #0f1c2b; --accent-2: #e88b6b; --bar: rgba(15, 28, 43, 0.94);
  color-scheme: dark;
}
/* Font size: 18px base, then 125 % and 150 % */
:root[data-taille="grande"] { --echelle: 1.25; }
:root[data-taille="tres-grande"] { --echelle: 1.5; }
html { font-size: calc(112.5% * var(--echelle)); scroll-padding-top: 6rem; }

* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--fg); font-family: var(--font); line-height: 1.6;
  overflow-wrap: break-word; padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
}
a { color: var(--accent); text-underline-offset: 0.15em; }
:focus-visible { outline: 3px solid var(--accent-2); outline-offset: 2px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
button, .btn, .menu a, .tools a { min-height: 48px; min-width: 48px; font: inherit; }

/* Top bar */
.topbar { position: sticky; top: 0; z-index: 10; background: var(--bar); border-bottom: 1px solid var(--line); }
.topbar-in { max-width: 60rem; margin: 0 auto; padding: 0.25rem 1rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem 1rem; }
.brand { font-weight: 700; color: var(--fg); text-decoration: none; display: inline-flex; align-items: center; min-height: 48px; margin-right: auto; }
.menu { display: flex; flex-wrap: wrap; gap: 0.25rem; list-style: none; margin: 0; padding: 0; }
.menu a { display: inline-flex; align-items: center; padding: 0 0.75rem; border-radius: 0.5rem; color: var(--fg); }
.menu a[aria-current="page"] { background: var(--surface); font-weight: 700; text-decoration-color: var(--accent-2); text-decoration-thickness: 3px; }
.tools { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.tools a { display: inline-flex; align-items: center; justify-content: center; }
.switch { display: inline-flex; border: 1px solid var(--line); border-radius: 0.5rem; overflow: hidden; }
.switch button { background: var(--surface); color: var(--fg); border: 0; border-right: 1px solid var(--line); padding: 0 0.6rem; cursor: pointer; }
.switch button:last-child { border-right: 0; }
.switch button[aria-pressed="true"] { background: var(--accent); color: var(--on-accent); font-weight: 700; }
.wave { display: block; width: 100%; height: 0.75rem; color: var(--line); }

/* Pages */
main { max-width: 60rem; margin: 0 auto; padding: 1rem; }
main:focus { outline: none; }
.page h1 { font-size: 1.9rem; line-height: 1.25; margin: 1rem 0 0.5rem; }
.page h2 { font-size: 1.4rem; margin: 2rem 0 0.5rem; }
.lead { font-size: 1.15rem; color: var(--muted); }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: 1rem; padding: 0; list-style: none; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 1rem; padding: 1rem 1.25rem; }
.card h2, .card h3 { margin-top: 0; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem 1.25rem; border-radius: 999px;
  background: var(--accent); color: var(--on-accent); font-weight: 700; text-decoration: none; border: 2px solid var(--accent); }
.btn-alt { background: transparent; color: var(--accent); }
.actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 1rem 0; }
.note { color: var(--muted); }
.error { border-left: 4px solid var(--accent-2); padding-left: 0.75rem; }

/* Call bar: always reachable on phones */
.callbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 10; display: flex; gap: 0.5rem; justify-content: center;
  padding: 0.5rem 1rem calc(0.5rem + env(safe-area-inset-bottom, 0px)); background: var(--bar); border-top: 1px solid var(--line); }
.callbar .btn { flex: 1 1 0; max-width: 16rem; }
@media (min-width: 900px) { .callbar { display: none; } body { padding-bottom: 0; } }

.site-foot { max-width: 60rem; margin: 2rem auto 0; padding: 1rem; color: var(--muted); border-top: 1px solid var(--line); }
```

- [ ] **Step 4: Run the contrast test to verify it passes**

Run: `python3 -m unittest tests/test_contrast.py -v`
Expected: all `ok`. (Light accent is `#1a6b5f`, darker than the spec's `#1f7a6d`, and coral `#b8532f` is used only for focus/underline, not text, so body-text pairs pass 4.5:1. If a pair still fails, darken the light token / lighten the dark token by small steps until it passes, and keep both dark blocks identical.)

- [ ] **Step 5: Write the label files** — `shared/libelles.html`

```html
<!-- Menu and interface labels (read by app.js with T('key')). The English twin is libelles.en.html: same keys.
     tel / tel-lien are the phone number (as shown, and + digits for links): identical in both files. -->
<span data-text="site-nom">Jonathan Lafleur · Technicien PC et Mac</span>
<span data-text="menu-accueil">Accueil</span>
<span data-text="menu-services">Services</span>
<span data-text="menu-tarifs">Tarifs</span>
<span data-text="menu-contact">Contact</span>
<span data-text="tel">418-391-1620</span>
<span data-text="tel-lien">+14183911620</span>
<span data-text="erreur-chargement">Impossible de charger le contenu. Rechargez la page.</span>
<span data-text="erreur-tarifs">Les tarifs n’ont pas pu être chargés. Appelez-nous pour les connaître.</span>
<span data-text="unite-heure">de l’heure</span>
<span data-text="taux-horaire">Au taux horaire</span>
<span data-text="sur-evaluation">Sur évaluation</span>
<span data-text="col-service">Service</span>
<span data-text="col-prix">Prix</span>
```

`shared/libelles.en.html` — same keys and order: `site-nom` “Jonathan Lafleur · PC and Mac technician”, `menu-accueil` “Home”, `menu-services` “Services”, `menu-tarifs` “Prices”, `menu-contact` “Contact”, `tel` / `tel-lien` identical, `erreur-chargement` “The content could not be loaded. Please reload the page.”, `erreur-tarifs` “The prices could not be loaded. Call us to get them.”, `unite-heure` “per hour”, `taux-horaire` “At the hourly rate”, `sur-evaluation` “Quote after review”, `col-service` “Service”, `col-prix` “Price”.

`shared/slugs.json`:

```json
{ "en": { "accueil": "home", "tarifs": "prices" }, "aliases": {} }
```

- [ ] **Step 6: Write the home page** — `shared/accueil.html`

```html
<section data-view="accueil" data-title="Accueil" class="page">
  <h1>Votre ordinateur vous donne du fil à retordre&nbsp;?</h1>
  <p class="lead">Jonathan Lafleur, technicien PC et Mac dans la Baie-des-Chaleurs. Je règle vos problèmes à distance, ou vous déposez votre ordinateur chez moi.</p>
  <div class="actions">
    <a class="btn" data-tel href="#">Appelez au <span data-phone>418-391-1620</span></a>
    <a class="btn btn-alt" data-sms href="#">Envoyez un texto</a>
  </div>
  <ul class="cards">
    <li class="card"><h2>À distance</h2><p>Je prends le contrôle de votre écran, avec votre permission, pendant que nous parlons au téléphone. Rien à déplacer.</p></li>
    <li class="card"><h2>Dépôt</h2><p>Vous apportez votre ordinateur sur rendez-vous. L’adresse vous est donnée quand vous réservez.</p></li>
    <li class="card"><h2>Prix clairs</h2><p>Diagnostic gratuit si vous faites faire les travaux. Aucune taxe à ajouter. <a href="#/tarifs">Voir les tarifs</a></p></li>
  </ul>
  <p><a href="#/services">Voir tous les services</a></p>
</section>
```

`shared/accueil.en.html` (same structure, ids and attributes; `data-title="Home"`):
- h1 “Is your computer giving you a hard time?”
- lead “Jonathan Lafleur, PC and Mac technician in the Baie-des-Chaleurs. I fix your problems remotely, or you drop your computer off at my place.”
- buttons “Call <span data-phone>418-391-1620</span>” / “Send a text”
- cards “Remote” — “With your permission, I take control of your screen while we talk on the phone. Nothing to carry.”; “Drop-off” — “Bring your computer by appointment. You get the address when you book.”; “Clear prices” — “Free diagnostic if you go ahead with the work. No taxes added. <a href="#/tarifs">See the prices</a>”
- “<a href="#/services">See all services</a>”

Stub pages (replaced in Tasks 3–4): `shared/services.html` → `<section data-view="services" data-title="Services" class="page"><h1>Services</h1></section>`; `.en.html` same. `shared/tarifs.html` → `data-title="Tarifs"`, `<h1>Tarifs</h1>`; `.en.html` `data-title="Prices"`, `<h1>Prices</h1>`. `shared/contact.html` / `.en.html` → `Contact`.

- [ ] **Step 7: Write the French shell** — `index.html` (replaces the placeholder)

```html
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Jonathan Lafleur · Technicien PC et Mac</title>
<meta name="description" content="Technicien PC et Mac dans la Baie-des-Chaleurs : dépannage, virus, mises à niveau, transfert de données, soutien à distance. Appelez ou textez.">
<meta name="color-scheme" content="light dark">
<link rel="alternate" hreflang="fr" href="https://services.jonathanlafleur.ca/">
<link rel="alternate" hreflang="en" href="https://services.jonathanlafleur.ca/en/">
<link rel="alternate" hreflang="x-default" href="https://services.jonathanlafleur.ca/">
<script>
  (function () {
    try {
      var d = document.documentElement;
      var t = localStorage.getItem('services-theme');
      if (t === 'light' || t === 'dark') d.setAttribute('data-theme', t);
      var s = localStorage.getItem('services-taille');
      if (s === 'grande' || s === 'tres-grande') d.setAttribute('data-taille', s);
      // Reader's language: the saved choice, else the browser's (first of fr/en in its list), saved once.
      // Only the home page follows it; deep links keep their language. Crawlers are never redirected.
      if (!/bot|crawl|spider|slurp/i.test(navigator.userAgent)) {
        var lang = localStorage.getItem('services-lang');
        if (lang !== 'fr' && lang !== 'en') {
          var langs = navigator.languages || [navigator.language || ''];
          lang = 'fr';
          for (var i = 0; i < langs.length; i++) {
            var p = String(langs[i]).slice(0, 2).toLowerCase();
            if (p === 'fr' || p === 'en') { lang = p; break; }
          }
          localStorage.setItem('services-lang', lang);
        }
        if (lang === 'en' && (location.hash === '' || location.hash === '#/')) location.replace('en/' + location.hash);
      }
    } catch (e) {}
  })();
</script>
<link rel="stylesheet" href="assets/style.css?v=20261016a">
<script src="assets/app.js?v=20261016a" defer></script>
</head>
<body>
<header class="topbar">
  <div class="topbar-in">
    <a class="brand" href="#/">Jonathan Lafleur · PC et Mac</a>
    <nav aria-label="Menu principal"><ul class="menu" id="menu"></ul></nav>
    <div class="tools">
      <a id="lang-link" href="en/" hreflang="en" lang="en" aria-label="English version">EN</a>
      <div class="switch" role="group" aria-label="Taille du texte">
        <button type="button" data-taille-choice="normale" aria-pressed="true" aria-label="Taille du texte : normale">A</button>
        <button type="button" data-taille-choice="grande" aria-pressed="false" aria-label="Taille du texte : grande">A+</button>
        <button type="button" data-taille-choice="tres-grande" aria-pressed="false" aria-label="Taille du texte : très grande">A++</button>
      </div>
      <div class="switch" role="group" aria-label="Thème">
        <button type="button" data-theme-choice="light" aria-pressed="false">Clair</button>
        <button type="button" data-theme-choice="auto" aria-pressed="true">Auto</button>
        <button type="button" data-theme-choice="dark" aria-pressed="false">Sombre</button>
      </div>
    </div>
  </div>
  <svg class="wave" viewBox="0 0 1200 12" preserveAspectRatio="none" aria-hidden="true"><path d="M0 6 Q 75 0 150 6 T 300 6 T 450 6 T 600 6 T 750 6 T 900 6 T 1050 6 T 1200 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>
</header>
<main id="view" tabindex="-1">
  <p>Chargement…</p>
  <noscript><p>Ce site a besoin de JavaScript. Appelez au 418-391-1620.</p></noscript>
</main>
<footer class="site-foot">Jonathan Lafleur · Technicien PC et Mac · Baie-des-Chaleurs · Aucune taxe applicable</footer>
<nav class="callbar" aria-label="Joindre le technicien">
  <a class="btn" data-tel href="tel:+14183911620">Appeler</a>
  <a class="btn btn-alt" data-sms href="sms:+14183911620">Texto</a>
</nav>
</body>
</html>
```

`en/index.html`: same file with these differences only — `<html lang="en" data-root="../">`; title “Jonathan Lafleur · PC and Mac technician”; description “PC and Mac technician in the Baie-des-Chaleurs: troubleshooting, viruses, upgrades, data transfer, remote support. Call or text.”; the inline script body is the theme/taille lines plus `if (!localStorage.getItem('services-lang')) localStorage.setItem('services-lang', 'en');` (no redirect); asset URLs `../assets/…`; brand “Jonathan Lafleur · PC and Mac”; menu `aria-label="Main menu"`; lang link `href="../" hreflang="fr" lang="fr" aria-label="Version française">FR`; size group “Text size” with labels “Text size: normal / large / extra large”; theme group “Theme”, “Light / Auto / Dark”; “Loading…”; noscript “This site needs JavaScript. Call 418-391-1620.”; footer “Jonathan Lafleur · PC and Mac technician · Baie-des-Chaleurs · No taxes charged”; callbar `aria-label="Reach the technician"`, “Call” / “Text”.

- [ ] **Step 8: Write `assets/app.js`**

```js
(function () {
  'use strict';

  // ---------- Language, files and helpers ----------
  var root = document.documentElement;
  // index.html is French, en/index.html is English (data-root="../" points back to the site root)
  var LANG = /^en\b/i.test(root.lang) ? 'en' : 'fr';
  var ROOT = root.getAttribute('data-root') || '';
  // Content file in the page's language: shared/x.html → shared/x.en.html in English
  function localized(path) { return ROOT + (LANG === 'en' ? path.replace(/\.html$/, '.en.html') : path); }
  // tarifs.json text fields are {"fr": …, "en": …}
  function L(v) { return v && typeof v === 'object' ? (v[LANG] || v.fr || '') : v; }

  var LABELS = localized('shared/libelles.html');
  // Pages (#/<id>[/anchor]): file and French fallback name; ORDER is the site order (the menu reads it)
  var PAGES = {
    'accueil': { url: localized('shared/accueil.html'), name: 'Accueil' },
    'services': { url: localized('shared/services.html'), name: 'Services' },
    'tarifs': { url: localized('shared/tarifs.html'), name: 'Tarifs' },
    'contact': { url: localized('shared/contact.html'), name: 'Contact' }
  };
  Object.setPrototypeOf(PAGES, null);  // so a route like #/constructor is not taken for a page
  var ORDER = ['accueil', 'services', 'tarifs', 'contact'];
  // Per-page work on the fetched fragment before it is shown (Task 4 adds tarifs)
  var FILL = Object.create(null);

  function store(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function plain(html) {
    var t = document.createElement('template');
    t.innerHTML = html;
    return t.content.textContent.trim();
  }

  // ---------- URL words (shared/slugs.json) ----------
  // Code and files use the French word; "en" gives its English word, "aliases" old ids that still lead to their page
  var SLUGS = { en: {}, aliases: {} }, SLUGS_BACK = {};
  function useSlugs(data) {
    SLUGS = data;
    Object.keys(data.en).forEach(function (w) { SLUGS_BACK[data.en[w]] = w; });
  }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function slugIn(word, lang) { return lang === 'en' && has(SLUGS.en, word) ? SLUGS.en[word] : word; }
  function slugFromAny(word) {
    if (has(SLUGS_BACK, word)) return SLUGS_BACK[word];
    return has(SLUGS.aliases, word) ? SLUGS.aliases[word] : word;
  }
  function pathIn(hash, lang) { return hash.replace(/[^/#]+/g, function (w) { return slugIn(slugFromAny(w), lang); }); }
  function link(hash) { return pathIn(hash, LANG); }

  // ---------- Fetching ----------
  function once(cache, key, make) {
    if (!cache[key]) cache[key] = make().catch(function (err) { delete cache[key]; throw err; });
    return cache[key];
  }
  var texts$ = {};
  function fetchText(url) {
    return once(texts$, url, function () {
      return fetch(url, { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error(url + ' (' + r.status + ')');
        return r.text();
      });
    });
  }
  // Content files use paths from the site root; from /en/ they need ROOT in front
  function rebase(frag) {
    if (!ROOT) return;
    frag.querySelectorAll('[src], [href]').forEach(function (el) {
      ['src', 'href'].forEach(function (attr) {
        var v = el.getAttribute(attr);
        if (v && !/^(#|\/|\?|[a-z][a-z0-9+.-]*:)/i.test(v)) el.setAttribute(attr, ROOT + v);
      });
    });
  }
  function fetchFragment(url) {
    return fetchText(url).then(function (html) {
      var t = document.createElement('template');
      t.innerHTML = html;
      rebase(t.content);
      return t.content;
    });
  }
  var slugs$ = once({}, 's', function () {
    return fetchText(ROOT + 'shared/slugs.json').then(JSON.parse).then(useSlugs).catch(function () {});  // without it, URLs keep their French words
  });

  // ---------- Editable texts ----------
  var texts = {};
  var labels$ = fetchFragment(LABELS).then(function (frag) {
    frag.querySelectorAll('[data-text]').forEach(function (el) { texts[el.dataset.text] = el.innerHTML.trim(); });
  }).catch(function () {});  // missing file: built-in fallbacks
  function T(key, fallback) { return has(texts, key) ? texts[key] : fallback; }
  function pageName(id) { return plain(T('menu-' + id, PAGES[id].name)); }

  // ---------- Phone ----------
  function phoneLinks(node) {
    var number = plain(T('tel', '418-391-1620')), target = plain(T('tel-lien', '+14183911620'));
    node.querySelectorAll('[data-tel]').forEach(function (a) { a.href = 'tel:' + target; });
    node.querySelectorAll('[data-sms]').forEach(function (a) { a.href = 'sms:' + target; });
    node.querySelectorAll('[data-phone]').forEach(function (el) { el.textContent = number; });
  }

  // ---------- Preferences ----------
  function choiceButtons(attr, key, values, fallback, apply) {
    var buttons = document.querySelectorAll('[data-' + attr + ']');
    function set(choice) {
      if (values.indexOf(choice) < 0) choice = fallback;  // an unknown saved value is the default
      apply(choice);
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-' + attr) === choice)); });
    }
    set(load(key));
    buttons.forEach(function (b) {
      b.addEventListener('click', function () { store(key, b.getAttribute('data-' + attr)); set(b.getAttribute('data-' + attr)); });
    });
  }
  function applyTheme(choice) {
    if (choice === 'light' || choice === 'dark') root.setAttribute('data-theme', choice);
    else root.removeAttribute('data-theme');
  }
  function applySize(choice) {
    if (choice === 'normale') root.removeAttribute('data-taille');
    else root.setAttribute('data-taille', choice);
  }
  choiceButtons('theme-choice', 'services-theme', ['light', 'auto', 'dark'], 'auto', applyTheme);
  choiceButtons('taille-choice', 'services-taille', ['normale', 'grande', 'tres-grande'], 'normale', applySize);

  // ---------- Language link: the same page in the other language ----------
  var langLink = document.getElementById('lang-link');
  function updateLangLink() {
    if (langLink) langLink.href = (LANG === 'fr' ? 'en/' : '../') + pathIn(location.hash, LANG === 'fr' ? 'en' : 'fr');
  }
  if (langLink) langLink.addEventListener('click', function () { updateLangLink(); store('services-lang', LANG === 'fr' ? 'en' : 'fr'); });

  // ---------- Menu and frame ----------
  var view = document.getElementById('view');
  var menu = document.getElementById('menu');
  function buildMenu() {
    menu.innerHTML = ORDER.map(function (id) {
      var hash = id === 'accueil' ? '#/' : '#/' + id;
      return '<li><a href="' + escapeHtml(link(hash)) + '" data-page="' + id + '">' + escapeHtml(pageName(id)) + '</a></li>';
    }).join('');
  }
  // What every page sets: active menu entry, tab title, focus for screen readers
  function frame(id) {
    menu.querySelectorAll('a').forEach(function (a) {
      if (a.dataset.page === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var site = plain(T('site-nom', 'Jonathan Lafleur · Technicien PC et Mac'));
    document.title = id === 'accueil' ? site : pageName(id) + ' · ' + site;
    updateLangLink();
  }
  function localizeLinks(node) {
    node.querySelectorAll('a[href^="#/"]').forEach(function (a) { a.setAttribute('href', link(a.getAttribute('href'))); });
  }

  // ---------- Routes ----------
  function parseRoute() {
    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(slugFromAny);
    return { page: parts[0] || 'accueil', anchor: parts[1] || null };
  }
  // The only route table: which page a route shows (an unknown one shows the home page)
  function resolveRoute(r) { return PAGES[r.page] ? r.page : 'accueil'; }

  function show(id, frag, anchor) {
    localizeLinks(frag);
    phoneLinks(frag);
    view.innerHTML = '';
    view.appendChild(frag);
    frame(id);
    var target = anchor && document.getElementById(anchor);
    if (target) target.scrollIntoView(); else { window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
  }
  function showLoadError(err) {
    view.innerHTML = '<p class="error">' + T('erreur-chargement', 'Impossible de charger le contenu. Rechargez la page.') +
      ' <small>(' + escapeHtml(err.message) + ')</small></p>';
  }
  var routeToken = 0;
  function route() {
    var token = ++routeToken;
    Promise.all([labels$, slugs$]).then(function () {
      var own = pathIn(location.hash, LANG);  // the address in the reader's language
      if (location.hash && own !== location.hash) { location.replace(own); return null; }
      var r = parseRoute(), id = resolveRoute(r);
      if (location.hash && location.hash !== '#/' && !PAGES[r.page]) { location.replace('#/'); return null; }
      return fetchFragment(PAGES[id].url).then(function (frag) {
        return Promise.resolve(FILL[id] ? FILL[id](frag) : null).then(function () { return { id: id, frag: frag, anchor: r.anchor }; });
      });
    }).then(function (x) {
      if (!x || token !== routeToken) return;  // the address was rewritten, or the reader already went elsewhere
      show(x.id, x.frag, x.anchor);
    }).catch(function (err) {
      if (token === routeToken) showLoadError(err);
    });
  }

  Promise.all([labels$, slugs$]).then(function () { buildMenu(); phoneLinks(document); route(); });
  window.addEventListener('hashchange', route);
})();
```

- [ ] **Step 9: Browser checks**

Copy the driver: `sed 's/kohai-cdp-/services-cdp-/' ~/Codes/kohai/tests/cdp.mjs > tests/cdp.mjs`.
Start a server in the background: `python3 -m http.server 8765` (from the repo root).

Run:
```bash
node tests/cdp.mjs 'http://localhost:8765/#/' \
  "document.querySelector('#view h1').textContent" \
  "[...document.querySelectorAll('#menu a')].map(a => a.getAttribute('href') + ' ' + a.textContent).join(' | ')" \
  "document.querySelector('.callbar [data-tel]').href + ' ' + document.querySelector('.callbar [data-sms]').href"
```
Expected: `"Votre ordinateur vous donne du fil à retordre ?"` (with a non-breaking space), `"#/ Accueil | #/services Services | #/tarifs Tarifs | #/contact Contact"`, `"tel:+14183911620 sms:+14183911620"`, and `third-party: []`.

Run (English, French word in the address is rewritten, unknown route goes home):
```bash
node tests/cdp.mjs 'http://localhost:8765/en/#/tarifs' "location.hash" "document.querySelector('#view h1').textContent" "document.getElementById('lang-link').getAttribute('href')"
node tests/cdp.mjs 'http://localhost:8765/#/nimporte-quoi' "location.hash" "!!document.querySelector('#view .error')"
```
Expected: `"#/prices"`, `"Prices"`, `"../#/tarifs"`; then `"#/"`, `false`.

Run (font size: saved junk value, then each step, no sideways scroll at 360px):
```bash
WIDTH=360 node tests/cdp.mjs 'http://localhost:8765/#/' \
  "localStorage.setItem('services-taille','enorme')" \
  "location.reload()" \
  "[getComputedStyle(document.documentElement).fontSize, document.querySelector('[data-taille-choice=normale]').getAttribute('aria-pressed')]" \
  "document.querySelector('[data-taille-choice=tres-grande]').click(); [getComputedStyle(document.documentElement).fontSize, document.documentElement.scrollWidth <= innerWidth]"
```
Expected: `null`, `null` (or a reload error line, ignored), `["18px","true"]`, then `["27px",true]`.

Run (English first visit from an English browser is sent to `/en/`): `LANGS=en-CA,en node tests/cdp.mjs 'http://localhost:8765/' "location.pathname"` → `"/en/"`.

Look at screenshots in both themes: `SHOT=$TMPDIR/home-light.png WIDTH=390 node tests/cdp.mjs 'http://localhost:8765/#/'` and the same after `"document.querySelector('[data-theme-choice=dark]').click()"` with `SHOT=$TMPDIR/home-dark.png`; open them with the Read tool and check readability, wave, call bar.

- [ ] **Step 10: Run all unit tests and the check, then commit**

Run: `python3 -m unittest discover tests -v && python3 .githooks/check-i18n.py`
Expected: all `ok`, check prints nothing and exits 0.

```bash
git add index.html en assets shared tests
git commit -m "feat: bilingual shells, coastal theme, font size control and home page"
```

---

### Task 3: Services and contact pages

**Files:**
- Modify (replace stubs): `shared/services.html`, `shared/services.en.html`, `shared/contact.html`, `shared/contact.en.html`

**Interfaces:**
- Consumes: Task 2 classes (`.page`, `.lead`, `.cards`, `.card`, `.btn`, `.btn-alt`, `.actions`, `.note`), `[data-tel]`, `[data-sms]`, `[data-phone]` (filled by `phoneLinks`), `#/…` links (localized by `localizeLinks`).
- Produces: `h2` ids `depannage`, `materiel`, `donnees`, `configuration` on the services page (anchors `#/services/<id>`).

- [ ] **Step 1: Write the failing browser check**

With the server running:
```bash
node tests/cdp.mjs 'http://localhost:8765/#/services' "[...document.querySelectorAll('#view h2')].map(h => h.id).join(',')"
node tests/cdp.mjs 'http://localhost:8765/en/#/contact' "document.querySelector('#view [data-tel]').href" "document.querySelector('#view [data-phone]').textContent"
```
Expected now: `""` and `null`-style errors (stubs have no h2 / buttons) — FAIL.

- [ ] **Step 2: Write `shared/services.html`**

```html
<section data-view="services" data-title="Services" class="page">
  <h1>Services</h1>
  <p class="lead">Pour PC (Windows) et Mac. À distance ou en dépôt, sur rendez-vous.</p>
  <ul class="cards">
    <li class="card">
      <h2 id="depannage">Dépannage et nettoyage</h2>
      <ul>
        <li>Ordinateur lent ou qui gèle</li>
        <li>Virus, logiciels malveillants et fenêtres publicitaires</li>
        <li>Réinstallation du système (Windows ou macOS)</li>
        <li>Mises à jour et nettoyage des logiciels inutiles</li>
        <li>Nettoyage de la poussière à l’intérieur</li>
      </ul>
    </li>
    <li class="card">
      <h2 id="materiel">Matériel</h2>
      <ul>
        <li>Mise à niveau : disque SSD, mémoire (RAM)</li>
        <li>Remplacement de pièces</li>
        <li>Préparation d’un nouvel ordinateur</li>
        <li>Assemblage d’un ordinateur sur mesure</li>
      </ul>
    </li>
    <li class="card">
      <h2 id="donnees">Données et sauvegarde</h2>
      <ul>
        <li>Transfert de vos fichiers vers un nouvel ordinateur</li>
        <li>Mise en place d’une sauvegarde automatique</li>
        <li>Récupération de fichiers perdus (sur évaluation)</li>
      </ul>
    </li>
    <li class="card">
      <h2 id="configuration">Configuration et réseau</h2>
      <ul>
        <li>Imprimante, Wi-Fi, courriel et comptes</li>
        <li>Apprendre à utiliser votre appareil, à votre rythme</li>
      </ul>
    </li>
  </ul>
  <p><a href="#/tarifs">Voir les tarifs</a> · <a href="#/contact">Prendre rendez-vous</a></p>
</section>
```

`shared/services.en.html` — same structure and ids, `data-title="Services"`: lead “For PC (Windows) and Mac. Remotely or by drop-off, by appointment.”; “Troubleshooting and cleanup”: “Slow or freezing computer”, “Viruses, malware and pop-up ads”, “System reinstall (Windows or macOS)”, “Updates and removing unneeded software”, “Cleaning the dust inside”; “Hardware”: “Upgrades: SSD drive, memory (RAM)”, “Part replacement”, “Setting up a new computer”, “Building a custom computer”; “Data and backup”: “Moving your files to a new computer”, “Setting up automatic backups”, “Recovering lost files (quote after review)”; “Setup and network”: “Printer, Wi-Fi, email and accounts”, “Learning to use your device, at your own pace”; footer links “See the prices” · “Book an appointment”.

- [ ] **Step 3: Write `shared/contact.html`**

```html
<section data-view="contact" data-title="Contact" class="page">
  <h1>Contact</h1>
  <p class="lead">Appelez ou envoyez un texto pour prendre rendez-vous. Je vous rappelle rapidement.</p>
  <div class="actions">
    <a class="btn" data-tel href="#">Appelez au <span data-phone>418-391-1620</span></a>
    <a class="btn btn-alt" data-sms href="#">Envoyez un texto</a>
  </div>
  <ul class="cards">
    <li class="card"><h2>Sur rendez-vous</h2><p>À distance partout au Québec, ou en dépôt dans la Baie-des-Chaleurs.</p></li>
    <li class="card"><h2>Dépôt</h2><p>L’adresse de dépôt est donnée à la prise de rendez-vous.</p></li>
    <li class="card"><h2>Avant d’appeler</h2><p>Notez la marque de l’ordinateur et ce qui se passe à l’écran. Une photo du message d’erreur aide beaucoup.</p></li>
  </ul>
</section>
```

`shared/contact.en.html` — same structure, `data-title="Contact"`: lead “Call or send a text to book an appointment. I’ll call you back quickly.”; buttons “Call <span data-phone>418-391-1620</span>” / “Send a text”; cards “By appointment” — “Remote anywhere in Quebec, or drop-off in the Baie-des-Chaleurs.”; “Drop-off” — “The drop-off address is given when you book.”; “Before you call” — “Note the computer’s brand and what you see on the screen. A photo of the error message helps a lot.”

- [ ] **Step 4: Run the browser check to verify it passes**

Same commands as Step 1. Expected: `"depannage,materiel,donnees,configuration"`; `"tel:+14183911620"`, `"418-391-1620"`. Also `node tests/cdp.mjs 'http://localhost:8765/en/#/services/materiel' "document.getElementById('materiel').getBoundingClientRect().top < 200"` → `true`.

- [ ] **Step 5: Check and commit**

Run: `python3 -m unittest discover tests && python3 .githooks/check-i18n.py`
Expected: pass, no output from the check.

```bash
git add shared/services.html shared/services.en.html shared/contact.html shared/contact.en.html
git commit -m "feat: services and contact pages in both languages"
```

---

### Task 4: Prices page drawn from tarifs.json

**Files:**
- Create: `shared/tarifs.json`
- Modify (replace stubs): `shared/tarifs.html`, `shared/tarifs.en.html`
- Modify: `assets/app.js` (add the prices section before `// ---------- Routes ----------`), `assets/style.css` (append table rules), both shells (bump `?v=20261016a` → `20261016b` on both assets)

**Interfaces:**
- Consumes: `LANG`, `ROOT`, `L`, `T`, `fetchText`, `escapeHtml`, `FILL` from Task 2; `tarifs.json` shape from Task 1.
- Produces: `formatPrice(amount) -> string` (HTML, in the page's language), `FILL.tarifs(frag)` filling `[data-tarifs]`. Exposed for tests on `window.servicesTest = { formatPrice: formatPrice }`.

- [ ] **Step 1: Write `shared/tarifs.json`**

```json
{
  "groupes": [
    { "id": "main-oeuvre", "titre": { "fr": "Main-d’œuvre", "en": "Labour" },
      "lignes": [
        { "id": "taux-horaire", "nom": { "fr": "Taux horaire", "en": "Hourly rate" }, "prix": 35, "unite": "heure",
          "note": { "fr": "Minimum 1&nbsp;h, ensuite par tranche de 30&nbsp;minutes", "en": "1-hour minimum, then in 30-minute steps" } },
        { "id": "petit-travail", "nom": { "fr": "Petit travail (moins de 30&nbsp;minutes)", "en": "Small job (under 30 minutes)" }, "prix": 20, "unite": "forfait" }
      ] },
    { "id": "forfaits", "titre": { "fr": "Forfaits", "en": "Flat rates" },
      "lignes": [
        { "id": "diagnostic", "nom": { "fr": "Diagnostic", "en": "Diagnostic" }, "prix": 50, "unite": "forfait",
          "note": { "fr": "Gratuit si vous faites faire les travaux", "en": "Free if you go ahead with the work" } },
        { "id": "virus", "nom": { "fr": "Retrait de virus", "en": "Virus removal" }, "prix": 90, "unite": "forfait" },
        { "id": "reinstallation", "nom": { "fr": "Réinstallation du système", "en": "System reinstall" }, "prix": 70, "unite": "forfait" },
        { "id": "reinstallation-transfert", "nom": { "fr": "Réinstallation du système et transfert de données", "en": "System reinstall and data transfer" }, "prix": 100, "unite": "forfait" },
        { "id": "transfert", "nom": { "fr": "Transfert de données", "en": "Data transfer" }, "prix": 70, "unite": "forfait" }
      ] },
    { "id": "a-l-heure", "titre": { "fr": "À l’heure", "en": "Hourly" },
      "lignes": [
        { "id": "nettoyage", "nom": { "fr": "Nettoyage (intérieur et logiciels)", "en": "Cleaning (inside and software)" }, "taux": "horaire" },
        { "id": "assemblage", "nom": { "fr": "Assemblage d’un ordinateur", "en": "Computer assembly" }, "taux": "horaire" },
        { "id": "mise-a-niveau", "nom": { "fr": "Mise à niveau (SSD, RAM…)", "en": "Upgrade (SSD, RAM…)" }, "taux": "horaire",
          "note": { "fr": "Pièces au prix coûtant; tarif petit travail si moins de 30&nbsp;minutes", "en": "Parts at cost; small-job rate if under 30 minutes" } },
        { "id": "distance", "nom": { "fr": "Soutien à distance", "en": "Remote support" }, "taux": "horaire",
          "note": { "fr": "Tarif petit travail si moins de 30&nbsp;minutes", "en": "Small-job rate if under 30 minutes" } },
        { "id": "configuration", "nom": { "fr": "Configuration et réseau", "en": "Setup and network" }, "taux": "horaire" }
      ] },
    { "id": "evaluation", "titre": { "fr": "Sur évaluation", "en": "Quote after review" },
      "lignes": [
        { "id": "recuperation", "nom": { "fr": "Récupération de données", "en": "Data recovery" }, "evaluation": true,
          "note": { "fr": "Chaque cas est étudié avant de commencer", "en": "Each case is reviewed before starting" } }
      ] }
  ]
}
```

Run: `python3 .githooks/check-i18n.py` → no output (the Task 1 check validates the file).

- [ ] **Step 2: Write the prices pages** — `shared/tarifs.html`

```html
<section data-view="tarifs" data-title="Tarifs" class="page">
  <h1>Tarifs</h1>
  <p class="lead">Des prix simples, les mêmes pour Mac et PC. Aucune taxe à ajouter.</p>
  <ul>
    <li>Un petit travail de moins de 30&nbsp;minutes coûte un prix fixe.</li>
    <li>Au-delà, c’est le taux horaire, avec un minimum d’une heure, puis par tranche de 30&nbsp;minutes.</li>
    <li>Le diagnostic est gratuit si vous faites faire les travaux.</li>
    <li>Les pièces sont facturées au prix coûtant.</li>
  </ul>
  <div data-tarifs></div>
  <p class="note">Taxes non applicables. Mac et PC&nbsp;: mêmes tarifs.</p>
  <p><a href="#/contact">Prendre rendez-vous</a></p>
</section>
```

`shared/tarifs.en.html` — same structure, `data-title="Prices"`: h1 “Prices”; lead “Simple prices, the same for Mac and PC. No taxes added.”; list “A small job under 30 minutes has a fixed price.” / “Beyond that, it’s the hourly rate, with a one-hour minimum, then in 30-minute steps.” / “The diagnostic is free if you go ahead with the work.” / “Parts are billed at cost.”; note “No taxes charged. Mac and PC: same rates.”; link “Book an appointment”.

- [ ] **Step 3: Write the failing browser checks**

```bash
node tests/cdp.mjs 'http://localhost:8765/#/tarifs' "document.querySelectorAll('#view [data-tarifs] tbody tr').length" "window.servicesTest && [servicesTest.formatPrice(35), servicesTest.formatPrice(17.5)]"
```
Expected now: `0`, `null` — FAIL.

- [ ] **Step 4: Add the prices code to `assets/app.js`** (before `// ---------- Routes ----------`)

```js
  // ---------- Prices (shared/tarifs.json) ----------
  var TARIFS = ROOT + 'shared/tarifs.json';
  // 35 → « 35 $ » / “$35”; 17.5 → « 17,50 $ » / “$17.50”
  function formatPrice(amount) {
    var n = Math.round(amount * 100) / 100;
    var s = n % 1 === 0 ? String(n) : n.toFixed(2);
    return LANG === 'en' ? '$' + s : s.replace('.', ',') + '&nbsp;$';
  }
  function hourlyRate(data) {
    var found = null;
    data.groupes.forEach(function (g) { g.lignes.forEach(function (l) { if (l.id === 'taux-horaire') found = l; }); });
    return found;
  }
  function priceHtml(line, rate) {
    if (line.evaluation) return T('sur-evaluation', 'Sur évaluation');
    if (line.taux === 'horaire') return T('taux-horaire', 'Au taux horaire') + (rate ? ' (' + priceHtml(rate) + ')' : '');
    return formatPrice(line.prix) + (line.unite === 'heure' ? ' ' + T('unite-heure', 'de l’heure') : '');
  }
  function lineHtml(line, rate) {
    return '<tr><th scope="row">' + L(line.nom) + (line.note ? '<br><small class="note">' + L(line.note) + '</small>' : '') +
      '</th><td>' + priceHtml(line, rate) + '</td></tr>';
  }
  function tarifsHtml(data) {
    var rate = hourlyRate(data);
    return data.groupes.map(function (g) {
      return '<table class="tarifs" id="' + escapeHtml(g.id) + '"><caption>' + L(g.titre) + '</caption>' +
        '<thead><tr><th scope="col">' + T('col-service', 'Service') + '</th><th scope="col">' + T('col-prix', 'Prix') + '</th></tr></thead>' +
        '<tbody>' + g.lignes.map(function (l) { return lineHtml(l, rate); }).join('') + '</tbody></table>';
    }).join('');
  }
  // The page keeps its text if the prices cannot load: the slot says so instead
  FILL.tarifs = function (frag) {
    var slot = frag.querySelector('[data-tarifs]');
    if (!slot) return null;
    return fetchText(TARIFS).then(JSON.parse).then(function (data) { slot.innerHTML = tarifsHtml(data); }, function () {
      slot.innerHTML = '<p class="error">' + T('erreur-tarifs', 'Les tarifs n’ont pas pu être chargés. Appelez-nous pour les connaître.') + '</p>';
    });
  };
  window.servicesTest = { formatPrice: formatPrice };
```

Append to `assets/style.css`:

```css
/* Prices */
.tarifs { width: 100%; border-collapse: collapse; margin: 1.5rem 0; background: var(--surface); border-radius: 1rem; overflow: hidden; }
.tarifs caption { text-align: left; font-size: 1.3rem; font-weight: 700; padding: 0 0 0.5rem; }
.tarifs th, .tarifs td { text-align: left; vertical-align: top; padding: 0.75rem 1rem; border-bottom: 1px solid var(--line); }
.tarifs thead th { font-size: 0.9rem; color: var(--muted); }
.tarifs tbody th { font-weight: 400; }
.tarifs td { white-space: nowrap; font-weight: 700; text-align: right; }
@media (max-width: 480px) { .tarifs td { white-space: normal; } }
```

Bump both shells' asset versions to `?v=20261016b` (two URLs in `index.html`, two in `en/index.html`).

- [ ] **Step 5: Run the browser checks to verify they pass**

```bash
node tests/cdp.mjs 'http://localhost:8765/#/tarifs' \
  "document.querySelectorAll('#view [data-tarifs] tbody tr').length" \
  "[servicesTest.formatPrice(35), servicesTest.formatPrice(17.5)]" \
  "document.querySelector('#main-oeuvre tbody td').innerHTML"
node tests/cdp.mjs 'http://localhost:8765/en/#/prices' "[servicesTest.formatPrice(35), servicesTest.formatPrice(17.5)]" "document.querySelector('#a-l-heure tbody td').textContent"
WIDTH=360 node tests/cdp.mjs 'http://localhost:8765/#/tarifs' "document.querySelector('[data-taille-choice=tres-grande]').click(); new Promise(r => setTimeout(r, 300)).then(() => document.documentElement.scrollWidth <= innerWidth)"
```
Expected: `13`; `["35&nbsp;$","17,50&nbsp;$"]`; `"35&nbsp;$ de l’heure"`; then `["$35","$17.50"]`, `"At the hourly rate ($35 per hour)"`; then `true`.

Failure path (prices file missing): temporarily serve without it — `mv shared/tarifs.json /tmp/t.json; node tests/cdp.mjs 'http://localhost:8765/#/tarifs' "document.querySelector('#view h1').textContent" "document.querySelector('[data-tarifs] .error') !== null"; mv /tmp/t.json shared/tarifs.json`.
Expected: `"Tarifs"`, `true`.

Screenshot check: `SHOT=$TMPDIR/tarifs.png WIDTH=390 node tests/cdp.mjs 'http://localhost:8765/#/tarifs'`, open it with Read: table readable, prices right-aligned, nothing cut off.

- [ ] **Step 6: Check and commit**

Run: `python3 -m unittest discover tests && python3 .githooks/check-i18n.py`

```bash
git add shared/tarifs.json shared/tarifs.html shared/tarifs.en.html assets index.html en/index.html
git commit -m "feat: prices page drawn from tarifs.json"
```

---

### Task 5: README and final pass

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# Services

PC and Mac technician site, served at https://services.jonathanlafleur.ca (GitHub Pages, no build step).
French at `/`, English at `/en/`. Rules and layout: see `AGENTS.md`.

## Change a price

Edit `shared/tarifs.json` (both `fr` and `en` text), then run `python3 .githooks/check-i18n.py`.

## Run locally

    python3 -m http.server 8765    # then open http://localhost:8765/
    python3 -m unittest discover tests

Enable the pre-commit check once per clone: `git config core.hooksPath .githooks`.
```

- [ ] **Step 2: Full manual pass** (server running)

For each of `/#/`, `/#/services`, `/#/tarifs`, `/#/contact`, `/en/#/`, `/en/#/services`, `/en/#/prices`, `/en/#/contact`: take `SHOT=… WIDTH=360` and `WIDTH=1200` screenshots after clicking `[data-taille-choice=tres-grande]` and `[data-theme-choice=dark]`, open each with Read, and confirm: text readable, no sideways scroll, menu wraps cleanly, call bar visible on 360px and hidden on 1200px, language link lands on the same page.

- [ ] **Step 3: Commit (doc-only)**

```bash
git add README.md
git commit -m "docs: readme"
```

- [ ] **Step 4: Stop before pushing**

Report to the user: commits made, checks run, screenshots reviewed. Pushing to `main` publishes the site; wait for their go-ahead, then `git push` and verify `https://services.jonathanlafleur.ca/` and `/en/` with `curl -s https://services.jonathanlafleur.ca/shared/tarifs.json | python3 -m json.tool | head`.
