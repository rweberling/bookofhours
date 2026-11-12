#!/usr/bin/env python3
"""year.xml, "The Year": the book's year a day at a time, as an RSS feed.

Usage:
  python3 scripts/build_year_feed.py               build it for today (Boston's date)
  python3 scripts/build_year_feed.py --as-of 2026-11-26
                                                   build it for another day
  python3 scripts/build_year_feed.py --check       exit 1 if year.xml no longer matches
                                                   the data, for the day it was built for

What a day holds, as the Seasons page shows it:

  a card     a daily card (data/days.json) on its date: the subject, its
             image and caption, the reading, and a link to
             seasons.html?day=MM-DD. The image, and the reading's text, go
             in only when their rights are open (NoC-US or a public-domain
             mark, as on Bluesky); otherwise the reading's citation alone.
  an essay   a Lectio Terra essay on its own day, the month and day it was
             first published (the day the Seasons page opens it), as in
             feed.xml: its first figure, its readers, the opening of its
             headnote, and a link to its page.

The year comes round again: a card returns on its date every year, and an
essay every year from its first publication, each year's showing its own
item (its guid ends #YYYY), so a reader sees it as new. The feed holds the
last 14 days up to the day it is built for, newest first, each dated
midnight in Boston. The date it was built for is written in the file, so
--check (and scripts/build.py) compare it with the data for that day, and
the Syndicate workflow rebuilds it each day (.github/workflows/
syndicate.yml). feed.xml stays the essays alone, by first publication.
"""

import argparse
import sys
from datetime import date, datetime, time, timedelta
from email.utils import format_datetime
from html import escape
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
from datafile import load  # noqa: E402
from syndicate import OPEN_RIGHTS, plain  # noqa: E402
from build_lectio_pages import essay_item, posts, subjects  # noqa: E402

SITE = 'https://earthlyhours.com'
HOME = ZoneInfo('America/New_York')
WINDOW = 14
OUT = ROOT / 'year.xml'
MARK = '<!-- Built by scripts/build_year_feed.py for '


def today():
    return datetime.now(HOME).date()


def web_copy(image, files):
    for copy in (files.get(image.get('file')) or {}).get('copies', []):
        if copy['file'].endswith('-1600.webp'):
            return copy['file']
    return None


def card_item(card, day, readings, images, names, files):
    reading = readings.get(card['reading']) or {}
    image = images.get(card['image']) or {}
    url = f'{SITE}/seasons.html?day={card["date"]}'
    body = ''
    copy = web_copy(image, files)
    if (image.get('rights') or '').startswith(OPEN_RIGHTS) and copy:
        body += f'<p><img src="{SITE}/{copy}" alt="{escape(plain(image.get("alt")))}"></p>'
        if image.get('caption'):
            body += f'<p><small>{escape(plain(image["caption"]))}</small></p>'
    edition = (reading.get('citation') or {}).get('edition') or {}
    if (edition.get('rights') or '').startswith(OPEN_RIGHTS) and reading.get('text'):
        body += f'<blockquote><p>{reading["text"]}</p></blockquote>'
    cite = plain((reading.get('citation') or {}).get('display'))
    if cite:
        body += f'<p><em>{escape(cite)}</em></p>'
    body += f'<p><a href="{url}">The day in The Earthly Book of Hours</a></p>'
    name = names.get(card['subject']) or card['subject']
    return f'{day.day} {day:%B}: {name}', url, body


def same_day(day, mmdd):
    """Does a card or essay dated MM-DD fall on this day? 29 February
    falls on 28 February in other years."""
    if mmdd == '02-29' and not (day.year % 4 == 0 and (day.year % 100 or day.year % 400 == 0)):
        mmdd = '02-28'
    return day.strftime('%m-%d') == mmdd


def build(as_of):
    data = load('lectio-data')
    by_subject = subjects()
    images_list = load('images')
    alts = {i['file']: i['alt'] for i in images_list if i.get('alt')}
    images = {i['id']: i for i in images_list}
    readings = {r['id']: r for r in load('readings')}
    names = {r['id']: r.get('name') for r in load('species') + load('phenomena')}
    files = load('image-files')['files']
    days = [d for d in load('days') if not d.get('draft')]
    essays = [e for _, e in posts(data) if e.get('page') and e.get('published')]

    items = []
    for back in range(WINDOW):
        day = as_of - timedelta(days=back)
        when = format_datetime(datetime.combine(day, time(0), HOME))
        found = []
        for e in essays:
            if same_day(day, e['published'][5:]) and day >= date.fromisoformat(e['published']):
                title, body = essay_item(e, by_subject, alts)
                found.append((title, f'{SITE}/{e["page"]}', body))
        for card in days:
            if same_day(day, card['date']):
                found.append(card_item(card, day, readings, images, names, files))
        for title, url, body in found:
            items.append(
                '  <item>\n'
                f'    <title>{escape(title)}</title>\n'
                f'    <link>{url}</link>\n'
                f'    <guid isPermaLink="false">{url}#{day.year}</guid>\n'
                f'    <pubDate>{when}</pubDate>\n'
                f'    <description>{escape(body)}</description>\n'
                '  </item>\n')
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            f'{MARK}{as_of.isoformat()} from data/; edit that, not this. -->\n'
            '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
            '<channel>\n'
            '  <title>The Year — The Earthly Book of Hours</title>\n'
            f'  <link>{SITE}/seasons.html</link>\n'
            f'  <atom:link href="{SITE}/year.xml" rel="self" type="application/rss+xml"/>\n'
            '  <description>The year a day at a time, as kept in the Boston Basin: a subject of the '
            'season each day, with an image and a reading, and each week its Lectio Terra essay. '
            'It comes round again every year.</description>\n'
            '  <language>en</language>\n'
            f'  <lastBuildDate>{format_datetime(datetime.combine(as_of, time(0), HOME))}</lastBuildDate>\n'
            + ''.join(items) +
            '</channel>\n</rss>\n')


def built_for():
    """The day year.xml was built for, or None if there is none."""
    if not OUT.exists():
        return None
    head = OUT.read_text(encoding='utf-8')[:400]
    i = head.find(MARK)
    return date.fromisoformat(head[i + len(MARK):i + len(MARK) + 10]) if i >= 0 else None


def stale():
    """['year.xml'] if it doesn't match the data for the day it was built for."""
    day = built_for()
    if day is None or OUT.read_text(encoding='utf-8') != build(day):
        return ['year.xml']
    return []


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--as-of', type=date.fromisoformat)
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()
    if args.check:
        due = stale()
        print('year.xml is out of date' if due else 'year.xml is up to date')
        return 1 if due else 0
    text = build(args.as_of or today())
    if not OUT.exists() or OUT.read_text(encoding='utf-8') != text:
        OUT.write_text(text, encoding='utf-8')
        print('year.xml written')
    return 0


if __name__ == '__main__':
    sys.exit(main())
