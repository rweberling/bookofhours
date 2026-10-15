#!/usr/bin/env python3
"""Write sitemap.xml: every page search engines should find.

Usage:
  python3 scripts/build_sitemap.py

Lists each page at its canonical address (its rel="canonical" link, or
its path on earthlyhours.com if it has none), skipping any page marked
noindex: the 404 page, colophon.html (which only forwards), and postcard
pages still in draft. Then each Seasons reading at its own address,
seasons.html?season=…&entry=…, the same address seasons.js gives it as
canonical. Each page's lastmod is the date of its last commit.

build_postcards.py and import_substack.py (with --write) run this when
they finish, so new postcards and readings are listed without a separate
step. After adding a page by hand, run it yourself; scripts/check_data.py
says when the list of addresses no longer matches the site (it ignores
the lastmod dates, which change with every commit). robots.txt points
crawlers here.
"""

import json
import re
import subprocess
from html import escape, unescape
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://earthlyhours.com'
SITEMAP = ROOT / 'sitemap.xml'
SKIP_DIRS = {'partials', 'scripts', 'worker', 'node_modules', 'fonts', 'images', 'data', 'docs'}

CANONICAL = re.compile(r'<link rel="canonical" href="([^"]+)"')
NOINDEX = re.compile(r'<meta name="robots" content="[^"]*noindex', re.I)


def pages():
    for path in sorted(ROOT.rglob('*.html')):
        rel = path.relative_to(ROOT)
        if rel.parts[0] in SKIP_DIRS or rel.parts[0].startswith('.'):
            continue
        yield rel


def last_commit_date(rel):
    result = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', str(rel)],
                            cwd=ROOT, capture_output=True, text=True)
    return result.stdout.strip() or None


def address(rel, html):
    found = CANONICAL.search(html)
    if found:
        return found.group(1)
    if rel.name == 'index.html':
        parent = rel.parent.as_posix()
        return f'{SITE}/' if parent == '.' else f'{SITE}/{parent}/'
    return f'{SITE}/{rel.as_posix()}'


def addresses():
    """(address, lastmod or None) for every page the sitemap should list."""
    entries = []
    for rel in pages():
        html = (ROOT / rel).read_text(encoding='utf-8')
        if NOINDEX.search(html) or rel.name == '404.html':
            continue
        entries.append((address(rel, html), last_commit_date(rel)))

    readings = json.loads((ROOT / 'data' / 'lectio-data.json').read_text(encoding='utf-8'))
    for season, items in readings['seasons'].items():
        for entry in items:
            entries.append((f'{SITE}/seasons.html?season={quote(season)}&entry={quote(entry["id"])}', None))
    return entries


def stale_addresses():
    """Addresses the site has but sitemap.xml lacks, and the reverse."""
    listed = set()
    if SITEMAP.exists():
        listed = {unescape(loc) for loc in re.findall(r'<loc>([^<]+)</loc>', SITEMAP.read_text(encoding='utf-8'))}
    current = {loc for loc, _ in addresses()}
    return sorted(current - listed), sorted(listed - current)


def main():
    entries = addresses()
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lastmod in entries:
        lines.append(f'  <url><loc>{escape(loc)}</loc>'
                     + (f'<lastmod>{lastmod}</lastmod>' if lastmod else '') + '</url>')
    lines.append('</urlset>')
    SITEMAP.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'Wrote sitemap.xml: {len(entries)} addresses.')


if __name__ == '__main__':
    main()
