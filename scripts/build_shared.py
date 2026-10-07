#!/usr/bin/env python3
"""Copy the shared pieces of every page in from partials/.

Usage:
  python3 scripts/build_shared.py

A few pieces of HTML are the same on (nearly) every page, so they're
written once, in partials/, and copied into each page:

  partials/head.html   icons, home-screen settings and Google Analytics,
                       at the top of each page's <head>
  partials/frame.html  the page frame and its four corner ornaments
  partials/nav.html    the menu bar at the foot of each page

Each copy sits between two marker lines, for example:

  <!-- shared:nav, from partials/nav.html (run scripts/build_shared.py); edit it there -->
  <!-- /shared:nav -->

So to change one of these, edit its file in partials/ and run this
script. Edits made between the markers inside a page are overwritten the
next time it runs. scripts/check_data.py says when a page's copy no
longer matches.

A page only gets the pieces it has markers for: weather.html, whose
image fills the screen, has no frame markers, so it gets no frame.

Write links in partials/ as plain file names (about.html, not
/about.html). The script adjusts each copy for its page:

  - Pages that can be reached at other addresses (404.html, and the
    postcard pages under c/) get links starting with /, so they work
    from anywhere on the site.
  - In the menu, the dropdown item for the page you're on is highlighted
    (class="active"), e.g. The Current Season on seasons.html.
  - In the menu, on each section's own page (index.html, seasons.html,
    weather.html), its Wander item becomes a button that opens the pane
    in place and reads "Sign in to wander" until the visitor signs in
    with DFOS (see nav.js). Elsewhere it stays a link to that page's
    #wander.

The postcard pages are written by scripts/build_postcards.py, which takes
these pieces from here too.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARTIALS = ROOT / 'partials'
NAMES = ('head', 'frame', 'nav')


def start(name):
    return f'<!-- shared:{name}, from partials/{name}.html (run scripts/build_shared.py); edit it there -->'


def end(name):
    return f'<!-- /shared:{name} -->'


def block(name):
    return re.compile(re.escape(start(name)) + '.*?' + re.escape(end(name)), re.S)


# Each section's page, its Wander item, and the id its script listens on.
WANDER = {
    'index.html': ('Wander the Hours', 'wander-open'),
    'seasons.html': ('Wander the Seasons', 'season-wander-open'),
    'weather.html': ('Wander the Weather', 'weather-wander-open'),
}


def absolute_links(page):
    """Pages that may be served from another address need /-rooted links."""
    return page == '404.html' or page.startswith('c/')


def adjust_nav(nav, page):
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
    return nav


def render(name, page=''):
    """Partial `name` as it should appear on `page` (a path from the site root)."""
    html = (PARTIALS / f'{name}.html').read_text(encoding='utf-8').strip()
    if name == 'nav':
        html = adjust_nav(html, page)
    if absolute_links(page):
        html = re.sub(r'((?:href|src)=")(?![a-z]+:|/|#)', r'\1/', html)
    return f'{start(name)}\n{html}\n{end(name)}'


def pages():
    """Every page that carries a shared piece, as paths from the site root."""
    for path in sorted(ROOT.glob('*.html')) + sorted((ROOT / 'c').glob('**/index.html')):
        text = path.read_text(encoding='utf-8')
        if any(start(name) in text for name in NAMES):
            yield path.relative_to(ROOT).as_posix()


def build(page, text):
    """`text` with every shared piece it carries brought up to date."""
    for name in NAMES:
        text = block(name).sub(lambda _: render(name, page), text, count=1)
    return text


def stale_pages():
    """Pages whose shared pieces don't match partials/."""
    return [page for page in pages()
            if build(page, (ROOT / page).read_text(encoding='utf-8')) != (ROOT / page).read_text(encoding='utf-8')]


def main():
    changed = 0
    for page in pages():
        path = ROOT / page
        text = path.read_text(encoding='utf-8')
        new = build(page, text)
        if new != text:
            path.write_text(new, encoding='utf-8')
            print(f'updated {page}')
            changed += 1
    print(f'{changed} page(s) updated.' if changed else 'Every page is up to date with partials/.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
