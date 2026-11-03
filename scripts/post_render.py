"""A Lectio Terra post, rebuilt from the collection: the Python twin of
renderPostBody() in shared.js.

A post's "body" (scripts/build_post_manifests.py) lists its pieces in
order: headings, rules, figures (image records), passages (reading
records) and runs of its own writing (writing records). render_post_body()
turns that list back into the post's HTML, in the markup the Seasons page
finishes (seasons.js): each passage a one-item list followed by its
citation, figures numbered in order, footnotes after everything else.

build_lectio_pages.py writes it into each post's page, so the page holds
the post as the records have it, readers without JavaScript included;
the Seasons page draws the same from the records in the browser. The two
are kept in step: scripts/check_pages.js compares them on every post.
Change one, change the other.
"""

import re
from html import escape as _escape

from post_html import blocks


def escape(text):
    """As escapeHTML() in shared.js: &, <, > and " made safe."""
    return _escape('' if text is None else str(text), quote=False).replace('"', '&quot;')


def plain(html):
    return re.sub(r'<[^>]*>', '', html or '')


def reading_html(reading):
    """As readingHTML() in shared.js: verse one line to a line (the house
    verse form, scripts/verse.py), prose as written."""
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


def figure_html(image, number):
    display = image.get('display') or {}
    label = '' if display.get('unlabelled') else f'Fig. {number}. '
    caption = '' if display.get('noCaption') else f'<figcaption>{label}{image.get("caption") or ""}</figcaption>'
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
            citation = (reading.get('citation') or {}).get('display') or ''
            parts.append(f'<ol><li>{reading_html(reading)}{inside}</li></ol>{citation}')
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
    notes = [f'<a href="#footnote-anchor-{n["marker"]}" target="_self">{n["marker"]}</a>{n["text"]}' for n in footnotes]
    return ''.join(parts) + ''.join(notes)
