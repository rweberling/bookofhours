#!/usr/bin/env python3
"""Write a page of its own for each Lectio Terra post: lectio-terra/<name>/.

Usage:
  python3 scripts/build_lectio_pages.py            rebuild every post that has a page
  python3 scripts/build_lectio_pages.py lt-0003    give these posts a page (and rebuild all)
  python3 scripts/build_lectio_pages.py --all      give every post a page

The Seasons page fills in its post with JavaScript, so search engines
and AI tools that don't run it see an empty page. A post page is the
Seasons page with one post already written into it: the same template
(seasons.html, read fresh each time), the same scripts, and for readers
with JavaScript the same page, margin labels, Wander pane and all. For
everyone else, the post's full text is there in the HTML.

A post's address is kept on its record in data/lectio-data.json, as
"page": "lectio-terra/sugar-maple/", from its subject's name. Like an ID, it
is fixed once published: if the name changes later, the address
doesn't. seasons.js reads it, so turning the page from a post page goes
to the next post's own page.

Each page carries <base href="/">, so the template's links, and the
scripts' fetches of data/, work from lectio-terra/<name>/ as they do from the
root. Links within the post (#footnote-1) are written out in full, since
the base would otherwise send them to the home page.

While TRIAL is True every post page is noindex, so the sitemap leaves
them out; set it False once the pages are approved.

scripts/check_data.py says when a page no longer matches its post or
the template. Run this after editing a post, seasons.html or partials/
(after build_shared.py).
"""

import json
import re
import sys
from html import escape, unescape
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from datafile import load  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://earthlyhours.com'
TEMPLATE = ROOT / 'seasons.html'
LECTIO = ROOT / 'data' / 'lectio-data.json'
AUTHOR = 'Ryan Weberling'
TRIAL = True

# The same web copies setWebImage() in shared.js points at.
WEB_WIDTHS = (800, 1600, 2400)


def web_version(src, width):
    return re.sub(r'\.[^./]+$', f'-{width}.webp', src.replace('images/', 'images/web/', 1))


def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', unescape(name).lower()).strip('-')


def subjects():
    return {r['id']: r for r in load('species') + load('phenomena')}


def plain(html):
    return re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]+>', '', html))).strip()


def summary(entry, limit=155):
    """The headnote's opening, for the page's description."""
    first = re.search(r'<p>(.*?)</p>', entry.get('bodyHtml', ''), re.S)
    text = plain(first.group(1)) if first else entry['title']
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(' ', 1)[0].rstrip(',;:—') + '…'


def long_date(iso):
    y, m, d = map(int, iso.split('-'))
    months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
              'August', 'September', 'October', 'November', 'December']
    return f'{months[m - 1]} {d}, {y}'


def body_html(entry, page):
    """The post as imported, with its images pointed at their web copies."""
    html = entry.get('bodyHtml', '')

    def image(m):
        attrs, src = m.group(1), m.group(2)
        srcset = ', '.join(f'{web_version(src, w)} {w}w' for w in WEB_WIDTHS)
        return (f'<img{attrs} src="{web_version(src, 1600)}" srcset="{srcset}" '
                f'sizes="(max-width: 680px) 92vw, 640px" data-master="{src}"')
    html = re.sub(r'<img\b([^>]*?)\ssrc="(images/[^"]+)"', image, html)
    html = re.sub(r'<img\b(?![^>]*\bloading=)', '<img loading="lazy"', html)
    return html.replace('href="#', f'href="{page}#')


def json_ld(entry, subject, url, image):
    data = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        'headline': f'Lectio Terra: {subject_name(entry, subject)}',
        'name': entry['title'],
        'url': url,
        'author': {'@type': 'Person', 'name': AUTHOR},
        'isPartOf': {'@type': 'CreativeWorkSeries', 'name': 'Lectio Terra',
                     'url': f'{SITE}/seasons-incipit.html'},
        'publisher': {'@type': 'Organization', 'name': 'The Earthly Book of Hours', 'url': f'{SITE}/'},
    }
    if entry.get('published'):
        data['datePublished'] = entry['published']
    if image:
        data['image'] = image
    if subject:
        about = {'@type': 'Thing', 'name': subject['name']}
        if subject.get('scientific'):
            about['alternateName'] = subject['scientific']
        if subject.get('wikidata'):
            about['sameAs'] = f'https://www.wikidata.org/wiki/{subject["wikidata"]}'
        data['about'] = about
    text = json.dumps(data, ensure_ascii=False, indent=2).replace('</', '<\\/')
    return f'<script type="application/ld+json">\n{text}\n</script>\n'


def subject_name(entry, subject):
    if subject:
        return subject['name']
    # As parsePostTitle() in shared.js: "Week 12: Sugar Maple, …" -> "Sugar Maple".
    return re.split(r'[,(]', entry['title'].split(':', 1)[-1])[0].strip()


def replace_once(text, pattern, new, flags=0):
    result, n = re.subn(pattern, lambda _: new, text, count=1, flags=flags)
    if n != 1:
        raise ValueError(f'seasons.html has changed: no match for {pattern!r}')
    return result


def post_entry(entry):
    """The details seasons.js still needs on a post page, as JSON."""
    data = {'id': entry['id'], 'readingLabels': entry.get('readingLabels') or []}
    text = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
    return f'<script type="application/json" id="post-entry">{text}</script>\n'


def render(template, season, entry, subject, alone):
    page = entry['page']
    url = f'{SITE}/{page}'
    name = subject_name(entry, subject)
    title = f'Lectio Terra: {name}'
    description = escape(summary(entry))
    credits = ', '.join(entry.get('readings') or [])
    first = (entry.get('images') or [{}])[0].get('src', '')
    image = f'{SITE}/{web_version(first, 1600)}' if first.startswith('images/') else ''

    t = template
    t = replace_once(t, r'<head>\n', '<head>\n<!-- Built by scripts/build_lectio_pages.py from data/lectio-data.json and seasons.html; edit those, not this. -->\n<base href="/">\n')
    t = replace_once(t, r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{description}">')
    t = replace_once(t, r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{escape(title)}">')
    t = replace_once(t, r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{description}">')
    t = replace_once(t, r'<meta property="og:type" content="[^"]*">', '<meta property="og:type" content="article">')
    if image:
        t = replace_once(t, r'<meta property="og:image" content="[^"]*">\n(<meta property="og:image:[^\n]*\n)*',
                         f'<meta property="og:image" content="{image}">\n')
    t = replace_once(t, r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{url}">')
    robots = '<meta name="robots" content="noindex">\n' if TRIAL else ''
    t = replace_once(t, r'<!-- No fixed canonical link here:[^\n]*\n', f'{robots}<link rel="canonical" href="{url}">\n')
    t = replace_once(t, r'<title>[^<]*</title>', f'<title>{escape(title)} — The Earthly Book of Hours</title>')
    t = replace_once(t, r'</head>', json_ld(entry, subject, url, image) + '</head>')

    t = replace_once(t, r'<body class="season-reading-page">',
                     f'<body class="season-reading-page" data-season="{season}" data-entry="{entry["id"]}">')
    t = replace_once(t, r'\s*<!-- For readers and crawlers without JavaScript[^\n]*\n\s*<noscript>.*?</noscript>', '', re.S)
    t = replace_once(t, r'(?<=aria-describedby="season-reading-subtitle-hint">)(?=</button>)', season.capitalize())
    t = replace_once(t, r'(?<=<h1 class="block-name" id="season-reading-title">)[^<]*', escape(name))
    if subject and subject.get('scientific'):
        t = replace_once(t, r'(?<=<em id="season-reading-latin">)', escape(subject['scientific']))
    t = replace_once(t, r'(?<=<p class="season-post-dek" id="season-reading-dek">)', escape(credits))
    t = replace_once(t, r'<div id="season-reading-body"></div>',
                     f'<div id="season-reading-body">\n{body_html(entry, page)}\n</div>')
    if alone:
        # The season's only post: nothing to turn to (as setSeason() in seasons.js).
        t = replace_once(t, r'<div class="turn-the-page visible season-turn">', '<div class="turn-the-page visible season-turn" hidden>')
    t = replace_once(t, r'(?=<script type="module" src="dfos-siwd.js">)', post_entry(entry))
    if entry.get('published'):
        t = replace_once(t, r'(?<=<p class="phenomena-list" id="season-reading-observation">)',
                         f'Published {long_date(entry["published"])}')
    return t


def posts(data):
    for season, items in data['seasons'].items():
        for entry in items:
            yield season, entry


def assign_pages(data, wanted, everything):
    """Give the posts asked for an address, keeping any they already have."""
    by_subject = subjects()
    taken = {e['page'] for _, e in posts(data) if e.get('page')}
    added = 0
    for _, entry in posts(data):
        if entry.get('page') or not (everything or entry['id'] in wanted):
            continue
        base = slug(subject_name(entry, by_subject.get(entry.get('subject'))))
        page, n = f'lectio-terra/{base}/', 2
        while page in taken:
            page, n = f'lectio-terra/{base}-{n}/', n + 1
        entry['page'] = page
        taken.add(page)
        added += 1
    return added


def pages():
    """{path: html} for every post with a page."""
    data = load('lectio-data')
    template = TEMPLATE.read_text(encoding='utf-8')
    by_subject = subjects()
    return {ROOT / entry['page'] / 'index.html':
            render(template, season, entry, by_subject.get(entry.get('subject')), len(data['seasons'][season]) < 2)
            for season, entry in posts(data) if entry.get('page')}


def stale_pages():
    """Post pages that no longer match their post or the template."""
    return [path.relative_to(ROOT).as_posix() for path, html in pages().items()
            if not path.exists() or path.read_text(encoding='utf-8') != html]


def main(args):
    everything = '--all' in args
    wanted = {a for a in args if not a.startswith('--')}
    data = load('lectio-data')
    known = {e['id'] for _, e in posts(data)}
    unknown = wanted - known
    if unknown:
        print(f'No such post: {", ".join(sorted(unknown))}', file=sys.stderr)
        return 1
    if assign_pages(data, wanted, everything):
        # Written as import_substack.py writes it.
        LECTIO.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for path, html in pages().items():
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists() or path.read_text(encoding='utf-8') != html:
            path.write_text(html, encoding='utf-8')
            print(f'wrote {path.relative_to(ROOT).as_posix()}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
