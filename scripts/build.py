#!/usr/bin/env python3
"""Bring every built file up to date with the data: one command for all.

Usage:
  python3 scripts/build.py            # rebuild whatever is out of date
  python3 scripts/build.py --check    # only say what is out of date (exit 1 if anything is)

Each step runs only when its files no longer match what they're built
from, in this order (later steps use earlier ones' output):

  1. web copies of the images        build_images.py     (new or changed masters)
  2. shared head, frame and menu     build_shared.py     (partials/ changed)
  3. postcard pages                  build_postcards.py  (data/postcards.csv or the template)
  4. post pages and the RSS feed     build_lectio_pages.py --all  (a post, its records,
                                                                    seasons.html or partials/)
  5. record pages (id/)              build_records.py    (any record, or partials/)
  6. sitemap and llms.txt            build_sitemap.py    (a page or reading added or gone)
  7. Sources page                    build_sources.py    (the data it lists; needs Chrome)

It doesn't import from Substack (import_substack.py --fetch --write does
that, and runs this too) or change any data. After it, run
scripts/check.sh before pushing.
"""

import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))


def due_images():
    from build_images import stale_masters
    return stale_masters()


def due_shared():
    from build_shared import stale_pages
    return stale_pages()


def due_postcards():
    from build_postcards import stale_pages
    return stale_pages()


def due_posts():
    from build_lectio_pages import stale_pages
    return stale_pages()


def due_records():
    from build_records import stale_pages
    return stale_pages()


def due_sitemap():
    from build_sitemap import stale_addresses, llms_stale
    missing, extra = stale_addresses()
    return [*missing, *extra] + (['llms.txt'] if llms_stale() else [])


def due_sources():
    import re
    from build_sources import inputs_digest
    m = re.search(r'<!-- sources:start inputs=([0-9a-f]+) -->', (ROOT / 'sources.html').read_text())
    return [] if m and m.group(1) == inputs_digest() else ['sources.html']


STEPS = [
    ('web copies of the images', due_images, ['build_images.py']),
    ('shared head, frame and menu', due_shared, ['build_shared.py']),
    ('postcard pages', due_postcards, ['build_postcards.py']),
    ('post pages and the RSS feed', due_posts, ['build_lectio_pages.py', '--all']),
    ('record pages', due_records, ['build_records.py']),
    ('sitemap and llms.txt', due_sitemap, ['build_sitemap.py']),
    ('Sources page', due_sources, ['build_sources.py']),
]


def main(args):
    check_only = '--check' in args
    due_any = False
    for name, due, command in STEPS:
        # Ask afresh each time: an earlier step may have made this one due.
        items = due()
        if not items:
            print(f'  up to date: {name}')
            continue
        due_any = True
        shown = ', '.join(str(i) for i in items[:4]) + (', ...' if len(items) > 4 else '')
        if check_only:
            print(f'OUT OF DATE: {name} ({shown}). Run: python3 scripts/build.py')
            continue
        print(f'Building {name} ({shown}):')
        result = subprocess.run([sys.executable, str(HERE / command[0]), *command[1:]], cwd=ROOT)
        if result.returncode:
            print(f'{command[0]} failed; stopping here.', file=sys.stderr)
            return result.returncode
        # The modules cache what they read; fresh ones for the next check.
        for module in [m for m in sys.modules if m.startswith('build_')]:
            del sys.modules[module]
    if check_only:
        return 1 if due_any else 0
    print('Everything is built.' if due_any else 'Everything was already up to date.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
