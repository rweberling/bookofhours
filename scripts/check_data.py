#!/usr/bin/env python3
"""Check the collection in data/ and report what still needs research.

Usage:
  python3 scripts/check_data.py               # errors, plus a count of core gaps
  python3 scripts/check_data.py --gaps        # ...and the core gaps by record
  python3 scripts/check_data.py --all --gaps  # ...including research details

Errors are things that would break the site or the data's reuse: IDs
that are missing, malformed, duplicated or retired (across the collection,
the Lectio Terra posts and the postcards, aliases included), links between
them that point nowhere, tags that aren't in data/vocab.json, missing image files, malformed
dates, and embedded editions or people whose copies disagree. The script
exits with status 1 when there are any.

Gaps are fields not yet filled in. They never fail the check. Core gaps
matter for the site and for rights: a bibliography line, a rights
statement, and a way for readers to reach the work (a cited link or a
suggested edition). Research details (a reading's work title, date
written and page or exact link; publishers, edition dates, holding
institutions, Wikidata IDs) are reported only with --all.

Nothing here writes files. The site reads data/ directly (loadCollection()
in shared.js).
"""

import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'

# Extended Date/Time Format, the subset used here: a year (negative for
# BCE), optionally with month and day, optionally uncertain (?) or
# approximate (~), or an interval of two such dates.
EDTF_DATE = r'-?\d{4}(-\d{2}(-\d{2})?)?[~?%]?'
EDTF = re.compile(rf'^{EDTF_DATE}(/{EDTF_DATE})?$')

RIGHTS_PREFIXES = ('http://rightsstatements.org/vocab/', 'https://creativecommons.org/')

# Citation links: the edition or object cited, its original, or another
# copy of it. Further reading is kept apart, as writing about the work
# or a related work. Purchase links aren't stored at all: a suggested
# edition is an ISBN, and the affiliate link is built from it.
LINK_ROLES = {'cited', 'original', 'copy'}
FURTHER_KINDS = {'about', 'related'}


def isbn13_valid(isbn):
    if not re.fullmatch(r'97[89]\d{10}', isbn or ''):
        return False
    total = sum(int(d) * (1 if i % 2 == 0 else 3) for i, d in enumerate(isbn[:12]))
    return (10 - total % 10) % 10 == int(isbn[12])


CORE_GAPS = {'bibliography line', 'rights', 'cited link or suggested edition', 'subject (species or phenomenon)'}


# One ID format per kind of record.
ID_FORMS = {
    'r': re.compile(r'^r-\d{4}$'), 'i': re.compile(r'^i-\d{4}$'), 'lt': re.compile(r'^lt-\d{4}$'),
    'w': re.compile(r'^w-\d{4}$'), 'pc': re.compile(r'^pc-[a-z]\d{2}-\d+$'),
    'sp': re.compile(r'^sp-\d{4}$'), 'ph': re.compile(r'^ph-\d{4}$'),
    'e': re.compile(r'^e-\d{4}$'),
}
# Where a reading, image or piece of writing can be shown on the site.
SHOWN_IN = ('hours', 'weather', 'seasons')
# The kinds of the site's own writing (data/writing.json). A new genre is
# a new kind here, not a new kind of ID.
WRITING_KINDS = ('versicle', 'phenomenon', 'note', 'headnote', 'supplementum')
# How a piece bears on a tag (a tag object's "basis"; see data/README.md).
TAG_BASES = ('grounded', 'thematic', 'both')
# A link to a Seasons entry, as written in post bodies (&amp;) or the CSV (&).
SEASONS_LINK = re.compile(r'seasons\.html\?season=(\w+)&(?:amp;)?entry=([^"&#\s]+)')


def tag_id(t):
    """A tag's ID, whether the tag is a plain string or an object
    ({"id": ..., "basis": ..., "note": ...})."""
    return t if isinstance(t, str) else (t.get('id') or t.get('term'))


def locators(holder):
    """A citation's (or a book plate's) locators, as a list: one, or one
    for each place a reading is cut from."""
    loc = (holder or {}).get('locator')
    return loc if isinstance(loc, list) else [loc] if loc else []


def load(name):
    return json.loads((DATA / f'{name}.json').read_text())


def post_readings(post):
    """The passages under a post's Readings heading, in order: what each
    reading's one-item list holds."""
    m = re.search(r'<h[2-4]>\s*Readings\s*</h[2-4]>(.*?)(?=<h[2-4]>\s*(?:Supplementum|More)\s*</h[2-4]>|$)',
                  post.get('bodyHtml', ''), re.S | re.I)
    return re.findall(r'<ol>\s*<li>(.*?)</li>\s*</ol>', m.group(1), re.S) if m else []


INDENTED = re.compile(r'(?:^|<p>|<br>)(?: |&nbsp;| ){2,}\S')


TAG = re.compile(r'[a-z0-9]{1,64}')


def syndication_problems(lectio, readings, writing, subjects):
    """What scripts/syndicate.py would send wrongly: a hashtag that isn't
    one lower-case word, or an excerpt that is no longer word for word in
    the record it names (after a correction to that record, say)."""
    from syndicate import plain as syn_plain
    problems = []
    texts = {r['id']: re.sub(r'\s+', ' ', syn_plain(r.get('text') or '')).replace('\u2060', '')
             for r in readings + writing}
    for s in subjects:
        for tag in s.get('hashtags') or []:
            if not TAG.fullmatch(tag):
                problems.append(f'{s["id"]}: hashtag "{tag}" is not one lower-case word')
    for post in (e for items in lectio.get('seasons', {}).values() for e in items):
        syn = post.get('syndication') or {}
        for tag in syn.get('hashtags') or []:
            if not TAG.fullmatch(tag):
                problems.append(f'{post["id"]}: hashtag "{tag}" is not one lower-case word')
        for ex in syn.get('excerpts') or []:
            text = re.sub(r'\s+', ' ', ex.get('text') or '').replace('\u2060', '')
            if ex.get('from') not in texts:
                problems.append(f'{post["id"]}: excerpt from {ex.get("from")}, which is not a reading or writing record')
            elif text not in texts[ex['from']]:
                problems.append(f'{post["id"]}: excerpt no longer word for word in {ex["from"]}: "{text[:50]}…"')
    return problems


def post_text_problems(lectio, readings, subjects):
    """What would show wrongly on a post's page, though the data is whole:
    a reading with nothing in its list (its passage strayed outside it,
    as American Robin's once did), a poem whose record has lost indents
    its post has (as Hardy's once had), a footnote reference with no note
    or a note with no reference, and a subject with no Latin name for the
    line under the title."""
    problems = []
    posts = [e for items in lectio.get('seasons', {}).values() for e in items]
    by_post = defaultdict(dict)
    for r in readings:
        if (r.get('lectio') or {}).get('post') and not r.get('draft'):
            by_post[r['lectio']['post']][r['lectio']['place']] = r
    names = {s['id']: s for s in subjects}
    for post in posts:
        pid, html = post['id'], post.get('bodyHtml', '')
        passages = post_readings(post)
        for place, passage in enumerate(passages, 1):
            if not re.sub(r'<[^>]+>|&nbsp;|\s', '', passage):
                problems.append(f'{pid}: reading {place} has an empty list item; its passage belongs inside it')
            record = by_post[pid].get(place)
            if record and (record.get('display') or {}).get('verse'):
                in_post = len(INDENTED.findall(passage))
                in_record = len(re.findall(r'(?:^|<br>)(?:&nbsp;){2,}', record.get('text', '')))
                if in_post > in_record:
                    problems.append(f'{record["id"]}: its post indents {in_post} line(s) of the poem, '
                                    f'its record {in_record}; set the record\'s indents from the post')
        own = lambda href: not re.match(r'^[a-z]+:', href, re.I)
        refs = {m.group(2) for m in re.finditer(r'href="([^"]*)#footnote-(\d+)"', html) if own(m.group(1))}
        notes = {m.group(2) for m in re.finditer(r'href="([^"]*)#footnote-anchor-(\d+)"[^>]*>\d+</a>\s*<p>', html)
                 if own(m.group(1))}
        for n in sorted(refs - notes, key=int):
            problems.append(f'{pid}: footnote reference {n} has no note')
        for n in sorted(notes - refs, key=int):
            problems.append(f'{pid}: footnote {n} is never referred to in the text')
        subject = names.get(post.get('subject'))
        if subject and not (subject.get('scientific') or subject.get('latin')):
            problems.append(f'{subject["id"]}: no Latin name ("scientific" or "latin") for the line under '
                            f'the title of {pid}')
    return problems


def conflict_markers():
    """Files committed in the middle of a merge, as sitemap.xml once was."""
    import subprocess
    try:
        files = subprocess.run(['git', 'ls-files'], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split()
    except (OSError, subprocess.CalledProcessError):
        return []
    marker = re.compile(r'^(<{7}|>{7})( |$)|^={7}$', re.M)
    found = []
    for name in files:
        if not name.endswith(('.html', '.js', '.css', '.json', '.xml', '.txt', '.md', '.py', '.csv', '.cff')):
            continue
        try:
            text = (ROOT / name).read_text(encoding='utf-8')
        except (OSError, UnicodeDecodeError):
            continue
        if marker.search(text):
            found.append(f'{name}: merge-conflict markers (<<<<<<< / >>>>>>>) left in the file')
    return found


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--gaps', action='store_true', help='list gaps by record')
    parser.add_argument('--all', action='store_true', help='include research details, not just core gaps')
    args = parser.parse_args()

    readings, images, writing, vocab = (load(n) for n in ('readings', 'images', 'writing', 'vocab'))
    species, phenomena = load('species'), load('phenomena')
    errors = []
    gaps = defaultdict(list)

    # IDs: neutral and permanent, one format per kind (see the Identifiers
    # section of the metadata notes), unique across everything, aliases
    # (the old IDs they replaced) included, and never one that's retired.
    # The old ed- IDs of the hour notes live on as aliases of the versicles.
    from datafile import load_posts
    lectio = load_posts()
    posts = [e for items in lectio.get('seasons', {}).values() for e in items]
    with (DATA / 'postcards.csv').open(encoding='utf-8', newline='') as f:
        cards = list(csv.DictReader(f))
    retired_path = DATA / 'retired-ids.json'
    retired = set(json.loads(retired_path.read_text())) if retired_path.exists() else set()
    seen = {}
    for kind, records, form in (('reading', readings, ID_FORMS['r']), ('image', images, ID_FORMS['i']),
                                ('writing', writing, ID_FORMS['w']), ('Lectio Terra post', posts, ID_FORMS['lt']),
                                ('postcard', cards, ID_FORMS['pc']), ('species', species, ID_FORMS['sp']),
                                ('phenomenon', phenomena, ID_FORMS['ph'])):
        for rec in records:
            rid = rec.get('id')
            if not rid:
                errors.append(f'{kind} without an id: {str(rec)[:80]}')
                continue
            if not form.match(rid):
                errors.append(f'{kind} id {rid} is not in the form {form.pattern}')
            if rid in retired:
                errors.append(f'{rid} is a retired id; give the {kind} a new one')
            for name in [rid] + list(rec.get('aliases') or []):
                if name in seen:
                    errors.append(f'duplicate id {name} ({seen[name]} and {kind})')
                seen[name] = kind

    # Links between them point somewhere: Seasons links in the posts and
    # on the postcards name a post that exists, in the season it's in.
    post_place = {(season, e['id']) for season, items in lectio.get('seasons', {}).items() for e in items}
    linked = [(e['id'], m.group(1), m.group(2)) for e in posts
              for m in SEASONS_LINK.finditer(e.get('bodyHtml') or '')]
    linked += [(c['id'], m.group(1), m.group(2)) for c in cards
               for m in SEASONS_LINK.finditer(c.get('post') or '')]
    for owner, season, target in linked:
        if (season, target) not in post_place:
            errors.append(f'{owner}: links to Seasons entry {target} in {season}, which is not there')

    # Each post's subject is a species or phenomenon record, whose names
    # the Seasons page shows; the post doesn't keep a copy of them.
    subjects = {r['id'] for r in species + phenomena}
    for e in posts:
        for field in ('species', 'latin'):
            if field in e:
                errors.append(f'{e["id"]}: "{field}" belongs on its subject record in data/species.json '
                              'or data/phenomena.json, not on the post')
        if not e.get('subject'):
            gaps[e['id']].append('subject (species or phenomenon)')
        elif e['subject'] not in subjects:
            errors.append(f'{e["id"]}: subject {e["subject"]} is not in data/species.json or data/phenomena.json')
    for r in species + phenomena:
        if not r.get('wikidata'):
            gaps[r['id']].append('Wikidata ID')
        if r['id'].startswith('sp-') and not r.get('gbif'):
            gaps[r['id']].append('GBIF ID')

    # Passages, figures and writing copied from Lectio Terra posts
    # (copy_lectio.py) name a post that exists, each piece of it once.
    post_ids = {e['id'] for e in posts}
    for records, piece in ((readings, 'passage'), (images, 'figure'), (writing, 'piece of writing')):
        copied = {}
        for r in records:
            source = r.get('lectio')
            if not source:
                continue
            key = (source.get('post'), r.get('kind'), source.get('place'))
            if key[0] not in post_ids:
                errors.append(f'{r["id"]}: copied from Lectio Terra post {key[0]}, which is not there')
            if key in copied:
                errors.append(f'{r["id"]}: the same {piece} as {copied[key]} ({key[0]})')
            copied[key] = r['id']

    # Tags point at the vocabularies. A tag is a plain ID, or an object
    # carrying one (with a basis and a note).
    schemes = {name: {c['id'] for c in concepts} for name, concepts in vocab.items()}
    schemes['species'] = {r['id'] for r in species}
    schemes['phenomena'] = {r['id'] for r in phenomena}
    def check_tags(rid, tags):
        for scheme, values in (tags or {}).items():
            if scheme not in schemes:
                errors.append(f'{rid}: unknown tag scheme "{scheme}"')
                continue
            for v in map(tag_id, values):
                if v not in schemes[scheme]:
                    errors.append(f'{rid}: "{v}" is not in the {scheme} vocabulary')
            # A tag object's basis says how the piece bears on the tag;
            # without one the tag is unclassified.
            for t in values:
                if isinstance(t, dict) and 'basis' in t and t['basis'] not in TAG_BASES:
                    errors.append(f'{rid}: {scheme} tag "{tag_id(t)}" has basis {t["basis"]!r}; '
                                  f'it must be one of {", ".join(TAG_BASES)}')
    for rec in readings + images + writing:
        check_tags(rec['id'], rec.get('tags'))

    # Each reading, image and piece of writing is shown in one place on
    # the site, and has what that place needs: an hour to be shown at, a
    # weather condition (or the unset view), or the Lectio Terra post it
    # comes from.
    for rec in readings + images + writing:
        rid, place, tags = rec['id'], rec.get('shownIn'), rec.get('tags') or {}
        if place not in SHOWN_IN:
            errors.append(f'{rid}: shownIn is {place!r}; it must be one of {", ".join(SHOWN_IN)}')
        elif place == 'hours' and not tags.get('hours'):
            errors.append(f'{rid}: shown in the Hours, but tagged with no hour to show it at')
        elif place == 'weather' and not (tags.get('weather') or (rec.get('display') or {}).get('weatherUnset')):
            errors.append(f'{rid}: shown in the Weather, but tagged with no condition (or display.weatherUnset)')
        elif place == 'seasons' and not rec.get('lectio'):
            errors.append(f'{rid}: shown in the Seasons, but not from a Lectio Terra post ("lectio")')

    # Verse is held in one form (lines joined by <br>, one blank line
    # between stanzas, indents as leading &nbsp;s), which the pages set out
    # line by line; scripts/verse.py puts a reading into it.
    from verse import in_verse_form
    for r in readings:
        if (r.get('display') or {}).get('verse'):
            problem = in_verse_form(r.get('text') or '')
            if problem:
                errors.append(f'{r["id"]}: marked as verse, but {problem}; run: python3 scripts/verse.py {r["id"]}')

    errors.extend(post_text_problems(lectio, readings, species + phenomena))
    errors.extend(syndication_problems(lectio, readings, writing, species + phenomena))
    errors.extend(conflict_markers())

    # Writing: a known kind and some text; in the Hours, one versicle per
    # hour, and its phenomenon lines numbered 1, 2, 3... by place.
    per_hour = defaultdict(lambda: defaultdict(list))
    for w in writing:
        if w.get('kind') not in WRITING_KINDS:
            errors.append(f'{w["id"]}: kind {w.get("kind")!r} is not one of {", ".join(WRITING_KINDS)}')
        if not (w.get('text') or '').strip():
            errors.append(f'{w["id"]}: no text')
        if w.get('shownIn') == 'hours' and not w.get('draft'):
            for hour in map(tag_id, (w.get('tags') or {}).get('hours') or []):
                per_hour[hour][w.get('kind')].append(w)
    # A post's body (its pieces in order, which the Seasons page rebuilds
    # it from) names each of its passages, figures and pieces of writing,
    # each passage and figure once, and nothing from another post.
    by_id = {r['id']: r for r in readings + images + writing}
    for e in posts:
        if 'body' not in e:
            continue
        named = []
        for item in e['body']:
            named += [item.get('reading'), item.get('image'), item.get('writing')] + item.get('figures', [])
        named = [n for n in named if n]
        for n in named:
            if n not in by_id or (by_id[n].get('lectio') or {}).get('post') != e['id']:
                errors.append(f'{e["id"]}: its body names {n}, which is not one of its pieces')
        mine = {r['id'] for r in readings + images + writing if (r.get('lectio') or {}).get('post') == e['id']}
        for n in sorted(mine - set(named)):
            errors.append(f'{e["id"]}: {n} is one of its pieces, but its body leaves it out')
        for n in {n for n in named if named.count(n) > 1 and not n.startswith('w-')}:
            errors.append(f'{e["id"]}: its body names {n} more than once')

    # Footnotes belong to the piece their references are in (a piece of
    # writing, or a reading): each has a marker and text, and the piece
    # refers to it.
    for rec in readings + writing:
        markers = [n.get('marker') for n in rec.get('footnotes') or []]
        for n in rec.get('footnotes') or []:
            if not isinstance(n.get('marker'), int) or not (n.get('text') or '').strip():
                errors.append(f'{rec["id"]}: a footnote needs a number (marker) and text: {str(n)[:60]}')
            elif f'href="#footnote-{n["marker"]}"' not in rec.get('text', ''):
                errors.append(f'{rec["id"]}: footnote {n["marker"]} is never referred to in its text')
        if len(set(markers)) != len(markers):
            errors.append(f'{rec["id"]}: two footnotes with the same number')
    for hour, kinds in per_hour.items():
        if len(kinds['versicle']) > 1:
            errors.append(f'{hour}: more than one versicle ({", ".join(w["id"] for w in kinds["versicle"])})')
        places = sorted(w.get('place') for w in kinds['phenomenon'] if isinstance(w.get('place'), int))
        if len(places) != len(kinds['phenomenon']) or places != list(range(1, len(places) + 1)):
            errors.append(f'{hour}: phenomenon lines need places 1 to {len(kinds["phenomenon"])}, one each')

    # The weather vocabulary matches the picker's list in atmosphere.js,
    # which stays the canonical list for pages that don't load data/.
    m = re.search(r'const WEATHER = \[(.*?)\];', (ROOT / 'atmosphere.js').read_text(), re.S)
    if m:
        site = re.findall(r"'([^']+)'", m.group(1))
        ours = [c['id'] for c in vocab.get('weather', [])]
        if site != ours:
            errors.append(f'weather vocabulary differs from atmosphere.js: '
                          f'only in atmosphere.js {sorted(set(site) - set(ours))}, '
                          f'only in vocab.json {sorted(set(ours) - set(site))}'
                          + ('' if set(site) != set(ours) else ' (order differs)'))

    # Facts the pages need before any data loads live in the site's scripts;
    # data/vocab.json repeats them for reuse. Check the copies agree.
    weather_js = (ROOT / 'weather.js').read_text()
    rows_js = [(label, re.findall(r"'([^']+)'", values))
               for label, values in re.findall(r"\{ label: '([^']+)',\s*values: \[([^\]]*)\] \}", weather_js)]
    rows_vocab = []
    for c in vocab.get('weather', []):
        if not rows_vocab or rows_vocab[-1][0] != c.get('group'):
            rows_vocab.append((c.get('group'), []))
        rows_vocab[-1][1].append(c['id'])
    if rows_js and rows_js != rows_vocab:
        errors.append(f'weather rows differ between WEATHER_GROUPS in weather.js {rows_js} and vocab.json {rows_vocab}')

    shared_js = (ROOT / 'shared.js').read_text()
    seasons_js = [(k, l, [int(n) for n in re.findall(r'\d+', months)])
                  for k, l, months in re.findall(r"\{ key: '([a-z]+)', label: '([^']+)', months: \[([^\]]*)\] \}", shared_js)]
    seasons_vocab = [(c['id'], c.get('label'), c.get('months')) for c in vocab.get('seasons', [])]
    if seasons_js != seasons_vocab:
        errors.append(f'seasons differ between SEASONS in shared.js {seasons_js} and vocab.json {seasons_vocab}')

    hours_js = [(k, l, int(h)) for k, l, h in re.findall(r"\{ key: '([a-z]+)', label: '([^']+)', start: (\d+),", shared_js)]
    hours_vocab = [(c['id'], c.get('label'), c.get('startHour')) for c in vocab.get('hours', [])]
    if hours_js != hours_vocab:
        errors.append(f'watches differ between HOURS in shared.js {hours_js} and vocab.json {hours_vocab}')

    # Every page that loads atmosphere.js loads shared.js before it.
    for page in sorted(ROOT.glob('*.html')):
        scripts = [src.lstrip('/') for src in re.findall(r'<script[^>]*src="([^"]+)"', page.read_text())]
        if 'atmosphere.js' in scripts:
            if 'shared.js' not in scripts or scripts.index('shared.js') > scripts.index('atmosphere.js'):
                errors.append(f'{page.name}: shared.js must load before atmosphere.js')

    # Image files exist.
    for img in images:
        if not img['file'].startswith(('http://', 'https://')) and not (ROOT / img['file']).exists():
            errors.append(f'{img["id"]}: missing file {img["file"]}')

    # Embedded editions and people: every copy that shares an id is the
    # same, field for field; a fact on one copy and missing from another
    # is reported too, so the copies can't drift apart. A person's role
    # belongs to the edition they're on, not the person. (The page a
    # record quotes is in its locator, not on the edition.)
    copies = defaultdict(list)
    def collect(owner, edition):
        # An edition without an ID (a Lectio reading's links, until Stage 3
        # gives it an edition record) has nothing to keep consistent.
        if not edition or 'id' not in edition:
            return
        people = edition.get('contributors') or []
        fields = {k: v for k, v in edition.items() if k != 'contributors'}
        fields['contributors'] = [(p['id'], p.get('role')) for p in people] or None
        copies[edition['id']].append((owner, fields))
        for p in people:
            copies[p['id']].append((owner, {k: v for k, v in p.items() if k != 'role'}))
    for r in readings:
        cit = r.get('citation') or {}
        collect(r['id'], cit.get('edition'))
        for q in cit.get('quotes') or []:
            collect(r['id'], q.get('edition'))
    for img in images:
        if img.get('creator'):
            copies[img['creator']['id']].append((img['id'], img['creator']))
        # An image from a printed volume has an edition of its own, which a
        # reading quoting the same book shares.
        collect(img['id'], img.get('edition'))
    # Each edition a reading quotes from (and any it quotes in turn) has a
    # neutral, permanent ID, e-0001; readings quoting the same edition share
    # it, and their copies of its details must agree (above).
    for r in readings:
        if r.get('draft'):
            continue
        cit = r.get('citation') or {}
        for edition in [cit.get('edition')] + [q.get('edition') for q in cit.get('quotes') or [] if 'edition' in q]:
            eid = (edition or {}).get('id')
            if not eid:
                errors.append(f'{r["id"]}: its edition has no ID; give it the next e- number')
            elif not ID_FORMS['e'].match(eid):
                errors.append(f'{r["id"]}: edition ID {eid} is not in the form e-0001')
            elif eid in retired:
                errors.append(f'{r["id"]}: {eid} is a retired ID; give the edition a new one')
    for img in images:
        eid = (img.get('edition') or {}).get('id')
        if img.get('edition') and not (eid and ID_FORMS['e'].match(eid)):
            errors.append(f'{img["id"]}: its edition needs an ID in the form e-0001')
    # An edition's identifiers point to authority records (data/README.md,
    # Editions); each in its own form, so a lookup can follow it.
    IDENTIFIER_FORMS = {
        'doi': r'10\.\d{4,9}/\S+', 'hathitrust': r'\d{9}', 'oclc': r'\d+', 'lccn': r'[a-z]*\d+',
        'isbn': r'97[89]\d{10}|\d{9}[\dX]', 'openlibrary': r'OL\d+[MW]', 'wikidata': r'Q\d+',
        'internetArchive': r'[\w.-]+',
    }
    editions = [((r.get('citation') or {}).get('edition'), r['id']) for r in readings] + \
               [(img.get('edition'), img['id']) for img in images]
    for edition, owner in editions:
        for key, value in ((edition or {}).get('identifiers') or {}).items():
            form = IDENTIFIER_FORMS.get(key)
            if not form:
                errors.append(f'{owner}: unknown identifier "{key}" (known: {", ".join(IDENTIFIER_FORMS)})')
            elif not re.fullmatch(form, str(value)):
                errors.append(f'{owner}: {key} "{value}" is not in its form')
    for cid, found in copies.items():
        first_owner, first = found[0]
        for owner, other in found[1:]:
            for k in sorted(set(first) | set(other)):
                a, b = first.get(k), other.get(k)
                if a == b:
                    continue
                if a is None or b is None:
                    has, lacks = (first_owner, owner) if b is None else (owner, first_owner)
                    errors.append(f'{cid}: "{k}" is on its copy in {has} but missing in {lacks}')
                else:
                    errors.append(f'{cid}: "{k}" is {a!r} in {first_owner} but {b!r} in {owner}')

    # Dates and rights are well formed where present.
    def check_date(rid, field, value):
        if value is not None and not EDTF.match(str(value)):
            errors.append(f'{rid}: {field} "{value}" is not an EDTF date')
    def check_rights(rid, value):
        if value is not None and not value.startswith(RIGHTS_PREFIXES):
            errors.append(f'{rid}: rights "{value}" is not a RightsStatements.org or Creative Commons URI')

    # The suggested-edition link pattern, from data/site.json.
    site = load('site')
    pattern = site.get('suggestedEditionUrl') or ''
    if '{isbn}' not in pattern:
        errors.append('data/site.json: suggestedEditionUrl needs {isbn} where the ISBN goes')
    affiliate = pattern.split('{isbn}')[0] if 'bookshop.org' in pattern else None

    def check_links(rid, links):
        for link in links or []:
            if link.get('role') not in LINK_ROLES:
                errors.append(f'{rid}: link role "{link.get("role")}" is not one of {", ".join(sorted(LINK_ROLES))}')
            if not str(link.get('url', '')).startswith(('http://', 'https://')):
                errors.append(f'{rid}: link without a web address: {link}')
            if 'bookshop.org' in str(link.get('url', '')):
                errors.append(f'{rid}: Bookshop link stored as a citation link; use suggestedEdition with its ISBN')

    def check_edition_links(rid, edition):
        # An edition links to the book as a whole; the page is the locator's.
        for link in (edition or {}).get('links') or []:
            if link.get('role') == 'cited':
                errors.append(f'{rid}: edition {(edition or {}).get("id")} has a "cited" link; '
                              f'the page link belongs in the locator')

    def check_locator(rid, loc):
        if not isinstance(loc, dict) or not (loc.get('page') or loc.get('url')):
            errors.append(f'{rid}: a locator needs a page or a link: {loc}')
            return
        if loc.get('url'):
            if not str(loc['url']).startswith(('http://', 'https://')):
                errors.append(f'{rid}: locator without a web address: {loc}')
            if not loc.get('label'):
                errors.append(f'{rid}: locator link without a label (the site it\'s on): {loc["url"]}')

    def check_further(rid, further):
        for item in further or []:
            if item.get('kind') not in FURTHER_KINDS:
                errors.append(f'{rid}: further reading kind "{item.get("kind")}" is not one of {", ".join(sorted(FURTHER_KINDS))}')
            if not str(item.get('url', '')).startswith(('http://', 'https://')):
                errors.append(f'{rid}: further reading without a web address: {item}')
            # Who published it, the piece's title and why it's worth
            # reading are kept apart (data/README.md), not run together.
            if not item.get('source'):
                errors.append(f'{rid}: further reading without its source (who published it): {item.get("url")}')
            extra = set(item) - {'kind', 'source', 'title', 'note', 'url'}
            if extra:
                errors.append(f'{rid}: further reading with unknown field(s) {", ".join(sorted(extra))}: {item.get("url")}')

    def check_suggested(rid, suggested):
        if not suggested:
            return
        if not isbn13_valid(suggested.get('isbn')):
            errors.append(f'{rid}: suggested edition ISBN "{suggested.get("isbn")}" is not a valid 13-digit ISBN')

    def check_display_links(rid, text, suggested=None):
        # Bookshop links written into display text must carry the affiliate ID
        # and lead to the reading's suggested edition, the one ISBN it records.
        isbn = (suggested or {}).get('isbn')
        for url in re.findall(r'href="(https?://(?:www\.)?bookshop\.org/[^"]*)"', text or ''):
            if affiliate and not url.startswith(affiliate):
                errors.append(f'{rid}: Bookshop link without the affiliate ID: {url}')
            elif not isbn:
                errors.append(f'{rid}: a Bookshop link in the display line, but no suggestedEdition: {url}')
            elif url != pattern.replace('{isbn}', isbn):
                errors.append(f'{rid}: the display line\'s Bookshop link isn\'t its suggested edition ({isbn}): {url}')

    for r in readings:
        if r.get('draft'):
            continue
        rid, cit = r['id'], r.get('citation') or {}
        ed = cit.get('edition') or {}
        if not cit.get('display'):
            errors.append(f'{rid}: no display citation')
        shown = set(re.findall(r'href="([^"]+)"', cit.get('display') or ''))
        # Where the display line leads to a suggested edition instead, the
        # locator stays the Source on the Sources page.
        to_bookshop = any('bookshop.org' in h for h in shown) and r.get('suggestedEdition')
        for holder in [cit] + (cit.get('quotes') or []):
            check_links(rid, (holder.get('edition') or {}).get('links'))
            check_edition_links(rid, holder.get('edition'))
            for loc in locators(holder):
                check_locator(rid, loc)
                # The display line takes the reader to the passage.
                if loc.get('url') and loc['url'] not in shown and not to_bookshop:
                    errors.append(f'{rid}: the display line doesn\'t link to its locator ({loc["url"]})')
        check_further(rid, r.get('furtherReading'))
        check_suggested(rid, r.get('suggestedEdition'))
        check_display_links(rid, cit.get('display'), r.get('suggestedEdition'))
        # A print-only citation needs no link when a suggested edition
        # leads the reader to the book.
        if not any(loc.get('url') for loc in locators(cit)) and not r.get('suggestedEdition'):
            gaps[rid].append('cited link or suggested edition')
        if not cit.get('bibliography'):
            gaps[rid].append('bibliography line')
        check_date(rid, 'written', cit.get('written'))
        for field in ('issued', 'original-date'):
            check_date(rid, field, ed.get(field))
        check_rights(rid, ed.get('rights'))
        if not ed.get('rights'):
            gaps[rid].append('rights')
        if not ed.get('title'):
            gaps[rid].append('edition title')
        if not ed.get('issued'):
            gaps[rid].append('edition date (issued)')
        if not ed.get('publisher'):
            gaps[rid].append('publisher')
        # The work quoted (a poem, essay, chapter or book), when it was
        # written, and where in the edition: asked of every reading alike,
        # whichever page shows it. A book quoted whole has its title and
        # first date on its edition. A locator may be a page or, for a
        # scan or web text, the exact link.
        if not (cit.get('title') or ed.get('title')):
            gaps[rid].append('work title')
        if not (cit.get('written') or ed.get('original-date')):
            gaps[rid].append('date written')
        if not any(loc.get('page') or loc.get('url') for loc in locators(cit)):
            gaps[rid].append('page or exact link')
        if not any(p.get('wikidata') for p in ed.get('contributors') or []):
            gaps[rid].append('author Wikidata ID')

    for img in images:
        if img.get('draft'):
            continue
        iid = img['id']
        check_date(iid, 'date', img.get('date'))
        check_rights(iid, img.get('rights'))
        check_links(iid, img.get('links'))
        if img.get('edition'):
            check_edition_links(iid, img['edition'])
            for loc in locators(img):
                check_locator(iid, loc)
            if not locators(img):
                gaps[iid].append('locator (page and link in the book)')
            if any(l.get('role') == 'cited' for l in img.get('links') or []):
                errors.append(f'{iid}: a plate from a book is cited by its locator, not a "cited" link')
        # source: where the image file itself was downloaded, and when.
        # The cited link is the work; this is the exact file, so a better
        # copy or a broken link can be traced later.
        source = img.get('source')
        if source is not None:
            if not str(source.get('url', '')).startswith(('http://', 'https://')):
                errors.append(f'{iid}: source without a web address: {source}')
            check_date(iid, 'source retrieved', source.get('retrieved'))
        if not (source and source.get('url') and source.get('retrieved')):
            gaps[iid].append('source file and retrieval date')
        check_further(iid, img.get('furtherReading'))
        check_display_links(iid, img.get('caption'))
        if not img.get('caption'):
            errors.append(f'{iid}: no display caption')
        if not img.get('bibliography'):
            gaps[iid].append('bibliography line')
        if not img.get('rights'):
            gaps[iid].append('rights')
        # Plates from books are cited by the book; stand-alone works by
        # the institution that holds them.
        if not img.get('edition') and not img.get('institution'):
            gaps[iid].append('holding institution')
        if img.get('creator') and not img['creator'].get('wikidata'):
            gaps[iid].append('creator Wikidata ID')

    drafts = [r['id'] for r in readings + images + writing if r.get('draft')]

    print(f'{len(readings)} readings, {len(images)} images, {len(writing)} pieces of writing'
          + (f', {len(drafts)} drafts (not shown on the site): {", ".join(drafts)}' if drafts else ''))
    if errors:
        print(f'\n{len(errors)} error(s):')
        for e in errors:
            print(f'  {e}')
    else:
        print('\nNo errors.')

    if not args.all:
        for rid in list(gaps):
            gaps[rid] = [f for f in gaps[rid] if f in CORE_GAPS]
            if not gaps[rid]:
                del gaps[rid]

    counts = defaultdict(int)
    for fields in gaps.values():
        for f in fields:
            counts[f] += 1
    if counts:
        print('\n' + ('All gaps' if args.all else 'Core gaps') + ' (records missing each field):')
        for field, n in sorted(counts.items(), key=lambda kv: -kv[1]):
            print(f'  {field}: {n}')
        if args.gaps:
            print()
            for rid, fields in gaps.items():
                print(f'  {rid}: {", ".join(fields)}')
        else:
            print('Run with --gaps to list them by record.')
    else:
        print('\nNo ' + ('' if args.all else 'core ') + 'gaps.')
    if not args.all:
        print('Research details (pages, publishers, Wikidata IDs and so on) are listed with --all.')

    # The Sources page is saved as static HTML; say when it no longer
    # matches the data it was built from.
    from build_sources import inputs_digest
    m = re.search(r'<!-- sources:start inputs=([0-9a-f]+) -->', (ROOT / 'sources.html').read_text())
    if not m:
        print('\nThe Sources page has not been built yet. Run: python3 scripts/build_sources.py')
    elif m.group(1) != inputs_digest():
        print('\nThe Sources page is out of date with the data. Run: python3 scripts/build_sources.py')

    # The pages show web copies of the images, made by build_images.py;
    # say when a master has none, or has changed since they were made.
    from build_images import stale_masters
    stale = stale_masters()
    if stale:
        print(f'\nWeb copies are missing or out of date for {len(stale)} image(s) '
              f'({", ".join(stale[:5])}{", ..." if len(stale) > 5 else ""}). '
              'Run: python3 scripts/build_images.py')

    # The head, frame and menu are copied into each page from partials/;
    # say when a page's copy no longer matches.
    from build_shared import stale_pages
    stale = stale_pages()
    if stale:
        print(f'\nShared parts are out of date on {len(stale)} page(s) ({", ".join(stale)}). '
              'Run: python3 scripts/build_shared.py')

    # sitemap.xml lists every page and reading; say when the list no
    # longer matches (lastmod dates aside).
    from build_sitemap import stale_addresses
    missing, extra = stale_addresses()
    if missing or extra:
        print(f'\nThe sitemap is out of date ({len(missing)} address(es) to add, {len(extra)} to remove). '
              'Run: python3 scripts/build_sitemap.py')
    # Each post's own page (lectio-terra/<name>/) is built from the post and
    # seasons.html; say when one no longer matches.
    from build_lectio_pages import stale_pages as stale_post_pages
    stale = stale_post_pages()
    if stale:
        print(f'\nPost pages are out of date ({", ".join(stale)}). Run: python3 scripts/build_lectio_pages.py')
    from build_sitemap import llms_stale
    if llms_stale():
        print('\nThe list of readings in llms.txt is out of date. Run: python3 scripts/build_sitemap.py')

    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
