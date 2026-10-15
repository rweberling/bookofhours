#!/usr/bin/env python3
"""Copy the passages quoted in Lectio Terra posts into data/readings.json.

Usage:
  python3 scripts/copy_lectio_readings.py           # report what would change
  python3 scripts/copy_lectio_readings.py --write   # add the new passages

Each post in data/lectio-data.json quotes its readings under the Readings
heading, one passage to a numbered list, with its citation straight
after. This gives each passage a reading record of its own, numbered on
from the last r- ID, with:

  text      the passage, with lines joined by <br> and paragraphs or
            stanzas by <br><br>, as in the other readings
  citation  display: the citation as the post gives it
  lectio    the post it appears in (its lt- ID) and its place there
  shownIn   seasons: the Seasons page shows it, inside its post
  tags      the post's season, and its subject (the sp- or ph- record
            the post names as "subject")

The post itself is unchanged: the Seasons page still shows it whole.

Passages already copied (matched by post and place) are left alone, so
anything added to their records by hand (a bibliography line, an
edition, tags) stays. If a passage's text in the post no longer matches
its record, this reports it rather than overwriting either. Only new
passages are added, and an ID is never reused.

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
R_ID = re.compile(r'^r-(\d{4})$')


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


def plain(html):
    return re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]+>', ' ', html))).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--write', action='store_true', help='add the new passages to data/readings.json')
    args = parser.parse_args()

    readings = load('readings')
    retired = json.loads((ROOT / 'data' / 'retired-ids.json').read_text())
    lectio = json.loads(LECTIO.read_text(encoding='utf-8'))
    posts = sorted(((season, post) for season, items in lectio['seasons'].items() for post in items),
                   key=lambda sp: (sp[1].get('published') or '', sp[1]['id']))

    copied = {(r['lectio']['post'], r['lectio']['place']): r for r in readings if r.get('lectio')}
    used = [int(m.group(1)) for i in [r['id'] for r in readings] + retired if (m := R_ID.match(i))]
    next_number = max(used, default=0) + 1

    added, differ, unlinked = [], [], set()
    for season, post in posts:
        for place, text, citation in passages(post):
            record = copied.get((post['id'], place))
            if record:
                if plain(record['text']) != plain(text):
                    differ.append(f'{record["id"]} ({post["id"]}, passage {place})')
                continue
            record = {
                'id': f'r-{next_number:04d}',
                'shownIn': 'seasons',
                'text': text,
                'citation': {'display': citation},
                'lectio': {'post': post['id'], 'place': place},
                'tags': {'hours': [], 'weather': [], 'seasons': [season]}
            }
            subject = post.get('subject') or ''
            if subject.startswith(('sp-', 'ph-')):
                record['tags']['species' if subject.startswith('sp-') else 'phenomena'] = [subject]
            else:
                unlinked.add(post['id'])
            next_number += 1
            readings.append(record)
            added.append(record)

    for r in added:
        print(f'{r["id"]}: {r["lectio"]["post"]} passage {r["lectio"]["place"]}: {plain(r["citation"]["display"])[:70]}')
    for d in differ:
        print(f'{d}: the post\'s text no longer matches the record; neither was changed', file=sys.stderr)
    for pid in sorted(unlinked):
        print(f'{pid} has no subject yet: add its sp- or ph- record to the post, then tag its readings', file=sys.stderr)
    if not added:
        print('No new passages.')
    elif args.write:
        save('readings', readings)
        print(f'Added {len(added)} passages to data/readings.json.')
    else:
        print(f'{len(added)} new passages. Run with --write to add them.')


if __name__ == '__main__':
    main()
