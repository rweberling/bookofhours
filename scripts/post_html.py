"""Split a post's HTML into its top-level blocks.

Shared by build_post_manifests.py (which works out each post's list of
pieces) and the checks. The post HTML comes from the Substack import,
which keeps only well-formed, simple markup, so a small tokenizer does:
it walks the tags, tracks how deep it is, and cuts the HTML wherever it
comes back to the top. Text between top-level elements (a citation
written straight after a reading's list) is a block of its own; text
that is only whitespace is dropped.

shared.js does the same split in the browser (topLevelBlocks()), so a
range of blocks means the same thing to both.
"""

import re

TAG = re.compile(r'<(/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(/?)>')
VOID = {'img', 'br', 'hr', 'wbr', 'input', 'meta', 'link', 'source', 'col', 'area'}


def blocks(html):
    """The top-level blocks of html, in order: [(tag or '#text', html)]."""
    out, depth, start, top_tag, pos = [], 0, None, None, 0
    for m in TAG.finditer(html or ''):
        closing, name, selfclosing = m.group(1), m.group(2).lower(), m.group(3)
        if depth == 0:
            text = html[pos:m.start()]
            if not closing and text.strip():
                out.append(('#text', text))
            if closing:
                # A stray end tag at the top: keep it with the text around it.
                continue
            if name in VOID or selfclosing:
                out.append((name, m.group(0)))
                pos = m.end()
                continue
            depth, start, top_tag = 1, m.start(), name
            continue
        if name in VOID or selfclosing:
            continue
        depth += -1 if closing else 1
        if depth == 0:
            out.append((top_tag, html[start:m.end()]))
            pos = m.end()
    tail = (html or '')[pos:] if depth == 0 else (html or '')[start:]
    if tail.strip():
        out.append(('#text', tail) if depth == 0 else (top_tag, tail))
    return out
