#!/usr/bin/env python3
"""Copy the site menu from partials/nav.html into every page.

Usage:
  python3 scripts/build_nav.py

The menu bar at the foot of each page is written once, in
partials/nav.html, and copied into each page between these two lines:

  <!-- nav: built from partials/nav.html by scripts/build_nav.py; edit it there -->
  <!-- /nav -->

So to change the menu, edit partials/nav.html and run this script. Edits
made to the menu inside a page are overwritten the next time it runs.
scripts/check_data.py says when a page's menu no longer matches.

Write links in partials/nav.html as plain file names (about.html, not
/about.html). The script adjusts the copy for each page:

  - The dropdown item for the page you're on is highlighted
    (class="active"), e.g. The Current Season on seasons.html.
  - Pages that can be reached at other addresses (404.html, and the
    postcard pages under c/) get links starting with /, so they work
    from anywhere on the site.
  - On each section's own page (index.html, seasons.html, weather.html),
    its Wander item becomes a button that opens the pane in place and
    reads "Sign in to wander" until the visitor signs in with DFOS (see
    nav.js). Elsewhere it stays a link to that page's #wander.

The postcard pages are written by scripts/build_postcards.py, which takes
its menu from here too.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAV = ROOT / 'partials' / 'nav.html'

START = '<!-- nav: built from partials/nav.html by scripts/build_nav.py; edit it there -->'
END = '<!-- /nav -->'
BLOCK = re.compile(re.escape(START) + '.*?' + re.escape(END), re.S)

# Each section's page, its Wander item, and the id its script listens on.
WANDER = {
    'index.html': ('Wander the Hours', 'wander-open'),
    'seasons.html': ('Wander the Seasons', 'season-wander-open'),
    'weather.html': ('Wander the Weather', 'weather-wander-open'),
}


def absolute_links(page):
    """Pages that may be served from another address need /-rooted links."""
    return page == '404.html' or page.startswith('c/')


def render(page=''):
    """The menu as it should appear on `page` (a path from the site root)."""
    nav = NAV.read_text(encoding='utf-8').strip()

    # Highlight this page's own item, but only inside the dropdowns:
    # About and Sources sit in the bar itself and stay as they are.
    def mark(menu):
        return menu.group(0).replace(f'<a href="{page}">', f'<a class="active" href="{page}">')
    nav = re.sub(r'<div class="nav-hours-menu".*?</div>', mark, nav, flags=re.S)

    if page in WANDER:
        label, button_id = WANDER[page]
        link = f'<a href="{page}#wander">{label}</a>'
        button = (f'<button class="wander-btn dfos-gated" id="{button_id}" '
                  f'data-gated-label="{label}">{label}</button>')
        assert link in nav, f'partials/nav.html has no {link}'
        nav = nav.replace(link, button)
    if absolute_links(page):
        nav = re.sub(r'href="(?![a-z]+:|/|#)', 'href="/', nav)
    return f'{START}\n{nav}\n{END}'


def pages():
    """Every page that carries the menu, as paths from the site root."""
    for path in sorted(ROOT.glob('*.html')) + sorted((ROOT / 'c').glob('**/index.html')):
        if START in path.read_text(encoding='utf-8'):
            yield path.relative_to(ROOT).as_posix()


def stale_pages():
    """Pages whose menu doesn't match partials/nav.html."""
    stale = []
    for page in pages():
        found = BLOCK.search((ROOT / page).read_text(encoding='utf-8'))
        if not found or found.group(0) != render(page):
            stale.append(page)
    return stale


def main():
    changed = 0
    for page in pages():
        path = ROOT / page
        text = path.read_text(encoding='utf-8')
        new = BLOCK.sub(lambda _: render(page), text, count=1)
        if new != text:
            path.write_text(new, encoding='utf-8')
            print(f'updated {page}')
            changed += 1
    print(f'{changed} page(s) updated.' if changed else 'Every page already has the current menu.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
