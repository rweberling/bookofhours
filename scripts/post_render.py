"""A Lectio Terra post, rebuilt from the collection: the site's one renderer
of a post.

A post's "body" (scripts/build_post_manifests.py) lists its pieces in
order: headings, rules, figures (image records), passages (reading
records) and runs of its own writing (writing records). render_post_body()
turns that list back into the post's HTML: each passage a one-item list
(marked as verse where it is) followed by its citation in a block of its
own, figures numbered in order, footnotes linked both ways and gathered
at the end.

build_lectio_pages.py writes it into each post's page, so the page holds
the post as the records have it, readers without JavaScript included.
The Seasons page shows a post by fetching that page (postBody() in
seasons.js), and seasons.js adds the margin labels, numerals and rules.
"""

import re
from html import escape as _escape

from post_html import blocks


def escape(text):
    """&, <, > and " made safe."""
    return _escape('' if text is None else str(text), quote=False).replace('"', '&quot;')


def plain(html):
    return re.sub(r'<[^>]*>', '', html or '')


def reading_html(reading):
    """Verse one line to a line (the house verse form, scripts/verse.py),
    prose as written; as readingHTML() in shared.js sets a reading out on
    the Hours and Weather pages."""
    text = reading.get('text') or ''
    if not (reading.get('display') or {}).get('verse'):
        return text
    lines = []
    for line in re.split(r'<br\s*/?>', text, flags=re.I):
        lead = re.match(r'^(?:&nbsp;)*', line).group(0)
        rest = line[len(lead):]
        if not rest.strip():
            lines.append('<span class="verse-gap"></span>')
        else:
            indent = len(lead) / 6
            indent = int(indent) if indent == int(indent) else indent
            lines.append(f'<span class="verse-line" style="--indent: {indent}">{rest}</span>')
    return ''.join(lines)


def record_mark(rid):
    """The small ¶ after a credit, leading to the piece's record page
    (/id/<id>/), as on the Hours, the Weather and Sources (recordMark()
    in shared.js). Readings and images only: they have record pages."""
    if not rid or rid.split('-')[0] not in ('r', 'i'):
        return ''
    rid = escape(rid)
    return (f'<a class="record-mark" href="/id/{rid}/" title="The record: {rid}" '
            f'aria-label="The record, {rid}">¶</a>')


def figure_html(image, number):
    display = image.get('display') or {}
    label = '' if display.get('unlabelled') else f'Fig. {number}. '
    caption = ('' if display.get('noCaption')
               else f'<figcaption>{label}{image.get("caption") or ""}{record_mark(image.get("id"))}</figcaption>')
    size = f' width="{display["size"][0]}" height="{display["size"][1]}"' if display.get('size') else ''
    youtube = re.search(r'youtube\.com/watch\?v=([\w-]+)', image.get('file') or '')
    if youtube:
        title = escape(re.sub(r'[“”"]', '', plain(image.get('caption') or '').split(',')[0]))
        return (f'<figure class="video-embed"><button type="button" class="video-play" data-youtube="{youtube.group(1)}" '
                f'aria-label="Play the video: {title}"><span class="video-play-icon" aria-hidden="true">▶</span>'
                f'<span class="video-play-note">Plays from YouTube when you press play</span></button>{caption}</figure>')
    if image.get('media') == 'video':
        def source(src, kind):
            return f'<source src="{escape(src)}" type="{kind}">' if src else ''
        label_attr = f' aria-label="{escape(image["alt"])}"' if image.get('alt') else ''
        return (f'<figure><video poster="{escape(image.get("poster") or "")}"{size}{label_attr} '
                f'controls muted loop playsinline preload="metadata">'
                f'{source(image.get("file"), "video/mp4")}{source(image.get("fallback"), "video/webm")}</video>{caption}</figure>')
    return (f'<figure><a target="_blank" href="{escape(image.get("link") or image.get("file"))}">'
            f'<img src="{escape(image.get("file"))}"{size} alt="{escape(image.get("alt") or "")}"></a>{caption}</figure>')


def render_post_body(post, by_id):
    figures = 0
    footnotes, seen = [], set()

    def figure(rid):
        nonlocal figures
        image = by_id.get(rid)
        if not image:
            return ''
        if not (image.get('display') or {}).get('noCaption'):
            figures += 1
        return figure_html(image, figures)

    def note_from(record):
        if record['id'] in seen:
            return
        seen.add(record['id'])
        footnotes.extend(record.get('footnotes') or [])

    parts = []
    for item in post.get('body') or []:
        if item.get('heading'):
            tag = item.get('tag') or 'h3'
            parts.append(f'<{tag}>{escape(item["heading"])}</{tag}>')
        elif item.get('hr'):
            parts.append('<hr>')
        elif item.get('image'):
            parts.append(figure(item['image']))
        elif item.get('reading'):
            reading = by_id.get(item['reading'])
            if not reading:
                continue
            note_from(reading)
            inside = ''.join(figure(f) for f in item.get('figures') or [])
            verse = ' class="reading-verse"' if (reading.get('display') or {}).get('verse') else ''
            citation = (reading.get('citation') or {}).get('display') or ''
            parts.append(f'<ol><li{verse}>{reading_html(reading)}{inside}</li></ol>'
                         + (f'<div class="reading-citation">{citation}{record_mark(reading["id"])}</div>'
                            if citation else ''))
        elif item.get('writing'):
            piece = by_id.get(item['writing'])
            if not piece:
                continue
            note_from(piece)
            start, end = item['blocks']
            html = ''.join(h for _, h in blocks(piece.get('text') or '')[start:end])
            if item.get('figures'):
                inside = ''.join(figure(f) for f in item['figures'])
                html = re.sub(r'((?:<p>\s*</p>)*</li>\s*</[uo]l>\s*)$', lambda m: inside + m.group(1), html)
            parts.append(html)
    footnotes.sort(key=lambda n: n['marker'])
    return mark_footnote_refs(''.join(parts)) + footnotes_html(footnotes)


def mark_footnote_refs(html):
    """A footnote's reference in the text (a link to #footnote-N): a
    small raised number with the id its note links back to."""
    return re.sub(r'<a href="#footnote-(\d+)"[^>]*>\1</a>',
                  lambda m: (f'<a class="footnote-ref" id="footnote-anchor-{m.group(1)}" '
                             f'href="#footnote-{m.group(1)}" aria-label="Note {m.group(1)}">{m.group(1)}</a>'),
                  html)


def footnotes_html(footnotes):
    """The notes under a short rule, each opening on its number, which
    links back to the reference."""
    if not footnotes:
        return ''
    notes = []
    for note in footnotes:
        n, text = note['marker'], note['text']
        number = (f'<a class="footnote-number" href="#footnote-anchor-{n}" '
                  f'aria-label="Back to the text, note {n}">{n}</a>')
        html = text if re.match(r'^\s*<p>', text) else f'<p>{text}</p>'
        notes.append(re.sub(r'^\s*<p>', lambda _: f'<p class="footnote" id="footnote-{n}">{number}', html, count=1))
    return f'<aside class="footnotes" aria-label="Notes">{"".join(notes)}</aside>'
