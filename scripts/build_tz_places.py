#!/usr/bin/env python3
"""Writes the time-zone table into atmosphere.js.

For readers who have never used "look outside", the site estimates where
they are from the time zone their browser reports (America/New_York and so
on), so the page's light can follow their sunrise and sunset. This takes
each zone's principal city from the system's tz database (zone.tab, then
zone1970.tab, plus the old names browsers still report, from tzdata.zi)
and writes them, to the nearest degree, between the tz-places markers in
atmosphere.js. A degree is about 4 minutes of sunrise at most; a zone can
be several degrees across, so the estimate is good to a quarter of an hour
or so, which is all the light needs.

Run it again only if the tz database has gained zones worth having.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TZ = Path('/usr/share/zoneinfo')
TARGET = ROOT / 'atmosphere.js'


def degrees(text):
    sign = -1 if text[0] == '-' else 1
    digits = text[1:]
    whole = 2 if len(digits) in (4, 6) else 3
    d, rest = int(digits[:whole]), digits[whole:]
    m = int(rest[:2]); s = int(rest[2:4]) if len(rest) > 2 else 0
    return sign * (d + m / 60 + s / 3600)


def read_tab(name, places):
    for line in (TZ / name).read_text().splitlines():
        if line.startswith('#') or not line.strip():
            continue
        coords, zone = line.split('\t')[1:3]
        m = re.match(r'([+-]\d+)([+-]\d+)$', coords)
        places.setdefault(zone, (round(degrees(m.group(1))), round(degrees(m.group(2)))))


def main():
    places = {}
    read_tab('zone.tab', places)
    read_tab('zone1970.tab', places)
    for line in (TZ / 'tzdata.zi').read_text().splitlines():
        if line.startswith('L '):
            _, target, alias = line.split()
            if target in places and alias not in places:
                places[alias] = places[target]
    # Grouped by region to keep it short: "America":"New_York 41 -74|…"
    regions = {}
    for zone, (lat, lon) in sorted(places.items()):
        if '/' not in zone:
            continue
        region, city = zone.split('/', 1)
        regions.setdefault(region, []).append(f'{city} {lat} {lon}')
    body = ',\n'.join(f' {region}: \'{"|".join(cities)}\'' for region, cities in sorted(regions.items()))
    block = ('// tz-places:start (written by scripts/build_tz_places.py)\n'
             f' const TZ_PLACES = {{\n{body}\n }};\n'
             ' // tz-places:end')
    js = TARGET.read_text()
    new, n = re.subn(r'// tz-places:start.*?// tz-places:end', lambda _: block, js, flags=re.S)
    if n != 1:
        raise SystemExit('atmosphere.js has no tz-places markers')
    TARGET.write_text(new)
    print(f'{len(places)} zones written to atmosphere.js ({len(block) // 1024} KB)')


if __name__ == '__main__':
    main()
