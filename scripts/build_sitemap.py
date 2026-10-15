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

Run it again after adding pages, readings or postcards, or after a
postcard leaves draft. robots.txt points crawlers here.
"""

import json
import re
import subprocess
from html import escape
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://earthlyhours.com'
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


def main():
    entries = []
    for rel in pages():
        html = (ROOT / rel).read_text(encoding='utf-8')
        if NOINDEX.search(html) or rel.name == '404.html':
            continue
        entries.append((address(rel, html), last_commit_date(rel)))

    readings = json.loads((ROOT / 'lectio-data.json').read_text(encoding='utf-8'))
    for season, items in readings['seasons'].items():
        for entry in items:
            entries.append((f'{SITE}/seasons.html?season={quote(season)}&entry={quote(entry["id"])}', None))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lastmod in entries:
        lines.append(f'  <url><loc>{escape(loc)}</loc>'
                     + (f'<lastmod>{lastmod}</lastmod>' if lastmod else '') + '</url>')
    lines.append('</urlset>')
    (ROOT / 'sitemap.xml').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'Wrote sitemap.xml: {len(entries)} addresses.')


if __name__ == '__main__':
    main()
