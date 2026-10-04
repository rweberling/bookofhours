#!/usr/bin/env python3
"""Build the postcard landing pages from data/postcards.csv.

Usage:
  python3 scripts/build_postcards.py

Each postcard's QR code points at a short link, earthlyhours.com/c/<path>
(e.g. /c/w26/1). The printed link never changes, so each one is a small
page on this site rather than a redirect: it shows the card's image and
citation, links to the digital original in its library or archive (with
a backup link), and, once one is written, to the card's Lectio Terra
entry. Changing where a card leads means editing its row and running this
again; the codes on cards already sent stay good.

Columns in data/postcards.csv:
  path          the short link after /c/, e.g. w26/1; becomes c/w26/1/index.html
  destination   the digital original (museum, library or archive page)
  backup        a second copy, in case the first link breaks
  title         the card's title; *asterisks* mark italics, e.g. for a species name
  citation      the full citation; *asterisks* mark italics
  image         the card's front as printed (cropped to the postcard), from
                the site root, e.g. images/postcards/w26/1.jpg
  image_full    the whole, uncropped image, e.g. images/postcards/w26/1-full.jpg;
                clicking the card opens it full screen. Optional.
  post          the Lectio Terra entry about the card, once there is one
  context       optional: a further text about the image, e.g. the artist's own
                description of it
  context_label how the context link reads on the page, e.g. "Read Trouvelot's
                account of that night (1882)"
  print_run, print_date, last_checked, status
                record keeping only; not shown on the page

A row with no title yet still gets a page, saying the card is being
prepared, so a code never leads to a missing page. Drafts and such
placeholders are kept out of search engines until their status is
something other than "draft".

Every page is rewritten on each run. Nothing else in the site is touched.
"""

import csv
import html
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data' / 'postcards.csv'
OUT = ROOT / 'c'
SITE = 'https://earthlyhours.com'

# The series a short link belongs to, named on its page.
SERIES = {
    'w26': 'A postcard for the winter solstice, 2026',
}

# The moment each series marks, shown under its subtitle. Written as a
# record, without tense, so it reads the same before and after the day.
# UT is Universal Time, the astronomers' clock at Greenwich.
DATELINES = {
    'w26': 'December 21, 2026, at 20:50 UT (3:50 p.m. Eastern)',
}

# Names for the libraries and archives the cards link to; any other host
# is shown by its domain.
HOLDERS = {
    'commons.wikimedia.org': 'Wikimedia Commons',
    'www.digitalcommonwealth.org': 'Digital Commonwealth',
    'digitalcollections.nypl.org': 'The New York Public Library',
    'archive.org': 'the Internet Archive',
    'www.wbc.poznan.pl': 'the Wielkopolska Digital Library',
    'www.atlascoelestis.com': 'Atlas Coelestis',
    'www.biodiversitylibrary.org': 'the Biodiversity Heritage Library',
    'www.loc.gov': 'the Library of Congress',
    'www.metmuseum.org': 'The Metropolitan Museum of Art',
    'www.rijksmuseum.nl': 'the Rijksmuseum',
    'hdl.handle.net': 'HathiTrust',
    'babel.hathitrust.org': 'HathiTrust',
}

PATH = re.compile(r'^[a-z0-9-]+(/[a-z0-9-]+)*$')

CORNER = '''<div class="corner corner-{pos}">
  <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 4 L4 20 M4 4 L20 4" stroke="currentColor" stroke-width="0.75" opacity="0.5"/>
    <path d="M4 4 Q15 4 15 15 Q15 26 4 26" stroke="currentColor" stroke-width="0.4" fill="none" opacity="0.3"/>
    <circle cx="4" cy="4" r="2" fill="currentColor" opacity="0.45"/>
  </svg>
</div>'''

PAGE = '''<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="icon" type="image/png" href="/images/emblemicon/favicon-96x96.png" sizes="96x96">
  <link rel="icon" type="image/svg+xml" href="/images/emblemicon/favicon.svg">
  <link rel="shortcut icon" href="/images/emblemicon/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/images/emblemicon/apple-touch-icon.png">
  <link rel="manifest" href="/images/emblemicon/site.webmanifest">
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-P4407N365M"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-P4407N365M');
  </script>
  <!-- Built by scripts/build_postcards.py from data/postcards.csv; edit those, not this. -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title_text} — The Earthly Book of Hours</title>
  <meta name="description" content="{description}">
{robots}  <meta name="application-name" content="The Earthly Hours">
  <meta property="og:title" content="{title_text}">
  <meta property="og:description" content="{description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{url}">
{og_image}  <link rel="canonical" href="{url}">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>

<div class="outer-frame"></div>

{corners}

<main class="page">
  <p class="publication-name">The Earthly Book of Hours</p>

  <div class="rule-ornament" aria-hidden="true">
    <div class="line"></div>
    <div class="lozenge">✦</div>
    <div class="diamond"></div>
    <div class="lozenge">✦</div>
    <div class="line"></div>
  </div>

  <h1 class="page-title">{title}</h1>
  <p class="page-subtitle">{series}</p>
{dateline}
{body}
{turn}
  <footer class="page-footer">
    <div class="rule-ornament" style="max-width:260px; margin-bottom:0;" aria-hidden="true">
      <div class="line"></div>
      <div class="diamond"></div>
      <div class="line"></div>
    </div>
    <p class="colophon">A project of <a href="https://otherwise.dfos.com" target="_blank">Otherwise</a></p>
  </footer>
</main>

<!-- ═══════════════════════════════════════════════
     FOOTER NAV BAR
════════════════════════════════════════════════ -->
<nav class="site-nav" id="site-nav">
  <div class="nav-hours-group">
    <button class="nav-hours-trigger" id="nav-hours-trigger">The Hours</button>
    <div class="nav-hours-menu" id="nav-hours-menu">
      <a href="/index.html">The Current Hour</a>
      <a href="/index.html#wander">Wander the Hours</a>
    </div>
  </div>
  <span class="nav-divider">✦</span>
  <div class="nav-hours-group">
    <button class="nav-hours-trigger" id="nav-seasons-trigger">The Seasons</button>
    <div class="nav-hours-menu" id="nav-seasons-menu">
      <a href="/seasons.html">The Current Season</a>
      <a href="/seasons.html#wander">Wander the Seasons</a>
    </div>
  </div>
  <span class="nav-divider">✦</span>
  <div class="nav-hours-group">
    <button class="nav-hours-trigger" id="nav-weather-trigger">The Weather</button>
    <div class="nav-hours-menu" id="nav-weather-menu">
      <a href="/weather.html">The Current Weather</a>
      <a href="/weather.html#wander">Wander the Weather</a>
    </div>
  </div>
  <span class="nav-divider">✦</span>
  <a href="/about.html">About</a>
  <span class="nav-divider">✦</span>
  <a href="/sources.html">Sources</a>
  <span class="nav-divider">✦</span>
  <div class="nav-hours-group"><button class="nav-hours-trigger" id="nav-projects-trigger">Other Projects</button><div class="nav-hours-menu nav-embed-menu" id="nav-projects-menu"><iframe data-src="https://app.dfos.com/embed/spaces/otherwise" width="400" height="118" frameborder="0" title="Otherwise"></iframe><a href="https://otherwise.dfos.com" target="_blank">Visit Otherwise</a></div></div>
</nav>

<script src="/shared.js"></script>
<script src="/atmosphere.js"></script>
<script src="/nav.js"></script>
{lightbox}
</body>
</html>
'''


def esc(text):
    return html.escape(text, quote=True)


def curly(text):
    """Typographer's quotes for the straight ones typed into the CSV."""
    text = re.sub(r'(^|[\s(\[])"', '\\1\u201c', text)
    text = re.sub(r'(^|[\s(\[])\'', '\\1\u2018', text)
    return text.replace('"', '\u201d').replace("'", '\u2019')


def rich(text):
    """Escape a citation, turning *asterisks* into italics."""
    return re.sub(r'\*([^*]+)\*', r'<em>\1</em>', esc(curly(text)))


def plain(text):
    """Text for places that can't show italics: tab titles, link previews, alt text."""
    return curly(text).replace('*', '')


def holder(url):
    host = urlparse(url).netloc
    return HOLDERS.get(host, host.removeprefix('www.'))


def has(row, col):
    return bool(row[col]) and (ROOT / row[col]).is_file()


def figure(row):
    """The card's front and citation; the front opens the whole image."""
    alt = esc(plain(row['title']))
    if has(row, 'image'):
        img = f'<img src="/{esc(row["image"])}" alt="{alt}">'
        if has(row, 'image_full'):
            # A plain link to the full image, which the script below opens
            # in the lightbox instead.
            img = (f'<a class="postcard-zoom" href="/{esc(row["image_full"])}" '
                   f'title="See the whole image">{img}</a>')
    else:
        img = '<div class="image-placeholder">The image for this card is on its way.</div>'
    caption = f'\n      <p class="image-caption">{rich(row["citation"])}</p>' if row['citation'] else ''
    return f'''  <div class="image-frame-outer postcard-figure">
    <div class="image-frame">
      <div class="image-inner">{img}</div>{caption}
    </div>
  </div>'''


def links(row):
    """Onward links: the Lectio Terra entry, the original, its backup."""
    items = []
    if row['post']:
        items.append(f'<a class="postcard-link-main" href="{esc(row["post"])}">Read the Lectio Terra entry</a>')
    if row['destination']:
        cls = 'postcard-link' if row['post'] else 'postcard-link-main'
        items.append(f'<a class="{cls}" href="{esc(row["destination"])}" target="_blank">'
                     f'See the original at {esc(holder(row["destination"]))}</a>')
    if row['backup']:
        items.append(f'<a class="postcard-link" href="{esc(row["backup"])}" target="_blank">'
                     f'or at {esc(holder(row["backup"]))}</a>')
    if row.get('context'):
        label = row.get('context_label') or 'Read more about this image'
        items.append(f'<a class="postcard-link postcard-context" href="{esc(row["context"])}" '
                     f'target="_blank">{rich(label)}</a>')
    if not items:
        return ''
    inner = '\n    '.join(items)
    return f'  <div class="postcard-links">\n    {inner}\n  </div>'


# The hours' lightbox (css/styles.css), for the whole image. Without
# JavaScript the card's link simply opens the image file.
LIGHTBOX = '''
<div class="lightbox" id="lightbox" role="dialog" aria-label="The whole image" aria-modal="true" tabindex="-1">
  <img id="lightbox-img" src="" alt="">
  <p class="lightbox-caption" id="lightbox-caption"></p>
</div>
<script>
(() => {
  const zoom = document.querySelector('.postcard-zoom');
  const box = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  zoom.addEventListener('click', (e) => {
    e.preventDefault();
    img.src = zoom.href;
    img.alt = zoom.querySelector('img').alt;
    document.getElementById('lightbox-caption').innerHTML =
      document.querySelector('.postcard-figure .image-caption')?.innerHTML || '';
    box.style.display = 'flex';
    box.focus();
    requestAnimationFrame(() => box.classList.add('open'));
  });
  const close = () => {
    if (!box.classList.contains('open')) return;
    box.classList.remove('open');
    setTimeout(() => { box.style.display = 'none'; }, 300);
    zoom.focus();
  };
  box.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();
</script>
'''


def intro(row):
    note = ('The image on this card is in the public domain. Follow the link below '
            'to see it in its first setting, the book, print or plate it comes from, '
            'in the digital collection that keeps it.')
    return f'''  <article class="content-block postcard-note">
    <p>{note}</p>
  </article>'''


def turn(row, rows):
    """The hours' "turn the page", here leading to the series' next card."""
    series = row['path'].split('/')[0]
    cards = [r['path'] for r in rows if r['path'].split('/')[0] == series]
    if len(cards) < 2:
        return ''
    nxt = cards[(cards.index(row['path']) + 1) % len(cards)]
    return f'''
  <div class="turn-the-page visible postcard-turn">
    <span class="ttp-bracket">[</span>
    <a class="page-action" href="/c/{esc(nxt)}/" aria-label="The next card in this set">turn the page</a>
    <span class="ttp-bracket">]</span>
  </div>
'''


def build(row, rows=()):
    path = row['path']
    series = SERIES.get(path.split('/')[0], 'A postcard from the Earthly Book of Hours')
    dateline = DATELINES.get(path.split('/')[0], '')
    if dateline:
        dateline = f'  <p class="postcard-dateline">{esc(dateline)}</p>\n'
    url = f'{SITE}/c/{path}/'
    ready = bool(row['title'])
    title_text = plain(row['title']) if ready else 'A Card in Preparation'
    title = rich(row['title']) if ready else esc(title_text)
    if ready:
        # The note points readers to the original, so it waits for one.
        note = intro(row) if row['destination'] else ''
        body = '\n\n'.join(part for part in (figure(row), note, links(row)) if part)
        description = f'{title_text}: {plain(row["citation"])}' if row['citation'] else title_text
    else:
        body = '''  <article class="content-block postcard-note">
    <p>This card is still being prepared. Its image, citation and links will appear here soon.</p>
    <p><a href="/index.html">Return to the current hour</a></p>
  </article>'''
        description = 'A postcard from the Earthly Book of Hours.'
    robots = '' if ready and row['status'] != 'draft' else '  <meta name="robots" content="noindex">\n'
    og_image = ''
    if ready and has(row, 'image'):
        og_image = f'  <meta property="og:image" content="{SITE}/{esc(row["image"])}">\n'
    corners = '\n'.join(CORNER.format(pos=p) for p in ('tl', 'tr', 'bl', 'br'))
    return PAGE.format(
        title=title, title_text=esc(title_text), series=esc(series),
        description=esc(description), url=esc(url), robots=robots,
        og_image=og_image, corners=corners, body=body, dateline=dateline,
        turn=turn(row, rows),
        lightbox=LIGHTBOX if ready and has(row, 'image') and has(row, 'image_full') else '')


def main():
    with DATA.open(encoding='utf-8', newline='') as f:
        rows = [{k: (v or '').strip() for k, v in r.items()} for r in csv.DictReader(f)]
    for row in rows:
        for col in ('context', 'context_label'):
            row.setdefault(col, '')

    errors, warnings, seen = [], [], set()
    for row in rows:
        p = row['path']
        if not PATH.match(p):
            errors.append(f'{p!r}: path should look like w26/1')
        if p in seen:
            errors.append(f'{p}: listed twice')
        seen.add(p)
        for col in ('destination', 'backup', 'post', 'context'):
            if row[col] and urlparse(row[col]).scheme not in ('http', 'https'):
                errors.append(f'{p}: {col} is not a web address')
        for col in ('image', 'image_full'):
            if row[col] and not (ROOT / row[col]).is_file():
                warnings.append(f'{p}: {col} not found yet at {row[col]}')
        if row['image_full'] and not row['image']:
            warnings.append(f'{p}: has image_full but no image; nothing to click')
        if row['title'] and not row['destination']:
            warnings.append(f'{p}: has a title but no destination')
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        sys.exit(1)

    for row in rows:
        page = OUT / row['path'] / 'index.html'
        page.parent.mkdir(parents=True, exist_ok=True)
        page.write_text(build(row, rows), encoding='utf-8')
        print(f'wrote {page.relative_to(ROOT)}')
    for w in warnings:
        print(f'note: {w}')


if __name__ == '__main__':
    main()
