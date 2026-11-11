#!/usr/bin/env python3
"""Write a page for every record in the collection, at its permanent address.

Usage:
  python3 scripts/build_records.py

Each reading, image, edition, species and phenomenon gets a page at
earthlyhours.com/id/<id>/ (id/r-0104/, id/e-0103/, id/sp-0001/), and the
same record as data beside it, id/<id>.json. id/ itself lists them all.
These are the collection's catalogue: what each record says, where it
appears on the site, what it links to (the original, Wikidata, GBIF),
its rights and how to cite it. They are written for researchers, search
engines and other collections to point to; readers reach them from the
Sources page and the like, not from the Hours.

What a page shows of the work itself depends on its rights: a reading or
image in the public domain (or openly licensed) is shown whole; one still
in copyright, or not yet assessed, only by its first line or a small
thumbnail, with a link to where the site shows it. The JSON copy leaves
out the text of a reading in copyright, as the published dataset does
(data/README.md, Rights).

An ID that was replaced (a record's `aliases`) gets a small page that
forwards to the record, so old links keep working.

While INDEXED is False the pages are kept out of search engines (noindex)
and so out of the sitemap. Writing (w-) and the posts (lt-, which have
their own pages under lectio-terra/) have no record pages; people have
no IDs of their own here and are linked to Wikidata.

Every page is rewritten when it changes; pages for records that are gone
or have become drafts are removed.
"""

import json
import re
import sys
from html import escape, unescape
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from datafile import load  # noqa: E402
from build_shared import render as render_shared  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'id'
SITE = 'https://earthlyhours.com'
DOI = 'https://doi.org/10.5281/zenodo.23603918'
INDEXED = False

PD = ('http://rightsstatements.org/vocab/NoC-US/1.0/', 'https://creativecommons.org/publicdomain/')
OPEN = PD + ('https://creativecommons.org/licenses/by/', 'https://creativecommons.org/licenses/by-sa/')

RIGHTS_WORDS = {
    'http://rightsstatements.org/vocab/NoC-US/1.0/': 'In the public domain in the United States',
    'http://rightsstatements.org/vocab/InC/1.0/': 'In copyright',
    'http://rightsstatements.org/vocab/InC-NC/1.0/': 'In copyright; non-commercial use permitted',
    'http://rightsstatements.org/vocab/InC-EDU/1.0/': 'In copyright; educational use permitted',
    'http://rightsstatements.org/vocab/UND/1.0/': 'Copyright undetermined',
    'http://rightsstatements.org/vocab/CNE/1.0/': 'Copyright not evaluated',
    'https://creativecommons.org/publicdomain/zero/1.0/': 'Dedicated to the public domain (CC0)',
}

IDENTIFIER_LINKS = {
    'doi': ('DOI', 'https://doi.org/{}'),
    'hathitrust': ('HathiTrust', 'https://catalog.hathitrust.org/Record/{}'),
    'oclc': ('WorldCat', 'https://search.worldcat.org/title/{}'),
    'lccn': ('Library of Congress', 'https://lccn.loc.gov/{}'),
    'openlibrary': ('Open Library', 'https://openlibrary.org/books/{}'),
    'isbn': ('ISBN', 'https://openlibrary.org/isbn/{}'),
    'internetArchive': ('Internet Archive', 'https://archive.org/details/{}'),
    'wikidata': ('Wikidata', 'https://www.wikidata.org/wiki/{}'),
}

MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
          'September', 'October', 'November', 'December']

KIND = {'r': 'Reading', 'i': 'Image', 'e': 'Edition', 'sp': 'Species', 'ph': 'Phenomenon'}

PAGE = '''<!DOCTYPE html>
<html lang="en" class="record-page">
<head>
{head}
  <!-- Built by scripts/build_records.py from data/; edit those, not this. -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title_text} — The Earthly Book of Hours</title>
  <meta name="description" content="{description}">
{robots}  <link rel="canonical" href="{url}">
  <link rel="alternate" type="application/json" href="{json_url}">
  <link rel="stylesheet" href="/css/styles.css">
{json_ld}</head>
<body>

{frame}

<main class="page">
  <p class="record-back"><a href="/" id="record-back">← The Hours</a></p>
  <p class="publication-name"><a href="/id/">The Earthly Book of Hours · Records</a></p>

  <div class="rule-ornament" aria-hidden="true">
    <div class="line"></div>
    <div class="lozenge">✦</div>
    <div class="diamond"></div>
    <div class="lozenge">✦</div>
    <div class="line"></div>
  </div>

  <h1 class="page-title">{title}</h1>
  <p class="page-subtitle">{kind} · {rid}</p>

{body}

  <footer class="page-footer">
    <div class="rule-ornament" style="max-width:260px; margin-bottom:0;" aria-hidden="true">
      <div class="line"></div>
      <div class="diamond"></div>
      <div class="line"></div>
    </div>
    <p class="colophon">A project of <a href="https://otherwise.dfos.com" target="_blank">Otherwise</a></p>
  </footer>
</main>

{nav}

<script src="/shared.js"></script>
<script src="/atmosphere.js"></script>
<script src="/nav.js"></script>
<script>
// The line at the top: back to the page the visitor came from on this
// site (the Hours, the Weather, the Seasons, an essay, Sources, another
// record), as the
// browser's own Back would; from anywhere else, the Hours.
(() => {{
  const back = document.getElementById('record-back');
  let from = null;
  try {{ from = document.referrer && new URL(document.referrer); }} catch (e) {{}}
  if (!back || !from || from.origin !== location.origin || from.pathname === location.pathname) return;
  const p = from.pathname;
  const name = p === '/' || p === '/index.html' ? 'The Hours'
    : p === '/weather.html' ? 'The Weather'
    : p === '/seasons.html' ? 'The Seasons'
    : p === '/lectio-terra/' ? 'Lectio Terra'
    : p.startsWith('/lectio-terra/') ? 'the essay'
    : p === '/sources.html' ? 'Sources'
    : p === '/id/' ? 'The Records'
    : p.startsWith('/id/') ? 'the previous record' : '';
  back.textContent = name ? '← Back to ' + name : '← Back';
  back.href = from.pathname + from.search;
  back.addEventListener('click', e => {{
    if (history.length > 1) {{ e.preventDefault(); history.back(); }}
  }});
}})();
</script>
</body>
</html>
'''

FORWARD = '''<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Built by scripts/build_records.py: an old ID, forwarding to its record. -->
  <meta charset="UTF-8">
  <title>{rid} — The Earthly Book of Hours</title>
  <meta name="robots" content="noindex">
  <link rel="canonical" href="{url}">
  <meta http-equiv="refresh" content="0; url=/id/{rid}/">
</head>
<body>
  <p>This record is now <a href="/id/{rid}/">{rid}</a>.</p>
</body>
</html>
'''


def recs(name):
    data = load(name)
    return data if isinstance(data, list) else next(v for v in data.values() if isinstance(v, list))


def plain(text):
    return re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]+>', ' ', text or ''))).strip()


def tag_id(t):
    return t if isinstance(t, str) else (t.get('id') or t.get('term'))


def prefix(rid):
    return rid.split('-', 1)[0]


def link(rid, label=None):
    return f'<a href="/id/{rid}/">{label or rid}</a>'


def ext(url, label):
    return f'<a href="{escape(url)}" target="_blank">{label}</a>'


def is_open(rights):
    return bool(rights) and rights.startswith(OPEN)


def rights_words(uri):
    if uri in RIGHTS_WORDS:
        return RIGHTS_WORDS[uri]
    m = re.match(r'https://creativecommons.org/licenses/([a-z-]+)/([\d.]+)', uri or '')
    return f'Licensed CC {m.group(1).upper()} {m.group(2)}' if m else 'Not yet assessed'


def first_line(text, verse):
    """A reading's opening: its first line of verse, or its first sentence."""
    if verse:
        line = re.split(r'<br\s*/?>', text, maxsplit=1)[0]
        return re.sub(r'^(&nbsp;)+', '', line).strip() + ' …'
    words = plain(text)
    m = re.match(r'(.{20,220}?[.!?;:])(\s|$)', words)
    cut = m.group(1) if m else words[:200].rsplit(' ', 1)[0]
    return escape(cut) + ' …'


class Collection:
    def __init__(self):
        self.readings = [r for r in recs('readings') if not r.get('draft')]
        self.images = [r for r in recs('images') if not r.get('draft')]
        self.species = recs('species')
        # The days, by the pieces they show: {piece id: day record}.
        self.day_of = {}
        for d in load('days'):
            if not d.get('draft'):
                for field in ('reading', 'image'):
                    self.day_of[d.get(field)] = d
        self.phenomena = recs('phenomena')
        vocab = load('vocab')
        self.labels = {kind: {v['id']: v['label'] for v in vocab[kind]} for kind in ('hours', 'weather', 'seasons')}
        self.posts = {}
        lectio = load('lectio-data')
        for items in lectio['seasons'].values():
            for entry in items:
                self.posts[entry['id']] = entry
        files = load('image-files')['files']
        self.copies = {path: info.get('copies', []) for path, info in files.items()}
        # Editions, from every copy (check_data.py keeps the copies the same).
        self.editions, self.cited_by = {}, {}
        for r in self.readings:
            ed = (r.get('citation') or {}).get('edition')
            if ed and ed.get('id'):
                self.editions.setdefault(ed['id'], ed)
                self.cited_by.setdefault(ed['id'], []).append(r['id'])
        for r in self.images:
            ed = r.get('edition')
            if ed and ed.get('id'):
                self.editions.setdefault(ed['id'], ed)
                self.cited_by.setdefault(ed['id'], []).append(r['id'])
        self.subjects = {s['id']: s for s in self.species + self.phenomena}
        self.about = {}
        for r in self.readings + self.images:
            tags = r.get('tags') or {}
            for t in (tags.get('species') or []) + (tags.get('phenomena') or []):
                self.about.setdefault(tag_id(t), []).append(r['id'])
        self.by_id = {r['id']: r for r in self.readings + self.images}

    # How a record is named in lists.
    def name(self, rid):
        if rid in self.by_id:
            r = self.by_id[rid]
            if prefix(rid) == 'r':
                c = r.get('citation') or {}
                who = ', '.join(p['name'] for p in (c.get('edition') or {}).get('contributors', [])
                                if p.get('role') == 'author')
                title = c.get('title') or (c.get('edition') or {}).get('title') or rid
                return f'{escape(who)}, “{escape(title)}”' if who else f'“{escape(title)}”'
            title = r.get('title')
            if not title:
                cap = plain(r.get('caption'))
                title = cap if len(cap) <= 90 else cap[:90].rsplit(' ', 1)[0].rstrip(',;:') + ' …'
            who = (r.get('creator') or {}).get('name')
            return f'{escape(who)}, {escape(title)}' if who else escape(title)
        if rid in self.editions:
            return f'<em>{escape(self.editions[rid].get("title") or rid)}</em>'
        if rid in self.subjects:
            return escape(self.subjects[rid]['name'])
        return rid


def section(title, inner):
    if not inner:
        return ''
    return f'''  <section class="content-block record-section">
    <h2 class="content-subhead">{title}</h2>
{inner}
  </section>'''


def dl(rows):
    rows = [(k, v) for k, v in rows if v]
    if not rows:
        return ''
    inner = '\n'.join(f'      <dt>{k}</dt><dd>{v}</dd>' for k, v in rows)
    return f'    <dl class="record-fields">\n{inner}\n    </dl>'


def people_line(people):
    out = []
    for p in people or []:
        name = escape(p['name'])
        if p.get('wikidata'):
            name = ext(f'https://www.wikidata.org/wiki/{p["wikidata"]}', name)
        role = p.get('role')
        out.append(f'{name} ({escape(role)})' if role and role != 'author' else name)
    return '; '.join(out)


def locator_rows(loc):
    out = []
    for item in (loc if isinstance(loc, list) else [loc] if loc else []):
        page = escape(item.get('page') or '')
        if item.get('url'):
            label = escape(item.get('label') or 'the source')
            out.append(ext(item['url'], f'{"p. " + page + ", " if page and page[0].isdigit() else page + ", " if page else ""}{label}'))
        elif page:
            out.append(f'{page} (in print)')
    return '<br>'.join(out)


# The editor's own person record: a picture he made was drawn from no
# outside source, and its record says so.
EDITOR = 'a-ryan-weberling'


def drawn_from(r):
    """Where the image shown was drawn from: its place in the source (the
    locator), else its cited link; then the exact file, where recorded,
    with the day it was downloaded. The editor's own pictures say so."""
    if (r.get('creator') or {}).get('id') == EDITOR and not (r.get('locator') or r.get('links')):
        return "The editor's own photograph" if 'photograph' in (r.get('bibliography') or '').lower() else "The editor's own work"
    rows = locator_rows(r.get('locator'))
    if not rows:
        rows = '<br>'.join(ext(l['url'], escape(l.get('label') or l['url']))
                           for l in r.get('links') or [] if l.get('role') == 'cited')
    src = r.get('source') or {}
    if src.get('url'):
        day = f', downloaded {escape(src["retrieved"])}' if src.get('retrieved') else ''
        rows += ('<br>' if rows else '') + ext(src['url'], 'The image file') + day
    return rows


def links_rows(links):
    return '<br>'.join(ext(l['url'], f'{escape(l.get("label") or l["url"])} ({escape(l.get("role", ""))})')
                       for l in links or [])


def further(items):
    out = []
    for f in items or []:
        text = escape(f['source'])
        if f.get('title'):
            text += f', “{escape(f["title"])}”'
        if f.get('note'):
            text += f' ({escape(f["note"])})'
        out.append(ext(f['url'], text))
    return '<br>'.join(out)


def tag_rows(col, r):
    tags = r.get('tags') or {}
    rows = []
    for kind, label in (('hours', 'Hours'), ('weather', 'Weather'), ('seasons', 'Seasons')):
        names = [col.labels[kind].get(tag_id(t), tag_id(t)) for t in tags.get(kind) or []]
        rows.append((label, escape(', '.join(names))))
    subj = [link(tag_id(t), col.name(tag_id(t))) for t in (tags.get('species') or []) + (tags.get('phenomena') or [])
            if tag_id(t) in col.subjects]
    rows.append(('About', ', '.join(subj)))
    return rows


def appears(col, r, kind):
    """Where the site shows a record, as links."""
    out = []
    shown = r.get('shownIn')
    if shown == 'hours':
        out.append(f'<a href="/?{kind}={r["id"]}">The Hours</a>')
    elif shown == 'weather':
        out.append(f'<a href="/weather.html?{kind}={r["id"]}">The Weather</a>')
    elif shown == 'days' and r['id'] in col.day_of:
        day = col.day_of[r['id']]
        month, d = (int(x) for x in day['date'].split('-'))
        out.append(f'<a href="/seasons.html?day={day["date"]}">The Seasons, {d} {MONTHS[month - 1]}</a>')
    post = col.posts.get((r.get('lectio') or {}).get('post'))
    if post:
        where = f'/{post["page"]}' if post.get('page') else '/seasons.html'
        out.append(f'<a href="{where}">{escape(post["title"])}</a> (Lectio Terra, {escape(post.get("published") or "")})')
    return '<br>'.join(out)


def cite(col, rid, url):
    name = col.name(rid)
    name = name[:-1] + '.”' if name.endswith('”') else name + '.'
    return (f'    <p class="record-cite">{name} Record {rid}, <em>The Earthly Book of Hours</em>, '
            f'ed. Ryan Weberling. <a href="{url}">{url}</a>. Dataset: <a href="{DOI}" target="_blank">{DOI}</a>.</p>')


def data_note(rid):
    return f'    <p class="record-data">This record as data: <a href="/id/{rid}.json">{rid}.json</a> · <a href="/id/">All records</a></p>'


def reading_page(col, r):
    c = r.get('citation') or {}
    ed = c.get('edition') or {}
    rights = ed.get('rights')
    verse = (r.get('display') or {}).get('verse')
    text = r.get('text') or ''
    if text and is_open(rights):
        shown = f'    <blockquote class="record-text{" verse" if verse else ""}">{text}</blockquote>'
    elif text:
        where = 'the site' if not r.get('shownIn') else 'its page on the site'
        shown = (f'    <blockquote class="record-text{" verse" if verse else ""}">{first_line(text, verse)}</blockquote>\n'
                 f'    <p class="record-note">The opening only: this text is still in copyright. Read it in full on {where}, below.</p>')
    else:
        shown = ''
    work = dl([
        ('Title', escape(c.get('title') or '')),
        ('By', people_line([p for p in ed.get('contributors', []) if p.get('role') == 'author'])),
        ('Written', escape(c.get('written') or '')),
        ('Citation', c.get('display') or ''),
        ('Bibliography', c.get('bibliography') or ''),
        ('Edition', link(ed['id'], col.name(ed['id'])) if ed.get('id') else ''),
        ('Drawn from', locator_rows(c.get('locator'))),
        ('Suggested edition', ext(f'https://bookshop.org/a/86532/{r["suggestedEdition"]["isbn"]}',
                                  escape(r['suggestedEdition'].get('note') or r['suggestedEdition']['isbn']))
         if r.get('suggestedEdition') else ''),
        ('Further reading', further(r.get('furtherReading'))),
    ])
    body = [section('The text', shown), section('The work', work),
            section('In the collection', dl([('Appears in', appears(col, r, 'r'))] + tag_rows(col, r))),
            section('Rights', dl([('Status', rights_words(rights)), ('Note', public_note(ed))])),
            section('Cite this record', cite(col, r['id'], f'{SITE}/id/{r["id"]}/') + '\n' + data_note(r['id']))]
    title = col.name(r['id'])
    ld = {'@context': 'https://schema.org', '@type': 'Quotation', '@id': f'{SITE}/id/{r["id"]}/',
          'name': c.get('title'), 'url': f'{SITE}/id/{r["id"]}/',
          'creator': [person_ld(p) for p in ed.get('contributors', []) if p.get('role') == 'author'],
          'isBasedOn': f'{SITE}/id/{ed["id"]}/' if ed.get('id') else None,
          'about': subjects_ld(col, r), 'license': rights,
          'isPartOf': {'@type': 'Collection', 'name': 'The Earthly Book of Hours', 'url': f'{SITE}/id/'}}
    return title, plain(title), '\n\n'.join(b for b in body if b), ld


def thumb(col, r, small):
    f = r.get('file') or ''
    if f.startswith('http'):
        return ext(f, 'Watch it on YouTube') if 'youtu' in f else ext(f, 'See it at its source')
    if r.get('media') == 'video':
        f = r.get('poster') or ''
    if not f:
        return ''
    copies = col.copies.get(f) or []
    src = copies[0]['file'] if copies else f
    alt = escape(r.get('alt') or plain(r.get('caption')))
    cls = 'record-thumb' if small else 'record-image'
    img = f'<img class="{cls}" src="/{escape(src)}" alt="{alt}" loading="lazy">'
    return img if small else f'<a href="/{escape(f)}">{img}</a>'


def image_page(col, r):
    rights = r.get('rights')
    small = not is_open(rights)
    pic = thumb(col, r, small)
    shown = ''
    if pic:
        note = ('\n    <p class="record-note">A thumbnail only: this image is still in copyright, '
                'or its status is not yet settled. See it on the site, below.</p>') if small else ''
        shown = f'    <div class="record-figure">{pic}</div>\n    <p class="image-caption">{r.get("caption") or ""}</p>{note}'
    ed = r.get('edition') or {}
    work = dl([
        ('Title', escape(r.get('title') or '')),
        ('By', people_line([r['creator']]) if r.get('creator') else ''),
        ('Made', escape(r.get('date') or '')),
        ('Held by', escape(r.get('institution') or '') + (f', {escape(r["shelfmark"])}' if r.get('shelfmark') else '')),
        ('Part of', escape(r.get('partOf') or '') if isinstance(r.get('partOf'), str) else escape(json.dumps(r.get('partOf'))) if r.get('partOf') else ''),
        ('Bibliography', r.get('bibliography') or ''),
        ('From the edition', link(ed['id'], col.name(ed['id'])) if ed.get('id') else ''),
        ('Drawn from', drawn_from(r)),
        ('Also at', '<br>'.join(ext(l['url'], escape(l.get('label') or l['url']))
                                for l in r.get('links') or [] if l.get('role') != 'cited')),
        ('Description', escape(r.get('alt') or '')),
        ('Further reading', further(r.get('furtherReading'))),
    ])
    body = [section('The image', shown), section('The work', work),
            section('In the collection', dl([('Appears in', appears(col, r, 'i'))] + tag_rows(col, r))),
            section('Rights', dl([('Status', rights_words(rights)), ('Note', public_note(r))])),
            section('Cite this record', cite(col, r['id'], f'{SITE}/id/{r["id"]}/') + '\n' + data_note(r['id']))]
    title = col.name(r['id'])
    ld = {'@context': 'https://schema.org', '@type': 'VisualArtwork', '@id': f'{SITE}/id/{r["id"]}/',
          'name': r.get('title') or plain(r.get('caption'))[:120], 'url': f'{SITE}/id/{r["id"]}/',
          'creator': [person_ld(r['creator'])] if r.get('creator') else [],
          'dateCreated': r.get('date'), 'description': r.get('alt'),
          'isBasedOn': f'{SITE}/id/{ed["id"]}/' if ed.get('id') else None,
          'about': subjects_ld(col, r), 'license': rights,
          'isPartOf': {'@type': 'Collection', 'name': 'The Earthly Book of Hours', 'url': f'{SITE}/id/'}}
    return title, plain(title), '\n\n'.join(b for b in body if b), ld


def edition_page(col, eid):
    ed = col.editions[eid]
    ids = []
    for key, value in (ed.get('identifiers') or {}).items():
        label, pattern = IDENTIFIER_LINKS.get(key, (key, None))
        ids.append(ext(pattern.format(value), f'{label}: {escape(value)}') if pattern else f'{escape(key)}: {escape(value)}')
    fields = dl([
        ('Title', f'<em>{escape(ed.get("title") or "")}</em>'),
        ('Type', escape(ed.get('type') or '')),
        ('Contributors', people_line(ed.get('contributors'))),
        ('In', escape(', '.join(x for x in (ed.get('container'), ('vol. ' + ed['volume']) if ed.get('volume') else '',
                                             ('no. ' + ed['issue']) if ed.get('issue') else '',
                                             ('pp. ' + ed['pages']) if ed.get('pages') else '') if x))),
        ('Edition', escape(ed.get('edition') or '')),
        ('Publisher', escape(ed.get('publisher') or '')),
        ('Published', escape(ed.get('issued') or '')),
        ('First published', escape(ed.get('original-date') or '') if ed.get('original-date') != ed.get('issued') else ''),
        ('Held at', escape(ed.get('archive') or '')),
        ('Identifiers', '<br>'.join(ids)),
        ('Links', links_rows(ed.get('links'))),
    ])
    used = '<br>'.join(f'{link(x, col.name(x))}' for x in col.cited_by.get(eid, []))
    body = [section('The edition', fields),
            section('In the collection', dl([('Cited by', used)])),
            section('Rights', dl([('Status', rights_words(ed.get('rights')) if ed.get('rights') else ''),
                                  ('Note', public_note(ed))])),
            section('Cite this record', cite(col, eid, f'{SITE}/id/{eid}/') + '\n' + data_note(eid))]
    t = {'book': 'Book', 'article': 'ScholarlyArticle', 'manuscript': 'Manuscript'}.get(ed.get('type'), 'CreativeWork')
    same = [IDENTIFIER_LINKS[k][1].format(v) for k, v in (ed.get('identifiers') or {}).items()
            if k in IDENTIFIER_LINKS and k not in ('isbn',)]
    ld = {'@context': 'https://schema.org', '@type': t, '@id': f'{SITE}/id/{eid}/', 'name': ed.get('title'),
          'url': f'{SITE}/id/{eid}/', 'author': [person_ld(p) for p in ed.get('contributors', [])],
          'publisher': ed.get('publisher'), 'datePublished': ed.get('issued'), 'sameAs': same,
          'isbn': (ed.get('identifiers') or {}).get('isbn')}
    title = col.name(eid)
    return title, plain(title), '\n\n'.join(b for b in body if b), ld


def subject_page(col, sid):
    s = col.subjects[sid]
    ids = []
    if s.get('wikidata'):
        ids.append(ext(f'https://www.wikidata.org/wiki/{s["wikidata"]}', f'Wikidata: {s["wikidata"]}'))
    if s.get('gbif'):
        ids.append(ext(f'https://www.gbif.org/species/{s["gbif"]}', f'GBIF: {s["gbif"]}'))
    if s.get('inaturalist'):
        ids.append(ext(f'https://www.inaturalist.org/taxa/{s["inaturalist"]}', f'iNaturalist: {s["inaturalist"]}'))
    latin = s.get('scientific') or s.get('latin')
    fields = dl([('Name', escape(s['name'])), ('Scientific name' if s.get('scientific') else 'Latin name',
                                                f'<em>{escape(latin)}</em>' if latin else ''),
                 ('Rank', escape(s.get('rank') or '')), ('Identifiers', '<br>'.join(ids))])
    posts = [e for e in col.posts.values() if e.get('subject') == sid]
    post_links = '<br>'.join(f'<a href="/{e["page"]}">{escape(e["title"])}</a>' if e.get('page') else escape(e['title'])
                             for e in posts)
    used = '<br>'.join(link(x, col.name(x)) for x in col.about.get(sid, []))
    body = [section('The subject', fields),
            section('In the collection', dl([('Lectio Terra', post_links), ('Records about it', used)])),
            section('Cite this record', cite(col, sid, f'{SITE}/id/{sid}/') + '\n' + data_note(sid))]
    ld = {'@context': 'https://schema.org', '@type': 'Taxon' if prefix(sid) == 'sp' else 'Thing',
          '@id': f'{SITE}/id/{sid}/', 'name': s['name'], 'alternateName': latin, 'url': f'{SITE}/id/{sid}/',
          'sameAs': [u for u in ([f'https://www.wikidata.org/wiki/{s["wikidata"]}'] if s.get('wikidata') else [])
                     + ([f'https://www.gbif.org/species/{s["gbif"]}'] if s.get('gbif') else [])]}
    return escape(s['name']), s['name'], '\n\n'.join(b for b in body if b), ld


def person_ld(p):
    out = {'@type': 'Person', 'name': p['name']}
    if p.get('wikidata'):
        out['sameAs'] = f'https://www.wikidata.org/wiki/{p["wikidata"]}'
    return out


def subjects_ld(col, r):
    tags = r.get('tags') or {}
    out = []
    for t in (tags.get('species') or []) + (tags.get('phenomena') or []):
        s = col.subjects.get(tag_id(t))
        if s:
            out.append({'@id': f'{SITE}/id/{s["id"]}/', 'name': s['name']})
    return out


def clean_ld(data):
    if isinstance(data, dict):
        return {k: clean_ld(v) for k, v in data.items() if v not in (None, '', [], {})}
    if isinstance(data, list):
        return [clean_ld(v) for v in data]
    return data


def page(rid, kind, title, title_text, body, ld):
    url = f'{SITE}/id/{rid}/'
    rel = f'id/{rid}/index.html'
    block = ('  <script type="application/ld+json">\n'
             + json.dumps(clean_ld(ld), ensure_ascii=False, indent=2).replace('</', '<\\/')
             + '\n  </script>\n')
    return PAGE.format(
        head=render_shared('head', rel), frame=render_shared('frame', rel), nav=render_shared('nav', rel),
        title=title, title_text=escape(title_text), description=escape(f'{KIND[kind]} {rid}: {title_text}'),
        robots='' if INDEXED else '  <meta name="robots" content="noindex">\n',
        url=url, json_url=f'{SITE}/id/{rid}.json', json_ld=block, kind=KIND[kind], rid=rid, body=body)


def public_note(holder):
    """A rights note as the site shows it: none where it's marked
    rightsNotePrivate (Ryan's working note, kept in the data only)."""
    if holder.get('rightsNotePrivate'):
        return ''
    return escape(holder.get('rightsNote') or '')


def without_private_notes(data):
    """`data` with every private rights note (and its flag) taken out."""
    if isinstance(data, dict):
        private = data.get('rightsNotePrivate')
        return {k: without_private_notes(v) for k, v in data.items()
                if not (private and k in ('rightsNote', 'rightsNotePrivate'))}
    if isinstance(data, list):
        return [without_private_notes(v) for v in data]
    return data


def record_json(col, rid):
    """The record as stored, but without the text of a reading in copyright
    or any private rights note."""
    if rid in col.by_id:
        r = json.loads(json.dumps(col.by_id[rid]))
        if prefix(rid) == 'r':
            rights = ((r.get('citation') or {}).get('edition') or {}).get('rights')
            if r.get('text') and not is_open(rights):
                r['firstLine'] = plain(first_line(r['text'], (r.get('display') or {}).get('verse')))
                del r['text']
    elif rid in col.editions:
        r = dict(col.editions[rid], citedBy=col.cited_by.get(rid, []))
    else:
        r = dict(col.subjects[rid], records=col.about.get(rid, []))
    r = without_private_notes(r)
    r = {'@id': f'{SITE}/id/{rid}/', **r, 'license': 'https://creativecommons.org/licenses/by-nc/4.0/',
         'dataset': DOI}
    return json.dumps(r, ensure_ascii=False, indent=2) + '\n'


def index_page(col, groups):
    rel = 'id/index.html'
    parts = []
    for heading, ids in groups:
        items = '\n'.join(f'      <li>{link(x)} {col.name(x)}</li>' for x in ids)
        parts.append(f'''  <section class="content-block record-section">
    <h2 class="content-subhead">{heading} ({len(ids)})</h2>
    <ul class="record-index">
{items}
    </ul>
  </section>''')
    intro = ('  <article class="content-block">\n    <p>Every record in the collection, each at its '
             'permanent address. To browse them as the site shows them, by hour, weather '
             'and season, see <a href="/sources.html">Sources</a>. The whole collection is archived, with each version, at '
             f'<a href="{DOI}" target="_blank">Zenodo</a>; its metadata is licensed CC BY-NC 4.0.</p>\n  </article>')
    return PAGE.format(
        head=render_shared('head', rel), frame=render_shared('frame', rel), nav=render_shared('nav', rel),
        title='The Records', title_text='The Records', description='Every record in The Earthly Book of Hours.',
        robots='' if INDEXED else '  <meta name="robots" content="noindex">\n',
        url=f'{SITE}/id/', json_url=f'{SITE}/id/index.json', json_ld='', kind='The collection',
        rid=f'{sum(len(i) for _, i in groups)} records',
        body=intro + '\n\n' + '\n\n'.join(parts)).replace('<p class="publication-name"><a href="/id/">The Earthly Book of Hours · Records</a></p>',
                                                       '<p class="publication-name">The Earthly Book of Hours</p>')


def wanted():
    """Every file this script should write: {path relative to ROOT: text}."""
    col = Collection()
    files, groups = {}, []
    for heading, ids, make in (
            ('Readings', [r['id'] for r in col.readings], lambda x: reading_page(col, col.by_id[x])),
            ('Images', [r['id'] for r in col.images], lambda x: image_page(col, col.by_id[x])),
            ('Editions', sorted(col.editions), lambda x: edition_page(col, x)),
            ('Species', [s['id'] for s in col.species], lambda x: subject_page(col, x)),
            ('Phenomena', [s['id'] for s in col.phenomena], lambda x: subject_page(col, x))):
        groups.append((heading, ids))
        for rid in ids:
            title, title_text, body, ld = make(rid)
            files[f'id/{rid}/index.html'] = page(rid, prefix(rid), title, title_text, body, ld)
            files[f'id/{rid}.json'] = record_json(col, rid)
    for r in col.readings + col.images:
        for alias in r.get('aliases') or []:
            if f'id/{alias}/index.html' not in files:
                files[f'id/{alias}/index.html'] = FORWARD.format(rid=r['id'], url=f'{SITE}/id/{r["id"]}/')
    files['id/index.html'] = index_page(col, groups)
    files['id/index.json'] = json.dumps({h: ids for h, ids in groups}, ensure_ascii=False, indent=2) + '\n'
    return files


def existing():
    return {p.relative_to(ROOT).as_posix() for p in OUT.rglob('*') if p.is_file()} if OUT.exists() else set()


def stale_pages():
    files = wanted()
    out = [p for p, text in files.items()
           if not (ROOT / p).exists() or (ROOT / p).read_text(encoding='utf-8') != text]
    return out + sorted(existing() - set(files))


def main():
    files = wanted()
    written = 0
    for rel, text in files.items():
        path = ROOT / rel
        if path.exists() and path.read_text(encoding='utf-8') == text:
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')
        written += 1
    removed = 0
    for rel in sorted(existing() - set(files)):
        (ROOT / rel).unlink()
        removed += 1
    for d in sorted((p for p in OUT.rglob('*') if p.is_dir()), reverse=True):
        if not any(d.iterdir()):
            d.rmdir()
    print(f'Record pages: {written} written, {removed} removed, {len(files)} in all.')


if __name__ == '__main__':
    main()
