#!/usr/bin/env python3
"""Link the people in the collection to Wikidata.

Usage:
  python3 scripts/link_people.py           # report what it would add
  python3 scripts/link_people.py --write   # add the confident matches

The people are the contributors on each reading's edition (authors,
translators, editors) and each image's creator. One Wikidata link is the
hub of linked open data for a person: it leads on to VIAF, the Library of
Congress, ISNI and the rest, so the collection keeps only the QID
("wikidata": "Q940473"), on each copy of the person, and no IDs of its own
beyond its informal keys (a-robert-ridgway).

A match is written only when it is confident: among the people Wikidata's
search finds for the name, exactly one whose name agrees with ours
(initials agreeing with full names: E. P. Felt is Ephraim Porter Felt) and
who was born before the earliest year our citations give for their work.
Everything else is listed with its candidates for a person to choose,
and nothing already linked is changed. Wikidata's search API is often
blocked from the cloud container; its query service is not, so the
search goes through that (wikibase:mwapi), with a pause between people.
"""

import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from collections import defaultdict

from datafile import load, save

AGENT = 'EarthlyHours/1.0 (https://earthlyhours.com; linking people to Wikidata)'
QUERY = '''SELECT ?q ?item ?itemLabel ?itemDescription ?born ?died WHERE {
  VALUES ?q { %s }
  SERVICE wikibase:mwapi { bd:serviceParam wikibase:endpoint "www.wikidata.org"; wikibase:api "EntitySearch";
    mwapi:search ?q; mwapi:language "en". ?item wikibase:apiOutputItem mwapi:item. }
  ?item wdt:P31 wd:Q5 .
  OPTIONAL { ?item wdt:P569 ?born } OPTIONAL { ?item wdt:P570 ?died }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}'''
BATCH = 20          # names per query
PAUSE = 65          # seconds between queries (the service may allow one a minute)


def plain(text):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', text or '')).strip()


def fold(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z ]+', ' ', text).split()


def names_agree(ours, theirs):
    """Same surname, and each of our given names (or initials) matching
    theirs in order: 'E. P. Felt' ~ 'Ephraim Porter Felt'."""
    a, b = fold(ours), fold(theirs)
    if not a or not b:
        return False
    if a == b:
        return True
    if a[-1] != b[-1] or len(a) > len(b):
        return False
    given, theirs_given = a[:-1], b[:-1]
    i = 0
    for g in given:
        while i < len(theirs_given) and not theirs_given[i].startswith(g if len(g) > 1 else g[0]):
            i += 1
        if i == len(theirs_given):
            return False
        i += 1
    return True


def year_of(value):
    m = re.match(r'^(-?)(\d{1,4})', value or '')
    return (-1 if m.group(1) else 1) * int(m.group(2)) if m else None


def search_name(name):
    return re.sub(r'\s*\(.*?\)', '', name).strip()


def candidates_for(names):
    """{name: [candidate, ...]} for a batch of names, in one query; None
    for the batch if the query fails."""
    query = QUERY % ' '.join(json.dumps(search_name(n)) for n in names)
    url = 'https://query.wikidata.org/sparql'
    data = urllib.parse.urlencode({'query': query}).encode()
    for attempt in range(3):
        request = urllib.request.Request(url, data=data, headers={
            'User-Agent': AGENT, 'Accept': 'application/sparql-results+json',
            'Content-Type': 'application/x-www-form-urlencoded'})
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                rows = json.load(response)['results']['bindings']
            break
        except Exception as error:
            print(f'  query failed ({error}); waiting', file=sys.stderr)
            time.sleep(PAUSE)
    else:
        return None
    found = {n: {} for n in names}
    by_search = defaultdict(list)
    for n in names:
        by_search[search_name(n)].append(n)
    for row in rows:
        qid = row['item']['value'].rsplit('/', 1)[1]
        candidate = {'qid': qid, 'label': row['itemLabel']['value'],
                     'description': row.get('itemDescription', {}).get('value', ''),
                     'born': year_of(row.get('born', {}).get('value')),
                     'died': year_of(row.get('died', {}).get('value'))}
        for n in by_search.get(row['q']['value'], []):
            found[n].setdefault(qid, candidate)
    return {n: list(c.values()) for n, c in found.items()}


def people(readings, images):
    """Each person by key: their name, the records naming them, and the
    earliest year our citations give for their work."""
    found = defaultdict(lambda: {'name': None, 'copies': [], 'years': [], 'wikidata': None})

    def note(person, text, copy):
        entry = found[person['id']]
        entry['name'] = entry['name'] or person['name']
        entry['copies'].append(copy)
        entry['years'] += [int(y) for y in re.findall(r'\b(1[0-9]{3}|20[0-2][0-9])\b', plain(text))]
        entry['wikidata'] = entry['wikidata'] or person.get('wikidata')

    for r in readings:
        if r.get('draft'):
            continue
        cit = r.get('citation') or {}
        for p in ((cit.get('edition') or {}).get('contributors') or []):
            note(p, cit.get('bibliography') or cit.get('display'), p)
    for img in images:
        if not img.get('draft') and img.get('creator'):
            note(img['creator'], img.get('bibliography') or img.get('caption'), img['creator'])
    return found


def main(args):
    write = '--write' in args
    readings, images = load('readings'), load('images')
    linked, review = [], []
    todo = [p for _, p in sorted(people(readings, images).items()) if not p['wikidata']]
    results = {}
    for start in range(0, len(todo), BATCH):
        if start:
            time.sleep(PAUSE)
        batch = [p['name'] for p in todo[start:start + BATCH]]
        print(f'  searching {start + 1}–{start + len(batch)} of {len(todo)}', file=sys.stderr)
        results.update(candidates_for(batch) or {n: None for n in batch})
    for person in todo:
        found = results.get(person['name'])
        if found is None:
            review.append((person['name'], 'the query failed; run again', []))
            continue
        year = min(person['years']) if person['years'] else None
        # Born before the work, and not dead more than a century before it
        # (a namesake from an earlier age); an ancient author in a modern
        # edition falls outside that and is left for a person.
        fit = [c for c in found if names_agree(person['name'], c['label'])
               and (year is None or c['born'] is None or c['born'] < year)
               and (year is None or c['died'] is None or c['died'] >= year - 100)]
        if len(fit) == 1 and (fit[0]['born'] is not None or year is None):
            match = fit[0]
            for copy in person['copies']:
                copy['wikidata'] = match['qid']
            linked.append(f'{person["name"]} → {match["qid"]} ({match["label"]}: {match["description"]})')
        else:
            why = 'no candidate' if not found else ('several fit' if len(fit) > 1 else 'none fits')
            review.append((person['name'], f'{why} (work from {year})', found[:5]))
    for line in linked:
        print(f'linked: {line}')
    print(f'\n{len(linked)} linked; {len(review)} for a person to look at:')
    for name, why, found in review:
        print(f'  {name}: {why}')
        for c in found:
            print(f'      {c["qid"]} {c["label"]}: {c["description"]} ({c["born"]}–{c["died"]})')
    if write:
        save('readings', readings)
        save('images', images)
        print('\nSaved. Now run python3 scripts/check_data.py.')
    else:
        print('\nNothing saved; add --write to save.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
