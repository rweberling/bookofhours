#!/usr/bin/env python3
"""Give editions the identifiers their cited copies already name.

Usage:
  python3 scripts/link_editions.py           # report what it would add
  python3 scripts/link_editions.py --write   # add it

The collection keeps what the site shows of an edition (author, title,
date) and points to authority records for the rest (data/README.md,
Editions). This script reads those pointers off the copy a record already
cites, so nothing is guessed:

  a HathiTrust scan (hdl.handle.net/2027/<id>, babel.hathitrust.org)
      -> its catalogue record, OCLC, LCCN and ISBN (HathiTrust's Bib API)
  an Internet Archive scan (archive.org/details/<id>)
      -> the OCLC, Open Library and ISBN numbers in its metadata
  a link with a DOI in it (doi.org/10..., a publisher's /doi/10...)
      -> the DOI, checked against Crossref

They go in the edition's "identifiers". A reading's edition is its
citation.edition; an image from a printed volume gets an edition of its
own (the next e- number), holding just these identifiers and the
catalogue's title and date, until its details are filled in. It only
ever adds: identifiers already there are left as they are.

It doesn't merge editions. Two records whose copies share a HathiTrust
record may be the same edition or two volumes of one set, so they are
listed at the end, for a person to decide (then give them one e- ID).

The cited copy: for a reading, its edition's link marked "cited", else the
first link in its citation; for an image, its link marked "cited", else
the first link in its caption. HathiTrust and Internet Archive need pauses
between requests; this keeps to about two a second.
"""

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict

from datafile import load, save
from copy_lectio import next_edition

AGENT = 'EarthlyHours/1.0 (bibliographic identifiers; https://earthlyhours.com)'
HATHI = re.compile(r'(?:hdl\.handle\.net/2027/|babel\.hathitrust\.org/cgi/pt\?id=)([a-z0-9]+\.[^?&#;/\s"]+)')
ARCHIVE = re.compile(r'archive\.org/details/([^/?#\s"]+)')
DOI = re.compile(r'(?:doi\.org/|/doi/(?:abs/|full/|epdf/|pdf/)?)(10\.\d{4,9}/[^?#\s"]+)')
LINK = re.compile(r'href="([^"]+)"')


def get_json(url):
    """The JSON at url; a "too many requests" is waited out (up to three
    tries), and a lookup that still fails is reported, not fatal."""
    for attempt in range(3):
        time.sleep(0.5 + attempt * 5)
        request = urllib.request.Request(url, headers={'User-Agent': AGENT})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code == 429 and attempt < 2:
                continue
            print(f'  lookup failed: {url} ({error})', file=sys.stderr)
            return None
        except Exception as error:
            print(f'  lookup failed: {url} ({error})', file=sys.stderr)
            return None


def cited_url(links, html):
    for link in links or []:
        if link.get('role') == 'cited' and link.get('url'):
            return link['url']
    found = LINK.findall(html or '')
    return found[0] if found else None


def from_hathitrust(htid):
    data = get_json(f'https://catalog.hathitrust.org/api/volumes/brief/htid/{urllib.parse.quote(htid)}.json')
    if not data or not data.get('records'):
        return None
    record_id, record = next(iter(data['records'].items()))
    ids = {'hathitrust': record_id}
    for key, field in (('oclc', 'oclcs'), ('lccn', 'lccns'), ('isbn', 'isbns')):
        if record.get(field):
            ids[key] = record[field][0]
    title = (record.get('titles') or [None])[0]
    issued = (record.get('publishDates') or [None])[0]
    return ids, title, issued


def from_archive(identifier):
    data = get_json(f'https://archive.org/metadata/{urllib.parse.quote(identifier)}')
    meta = (data or {}).get('metadata') or {}
    first = lambda v: v[0] if isinstance(v, list) else v
    ids = {'internetArchive': identifier}
    for key, field in (('oclc', 'oclc-id'), ('openlibrary', 'openlibrary_edition'), ('isbn', 'isbn'), ('lccn', 'lccn')):
        if meta.get(field):
            ids[key] = str(first(meta[field])).strip()
    return ids, first(meta.get('title')), first(meta.get('date'))


def from_doi(doi):
    doi = urllib.parse.unquote(doi).rstrip('.')
    data = get_json(f'https://api.crossref.org/works/{urllib.parse.quote(doi)}')
    message = (data or {}).get('message')
    if not message:
        return None
    issued = (message.get('issued') or {}).get('date-parts', [[None]])[0][0]
    return {'doi': message.get('DOI', doi).lower()}, (message.get('title') or [None])[0], str(issued) if issued else None


def tidy(found):
    """Library of Congress numbers without the catalogue's suffix or spaces
    (\"17028831 //r\" is 17028831); no ISBN on a book from before ISBNs
    (about 1970), which belongs to a reprint in the same catalogue record."""
    if not found:
        return None
    ids, title, issued = found
    if 'lccn' in ids:
        ids['lccn'] = re.sub(r'\s+', '', ids['lccn'].split('//')[0])
    year = re.match(r'\d{4}', str(issued or ''))
    if 'isbn' in ids and year and int(year.group(0)) < 1970:
        del ids['isbn']
    return ids, title, issued


def identify(url):
    """(identifiers, catalogue title, date) for the copy at url, or None."""
    if not url:
        return None
    if m := HATHI.search(url):
        return tidy(from_hathitrust(urllib.parse.unquote(m.group(1))))
    if m := DOI.search(url):
        return tidy(from_doi(m.group(1)))
    if m := ARCHIVE.search(url):
        return tidy(from_archive(m.group(1)))
    return None


def main(args):
    write = '--write' in args
    readings, images = load('readings'), load('images')
    retired = json.loads(open('data/retired-ids.json').read()) if __import__('os').path.exists('data/retired-ids.json') else []
    next_e = next_edition(readings + images, retired)
    added, made, by_record = 0, 0, defaultdict(list)

    for r in readings:
        if r.get('draft'):
            continue
        cit = r.get('citation') or {}
        edition = cit.get('edition')
        if not edition:
            continue
        found = identify(cited_url(edition.get('links'), cit.get('display')))
        if not found:
            continue
        ids, _, _ = found
        have = edition.setdefault('identifiers', {})
        new = {k: v for k, v in ids.items() if k not in have}
        if new:
            have.update(new)
            added += 1
            print(f'{r["id"]} ({edition["id"]}): {", ".join(f"{k} {v}" for k, v in new.items())}')
        if 'hathitrust' in have:
            by_record[have['hathitrust']].append(f'{r["id"]} {edition["id"]}')

    for img in images:
        if img.get('draft'):
            continue
        found = identify(cited_url(img.get('links'), img.get('caption')))
        if not found:
            continue
        ids, title, issued = found
        edition = img.get('edition')
        if not edition:
            edition = {'id': f'e-{next_e:04d}'}
            if title:
                edition['title'] = title
            if issued:
                edition['issued'] = issued
            img['edition'] = edition
            next_e += 1
            made += 1
        have = edition.setdefault('identifiers', {})
        new = {k: v for k, v in ids.items() if k not in have}
        if new:
            have.update(new)
            added += 1
            print(f'{img["id"]} ({edition["id"]}): {", ".join(f"{k} {v}" for k, v in new.items())}')
        if 'hathitrust' in have:
            by_record[have['hathitrust']].append(f'{img["id"]} {edition["id"]}')

    shared = {k: v for k, v in by_record.items() if len({x.split()[1] for x in v}) > 1}
    print(f'\n{added} edition(s) given identifiers; {made} new edition(s) for images from printed volumes.')
    if shared:
        print('\nThese share a HathiTrust record: the same edition, or volumes of one set? '
              'If the same, give them one e- ID.')
        for record, owners in shared.items():
            print(f'  catalog.hathitrust.org/Record/{record}: {"; ".join(owners)}')
    if write:
        save('readings', readings)
        save('images', images)
        print('\nSaved. Now run python3 scripts/check_data.py.')
    else:
        print('\nNothing saved; add --write to save.')
    return 0


if __name__ == '__main__':
    sys.path.insert(0, __import__('os').path.dirname(__file__))
    sys.exit(main(sys.argv[1:]))
