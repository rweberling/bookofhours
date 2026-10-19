#!/usr/bin/env python3
"""Give each Lectio Terra post its ordered list of pieces ("body").

Usage:
  python3 scripts/build_post_manifests.py           # report
  python3 scripts/build_post_manifests.py --write   # save the lists

A post's HTML (bodyHtml in data/lectio-data.json) is read block by block
and matched to the records copy_lectio.py made from it, so the post can
be rebuilt from the records alone (renderPostBody() in shared.js). Each
item in a post's body is one of:

  {"heading": "Headnote", "tag": "h3"}   a part's heading, as the post has it
  {"hr": true}                           a rule between parts
  {"image": "i-0040"}                    a figure (numbered when shown)
  {"reading": "r-0041"}                  a passage and its citation;
  {"reading": "r-0068", "figures": [..]} ...with figures inside it
  {"writing": "w-0034", "blocks": [0, 5]}
                                         blocks 0 to 4 of a piece of
                                         writing (a figure may sit between
                                         two runs of the same piece);
  {"writing": "w-0041", "blocks": [3, 4], "figures": [..]}
                                         ...with figures at the end of its
                                         list's last item (weeks 13, 20)

Footnotes aren't listed: they're shown after everything else, from the
pieces they belong to. Substack's subscribe line and empty paragraphs at
the edges of a part are left out on purpose.

It also adds to each figure's image record what showing it needs and the
copy didn't keep: "link", where the figure links to when that isn't the
image itself; display.noCaption for the one the post shows without a
caption (not numbered); display.unlabelled for one whose caption has
no "Fig. 1." (numbered all the same); and display.size, the width and
height the post sets the figure at.
"""

import argparse
import json
import re
import sys

from datafile import ROOT, load, save
from copy_lectio import FIGURE, SECTION_HEADING, SUBSTACK_LINE, LECTIO
from post_html import blocks

EMPTY_P = re.compile(r'^<p>\s*</p>$')
# An image's file, or a video's (its first source).
IMG_SRC = re.compile(r'<(?:img|source)\b[^>]*\bsrc="([^"]+)"')
A_HREF = re.compile(r'<a\b[^>]*\bhref="([^"]+)"')


def build(post, readings, images, writing):
    """(body, problems, image updates) for one post."""
    mine = lambda records: [r for r in records if (r.get('lectio') or {}).get('post') == post['id']]
    passages = sorted(mine(readings), key=lambda r: r['lectio']['place'])
    by_file = {r['file']: r for r in mine(images)}
    pieces = {w['kind']: w for w in mine(writing)}
    pending = {kind: [h.strip() for _, h in blocks(w['text'])] for kind, w in pieces.items()}
    pointer = {kind: 0 for kind in pieces}

    body, problems, updates = [], [], {}
    section, reading_no, in_footnotes = 'before', 0, False

    def figure(html):
        src = IMG_SRC.search(html)
        youtube = re.search(r'\bdata-youtube="([\w-]+)"', html)
        file = f'https://www.youtube.com/watch?v={youtube.group(1)}' if youtube else (src.group(1) if src else None)
        record = by_file.get(file) if file else None
        if not record:
            problems.append(f'a figure with no image record: {html[:80]}')
            return None
        href = A_HREF.search(html)
        update = {}
        img = re.search(r'<(?:img|video)\b[^>]*>', html)
        img = img.group(0) if img else ''
        w, h = re.search(r'\bwidth="([\d.]+)"', img), re.search(r'\bheight="([\d.]+)"', img)
        if w and h:
            update['size'] = [round(float(w.group(1))), round(float(h.group(1)))]
        if href and href.group(1) != record['file'] and not youtube:
            update['link'] = href.group(1)
        caption = re.search(r'<figcaption[^>]*>(.*?)</figcaption>', html, re.S)
        if not caption:
            update['noCaption'] = True
        elif not re.match(r'\s*(?:<(?:em|i|strong|b)>)?\s*fig(?:ure)?\.?\s*\d', caption.group(1), re.I):
            update['unlabelled'] = True
        if update:
            updates[record['id']] = update
        return record['id']

    def writing_block(kind, html):
        rec = pieces.get(kind)
        inside = FIGURE.findall(html)
        bare = FIGURE.sub('', html).strip()
        if rec and pointer[kind] < len(pending[kind]) and pending[kind][pointer[kind]] == bare:
            n = pointer[kind]
            pointer[kind] += 1
            last = body[-1] if body else None
            if not inside and last and last.get('writing') == rec['id'] and last['blocks'][1] == n \
                    and 'figures' not in last:
                last['blocks'][1] = n + 1
            else:
                item = {'writing': rec['id'], 'blocks': [n, n + 1]}
                if inside:
                    item['figures'] = [f for f in (figure(h) for h in inside) if f]
                body.append(item)
            return True
        return False

    writing_kind = {'before': 'note', 'headnote': 'headnote', 'supplementum': 'supplementum'}
    for tag, html in blocks(post.get('bodyHtml') or ''):
        heading = SECTION_HEADING.fullmatch(html.strip())
        if heading:
            section = heading.group(1).lower()
            text = re.sub(r'<[^>]+>', '', html).strip()
            body.append({'heading': text, 'tag': tag})
            continue
        if SUBSTACK_LINE.fullmatch(html.strip()):
            continue
        if tag == 'figure':
            fid = figure(html)
            if fid:
                body.append({'image': fid})
            continue
        if section == 'readings':
            if tag == 'ol':
                if reading_no >= len(passages):
                    problems.append(f'a list with no reading record: {html[:80]}')
                    continue
                item = {'reading': passages[reading_no]['id']}
                inner = [figure(f.group(0)) for f in FIGURE.finditer(html)]
                if inner:
                    item['figures'] = [f for f in inner if f]
                body.append(item)
                reading_no += 1
            elif tag == 'hr':
                body.append({'hr': True})
            # Anything else here is a citation, or a passage set out after
            # its list (week 11): part of the reading before it.
            continue
        if 'href="#footnote-anchor-' in html:
            in_footnotes = True
        if in_footnotes:
            continue
        kind = writing_kind[section]
        if writing_block(kind, html):
            continue
        if EMPTY_P.match(html.strip()):
            continue
        if tag == 'hr':
            body.append({'hr': True})
            continue
        problems.append(f'{section}: a block not in its writing record: {html[:80]}')

    for kind, n in pointer.items():
        if n != len(pending[kind]):
            problems.append(f'{kind} {pieces[kind]["id"]}: blocks {n} to {len(pending[kind]) - 1} never placed')
    if reading_no != len(passages):
        problems.append(f'{len(passages) - reading_no} reading records never placed')
    return body, problems, updates


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--write', action='store_true', help='save each post\'s body, and the figures\' links')
    args = parser.parse_args()

    readings, images, writing = load('readings'), load('images'), load('writing')
    lectio = json.loads(LECTIO.read_text(encoding='utf-8'))
    all_updates, failed = {}, 0
    for season, items in lectio['seasons'].items():
        for post in items:
            body, problems, updates = build(post, readings, images, writing)
            all_updates.update(updates)
            for p in problems:
                print(f'{post["id"]}: {p}', file=sys.stderr)
            failed += bool(problems)
            post['body'] = body
            print(f'{post["id"]}: {len(body)} items{"" if not problems else " (with problems)"}')
    print(f'{len(all_updates)} figures described; {failed} posts with problems.')

    if args.write:
        for img in images:
            update = all_updates.get(img['id'])
            if update and 'link' in update:
                img['link'] = update['link']
            for flag in ('noCaption', 'unlabelled'):
                if update and update.get(flag):
                    img.setdefault('display', {})[flag] = True
            if update and update.get('size'):
                img.setdefault('display', {})['size'] = update['size']
        save('images', images)
        LECTIO.write_text(json.dumps(lectio, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print('Saved.')


if __name__ == '__main__':
    main()
