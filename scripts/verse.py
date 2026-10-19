#!/usr/bin/env python3
"""Mark readings as verse and set their text out in the house verse form.

Usage:
  python3 scripts/verse.py r-0045 r-0062            # show what would change
  python3 scripts/verse.py r-0045 --lines --write   # change them

A reading marked "display": {"verse": true} is shown one line to a line:
a line too long for the page carries on under a hanging indent, and the
poem's own indents are kept (verseHTML() in shared.js). Its text is
held in one form, whatever the poem came from:

  lines     joined by <br>
  stanzas   separated by <br><br> (one blank line, never more)
  indents   leading &nbsp;s, one for each space of the indent
  no        <p> tags, raw line breaks, or breaks at either end

This turns a reading's text into that form and sets the flag. Readings
copied from Lectio Terra posts come as the post set them out, which
varies: a "preformatted" paragraph with plain line breaks (each space
of an indent kept), a paragraph to each stanza, or a paragraph to each
line. The first is recognised; for the other two, say which:

  (default)  each <p> is a stanza
  --lines    each <p> is a line (an empty one marks a stanza break)

Only the setting out changes, never the words or links: it stops if
the result would read differently (by the test copy_lectio.py uses to
match a post with its copies), so a copy still matches its post. The
post itself is never changed.
"""

import argparse
import re
import sys

from copy_lectio import same
from datafile import load, save

BREAK = re.compile(r'<br\s*/?>', re.I)
INLINE = r'(?:strong|em|b|i|a)'


def as_verse(html, paragraph_is_line=False):
    """The text in the house verse form (see above)."""
    html = html.replace('﻿', '').replace(' ', '&nbsp;')

    # A preformatted paragraph: its line breaks are lines, its leading
    # spaces indents.
    def preformatted(m):
        lines = m.group(1).split('\n')
        return '<p>' + '<br>'.join(
            '&nbsp;' * (len(line) - len(line.lstrip(' '))) + line.lstrip(' ') for line in lines) + '</p>'
    html = re.sub(r'<p\b[^>]*preformatted[^>]*>(.*?)</p>', preformatted, html, flags=re.S)

    # Anywhere else a raw line break is only HTML whitespace.
    html = re.sub(r'\s*\n\s*', ' ', html)
    # Keep inline tags with their words, not stranded across a break.
    html = re.sub(r'(?:' + BREAK.pattern + r')(\s*</' + INLINE + r'>)', r'\1<br>', html, flags=re.I)
    html = re.sub(r'(<' + INLINE + r'\b[^>]*>\s*)(?:' + BREAK.pattern + r')', r'<br>\1', html, flags=re.I)

    paragraphs = re.findall(r'<p\b[^>]*>(.*?)</p>', html, re.S) if '<p' in html else [html]
    if paragraph_is_line:
        lines = BREAK.split('<br>'.join(paragraphs))
    else:
        lines = []
        for p in paragraphs:
            if re.sub(r'<[^>]+>|&nbsp;|\s', '', p):
                lines += BREAK.split(p) + ['']

    out = []
    for line in lines:
        line = line.strip(' \t')
        blank = not re.sub(r'<[^>]+>|&nbsp;|\s', '', line)
        if blank:
            if out and out[-1]:
                out.append('')
        else:
            out.append(line)
    while out and not out[-1]:
        out.pop()
    return '<br>'.join(out)


def in_verse_form(text):
    """Whether a verse reading's text is in the house form; the reason if not."""
    if '<p' in text:
        return 'it has <p> tags'
    if '\n' in text:
        return 'it has raw line breaks'
    if re.match(r'\s*<br', text) or re.search(r'<br\s*/?>\s*$', text):
        return 'it starts or ends with a break'
    if re.search(r'(?:<br\s*/?>\s*){3}', text):
        return 'it has more than one blank line in a row'
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('ids', nargs='+', help='reading IDs')
    parser.add_argument('--lines', action='store_true', help='each <p> is a line, not a stanza')
    parser.add_argument('--write', action='store_true', help='save the changes')
    args = parser.parse_args()

    readings = load('readings')
    by_id = {r['id']: r for r in readings}
    changed = 0
    for rid in args.ids:
        rec = by_id.get(rid)
        if not rec:
            sys.exit(f'{rid}: no such reading')
        text = as_verse(rec['text'], args.lines)
        # (A stray byte-order mark, from a paste, is the one thing it drops.)
        if not same(rec['text'].replace('\ufeff', ''), text):
            print(f'{rid}: the verse form would change its words or links; set it out by hand', file=sys.stderr)
            continue
        marked = (rec.get('display') or {}).get('verse')
        if text == rec['text'] and marked:
            print(f'{rid}: already in verse form')
            continue
        print(f'{rid}:\n  ' + text.replace('<br>', '\n  ') + '\n')
        rec['text'] = text
        rec['display'] = {**(rec.get('display') or {}), 'verse': True}
        changed += 1
    if args.write and changed:
        save('readings', readings)
        print(f'Saved {changed}. Now run python3 scripts/check_data.py.')
    elif changed:
        print('Nothing saved; add --write to save.')


if __name__ == '__main__':
    main()
