#!/usr/bin/env python3
"""Post the site's own content to Bluesky, as earthlyhours.com, and keep
the essays' standard.site records.

Usage:
  python3 scripts/syndicate.py                  post what is due (needs BLUESKY_APP_PASSWORD)
  python3 scripts/syndicate.py --dry-run        say what would be posted; send nothing
  python3 scripts/syndicate.py --preview lt-0033
                                                show the essay post for any post; send nothing

Run by .github/workflows/syndicate.yml once a day and after each push that
changes data/lectio-data.json. Without the password it does a dry run.

What it posts (the streams in data/syndication.json; the plan is in the
"Syndication Plan" doc):

  essay   A Lectio Terra post first published on or after the stream's
          "since" date, once it has a page: a link card to the page (its
          first shareable figure as the picture), then a reply with up to
          four more of its figures. With it, a site.standard.document
          record for the essay, its bskyPostRef pointing at the card.

  season  Back in season: on the stream's "days" (Tuesday and Saturday),
          one earlier essay whose season is the current one (data/
          vocab.json's months, Boston's date), not out in any stream
          within "minWeeks" (8), the one away longest first: a link
          card to its page, led by its next unused excerpt, with the
          next shareable figure after the one last used for it as the
          picture (the essay stream's card counts as using the first of
          each). Essays without excerpts are skipped. Each post goes in
          the log with its "excerpt" (index) and "figure" (ID). With
          "dryRun": true on the stream, a live run only writes what it
          would post, and the next few after it, to the run summary.

  records The essays published before the essay stream's "since" date:
          a site.standard.document record for each, with no new post.
          Its bskyPostRef is the earliest Bluesky post of the account
          that linked to the essay (on Substack or the site), if any.

At most two posts a day across the streams (a card and its reply count
as one): the essay stream first, then Back in season if there's room.

What the text is made of, all from the records:

  - one of the post's curated excerpts (syndication.excerpts on the post;
    a reading's line in quotation marks and signed with its author): the
    first for the essay stream, or else the post's subtitle
  - hashtags: the subject's (hashtags on its sp- or ph- record), the
    post's own (syndication.hashtags), then the account's standingTags.
    As many as fit show in the text; the rest go in the post's unseen
    tags (at most 8).

Figures are used only when their record's rights allow it (No Copyright
in the US, or public domain), sent as JPEG copies under Bluesky's 1 MB.

What it writes back, all in data/syndication.json (so the posts' own
records, and the pages built from them, don't change daily): each
essay's at:// addresses under "essays" ("card": {uri, cid}, "reply",
"document"), and every Bluesky post made in the "log" (date, stream,
post, uri; Back in season adds excerpt and figure). build_lectio_pages.py then
puts <link rel="site.standard.document"> in the page's head. The
publication record (rkey fixed in syndication.json) is made on the first
live run if it isn't there; /.well-known/site.standard.publication names it.

A run that fails part way keeps what it finished: the next run carries
on (a card already posted is not posted again; a missing reply or
document record is made).
"""

import argparse
import html
import io
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from datafile import load, save  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://earthlyhours.com'
SERVICE = 'https://bsky.social'
LIMIT = 300                    # Bluesky's limit on a post's text (graphemes)
PER_DAY = 2                    # posts a day across the streams (a card and its reply are one)
HOME = ZoneInfo('America/New_York')   # whose day it is
HIDDEN_TAGS = 8                # the post record's unseen tags
IMAGE_BYTES = 950_000          # under the 1 MB blob limit
OPEN_RIGHTS = (
    'http://rightsstatements.org/vocab/NoC-US/',
    'https://creativecommons.org/publicdomain/',
)


# ---------- reading the collection ----------

def plain(text):
    text = re.sub(r'<br\s*/?>', '\n', text or '')
    text = re.sub(r'</p>\s*', '\n\n', text)
    text = html.unescape(re.sub(r'<[^>]+>', '', text)).replace(' ', ' ')
    text = re.sub(r'[ \t]+', ' ', text)
    return re.sub(r'\n{3,}', '\n\n', text).strip()


def posts(data):
    for items in data['seasons'].values():
        yield from items


class Collection:
    def __init__(self):
        self.data = load('lectio-data')
        self.config = load('syndication')
        self.subjects = {r['id']: r for r in load('species') + load('phenomena')}
        self.readings = {r['id']: r for r in load('readings')}
        self.writing = {r['id']: r for r in load('writing')}
        self.images = load('images')

    def post(self, pid):
        for p in posts(self.data):
            if p['id'] == pid:
                return p
        raise SystemExit(f'No post {pid}')

    def subject(self, post):
        return self.subjects.get(post.get('subject')) or {}

    def figures(self, post):
        """The post's figures that may be shared, in the post's order."""
        mine = [i for i in self.images
                if (i.get('lectio') or {}).get('post') == post['id'] and not i.get('draft')]
        mine.sort(key=lambda i: i['lectio'].get('place', 0))
        return [i for i in mine
                if (i.get('rights') or '').startswith(OPEN_RIGHTS) and (ROOT / i['file']).exists()]

    def author(self, rid):
        edition = (self.readings[rid].get('citation') or {}).get('edition') or {}
        names = [c['name'] for c in edition.get('contributors', []) if c.get('role') == 'author']
        return names[0] if names else None

    def hashtags(self, post):
        tags = (self.subject(post).get('hashtags') or []) \
            + ((post.get('syndication') or {}).get('hashtags') or []) \
            + (self.config.get('standingTags') or [])
        seen = []
        for t in tags:
            if t not in seen:
                seen.append(t)
        return seen

    def own_text(self, post):
        """The post's own writing (headnote, notes, supplementum), as plain text."""
        parts = []
        for piece in post.get('body', []):
            w = self.writing.get(piece.get('writing', ''))
            if w and w.get('kind') in ('headnote', 'note', 'supplementum'):
                text = plain(w.get('text'))
                if text and text not in parts:
                    parts.append(text)
        return '\n\n'.join(parts)


# ---------- composing ----------

def utf8_len(s):
    return len(s.encode('utf-8'))


def excerpts(post):
    return (post.get('syndication') or {}).get('excerpts') or []


def opening(c, post, index=0):
    """The line a card post leads with: the post's excerpt at index (its
    first, for the essay stream), signed if it is a reading's."""
    if excerpts(post):
        ex = excerpts(post)[index]
        if ex['from'].startswith('r-'):
            who = c.author(ex['from'])
            return f'“{ex["text"]}”' + (f' — {who}' if who else '')
        return ex['text']
    return post.get('subtitle') or ''


def with_tags(text, tags):
    """Text plus as many #tags as fit, their facets, and the tags left over."""
    shown = []
    for t in tags:
        trial = text + '\n\n' + ' '.join('#' + x for x in shown + [t])
        if len(trial) <= LIMIT and len(shown) < 4:
            shown.append(t)
    facets = []
    if shown:
        text += '\n\n'
        for t in shown:
            start = utf8_len(text)
            text += '#' + t
            facets.append({'index': {'byteStart': start, 'byteEnd': utf8_len(text)},
                           'features': [{'$type': 'app.bsky.richtext.facet#tag', 'tag': t}]})
            text += ' '
        text = text.rstrip()
    rest = [t for t in tags if t not in shown][:HIDDEN_TAGS]
    return text, facets, rest


def card_title(c, post):
    return f'Lectio Terra: {c.subject(post).get("name") or post["title"]}'


def card_description(post):
    from build_lectio_pages import summary
    return summary(post)


def compose_essay(c, post):
    """Everything the essay stream would send for a post, without sending it."""
    text, facets, hidden = with_tags(opening(c, post), c.hashtags(post))
    if len(text) > LIMIT:
        raise SystemExit(f'{post["id"]}: the opening alone is over {LIMIT} characters')
    figures = c.figures(post)
    return {
        'post': post['id'],
        'url': f'{SITE}/{post["page"]}',
        'text': text, 'facets': facets, 'tags': hidden,
        'title': card_title(c, post),
        'description': card_description(post),
        'thumb': figures[0] if figures else None,
        'more': figures[1:5],
    }


def compose_season(c, post, excerpt, figure):
    """A Back in season post: a link card to an earlier essay's page, led
    by one of its excerpts, with one of its figures as the picture."""
    text, facets, hidden = with_tags(opening(c, post, excerpt), c.hashtags(post))
    if len(text) > LIMIT:
        raise SystemExit(f'{post["id"]}: excerpt {excerpt} alone is over {LIMIT} characters')
    return {
        'post': post['id'],
        'url': f'{SITE}/{post["page"]}',
        'text': text, 'facets': facets, 'tags': hidden,
        'title': card_title(c, post),
        'description': card_description(post),
        'thumb': figure,
        'more': [],
        'excerpt': excerpt,
    }


def document_record(c, post, publication, card, cover):
    record = {
        '$type': 'site.standard.document',
        'site': publication,
        'path': '/' + post['page'],
        'title': card_title(c, post),
        'publishedAt': post['published'] + 'T12:00:00.000Z',
    }
    if post.get('subtitle'):
        record['description'] = post['subtitle']
    if cover:
        record['coverImage'] = cover
    text = c.own_text(post)
    if text:
        # The readings and figures aren't in the record (the readings'
        # rights), so it ends by pointing to the page that has them.
        record['textContent'] = (text + '\n\nThe full essay, with its readings and figures, is at '
                                 f'{SITE}/{post["page"]}')
    tags = [t for t in c.hashtags(post) if t not in (c.config.get('standingTags') or [])]
    if tags:
        record['tags'] = tags
    if card:
        record['bskyPostRef'] = card
    return record


def digest(record):
    """A fingerprint of a document record's content, its picture aside
    (a fresh upload of the same figure would differ)."""
    import hashlib
    rest = {k: v for k, v in record.items() if k != 'coverImage'}
    return hashlib.sha256(json.dumps(rest, sort_keys=True).encode()).hexdigest()[:16]


def jpeg(path):
    """A JPEG copy under the blob limit, and its size in pixels."""
    from PIL import Image
    img = Image.open(path)
    img = img.convert('RGB')
    img.thumbnail((2000, 2000))
    quality = 85
    while True:
        buf = io.BytesIO()
        img.save(buf, 'JPEG', quality=quality, optimize=True)
        if buf.tell() <= IMAGE_BYTES or quality <= 40:
            break
        if quality > 60:
            quality -= 10
        else:
            img.thumbnail((int(img.width * 0.8), int(img.height * 0.8)))
    return buf.getvalue(), img.size


# ---------- sending ----------

class Bluesky:
    def __init__(self, handle, password):
        session = self.call('com.atproto.server.createSession',
                            {'identifier': handle, 'password': password}, auth=False)
        self.did = session['did']
        self.token = session['accessJwt']

    def call(self, method, body=None, auth=True, raw=None, mime=None, query=None):
        url = f'{SERVICE}/xrpc/{method}'
        if query:
            url += '?' + '&'.join(f'{k}={urllib.request.quote(str(v))}' for k, v in query.items())
        headers = {}
        data = None
        if raw is not None:
            data, headers['Content-Type'] = raw, mime
        elif body is not None:
            data, headers['Content-Type'] = json.dumps(body).encode(), 'application/json'
        if auth:
            headers['Authorization'] = f'Bearer {self.token}'
        req = urllib.request.Request(url, data=data, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read() or b'{}')
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors='replace')
            if e.code in (400, 404) and 'RecordNotFound' in detail:
                return None
            raise SystemExit(f'{method}: HTTP {e.code} {detail}')

    def blob(self, path):
        data, size = jpeg(path)
        return self.call('com.atproto.repo.uploadBlob', raw=data, mime='image/jpeg')['blob'], size

    def create(self, collection, record):
        r = self.call('com.atproto.repo.createRecord',
                      {'repo': self.did, 'collection': collection, 'record': record})
        return {'uri': r['uri'], 'cid': r['cid']}

    def get(self, collection, rkey):
        return self.call('com.atproto.repo.getRecord',
                         query={'repo': self.did, 'collection': collection, 'rkey': rkey})

    def put(self, collection, rkey, record):
        r = self.call('com.atproto.repo.putRecord',
                      {'repo': self.did, 'collection': collection, 'rkey': rkey, 'record': record})
        return {'uri': r['uri'], 'cid': r['cid']}


def today():
    """The date in Boston, so a run near midnight UTC counts the right day."""
    return datetime.now(HOME).date()


def now():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'


def ensure_publication(bs, c):
    p = c.config['publication']
    uri = f'at://{bs.did}/site.standard.publication/{p["rkey"]}'
    record = {'$type': 'site.standard.publication', 'url': p['url'], 'name': p['name'],
              'description': p['description'], 'preferences': {'showInDiscover': True}}
    old = bs.get('site.standard.publication', p['rkey'])
    if old:
        if all(old['value'].get(k) == record[k] for k in ('url', 'name', 'description')):
            return uri
        # Changed in syndication.json: update it, keeping its icon.
        if old['value'].get('icon'):
            record['icon'] = old['value']['icon']
        bs.put('site.standard.publication', p['rkey'], record)
        print(f'Updated the publication record {p["rkey"]}.')
        return uri
    if p.get('icon'):
        record['icon'] = bs.blob(ROOT / p['icon'])[0]
    print(f'Made the publication record {p["rkey"]}.')
    bs.put('site.standard.publication', p['rkey'], record)
    return uri


def send_card(bs, plan):
    """Post a link card; its {uri, cid} and the picture's blob."""
    thumb = None
    if plan['thumb']:
        thumb, _ = bs.blob(ROOT / plan['thumb']['file'])
    external = {'uri': plan['url'], 'title': plan['title'], 'description': plan['description']}
    if thumb:
        external['thumb'] = thumb
    record = {'$type': 'app.bsky.feed.post', 'text': plan['text'], 'createdAt': now(),
              'langs': ['en'], 'embed': {'$type': 'app.bsky.embed.external', 'external': external}}
    if plan['facets']:
        record['facets'] = plan['facets']
    if plan['tags']:
        record['tags'] = plan['tags']
    return bs.create('app.bsky.feed.post', record), thumb


def send_season(bs, c, plan):
    card, _ = send_card(bs, plan)
    c.config.setdefault('log', []).append({
        'date': today().isoformat(), 'stream': 'season', 'post': plan['post'],
        'uri': card['uri'], 'excerpt': plan['excerpt'],
        'figure': plan['thumb']['id'] if plan['thumb'] else None})
    save_all(c)
    print(f'{plan["post"]}: back in season, {card["uri"]}')


def send_essay(bs, c, post, plan, publication):
    """Post an essay's card and reply and make its document record,
    skipping whatever an earlier run already did."""
    done = c.config.setdefault('essays', {}).setdefault(post['id'], {})
    log = c.config.setdefault('log', [])
    cover = None
    if 'card' not in done:
        done['card'], cover = send_card(bs, plan)
        log.append({'date': today().isoformat(), 'stream': 'essay', 'post': post['id'],
                    'uri': done['card']['uri']})
        save_all(c)
        print(f'{post["id"]}: posted {done["card"]["uri"]}')
    if plan['more'] and 'reply' not in done:
        images = []
        for fig in plan['more']:
            blob, (w, h) = bs.blob(ROOT / fig['file'])
            images.append({'image': blob, 'alt': plain(fig.get('alt') or ''),
                           'aspectRatio': {'width': w, 'height': h}})
        record = {'$type': 'app.bsky.feed.post', 'text': '', 'createdAt': now(), 'langs': ['en'],
                  'reply': {'root': done['card'], 'parent': done['card']},
                  'embed': {'$type': 'app.bsky.embed.images', 'images': images}}
        reply = bs.create('app.bsky.feed.post', record)
        done['reply'] = reply['uri']
        log.append({'date': today().isoformat(), 'stream': 'essay', 'post': post['id'],
                    'uri': reply['uri']})
        save_all(c)
        print(f'{post["id"]}: replied with {len(images)} figures')
    if 'document' not in done:
        if cover is None and plan['thumb']:
            cover, _ = bs.blob(ROOT / plan['thumb']['file'])
        record = document_record(c, post, publication, done['card'], cover)
        done['document'] = bs.create('site.standard.document', record)['uri']
        done['digest'] = digest(record)
        save_all(c)
        print(f'{post["id"]}: document record {done["document"]}')


def save_all(c):
    save('syndication', c.config)


# ---------- what is due ----------

def due_essays(c):
    stream = c.config['streams'].get('essay') or {}
    if not stream.get('on'):
        return []
    since = stream.get('since', '9999')
    out = []
    for p in posts(c.data):
        done = (c.config.get('essays') or {}).get(p['id']) or {}
        if (p.get('page') and p.get('published', '') >= since
                and (ROOT / p['page'] / 'index.html').exists()
                and not ('card' in done and 'document' in done)):
            out.append(p)
    return sorted(out, key=lambda p: p['published'])


def due_records(c):
    if not (c.config['streams'].get('records') or {}).get('on'):
        return []
    since = (c.config['streams'].get('essay') or {}).get('since', '9999')
    essays = c.config.get('essays') or {}
    return sorted((p for p in posts(c.data)
                   if p.get('page') and p.get('published', '9999') < since
                   and (ROOT / p['page'] / 'index.html').exists()
                   and 'document' not in (essays.get(p['id']) or {})),
                  key=lambda p: p['published'])


DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']


def season_of(day):
    """The site's season on a date, from data/vocab.json (shared.js's months)."""
    for s in load('vocab')['seasons']:
        if day.month in s['months']:
            return s['id']


def posted_on(c, day):
    """How many posts went out on a day, across the streams (a card and
    its reply count once)."""
    return len({(e['stream'], e['post']) for e in c.config.get('log') or []
                if e.get('date') == day.isoformat()})


def season_choice(c, day, log=None):
    """The essay, excerpt index and figure Back in season would post on a
    day, or None: its season is now, it has excerpts and a page, and it
    hasn't gone out (in any stream) within minWeeks. The one away
    longest goes first, the earliest published among equals."""
    stream = c.config['streams'].get('season') or {}
    log = (c.config.get('log') or []) if log is None else log
    season = season_of(day)
    last = {}
    for e in log:
        if e.get('date', '') <= day.isoformat():
            last[e['post']] = max(last.get(e['post'], ''), e['date'])
    gap = timedelta(weeks=stream.get('minWeeks', 8))
    ready = [p for p in posts(c.data)
             if p.get('season') == season and excerpts(p) and p.get('page')
             and p.get('published', '9999') < day.isoformat()
             and (ROOT / p['page'] / 'index.html').exists()
             and (p['id'] not in last or date.fromisoformat(last[p['id']]) + gap <= day)]
    if not ready:
        return None
    post = min(ready, key=lambda p: (last.get(p['id'], ''), p['published']))
    mine = [e for e in log if e['post'] == post['id'] and e.get('stream') == 'season']
    essay_card = 'card' in ((c.config.get('essays') or {}).get(post['id']) or {})
    # The next excerpt: the essay stream used the first; each return the
    # next, round the list.
    if mine and mine[-1].get('excerpt') is not None:
        excerpt = (mine[-1]['excerpt'] + 1) % len(excerpts(post))
    else:
        excerpt = 1 % len(excerpts(post)) if essay_card else 0
    # The next figure after the one last used for it (the essay stream's
    # card used the first), round the list.
    figures = c.figures(post)
    figure = None
    if figures:
        ids = [f['id'] for f in figures]
        used = next((e.get('figure') for e in reversed(mine) if e.get('figure')), None)
        if used is None and essay_card:
            used = ids[0]
        figure = figures[(ids.index(used) + 1) % len(ids)] if used in ids else figures[0]
    return post, excerpt, figure


def due_season(c, day, essays_due=0):
    """The Back in season post due today, or None: a stream day, none
    posted yet today, and room under PER_DAY after the essay stream."""
    stream = c.config['streams'].get('season') or {}
    if not stream.get('on'):
        return None
    if DAYS[day.weekday()] not in [d[:3].lower() for d in stream.get('days', [])]:
        return None
    log = c.config.get('log') or []
    if any(e.get('stream') == 'season' and e.get('date') == day.isoformat() for e in log):
        return None
    if posted_on(c, day) + essays_due >= PER_DAY:
        return None
    choice = season_choice(c, day)
    return compose_season(c, *choice) if choice else None


def season_ahead(c, start, first=None, count=4):
    """The next Back in season posts after start, as if each before it
    (first, start's own, among them) had gone out: for a dry run, which
    can't write the log."""
    stream = c.config['streams'].get('season') or {}
    days = [d[:3].lower() for d in stream.get('days', [])]
    log = list(c.config.get('log') or [])
    if first:
        log.append({'date': start.isoformat(), 'stream': 'season', 'post': first['post'],
                    'excerpt': first['excerpt'],
                    'figure': first['thumb']['id'] if first['thumb'] else None})
    out, day = [], start
    while len(out) < count and day < start + timedelta(days=120):
        day += timedelta(days=1)
        if DAYS[day.weekday()] not in days:
            continue
        choice = season_choice(c, day, log)
        if choice:
            post, excerpt, figure = choice
            out.append((day, compose_season(c, post, excerpt, figure)))
            log.append({'date': day.isoformat(), 'stream': 'season', 'post': post['id'],
                        'excerpt': excerpt, 'figure': figure['id'] if figure else None})
    return out


def public(method, **query):
    url = f'https://public.api.bsky.app/xrpc/{method}?' + '&'.join(
        f'{k}={urllib.request.quote(str(v))}' for k, v in query.items() if v is not None)
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.loads(r.read())


def announcements(c):
    """The account's earliest Bluesky post linking to each essay, by post ID:
    a link card to its Substack post (either address) or its page here."""
    did = public('com.atproto.identity.resolveHandle', handle=c.config['account'])['did']
    keys = {}
    for p in posts(c.data):
        for alias in [p.get('canonicalUrl', '').rstrip('/').rsplit('/', 1)[-1]] + (p.get('aliases') or []):
            if alias:
                keys[alias] = p['id']
        if p.get('page'):
            keys[f'{SITE}/{p["page"]}'.rstrip('/')] = p['id']
    found, cursor = {}, None
    while True:
        page = public('app.bsky.feed.getAuthorFeed', actor=did, limit=100,
                      filter='posts_no_replies', cursor=cursor)
        for item in page['feed']:
            post = item['post']
            embed = post['record'].get('embed') or {}
            if item.get('reason') or embed.get('$type') != 'app.bsky.embed.external':
                continue
            link = embed['external']['uri'].split('?')[0].split('#')[0].rstrip('/')
            pid = keys.get(link) or (keys.get(link.rsplit('/', 1)[-1]) if '.substack.com' in link else None)
            when = post['record'].get('createdAt', '')
            if pid and (pid not in found or when < found[pid][0]):
                found[pid] = (when, {'uri': post['uri'], 'cid': post['cid']})
        cursor = page.get('cursor')
        if not cursor or not page['feed']:
            break
    return {pid: ref for pid, (when, ref) in found.items()}


def describe_record(c, post, ref, out):
    figures = c.figures(post)
    record = document_record(c, post, 'at://…/site.standard.publication/' + c.config['publication']['rkey'],
                             ref, None)
    out.write(f'### {post["id"]}: {record["title"]}\n\n')
    out.write(f'- Path: {record["path"]} · published {record["publishedAt"][:10]}\n')
    out.write(f'- Description: {record.get("description", "none")}\n')
    out.write(f'- Cover: {figures[0]["id"] if figures else "none"}\n')
    out.write(f'- Tags: {" ".join(record.get("tags", [])) or "none"}\n')
    out.write(f'- Text: {len(record.get("textContent", ""))} characters of your own writing\n')
    out.write(f'- Bluesky post: {ref["uri"] if ref else "none found"}\n\n')


def send_record(bs, c, post, ref, publication):
    figures = c.figures(post)
    cover = bs.blob(ROOT / figures[0]['file'])[0] if figures else None
    done = c.config.setdefault('essays', {}).setdefault(post['id'], {})
    record = document_record(c, post, publication, ref, cover)
    done['document'] = bs.create('site.standard.document', record)['uri']
    done['digest'] = digest(record)
    if ref:
        done['ref'] = ref
    save_all(c)
    print(f'{post["id"]}: document record {done["document"]}')


def due_updates(c, publication):
    """Essays whose document record no longer matches their data (a
    corrected title, new hashtags, edited writing): (post, record) pairs."""
    out = []
    for pid, done in (c.config.get('essays') or {}).items():
        if 'document' not in done or 'digest' not in done:
            continue
        post = c.post(pid)
        record = document_record(c, post, publication, done.get('card') or done.get('ref'), None)
        if digest(record) != done['digest']:
            out.append((post, record))
    return out


def send_update(bs, c, post, record):
    done = c.config['essays'][post['id']]
    rkey = done['document'].rsplit('/', 1)[-1]
    old = bs.get('site.standard.document', rkey)
    if old and old['value'].get('coverImage'):
        record['coverImage'] = old['value']['coverImage']
    bs.put('site.standard.document', rkey, record)
    done['digest'] = digest({k: v for k, v in record.items()})
    save_all(c)
    print(f'{post["id"]}: updated its document record')


def describe(plan, out):
    out.write(f'### {plan["post"]}: {plan["title"]}\n\n')
    out.write('Card post text:\n\n```\n' + plan['text'] + '\n```\n\n')
    out.write(f'- Link: {plan["url"]}\n')
    out.write(f'- Card description: {plan["description"]}\n')
    out.write(f'- Card picture: {plan["thumb"]["id"] + " " + plan["thumb"]["file"] if plan["thumb"] else "none"}\n')
    out.write(f'- Unseen tags: {" ".join(plan["tags"]) or "none"}\n')
    if 'excerpt' in plan:
        out.write(f'- Excerpt {plan["excerpt"] + 1} of its list\n')
    elif plan['more']:
        out.write(f'- Reply with {len(plan["more"])} figures: {", ".join(f["id"] for f in plan["more"])}\n')
    else:
        out.write('- No reply (no more shareable figures)\n')
    out.write('\n')


def describe_season(c, day, plan, out, sent=False):
    stream = c.config['streams'].get('season') or {}
    if plan:
        head = 'Back in season' + ('' if sent else ' (dry run, not sent)')
        out.write(f'## {head}: {day:%A %-d %B}\n\n')
        describe(plan, out)
    ahead = season_ahead(c, day, plan)
    if ahead and not sent:
        out.write('Back in season after that, if each went out:\n\n')
        for d, p in ahead:
            out.write(f'- {d:%a %-d %b}: {p["post"]} ({p["title"]}), excerpt {p["excerpt"] + 1}, '
                      f'picture {p["thumb"]["id"] if p["thumb"] else "none"}\n')
        out.write('\n')
    elif not ahead and not plan and stream.get('on'):
        out.write('Back in season: no essay of this season is free in the next weeks.\n\n')


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--preview', metavar='POST')
    args = ap.parse_args()
    c = Collection()
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    out = open(summary, 'a') if summary else sys.stdout

    if args.preview:
        describe(compose_essay(c, c.post(args.preview)), sys.stdout)
        return

    day = today()
    due = due_essays(c)
    season = due_season(c, day, len(due))
    season_stream = c.config['streams'].get('season') or {}
    records = due_records(c)
    found = announcements(c) if records else {}
    password = os.environ.get('BLUESKY_APP_PASSWORD')
    dry = args.dry_run or not password
    if dry:
        out.write('## Syndication: dry run, nothing sent\n\n')
        if not password and not args.dry_run:
            out.write('(No BLUESKY_APP_PASSWORD secret yet.)\n\n')
        pub = f'at://{c.config.get("did", "…")}/site.standard.publication/{c.config["publication"]["rkey"]}'
        updates = due_updates(c, pub)
        if not due and not records and not updates and not season:
            out.write('Nothing due.\n\n')
        for p, _ in updates:
            out.write(f'- {p["id"]}: its document record would be updated to match its data\n')
        for p in due:
            describe(compose_essay(c, p), out)
        if season_stream.get('on'):
            describe_season(c, day, season, out)
        if records:
            out.write(f'## {len(records)} standard.site records for earlier essays (no posts)\n\n')
        for p in records:
            describe_record(c, p, found.get(p['id']), out)
        return

    # Signing in and checking the publication record on every live run
    # shows straight away if the password stops working.
    bs = Bluesky(c.config['account'], password)
    publication = ensure_publication(bs, c)
    updates = due_updates(c, publication)
    if not due and not records and not updates and not season:
        out.write('Signed in; the publication record is there. Nothing due.\n\n')
        if season_stream.get('on') and season_stream.get('dryRun'):
            describe_season(c, day, None, out)
        return
    for p, record in updates:
        out.write(f'- {p["id"]}: document record updated to match its data\n')
        send_update(bs, c, p, record)
    for p in due:
        plan = compose_essay(c, p)
        describe(plan, out)
        send_essay(bs, c, p, plan, publication)
    if season and season_stream.get('dryRun'):
        describe_season(c, day, season, out)
    elif season:
        describe(season, out)
        send_season(bs, c, season)
    for p in records:
        describe_record(c, p, found.get(p['id']), out)
        send_record(bs, c, p, found.get(p['id']), publication)


if __name__ == '__main__':
    main()
