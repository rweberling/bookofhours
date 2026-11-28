#!/usr/bin/env python3
"""The calendar: the book's year as a subscribable .ics, at earthlyhours.com/calendar.ics.

Usage:
  python3 scripts/build_calendar.py                write calendar.ics (the site's copy)
  python3 scripts/build_calendar.py --out FILE     write the calendar to FILE instead
  python3 scripts/build_calendar.py --show         print the events as plain text

Every day of the book's year is an all-day event that repeats each year:

  a card     (data/days.json) on its date: the subject; in the notes its
             second name (scientific or Latin), the reading's opening
             (open rights only, about 200 characters), who and when for
             the words and the image, and the day's page,
             seasons.html?day=MM-DD (Ryan, 28 November 2026: a pointer to
             the page, not the whole card).
  an essay   a Lectio Terra post on the day it was first published, then
             every year from the next on its fixed day, the same day
             unless another was pinned (weeks.essay_day; the Seasons page
             keeps the same rule): its subject's second name, the opening
             of its headnote, its readers, and its page.
  the year's eve, 20 December, outside the weeks.

A card starts on its first date on or after the calendar's "start"
(data/syndication.json, "calendar"), so the first cards are in late
November 2026. Unlike the pages and feeds, the calendar shows each day as
soon as it is added, about ten days ahead: calendars are for looking
ahead. It has no images (calendar apps don't show them).

The file is part of the site (calendar.ics at the root, public like
year.xml): .github/workflows/calendar.yml rebuilds and commits it when the
data changes, and GitHub Pages serves it. Supporters reach it through the
DFOS page (an honor system, Ryan, 28 November 2026: the cards and essays
are free on the site anyway). The output is the same for the same data, so
an unchanged calendar makes no commit.
"""

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from datafile import creator_names, load  # noqa: E402
from syndicate import OPEN_RIGHTS, plain  # noqa: E402
from build_lectio_pages import posts, readers, subject_name, subjects, summary  # noqa: E402
from weeks import essay_day  # noqa: E402

SITE = 'https://earthlyhours.com'
NAME = 'The Earthly Book of Hours'
STAMP = '20261112T000000Z'     # DTSTAMP: fixed, so the same data gives the same file
YEARS_EVE = (
    "The year's eve: the day that stands outside the fifty-two weeks of "
    "The Earthly Book of Hours, before the year turns at the winter solstice."
)


def ics_text(s):
    return (s.replace('\\', '\\\\').replace(';', '\\;').replace(',', '\\,')
            .replace('\r\n', '\n').replace('\n', '\\n'))


def fold(line):
    """Lines of at most 75 octets, continued with a space (RFC 5545)."""
    out, cur = [], b''
    for ch in line:
        b = ch.encode('utf-8')
        if len(cur) + len(b) > (75 if not out else 74):
            out.append(cur)
            cur = b''
        cur += b
    out.append(cur)
    return '\r\n '.join(part.decode('utf-8') for part in out)


def event(uid, start, summary_text, description, url, repeat=True):
    lines = [
        'BEGIN:VEVENT',
        f'UID:{uid}@earthlyhours.com',
        f'DTSTAMP:{STAMP}',
        f'DTSTART;VALUE=DATE:{start:%Y%m%d}',
        *(['RRULE:FREQ=YEARLY'] if repeat else []),
        f'SUMMARY:{ics_text(summary_text)}',
        f'DESCRIPTION:{ics_text(description)}',
        f'URL:{url}',
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
    ]
    return lines


def first_on_or_after(mmdd, start):
    m, d = map(int, mmdd.split('-'))
    candidate = date(start.year, m, d)
    return candidate if candidate >= start else date(start.year + 1, m, d)


def snippet(text, limit=200):
    """A reading's opening, cut on a word: the event is a pointer to the
    day's page, not the day itself (Ryan, 28 November 2026)."""
    words = ' '.join(plain(text).split())
    if len(words) <= limit:
        return words
    return words[:limit].rsplit(' ', 1)[0].rstrip(',;:—.') + '…'


def year_of(value):
    m = re.search(r'\d{4}', value or '')
    return m.group(0) if m else ''


def second_name(subject):
    return subject.get('scientific') or subject.get('latin') or ''


def card_notes(card, reading, image, subject):
    """The subject's second name; the reading's opening (open rights
    only); who and when, words and image; the link."""
    parts = []
    latin = second_name(subject)
    if latin:
        parts.append(latin)
    citation = reading.get('citation') or {}
    edition = citation.get('edition') or {}
    if (edition.get('rights') or '').startswith(OPEN_RIGHTS) and reading.get('text'):
        parts.append(f'“{snippet(reading["text"])}”')
    author = ' and '.join(c['name'] for c in edition.get('contributors', []) if c.get('role') == 'author')
    if not author:  # no contributors recorded yet: the citation opens on the author
        author = plain(citation.get('display')).split(',')[0].strip()
    words = ', '.join(x for x in (author, year_of(citation.get('written') or edition.get('issued'))) if x)
    maker = ', '.join(x for x in (creator_names(image), year_of(image.get('date'))) if x)
    credits = ' · '.join(x for x in (f'Words: {words}' if words else '', f'Image: {maker}' if maker else '') if x)
    if credits:
        parts.append(credits)
    parts.append(f'Read the day: {SITE}/seasons.html?day={card["date"]}')
    return '\n\n'.join(parts)


def essay_notes(entry, subject=None):
    url = f'{SITE}/{entry["page"]}'
    parts = []
    latin = second_name(subject or {})
    if latin:
        parts.append(latin)
    parts.append(summary(entry, 200))
    who = ', '.join(readers(entry))
    if who:
        parts.append(f'With {who}.')
    parts.append(f'Read the essay: {url}')
    return '\n\n'.join(parts)


def events(config):
    start = date.fromisoformat(config.get('start', '2026-11-26'))
    by_subject = subjects()
    names = {r['id']: r for r in load('species') + load('phenomena')}
    readings = {r['id']: r for r in load('readings')}
    images = {i['id']: i for i in load('images')}
    out = []
    for card in sorted(load('days'), key=lambda d: d['date']):
        if card.get('draft') or card['date'] == '02-29':
            continue
        subject = names.get(card['subject']) or {}
        out.append((card['date'], event(
            card['id'], first_on_or_after(card['date'], start),
            subject.get('name') or card['subject'],
            card_notes(card, readings.get(card['reading']) or {}, images.get(card['image']) or {}, subject),
            f'{SITE}/seasons.html?day={card["date"]}')))
    for _, entry in posts(load('lectio-data')):
        if not (entry.get('page') and entry.get('published')):
            continue
        name = subject_name(entry, by_subject.get(entry.get('subject')))
        first = date.fromisoformat(entry['published'])
        title, notes, url = f'Lectio Terra: {name}', essay_notes(entry, names.get(entry.get('subject'))), f'{SITE}/{entry["page"]}'
        # Its first showing, on its publication day, then every year
        # from the next on its fixed day (weeks.essay_day).
        out.append((entry['published'][5:], event(f'{entry["id"]}-first', first, title, notes, url,
                                                  repeat=False)))
        again = essay_day(entry)
        out.append((again, event(entry['id'], date(first.year + 1, *map(int, again.split('-'))),
                                 title, notes, url)))
    out.append(('12-20', event('years-eve', first_on_or_after('12-20', start),
                               "The Year's Eve", YEARS_EVE, f'{SITE}/seasons.html?day=12-20')))
    out.sort(key=lambda e: (e[0], e[1][1]))
    return [e for _, e in out]


def build(config):
    lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Otherwise Editions//The Earthly Book of Hours//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        f'X-WR-CALNAME:{ics_text(NAME)}',
        'X-WR-CALDESC:' + ics_text(config.get('description', '')),
        'X-WR-TIMEZONE:America/New_York',
        'REFRESH-INTERVAL;VALUE=DURATION:P1D',
        'X-PUBLISHED-TTL:P1D',
    ]
    for e in events(config):
        lines += e
    lines.append('END:VCALENDAR')
    return '\r\n'.join(fold(line) for line in lines) + '\r\n'


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--out', default=str(HERE.parent / 'calendar.ics'))
    ap.add_argument('--show', action='store_true')
    args = ap.parse_args()
    config = load('syndication').get('calendar') or {}
    text = build(config)
    if not args.show:
        Path(args.out).write_text(text, encoding='utf-8', newline='')
        print(f'{args.out}: {text.count("BEGIN:VEVENT")} events')
    else:
        unfolded = text.replace('\r\n ', '')
        for block in re.findall(r'BEGIN:VEVENT\r\n(.*?)END:VEVENT', unfolded, re.S):
            f = dict(line.split(':', 1) for line in block.split('\r\n') if ':' in line)
            start = next(v for k, v in f.items() if k.startswith('DTSTART'))
            desc = f['DESCRIPTION'].replace('\\n', '\n').replace('\\,', ',').replace('\\;', ';')
            print(f'== {start}  {f["SUMMARY"]}\n{desc}\n')


if __name__ == '__main__':
    main()
