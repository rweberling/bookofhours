#!/usr/bin/env python3
"""Write a page of its own for each Lectio Terra post: lectio-terra/<name>/,
and the series' contents page, lectio-terra/ itself.

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

The sitemap and llms.txt list each post at its page, and seasons.html
names the page as canonical when it shows that post, so search engines
treat the page as the post's one address.

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
from copy_lectio import EMPTY_EDGE, SUBSTACK_LINE  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://earthlyhours.com'
TEMPLATE = ROOT / 'seasons.html'
CONTENTS_TEMPLATE = ROOT / 'seasons-incipit.html'   # the contents page, lectio-terra/
LECTIO = ROOT / 'data' / 'lectio-data.json'
AUTHOR = 'Ryan Weberling'

# The same web copies setWebImage() in shared.js points at.
WEB_WIDTHS = (800, 1600, 2400)


def web_version(src, width):
    return re.sub(r'\.[^./]+$', f'-{width}.webp', src.replace('images/', 'images/web/', 1))


def slug(name):
    name = re.sub(r"['’]", '', unescape(name).lower())   # Lady's -> ladys
    return re.sub(r'[^a-z0-9]+', '-', name).strip('-')


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


# A link from one post to another, as import_substack.py writes it.
POST_LINK = re.compile(r'seasons\.html\?season=\w+&(?:amp;)?entry=([^"&#\s]+)')


def body_html(entry, page, post_pages, alts):
    """The post as imported, without Substack's subscribe line, its images
    pointed at their web copies and given their descriptions (alts, by
    file), and its links to other posts at their pages."""
    html = EMPTY_EDGE.sub('', SUBSTACK_LINE.sub('', entry.get('bodyHtml', '')).strip())

    def described(m):
        tag = m.group(0)
        src = re.search(r'\ssrc="([^"]+)"', tag)
        if not src or src.group(1) not in alts:
            return tag
        alt = escape(alts[src.group(1)])
        return re.sub(r'\salt="[^"]*"', f' alt="{alt}"', tag) if ' alt="' in tag else tag[:-1] + f' alt="{alt}">'
    html = re.sub(r'<img\b[^>]*>', described, html)
    html = re.sub(r'<video\b([^>]*)>(\s*<source src="([^"]+)")',
                  lambda m: (f'<video{m.group(1)} aria-label="{escape(alts[m.group(3)])}">{m.group(2)}'
                             if m.group(3) in alts else m.group(0)), html)
    html = POST_LINK.sub(lambda m: post_pages.get(m.group(1), m.group(0)), html)

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
                     'url': f'{SITE}/lectio-terra/'},
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
    # The trail Google shows above the result: the site, the series, the post.
    trail = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': n, 'name': name, 'item': link}
            for n, (name, link) in enumerate([
                ('The Earthly Book of Hours', f'{SITE}/'),
                ('Lectio Terra', f'{SITE}/lectio-terra/'),
                (subject_name(entry, subject), url),
            ], start=1)
        ],
    }
    return ''.join(
        '<script type="application/ld+json">\n'
        + json.dumps(block, ensure_ascii=False, indent=2).replace('</', '<\\/')
        + '\n</script>\n'
        for block in (data, trail))


def citation_tags(entry, title):
    """For Zotero and other reference managers. DC.type makes Zotero save a
    blog post; citation_ tags alone make it a journal article."""
    tags = [('citation_title', title), ('citation_author', 'Weberling, Ryan')]
    if entry.get('published'):
        tags.append(('citation_publication_date', entry['published'].replace('-', '/')))
    tags.append(('DC.type', 'blogPost'))
    return ''.join(f'<meta name="{name}" content="{escape(value)}">\n' for name, value in tags)


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


def render(template, season, entry, subject, alone, post_pages, alts):
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
    t = replace_once(t, r'<!-- No fixed canonical link here:[^\n]*\n', f'<link rel="canonical" href="{url}">\n')
    t = replace_once(t, r'<title>[^<]*</title>', f'<title>{escape(title)} — The Earthly Book of Hours</title>')
    t = replace_once(t, r'</head>', citation_tags(entry, title) + json_ld(entry, subject, url, image) + '</head>')

    t = replace_once(t, r'<body class="season-reading-page">',
                     f'<body class="season-reading-page" data-season="{season}" data-entry="{entry["id"]}">')
    t = replace_once(t, r'\s*<!-- For readers and crawlers without JavaScript[^\n]*\n\s*<noscript>.*?</noscript>', '', re.S)
    t = replace_once(t, r'(?<=aria-describedby="season-reading-subtitle-hint">)(?=</button>)', season.capitalize())
    t = replace_once(t, r'(?<=<h1 class="block-name" id="season-reading-title">)[^<]*', escape(name))
    if subject and subject.get('scientific'):
        t = replace_once(t, r'(?<=<em id="season-reading-latin">)', escape(subject['scientific']))
    t = replace_once(t, r'(?<=<p class="season-post-dek" id="season-reading-dek">)', escape(credits))
    t = replace_once(t, r'<div id="season-reading-body"></div>',
                     f'<div id="season-reading-body">\n{body_html(entry, page, post_pages, alts)}\n</div>')
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


def contents(data, by_subject):
    """lectio-terra/ itself: every post with a page, by season, in the
    Seasons Incipit's page (its frame, menu and type)."""
    url = f'{SITE}/lectio-terra/'
    description = 'Lectio Terra: every weekly species study, by season, with its readers and date.'
    sections = []
    for season, items in data['seasons'].items():
        rows = []
        for entry in sorted(items, key=lambda e: e.get('published') or ''):
            if not entry.get('page'):
                continue
            subject = by_subject.get(entry.get('subject'))
            latin = f' <em class="contents-latin">{escape(subject["scientific"])}</em>' if subject and subject.get('scientific') else ''
            details = [escape(', '.join(entry.get('readings') or []))]
            if entry.get('published'):
                details.append(long_date(entry['published']))
            rows.append(f'      <li><a href="{entry["page"]}">{escape(subject_name(entry, subject))}</a>{latin}'
                        f'<span class="contents-details">{" · ".join(d for d in details if d)}</span></li>')
        if rows:
            sections.append(f'    <h2 class="content-subhead">{season.capitalize()}</h2>\n'
                            f'    <ul class="contents-list">\n' + '\n'.join(rows) + '\n    </ul>')

    t = CONTENTS_TEMPLATE.read_text(encoding='utf-8')
    t = replace_once(t, r'<head>\n', '<head>\n<!-- Built by scripts/build_lectio_pages.py from data/lectio-data.json and seasons-incipit.html; edit those, not this. -->\n<base href="/">\n')
    t = replace_once(t, r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{description}">')
    t = replace_once(t, r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="Lectio Terra: Contents — The Earthly Book of Hours">')
    t = replace_once(t, r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{description}">')
    t = replace_once(t, r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{url}">')
    t = replace_once(t, r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">')
    t = replace_once(t, r'<title>[^<]*</title>', '<title>Lectio Terra: Contents — The Earthly Book of Hours</title>')
    t = replace_once(t, r'<p class="page-kicker">[^<]*</p>', '<p class="page-kicker">The Seasons</p>')
    t = replace_once(t, r'<h1 class="page-title">[^<]*</h1>', '<h1 class="page-title">Lectio Terra</h1>')
    t = replace_once(t, r'<p class="page-subtitle">[^<]*</p>', '<p class="page-subtitle">Contents</p>')
    t = replace_once(t, r'<article class="content-block">.*?</article>',
                     '<article class="content-block lectio-contents">\n' + '\n\n'.join(sections) + '\n  </article>', re.S)
    t = replace_once(t, r'<div class="turn-the-page visible incipit-onward">.*?</div>',
                     '<div class="turn-the-page visible incipit-onward"><span class="ttp-bracket">[</span>'
                     '<a class="page-action" href="seasons-incipit.html">the incipit</a>'
                     '<span class="ttp-sep" aria-hidden="true">|</span>'
                     '<a class="page-action" href="seasons.html">the current season</a>'
                     '<span class="ttp-bracket">]</span></div>', re.S)
    # The menu's Incipit item is the Incipit's own; nothing in it is this page.
    t = replace_once(t, r'<a class="active" href="seasons-incipit.html">', '<a href="seasons-incipit.html">')
    return t


def pages():
    """{path: html} for every post with a page, and the contents page."""
    data = load('lectio-data')
    template = TEMPLATE.read_text(encoding='utf-8')
    by_subject = subjects()
    alts = {image['file']: image['alt'] for image in load('images') if image.get('alt')}
    # Each post's page by its ID and old IDs, for links between posts.
    post_pages = {key: entry['page'] for _, entry in posts(data) if entry.get('page')
                  for key in [entry['id'], *(entry.get('aliases') or [])]}
    built = {ROOT / entry['page'] / 'index.html':
             render(template, season, entry, by_subject.get(entry.get('subject')),
                    len(data['seasons'][season]) < 2, post_pages, alts)
             for season, entry in posts(data) if entry.get('page')}
    if built:
        built[ROOT / 'lectio-terra' / 'index.html'] = contents(data, by_subject)
    return built


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
