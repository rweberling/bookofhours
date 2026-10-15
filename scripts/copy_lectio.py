#!/usr/bin/env python3
"""Copy the passages and figures in Lectio Terra posts into the collection.

Usage:
  python3 scripts/copy_lectio.py           # report what would change
  python3 scripts/copy_lectio.py --write   # add the new ones

Each post in data/lectio-data.json quotes its readings under the Readings
heading, one passage to a numbered list, with its citation straight
after, and shows its images as numbered figures with captions. This
gives each passage a reading record (data/readings.json) and each figure
an image record (data/images.json) of its own, numbered on from the last
r- or i- ID, with:

  text      (a passage) the passage, with lines joined by <br> and
            paragraphs or stanzas by <br><br>, as in the other readings
  citation  (a passage) display: the citation as the post gives it
  file      (a figure) the image file the post shows
  caption   (a figure) its caption as the post gives it, without the
            post's own "Fig. 2." numbering
  lectio    the post it appears in (its lt- ID) and its place there:
            passage 2, or figure 3
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
# The post's own numbering at the start of a caption, "Fig. 2." or
# "Figure 2.", which may sit just inside an opening <em>.
FIGURE_LABEL = re.compile(r'^(\s*(?:<(?:em|i|strong|b)>)?)\s*fig(?:ure)?\.?\s*\d+\s*[.:]\s*', re.I)


def preformatted(text):
    """A preformatted paragraph's own line breaks, as <br>."""
    lines = [line.rstrip() for line in text.strip().split('\n')]
    return re.sub(r'(<br>){3,}', '<br><br>', '<br>'.join(lines))


def passage_text(html):
    """The passage in the readings' own markup: <br> between lines, <br><br>
    between paragraphs or stanzas (an empty paragraph in the post)."""
    html = re.sub(r'<figure\b.*?</figure>', '', html, flags=re.S)
    paras = [(cls, p.strip()) for cls, p in re.findall(r'<p\b([^>]*)>(.*?)</p>', html, re.S)]
    if not paras:
        return html.strip()
    out, gap = [], False
    for cls, p in paras:
        if not p:
            gap = bool(out)
            continue
        if out:
            out.append('<br><br>' if gap else '<br>')
        out.append(preformatted(p) if 'preformatted' in cls else p)
        gap = False
    return ''.join(out)


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


def plain(html):
    return re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]+>', ' ', html))).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--write', action='store_true', help='add the new pieces to data/readings.json and data/images.json')
    args = parser.parse_args()

    readings, images = load('readings'), load('images')
    retired = json.loads((ROOT / 'data' / 'retired-ids.json').read_text())
    lectio = json.loads(LECTIO.read_text(encoding='utf-8'))
    posts = sorted(((season, post) for season, items in lectio['seasons'].items() for post in items),
                   key=lambda sp: (sp[1].get('published') or '', sp[1]['id']))

    copied_r = {(r['lectio']['post'], r['lectio']['place']): r for r in readings if r.get('lectio')}
    copied_i = {(r['lectio']['post'], r['lectio']['place']): r for r in images if r.get('lectio')}
    next_r, next_i = next_number(readings, retired, 'r'), next_number(images, retired, 'i')

    added_r, added_i, differ, unlinked = [], [], [], set()
    for season, post in posts:
        if not (post.get('subject') or '').startswith(('sp-', 'ph-')):
            unlinked.add(post['id'])
        for place, text, citation in passages(post):
            record = copied_r.get((post['id'], place))
            if record:
                if plain(record['text']) != plain(text):
                    differ.append(f'{record["id"]} ({post["id"]}, passage {place}): the passage')
                continue
            record = {
                'id': f'r-{next_r:04d}',
                'shownIn': 'seasons',
                'text': text,
                'citation': {'display': citation},
                'lectio': {'post': post['id'], 'place': place},
                'tags': subject_tags(post, season)
            }
            next_r += 1
            readings.append(record)
            added_r.append(record)
        for place, file, caption in figures(post):
            record = copied_i.get((post['id'], place))
            if record:
                if record['file'] != file:
                    differ.append(f'{record["id"]} ({post["id"]}, figure {place}): the image file')
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

    for r in added_r:
        print(f'{r["id"]}: {r["lectio"]["post"]} passage {r["lectio"]["place"]}: {plain(r["citation"]["display"])[:70]}')
    for r in added_i:
        print(f'{r["id"]}: {r["lectio"]["post"]} figure {r["lectio"]["place"]}: {plain(r["caption"])[:70]}')
    for d in differ:
        print(f'{d} in the post no longer matches the record; neither was changed', file=sys.stderr)
    for pid in sorted(unlinked):
        print(f'{pid} has no subject yet: add its sp- or ph- record to the post, then tag its pieces', file=sys.stderr)
    if not (added_r or added_i):
        print('Nothing new to copy.')
    elif args.write:
        if added_r:
            save('readings', readings)
        if added_i:
            save('images', images)
        print(f'Added {len(added_r)} passages to data/readings.json and {len(added_i)} figures to data/images.json.')
    else:
        print(f'{len(added_r)} new passages and {len(added_i)} new figures. Run with --write to add them.')


if __name__ == '__main__':
    main()
