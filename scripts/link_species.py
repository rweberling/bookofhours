#!/usr/bin/env python3
"""Look up the registry IDs for the species records in data/species.json.

Usage:
  python3 scripts/link_species.py           # show what was found
  python3 scripts/link_species.py --write   # fill in the empty IDs

For each species record, asks Wikidata for the item whose taxon name
(P225) is exactly the record's scientific name, and takes from it the
Wikidata ID and the GBIF (P846) and iNaturalist (P3151) taxon IDs. A
name that matches no item, or more than one, is reported for you to
settle by hand. Only empty fields are filled, so an ID entered by hand
is never replaced; where Wikidata disagrees with one, that is reported.

Phenomena (data/phenomena.json) are not looked up: their names are
written for the site, not registry names. Add their Wikidata IDs by hand.

Needs to reach query.wikidata.org.
"""

import argparse
import json
import sys
import urllib.parse
import urllib.request

from datafile import load, save

ENDPOINT = 'https://query.wikidata.org/sparql'
FIELDS = {'wikidata': 'item', 'gbif': 'gbif', 'inaturalist': 'inat'}


def query(names):
    values = ' '.join(json.dumps(n) for n in names)
    sparql = f'''SELECT ?name ?item ?gbif ?inat WHERE {{
  VALUES ?name {{ {values} }}
  ?item wdt:P225 ?name .
  OPTIONAL {{ ?item wdt:P846 ?gbif }}
  OPTIONAL {{ ?item wdt:P3151 ?inat }}
}}'''
    url = ENDPOINT + '?' + urllib.parse.urlencode({'query': sparql, 'format': 'json'})
    request = urllib.request.Request(url, headers={
        'User-Agent': 'EarthlyBookOfHours/1.0 (https://earthlyhours.com; hello@earthlyhours.com)'})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def found_by_name(result):
    """{name: {item ID: {field: value}}} from the SPARQL result."""
    found = {}
    for row in result['results']['bindings']:
        item = row['item']['value'].rsplit('/', 1)[-1]
        ids = found.setdefault(row['name']['value'], {}).setdefault(item, {'wikidata': item})
        for field, var in FIELDS.items():
            if var in row and field != 'wikidata':
                ids.setdefault(field, row[var]['value'])
    return found


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--write', action='store_true', help='fill the empty IDs in data/species.json')
    args = parser.parse_args()

    species = load('species')
    found = found_by_name(query(sorted({s['scientific'] for s in species})))

    filled = 0
    for s in species:
        items = found.get(s['scientific'], {})
        if len(items) != 1:
            print(f'{s["id"]} {s["scientific"]}: {"no Wikidata item" if not items else "several items: " + ", ".join(items)}; settle by hand')
            continue
        ids = next(iter(items.values()))
        for field in FIELDS:
            new = ids.get(field)
            if not new:
                continue
            if not s.get(field):
                s[field] = new
                filled += 1
                print(f'{s["id"]} {s["scientific"]}: {field} {new}')
            elif str(s[field]) != new:
                print(f'{s["id"]} {s["scientific"]}: {field} is {s[field]}, Wikidata says {new}; left as it is')

    if args.write and filled:
        save('species', species)
        print(f'Filled {filled} IDs in data/species.json.')
    elif filled:
        print(f'{filled} IDs to fill. Run with --write to save them.')
    else:
        print('Nothing new to fill.')


if __name__ == '__main__':
    try:
        main()
    except OSError as error:
        sys.exit(f'Could not reach Wikidata ({error}). Is query.wikidata.org allowed?')
