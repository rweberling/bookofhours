#!/usr/bin/env python3
"""What peaks in New England in a given week of the Seasons, from iNaturalist.

Usage:
  python3 scripts/inat_week.py 50                 # Week 50, the default years
  python3 scripts/inat_week.py 50 --years 2016-2025 --min 20 --per-group 12
  python3 scripts/inat_week.py 50 --json out.json

For the day candidates (CLAUDE.md, "Day candidates"): a starting list of
what is actually out there that week, before any reading or image is looked
for. It counts research-grade iNaturalist observations in the six New
England states (Massachusetts, Connecticut, Rhode Island, Vermont, New
Hampshire, Maine) over the given years, for the week's seven days and for
the whole year, and ranks each species by its peak: its share of the
week's observations against its share of the year's. Using shares rather
than raw counts allows for there being fewer observers in winter. A
species also needs at least --min observations in the week, so that it is
something a reader could find.

The list is grouped by kind (iNaturalist's iconic taxa: birds, plants,
fungi, insects and so on) so a week can be spread across them. It says
nothing about sky, weather or the kitchen; those are added by hand.

The iNaturalist API asks for about one request a second; the script keeps
to that and needs about a minute for a week.
"""

import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from weeks import week_days  # noqa: E402

API = 'https://api.inaturalist.org/v1'
PLACES = '2,49,8,47,41,17'   # MA, CT, RI, VT, NH, ME
AGENT = 'EarthlyHours/1.0 (https://earthlyhours.com; weekly phenology for the Seasons)'
GROUPS = ['Aves', 'Plantae', 'Fungi', 'Insecta', 'Arachnida', 'Mammalia', 'Mollusca',
          'Amphibia', 'Reptilia', 'Actinopterygii', 'Chromista', 'Protozoa', 'Animalia']
_last = [0.0]


def call(path, **params):
    wait = 1.1 - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    url = f'{API}/{path}?' + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': AGENT})
            with urllib.request.urlopen(req, timeout=60) as r:
                _last[0] = time.time()
                return json.load(r)
        except Exception as error:
            print(f'  {path}: {error}; waiting', file=sys.stderr)
            time.sleep(5 * (attempt + 1))
    raise SystemExit(f'iNaturalist did not answer: {url}')


def base(years):
    return dict(place_id=PLACES, quality_grade='research', verifiable='true',
                year=','.join(str(y) for y in years))


def day_filters(week):
    """The week's days as month/day filters, one per month it spans."""
    by_month = {}
    for m, d in week_days(week):
        by_month.setdefault(m, []).append(d)
    return [dict(month=m, day=','.join(map(str, ds))) for m, ds in by_month.items()]


def total(**params):
    return call('observations', per_page=0, **params)['total_results']


def species_counts(pages, **params):
    out = {}
    for page in range(1, pages + 1):
        d = call('observations/species_counts', per_page=500, page=page, **params)
        for r in d['results']:
            t = r['taxon']
            if t.get('rank') not in ('species', 'hybrid'):
                continue
            out[t['id']] = dict(id=t['id'], name=t['name'],
                                common=t.get('preferred_common_name') or '',
                                group=t.get('iconic_taxon_name') or 'Other',
                                count=out.get(t['id'], {}).get('count', 0) + r['count'])
        if page * 500 >= d['total_results']:
            break
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('week', type=int)
    ap.add_argument('--years', default='2016-2025')
    ap.add_argument('--min', type=int, default=20, help='least observations in the week')
    ap.add_argument('--pages', type=int, default=4, help='pages of 500 species for the week')
    ap.add_argument('--per-group', type=int, default=10)
    ap.add_argument('--json')
    a = ap.parse_args()
    y1, y2 = (int(x) for x in a.years.split('-'))
    years = list(range(y1, y2 + 1))
    b = base(years)

    days = week_days(a.week)
    print(f'Week {a.week}: {days[0][0]}/{days[0][1]} to {days[-1][0]}/{days[-1][1]}, '
          f'New England, research grade, {y1}-{y2}', file=sys.stderr)

    week, week_total = {}, 0
    for f in day_filters(a.week):
        week_total += total(**b, **f)
        for tid, r in species_counts(a.pages, **b, **f).items():
            if tid in week:
                week[tid]['count'] += r['count']
            else:
                week[tid] = r
    year_total = total(**b)
    keep = [r for r in week.values() if r['count'] >= a.min]
    print(f'  {week_total} observations in the week, {year_total} in the year; '
          f'{len(keep)} species with at least {a.min}', file=sys.stderr)

    ids = [r['id'] for r in keep]
    for i in range(0, len(ids), 100):
        chunk = ids[i:i + 100]
        year = species_counts(1, taxon_id=','.join(map(str, chunk)), **b)
        for tid in chunk:
            n = year.get(tid, {}).get('count', 0)
            r = week[tid]
            r['year'] = n
            r['peak'] = round((r['count'] / week_total) / (n / year_total), 1) if n else None

    ranked = sorted((r for r in keep if r.get('peak')), key=lambda r: -r['peak'])
    groups = {}
    for r in ranked:
        groups.setdefault(r['group'], []).append(r)
    order = [g for g in GROUPS if g in groups] + [g for g in groups if g not in GROUPS]
    for g in order:
        print(f'\n{g}')
        for r in groups[g][:a.per_group]:
            print(f"  {r['peak']:>5}x  {r['count']:>5} obs  {r['common'] or '-'} ({r['name']})")
    if a.json:
        Path(a.json).write_text(json.dumps(dict(week=a.week, years=a.years, weekTotal=week_total,
                                                yearTotal=year_total, species=ranked),
                                           ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
