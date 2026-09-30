#!/usr/bin/env python3
"""Check the collection in data/ and report what still needs research.

Usage:
  python3 scripts/check_data.py               # errors, plus a count of core gaps
  python3 scripts/check_data.py --gaps        # ...and the core gaps by record
  python3 scripts/check_data.py --all --gaps  # ...including research details

Errors are things that would break the site or the data's reuse: duplicate
IDs, tags that aren't in data/vocab.json, missing image files, malformed
dates, and embedded editions or people whose copies disagree. The script
exits with status 1 when there are any.

Gaps are fields not yet filled in. They never fail the check. Core gaps
matter for the site and for rights: a bibliography line, a rights
statement, and a way for readers to reach the work (a cited link or a
suggested edition). Research details (page numbers, publishers, edition
dates, holding institutions, Wikidata IDs) are reported only with --all.

Nothing here writes files. The site reads data/ directly (loadCollection()
in shared.js).
"""

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'

# Extended Date/Time Format, the subset used here: a year (negative for
# BCE), optionally with month and day, optionally uncertain (?) or
# approximate (~), or an interval of two such dates.
EDTF_DATE = r'-?\d{4}(-\d{2}(-\d{2})?)?[~?%]?'
EDTF = re.compile(rf'^{EDTF_DATE}(/{EDTF_DATE})?$')

RIGHTS_PREFIXES = ('http://rightsstatements.org/vocab/', 'https://creativecommons.org/')

# Citation links: the edition or object cited, its original, or another
# copy of it. Further reading is kept apart, as writing about the work
# or a related work. Purchase links aren't stored at all: a suggested
# edition is an ISBN, and the affiliate link is built from it.
LINK_ROLES = {'cited', 'original', 'copy'}
FURTHER_KINDS = {'about', 'related'}


def isbn13_valid(isbn):
    if not re.fullmatch(r'97[89]\d{10}', isbn or ''):
        return False
    total = sum(int(d) * (1 if i % 2 == 0 else 3) for i, d in enumerate(isbn[:12]))
    return (10 - total % 10) % 10 == int(isbn[12])


CORE_GAPS = {'bibliography line', 'rights', 'cited link or suggested edition'}


def load(name):
    return json.loads((DATA / f'{name}.json').read_text())


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--gaps', action='store_true', help='list gaps by record')
    parser.add_argument('--all', action='store_true', help='include research details, not just core gaps')
    args = parser.parse_args()

    readings, images, editorial, vocab = (load(n) for n in ('readings', 'images', 'editorial', 'vocab'))
    errors = []
    gaps = defaultdict(list)

    # IDs are unique across the whole collection.
    seen = {}
    for kind, records in (('reading', readings), ('image', images), ('editorial', editorial)):
        for rec in records:
            rid = rec.get('id')
            if not rid:
                errors.append(f'{kind} without an id: {str(rec)[:80]}')
            elif rid in seen:
                errors.append(f'duplicate id {rid}')
            seen[rid] = kind

    # Tags point at the vocabularies.
    schemes = {name: {c['id'] for c in concepts} for name, concepts in vocab.items()}
    def check_tags(rid, tags):
        for scheme, values in (tags or {}).items():
            if scheme not in schemes:
                errors.append(f'{rid}: unknown tag scheme "{scheme}"')
                continue
            for v in values:
                if v not in schemes[scheme]:
                    errors.append(f'{rid}: "{v}" is not in the {scheme} vocabulary')
    for rec in readings + images:
        check_tags(rec['id'], rec.get('tags'))
    for rec in editorial:
        check_tags(rec['id'], rec.get('about'))

    # The weather vocabulary matches the picker's list in atmosphere.js,
    # which stays the canonical list for pages that don't load data/.
    m = re.search(r'const WEATHER = \[(.*?)\];', (ROOT / 'atmosphere.js').read_text(), re.S)
    if m:
        site = re.findall(r"'([^']+)'", m.group(1))
        ours = [c['id'] for c in vocab.get('weather', [])]
        if site != ours:
            errors.append(f'weather vocabulary differs from atmosphere.js: '
                          f'only in atmosphere.js {sorted(set(site) - set(ours))}, '
                          f'only in vocab.json {sorted(set(ours) - set(site))}'
                          + ('' if set(site) != set(ours) else ' (order differs)'))

    # Facts the pages need before any data loads live in the site's scripts;
    # data/vocab.json repeats them for reuse. Check the copies agree.
    weather_js = (ROOT / 'weather.js').read_text()
    rows_js = [(label, re.findall(r"'([^']+)'", values))
               for label, values in re.findall(r"\{ label: '([^']+)',\s*values: \[([^\]]*)\] \}", weather_js)]
    rows_vocab = []
    for c in vocab.get('weather', []):
        if not rows_vocab or rows_vocab[-1][0] != c.get('group'):
            rows_vocab.append((c.get('group'), []))
        rows_vocab[-1][1].append(c['id'])
    if rows_js and rows_js != rows_vocab:
        errors.append(f'weather rows differ between WEATHER_GROUPS in weather.js {rows_js} and vocab.json {rows_vocab}')

    shared_js = (ROOT / 'shared.js').read_text()
    seasons_js = [(k, l, [int(n) for n in re.findall(r'\d+', months)])
                  for k, l, months in re.findall(r"\{ key: '([a-z]+)', label: '([^']+)', months: \[([^\]]*)\] \}", shared_js)]
    seasons_vocab = [(c['id'], c.get('label'), c.get('months')) for c in vocab.get('seasons', [])]
    if seasons_js != seasons_vocab:
        errors.append(f'seasons differ between SEASONS in shared.js {seasons_js} and vocab.json {seasons_vocab}')

    hours_js = [(k, l, int(h)) for k, l, h in re.findall(r"\{ key: '([a-z]+)', label: '([^']+)', start: (\d+),", shared_js)]
    hours_vocab = [(c['id'], c.get('label'), c.get('startHour')) for c in vocab.get('hours', [])]
    if hours_js != hours_vocab:
        errors.append(f'watches differ between HOURS in shared.js {hours_js} and vocab.json {hours_vocab}')

    # Every page that loads atmosphere.js loads shared.js before it.
    for page in sorted(ROOT.glob('*.html')):
        scripts = [src.lstrip('/') for src in re.findall(r'<script[^>]*src="([^"]+)"', page.read_text())]
        if 'atmosphere.js' in scripts:
            if 'shared.js' not in scripts or scripts.index('shared.js') > scripts.index('atmosphere.js'):
                errors.append(f'{page.name}: shared.js must load before atmosphere.js')

    # Image files exist.
    for img in images:
        if not (ROOT / img['file']).exists():
            errors.append(f'{img["id"]}: missing file {img["file"]}')

    # Embedded editions and people: every copy that shares an id agrees.
    copies = defaultdict(list)
    def collect(owner, edition):
        if not edition:
            return
        people = edition.get('contributors') or []
        copies[edition['id']].append((owner, {k: v for k, v in edition.items() if k != 'contributors'}))
        for p in people:
            copies[p['id']].append((owner, {k: v for k, v in p.items() if k != 'role'}))
    for r in readings:
        cit = r.get('citation') or {}
        collect(r['id'], cit.get('edition'))
        for q in cit.get('quotes') or []:
            collect(r['id'], q.get('edition'))
    for img in images:
        if img.get('creator'):
            copies[img['creator']['id']].append((img['id'], img['creator']))
    for cid, found in copies.items():
        first_owner, first = found[0]
        for owner, other in found[1:]:
            for k in sorted(set(first) | set(other)):
                a, b = first.get(k), other.get(k)
                if a is not None and b is not None and a != b:
                    errors.append(f'{cid}: "{k}" is {a!r} in {first_owner} but {b!r} in {owner}')

    # Dates and rights are well formed where present.
    def check_date(rid, field, value):
        if value is not None and not EDTF.match(str(value)):
            errors.append(f'{rid}: {field} "{value}" is not an EDTF date')
    def check_rights(rid, value):
        if value is not None and not value.startswith(RIGHTS_PREFIXES):
            errors.append(f'{rid}: rights "{value}" is not a RightsStatements.org or Creative Commons URI')

    # The suggested-edition link pattern, from data/site.json.
    site = load('site')
    pattern = site.get('suggestedEditionUrl') or ''
    if '{isbn}' not in pattern:
        errors.append('data/site.json: suggestedEditionUrl needs {isbn} where the ISBN goes')
    affiliate = pattern.split('{isbn}')[0] if 'bookshop.org' in pattern else None

    def check_links(rid, links):
        for link in links or []:
            if link.get('role') not in LINK_ROLES:
                errors.append(f'{rid}: link role "{link.get("role")}" is not one of {", ".join(sorted(LINK_ROLES))}')
            if not str(link.get('url', '')).startswith(('http://', 'https://')):
                errors.append(f'{rid}: link without a web address: {link}')
            if 'bookshop.org' in str(link.get('url', '')):
                errors.append(f'{rid}: Bookshop link stored as a citation link; use suggestedEdition with its ISBN')

    def check_further(rid, further):
        for item in further or []:
            if item.get('kind') not in FURTHER_KINDS:
                errors.append(f'{rid}: further reading kind "{item.get("kind")}" is not one of {", ".join(sorted(FURTHER_KINDS))}')
            if not str(item.get('url', '')).startswith(('http://', 'https://')):
                errors.append(f'{rid}: further reading without a web address: {item}')

    def check_suggested(rid, suggested):
        if not suggested:
            return
        if not isbn13_valid(suggested.get('isbn')):
            errors.append(f'{rid}: suggested edition ISBN "{suggested.get("isbn")}" is not a valid 13-digit ISBN')

    def check_display_links(rid, text):
        # Bookshop links written into display text must carry the affiliate ID.
        for url in re.findall(r'href="(https?://(?:www\.)?bookshop\.org/[^"]*)"', text or ''):
            if affiliate and not url.startswith(affiliate):
                errors.append(f'{rid}: Bookshop link without the affiliate ID: {url}')

    for r in readings:
        if r.get('draft'):
            continue
        rid, cit = r['id'], r.get('citation') or {}
        ed = cit.get('edition') or {}
        if not cit.get('display'):
            errors.append(f'{rid}: no display citation')
        check_links(rid, ed.get('links'))
        for q in cit.get('quotes') or []:
            check_links(rid, (q.get('edition') or {}).get('links'))
        check_further(rid, r.get('furtherReading'))
        check_suggested(rid, r.get('suggestedEdition'))
        check_display_links(rid, cit.get('display'))
        # A print-only citation needs no link when a suggested edition
        # leads the reader to the book.
        if not any(l.get('role') == 'cited' for l in ed.get('links') or []) and not r.get('suggestedEdition'):
            gaps[rid].append('cited link or suggested edition')
        if not cit.get('bibliography'):
            gaps[rid].append('bibliography line')
        check_date(rid, 'written', cit.get('written'))
        for field in ('issued', 'original-date'):
            check_date(rid, field, ed.get(field))
        check_rights(rid, ed.get('rights'))
        if not ed.get('rights'):
            gaps[rid].append('rights')
        if not ed.get('title'):
            gaps[rid].append('edition title')
        if not ed.get('issued'):
            gaps[rid].append('edition date (issued)')
        if not ed.get('publisher'):
            gaps[rid].append('publisher')
        if not (cit.get('locator') or {}).get('page'):
            gaps[rid].append('page')
        if not any(p.get('wikidata') for p in ed.get('contributors') or []):
            gaps[rid].append('author Wikidata ID')

    for img in images:
        if img.get('draft'):
            continue
        iid = img['id']
        check_date(iid, 'date', img.get('date'))
        check_rights(iid, img.get('rights'))
        check_links(iid, img.get('links'))
        check_further(iid, img.get('furtherReading'))
        check_display_links(iid, img.get('caption'))
        if not img.get('caption'):
            errors.append(f'{iid}: no display caption')
        if not img.get('bibliography'):
            gaps[iid].append('bibliography line')
        if not img.get('rights'):
            gaps[iid].append('rights')
        # Plates from books are cited by the book; stand-alone works by
        # the institution that holds them.
        if not img.get('container') and not img.get('institution'):
            gaps[iid].append('holding institution')
        if img.get('creator') and not img['creator'].get('wikidata'):
            gaps[iid].append('creator Wikidata ID')

    drafts = [r['id'] for r in readings + images + editorial if r.get('draft')]

    print(f'{len(readings)} readings, {len(images)} images, {len(editorial)} editorial records'
          + (f', {len(drafts)} drafts (not shown on the site): {", ".join(drafts)}' if drafts else ''))
    if errors:
        print(f'\n{len(errors)} error(s):')
        for e in errors:
            print(f'  {e}')
    else:
        print('\nNo errors.')

    if not args.all:
        for rid in list(gaps):
            gaps[rid] = [f for f in gaps[rid] if f in CORE_GAPS]
            if not gaps[rid]:
                del gaps[rid]

    counts = defaultdict(int)
    for fields in gaps.values():
        for f in fields:
            counts[f] += 1
    if counts:
        print('\n' + ('All gaps' if args.all else 'Core gaps') + ' (records missing each field):')
        for field, n in sorted(counts.items(), key=lambda kv: -kv[1]):
            print(f'  {field}: {n}')
        if args.gaps:
            print()
            for rid, fields in gaps.items():
                print(f'  {rid}: {", ".join(fields)}')
        else:
            print('Run with --gaps to list them by record.')
    else:
        print('\nNo ' + ('' if args.all else 'core ') + 'gaps.')
    if not args.all:
        print('Research details (pages, publishers, Wikidata IDs and so on) are listed with --all.')

    # The Sources page is saved as static HTML; say when it no longer
    # matches the data it was built from.
    from build_sources import inputs_digest
    m = re.search(r'<!-- sources:start inputs=([0-9a-f]+) -->', (ROOT / 'sources.html').read_text())
    if not m:
        print('\nThe Sources page has not been built yet. Run: python3 scripts/build_sources.py')
    elif m.group(1) != inputs_digest():
        print('\nThe Sources page is out of date with the data. Run: python3 scripts/build_sources.py')

    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
