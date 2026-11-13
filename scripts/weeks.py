#!/usr/bin/env python3
"""The Seasons' weeks, for the build scripts (shared.js has the same rule
for the pages; keep the two in step).

The year runs in 52 fixed weeks counted from the winter solstice
(decided 11 November 2026; Site Project Notes, "The weeks"). Week 1
begins on 21 December every year, so every date sits in the same week
each year. 52 weeks make 364 days: 20 December stands outside them, the
year's eve, and 29 February joins Week 10. A week belongs to the season
its middle (fourth) day falls in: 13 weeks each, Winter 50-52 and 1-10,
Spring 11-23, Summer 24-36, Autumn 37-49.

Usage:
  python3 scripts/weeks.py              # every week, its dates and season
  python3 scripts/weeks.py 11-26        # the week a date (MM-DD) falls in
"""

import sys
from datetime import date, timedelta

COMMON = 2025            # a common year, for counting
WEEK_ONE = (12, 21)
SEASONS = {12: 'winter', 1: 'winter', 2: 'winter', 3: 'spring', 4: 'spring', 5: 'spring',
           6: 'summer', 7: 'summer', 8: 'summer', 9: 'autumn', 10: 'autumn', 11: 'autumn'}
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
          'September', 'October', 'November', 'December']


def _offset(month, day):
    start = date(COMMON, *WEEK_ONE)
    return (date(COMMON, month, day) - start).days % 365


def week_days(week):
    """The seven days of a week, as (month, day), in order (29 February,
    when there is one, is Week 10's eighth)."""
    start = date(COMMON - 1, *WEEK_ONE) + timedelta(days=(week - 1) * 7)
    return [((start + timedelta(days=i)).month, (start + timedelta(days=i)).day) for i in range(7)]


def week_of(month, day):
    """The week number a date falls in, or None for 20 December."""
    if (month, day) == (2, 29):
        return 10
    offset = _offset(month, day)
    return None if offset == 364 else offset // 7 + 1


def essay_day(published, year):
    """The day ("MM-DD") an essay first published on `published`
    (YYYY-MM-DD) is kept on in `year`: its publication day in the year
    it came out; in every later year, the last day of its week (decided
    13 November 2026: the book's year is fixed by date, the civil week
    only says when a piece first comes out). shared.js's essayDayKey()
    keeps the same rule."""
    y, m, d = (int(x) for x in published.split('-'))
    week = week_of(m, d)
    if year <= y or week is None:
        return published[5:]
    m, d = week_days(week)[-1]
    return f'{m:02d}-{d:02d}'


def season_of_week(week):
    return SEASONS[week_days(week)[3][0]]


def parse(key):
    """(month, day) from "MM-DD", or ValueError."""
    month, day = (int(x) for x in key.split('-'))
    if (month, day) != (2, 29):
        date(COMMON, month, day)
    return month, day


def range_words(week):
    days = week_days(week)
    (m1, d1), (m2, d2) = days[0], days[-1]
    return f'{d1}–{d2} {MONTHS[m2 - 1]}' if m1 == m2 else f'{d1} {MONTHS[m1 - 1]} – {d2} {MONTHS[m2 - 1]}'


def main():
    if len(sys.argv) > 1:
        month, day = parse(sys.argv[1])
        week = week_of(month, day)
        print('20 December: the year\'s eve, outside the weeks' if week is None
              else f'Week {week} ({range_words(week)}), {season_of_week(week)}')
        return
    for week in range(1, 53):
        print(f'Week {week:2}  {range_words(week):28} {season_of_week(week)}')


if __name__ == '__main__':
    main()
