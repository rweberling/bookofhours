#!/usr/bin/env python3
"""Copy the passages, figures and writing in Lectio Terra posts into the collection.

Usage:
  python3 scripts/copy_lectio.py           # report what would change
  python3 scripts/copy_lectio.py --write   # add the new ones

Each post in data/lectio-data.json has a Headnote, then its readings
under the Readings heading (one passage to a numbered list, with its
citation straight after), then a Supplementum; some open with a note to
readers before the Headnote, and some have footnotes. Its images are
numbered figures with captions. This gives each passage a reading record
(data/readings.json), each figure an image record (data/images.json),
and each piece of the post's own writing a writing record
(data/writing.json), numbered on from the last r-, i- or w- ID, with:

  text      (a passage) the passage as the post sets it out: its own
            paragraphs and line breaks, less any figures
  citation  (a passage) display: the citation as the post gives it
  kind      (writing) note, headnote or supplementum
  text      (writing) its HTML as the post gives it, less the figures
            (which are image records) and Substack's "reader-supported
            publication" line
  footnotes the post's footnotes whose references are in this piece (a
            piece of writing, or a passage), each its marker and text
  file      (a figure) the image file the post shows
  caption   (a figure) its caption as the post gives it, without the
            post's own "Fig. 2." numbering
  lectio    the post it appears in (its lt- ID) and its place there:
            passage 2, or figure 3 (writing has one of each kind per
            post)
  shownIn   seasons: the Seasons page shows it, inside its post
  tags      the post's season, and its subject (the sp- or ph- record
            the post names as "subject")

The post itself is unchanged: the Seasons page still shows it whole.

Pieces already copied (matched by post and place) are left alone, so
anything added to their records by hand (a bibliography line, rights,
tags) stays. If a post's passage or figure no longer matches its record,
this reports it rather than overwriting either. Only new pieces are
added, and an ID is never reused.

import_substack.py runs this (with --write) after importing posts.
"""

import argparse
import json
import re
import sys
from html import unescape
from pathlib import Path

from datafile import ROOT, load, save

LECTIO = ROOT / 'data' / 'lectio-data.json'
PASSAGE = re.compile(r'<ol\b[^>]*>\s*<li>(.*?)</li>\s*</ol>', re.S)
READINGS_HEADING = re.compile(r'<h[23][^>]*>\s*readings\s*</h[23]>', re.I)
NEXT_HEADING = re.compile(r'<h[23]\b')
BLOCK = re.compile(r'<(?:p|figure|h[1-6]|ol|ul|hr|blockquote|div)\b')
FIGURE = re.compile(r'<figure\b.*?</figure>', re.S)
SECTION_HEADING = re.compile(r'<h[23][^>]*>\s*(headnote|readings|supplementum)\s*</h[23]>', re.I)
SUBSTACK_LINE = re.compile(r'<p>\s*Otherwise is a reader-supported publication\..*?</p>', re.S)
NOTE_MARK = re.compile(r'<a\b[^>]*href="#footnote-anchor-(\d+)"[^>]*>.*?</a>', re.S)
EMPTY_EDGE = re.compile(r'^(\s*<p>\s*</p>)+|(<p>\s*</p>\s*)+$')
# The post's own numbering at the start of a caption, "Fig. 2." or
# "Figure 2.", which may sit just inside an opening <em>.
FIGURE_LABEL = re.compile(r'^(\s*(?:<(?:em|i|strong|b)>)?)\s*fig(?:ure)?\.?\s*\d+\s*[.:]\s*', re.I)


def passage_text(html):
    """The passage as the post sets it out (its paragraphs, line breaks and
    any preformatted lines), less figures and empty paragraphs at either
    end."""
    html = re.sub(r'<figure\b.*?</figure>', '', html, flags=re.S)
    return EMPTY_EDGE.sub('', html.strip()).strip()


def citation_text(html):
    """The citation: the text straight after the passage, or, when the post
    puts it in a paragraph of its own, the first such paragraph."""
    found = BLOCK.search(html)
    bare = (html[:found.start()] if found else html).strip()
    if bare:
        return bare
    for cls, p in re.findall(r'<p\b([^>]*)>(.*?)</p>', html, re.S):
        if p.strip() and 'preformatted' not in cls:
            return re.sub(r'(<em>\s*</em>|\s)+$', '', p.strip())
    return ''


def passages(post):
    """(place, text, citation) for each passage under the post's Readings heading."""
    body = post.get('bodyHtml') or ''
    start = READINGS_HEADING.search(body)
    if not start:
        return []
    section = body[start.end():]
    end = NEXT_HEADING.search(section)
    section = section[:end.start()] if end else section
    found = list(PASSAGE.finditer(section))
    out = []
    for n, m in enumerate(found):
        after = section[m.end():found[n + 1].start() if n + 1 < len(found) else len(section)]
        text = passage_text(m.group(1))
        if not text:
            # An empty list item, with the passage in preformatted
            # paragraphs just after it (week 11).
            lead = re.match(r'(\s*<p\b[^>]*preformatted[^>]*>.*?</p>)+', after, re.S)
            if lead:
                text, after = passage_text(lead.group(0)), after[lead.end():]
        out.append((n + 1, text, citation_text(after)))
    return out


def figures(post):
    """(place, file, caption) for each figure in the post, in order."""
    out = []
    for n, m in enumerate(FIGURE.finditer(post.get('bodyHtml') or '')):
        img = re.search(r'<img\b[^>]*\bsrc="([^"]+)"', m.group(0))
        caption = re.search(r'<figcaption\b[^>]*>(.*?)</figcaption>', m.group(0), re.S)
        caption = FIGURE_LABEL.sub(r'\1', caption.group(1).strip()) if caption else ''
        if not caption:
            # An image the post shows without a caption (one, in week 30).
            caption = f'An image in the Lectio Terra post “{plain(post.get("title") or "")}”'
        out.append((n + 1, img.group(1) if img else '', caption))
    return out


def sections(post):
    """The post's HTML in its parts: what comes before the Headnote, the
    Headnote, the Readings and the Supplementum (any missing are '')."""
    body = post.get('bodyHtml') or ''
    found = list(SECTION_HEADING.finditer(body))
    parts = {'before': body[:found[0].start()] if found else body}
    for n, m in enumerate(found):
        end = found[n + 1].start() if n + 1 < len(found) else len(body)
        parts[m.group(1).lower()] = body[m.end():end]
    return parts


def own_text(html):
    """A piece of the post's writing, without its figures, Substack's
    subscribe line, or empty paragraphs at either end."""
    html = FIGURE.sub('', html)
    html = SUBSTACK_LINE.sub('', html)
    return EMPTY_EDGE.sub('', html.strip()).strip()


def writings(post):
    """The post's own writing: [(kind, text)] for its note, headnote and
    supplementum, and {where: [footnote]} for its footnotes, by the piece
    their reference is in ('note', 'headnote', 'supplementum', or
    ('passage', place); None if it wasn't found)."""
    parts = sections(post)
    supplementum = parts.get('supplementum', '')
    notes = list(NOTE_MARK.finditer(supplementum))
    footnotes = []
    for n, m in enumerate(notes):
        end = notes[n + 1].start() if n + 1 < len(notes) else len(supplementum)
        footnotes.append((int(m.group(1)), own_text(supplementum[m.end():end])))
    if notes:
        supplementum = supplementum[:notes[0].start()]

    pieces = []
    for kind, html in (('note', parts.get('before', '')), ('headnote', parts.get('headnote', '')),
                       ('supplementum', supplementum)):
        text = own_text(html)
        if plain(text):
            pieces.append((kind, text))
    notes_by_piece = {}
    for marker, text in footnotes:
        ref = f'href="#footnote-{marker}"'
        where = next((kind for kind, t in pieces if ref in t), None)
        if not where:
            where = next((('passage', place) for place, t, _ in passages(post) if ref in t), None)
        notes_by_piece.setdefault(where, []).append({'marker': marker, 'text': text})
    return pieces, notes_by_piece


def with_footnotes(record, notes):
    """The record with its footnotes just after its text, if it has any."""
    if not notes:
        return record
    out = {}
    for key, value in record.items():
        out[key] = value
        if key == 'text':
            out['footnotes'] = notes
    return out


def same_notes(record, notes):
    return [(n['marker'], plain(n['text'])) for n in record.get('footnotes') or []] == \
           [(n['marker'], plain(n['text'])) for n in notes or []]


def subject_tags(post, season):
    tags = {'hours': [], 'weather': [], 'seasons': [season]}
    subject = post.get('subject') or ''
    if subject.startswith(('sp-', 'ph-')):
        tags['species' if subject.startswith('sp-') else 'phenomena'] = [subject]
    return tags


def next_number(records, retired, prefix):
    form = re.compile(rf'^{prefix}-(\d{{4}})$')
    used = [int(m.group(1)) for i in [r['id'] for r in records] + retired if (m := form.match(i))]
    return max(used, default=0) + 1


def same(a, b):
    """Whether two copies say the same: the same words and the same links."""
    links = lambda h: re.findall(r'href="([^"]+)"', h or '')
    return plain(a) == plain(b) and links(a) == links(b)


def plain(html):
    return re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]+>', ' ', html))).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--write', action='store_true', help='add the new pieces to data/readings.json and data/images.json')
    args = parser.parse_args()

    readings, images, writing = load('readings'), load('images'), load('writing')
    retired = json.loads((ROOT / 'data' / 'retired-ids.json').read_text())
    lectio = json.loads(LECTIO.read_text(encoding='utf-8'))
    posts = sorted(((season, post) for season, items in lectio['seasons'].items() for post in items),
                   key=lambda sp: (sp[1].get('published') or '', sp[1]['id']))

    copied_r = {(r['lectio']['post'], r['lectio']['place']): r for r in readings if r.get('lectio')}
    copied_i = {(r['lectio']['post'], r['lectio']['place']): r for r in images if r.get('lectio')}
    copied_w = {(w['lectio']['post'], w['kind']): w for w in writing if w.get('lectio')}
    next_r, next_i = next_number(readings, retired, 'r'), next_number(images, retired, 'i')
    next_w = next_number(writing, retired, 'w')

    added_r, added_i, added_w, differ, unlinked = [], [], [], [], set()
    for season, post in posts:
        if not (post.get('subject') or '').startswith(('sp-', 'ph-')):
            unlinked.add(post['id'])
        pieces, notes = writings(post)
        for note in notes.get(None, []):
            differ.append(f'{post["id"]}, footnote {note["marker"]}: its reference was not found')
        for place, text, citation in passages(post):
            record = copied_r.get((post['id'], place))
            if record:
                if not same(record['text'], text):
                    differ.append(f'{record["id"]} ({post["id"]}, passage {place}): the passage')
                if not same(record['citation'].get('display', ''), citation):
                    differ.append(f'{record["id"]} ({post["id"]}, passage {place}): its citation')
                if not same_notes(record, notes.get(('passage', place))):
                    differ.append(f'{record["id"]} ({post["id"]}, passage {place}): its footnotes')
                continue
            record = {
                'id': f'r-{next_r:04d}',
                'shownIn': 'seasons',
                'text': text,
                'citation': {'display': citation},
                'lectio': {'post': post['id'], 'place': place},
                'tags': subject_tags(post, season)
            }
            record = with_footnotes(record, notes.get(('passage', place)))
            next_r += 1
            readings.append(record)
            added_r.append(record)
        for place, file, caption in figures(post):
            record = copied_i.get((post['id'], place))
            if record:
                if record['file'] != file:
                    differ.append(f'{record["id"]} ({post["id"]}, figure {place}): the image file')
                if not same(record['caption'], caption):
                    differ.append(f'{record["id"]} ({post["id"]}, figure {place}): its caption')
                continue
            record = {
                'id': f'i-{next_i:04d}',
                'shownIn': 'seasons',
                'file': file,
                'caption': caption,
                'lectio': {'post': post['id'], 'place': place},
                'tags': subject_tags(post, season)
            }
            next_i += 1
            images.append(record)
            added_i.append(record)
        for kind, text in pieces:
            record = copied_w.get((post['id'], kind))
            if record:
                if not same(record['text'], text):
                    differ.append(f'{record["id"]} ({post["id"]}, {kind}): the text')
                if not same_notes(record, notes.get(kind)):
                    differ.append(f'{record["id"]} ({post["id"]}, {kind}): its footnotes')
                continue
            record = with_footnotes({
                'id': f'w-{next_w:04d}',
                'kind': kind,
                'shownIn': 'seasons',
                'text': text,
                'lectio': {'post': post['id']},
                'tags': subject_tags(post, season)
            }, notes.get(kind))
            next_w += 1
            writing.append(record)
            added_w.append(record)

    for r in added_r:
        print(f'{r["id"]}: {r["lectio"]["post"]} passage {r["lectio"]["place"]}: {plain(r["citation"]["display"])[:70]}')
    for r in added_i:
        print(f'{r["id"]}: {r["lectio"]["post"]} figure {r["lectio"]["place"]}: {plain(r["caption"])[:70]}')
    for w in added_w:
        print(f'{w["id"]}: {w["lectio"]["post"]} {w["kind"]}: {plain(w["text"])[:60]}')
    for d in differ:
        print(f'{d} in the post no longer matches the record, or is missing; nothing was changed', file=sys.stderr)
    for pid in sorted(unlinked):
        print(f'{pid} has no subject yet: add its sp- or ph- record to the post, then tag its pieces', file=sys.stderr)
    if not (added_r or added_i or added_w):
        print('Nothing new to copy.')
    elif args.write:
        if added_r:
            save('readings', readings)
        if added_i:
            save('images', images)
        if added_w:
            save('writing', writing)
        print(f'Added {len(added_r)} passages, {len(added_i)} figures and {len(added_w)} pieces of writing.')
    else:
        print(f'{len(added_r)} new passages, {len(added_i)} new figures and {len(added_w)} new pieces of writing. '
              'Run with --write to add them.')


if __name__ == '__main__':
    main()
