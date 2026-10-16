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
    named = [i for i in ids + gids if isinstance(i, str)]  # other ids are already reported as not a non-empty "id"
    problems += ['{} id {} appears more than once'.format(TARIFS, i) for i in sorted({i for i in named if named.count(i) > 1})]
    hourly = any(isinstance(l, dict) and l.get('taux') == 'horaire'
                 for g in data['groupes'] if isinstance(g, dict) for l in (g.get('lignes') or []))
    if hourly and 'taux-horaire' not in ids:
        problems.append(TARIFS + ' has "taux": "horaire" lines but no line "taux-horaire"')
    return problems


def slug_problems(data, live=frozenset()):
    """shared/slugs.json: clean URL words; one English word per French word; old ids lead to a current one."""
    if not isinstance(data, dict) or not all(isinstance(data.get(k), dict) for k in ('en', 'aliases')):
        return [SLUGS + ' must be an object with "en" and "aliases" objects']
    problems = ['{} "{}": "{}" is not a URL word (a-z, 0-9, -)'.format(SLUGS, k, v) for k, v in list(data['en'].items()) + list(data['aliases'].items())
                if not (isinstance(v, str) and re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', v))]
    # The checks below compare words: only the valid ones, the others are reported above
    en = {k: v for k, v in data['en'].items() if isinstance(v, str)}
    aliases = {k: v for k, v in data['aliases'].items() if isinstance(v, str)}
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
    problems = ['data-text "{}" is missing from {}'.format(k, LABELS) for k in SAME_VALUE if k not in va]
    problems += ['data-text "{}" differs between {} and {}'.format(k, LABELS, twin(LABELS)) for k in SAME_VALUE if k in va and va[k] != vb.get(k)]
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
