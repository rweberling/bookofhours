#!/usr/bin/env python3
"""Put the site's open-rights figures on Are.na, one image block each, in
the channels under "The Earthly Book of Hours".

Usage:
  python3 scripts/arena.py                 post what is new (needs ARENA_TOKEN)
  python3 scripts/arena.py --dry-run       say what it would do; send nothing
  python3 scripts/arena.py --limit 1       make at most one new block this run
  python3 scripts/arena.py --show i-0001 i-0035
                                           print those images' blocks as they'd be sent

Run by .github/workflows/syndicate.yml with the daily run. Without the
ARENA_TOKEN secret (an Are.na personal access token with write scope) it
does a dry run.

What goes up: every image the site shows (not a draft) whose rights allow
sharing (NoC-US or a public-domain mark, syndicate.py's OPEN_RIGHTS), from
its 1600 px web copy on earthlyhours.com, in exactly one channel, the one
where the site shows it:

  seasons  a Lectio Terra figure: the channel of its post's season
  hours    an Hours image: the channel of its watch (each has one)
  weather  a Weather image: The Weather

A block in two channels would count twice against the free plan's 200
blocks, so each image goes in one only. Videos and figures of posts not
yet in a season are left out.

Each block: title, the work and its creator; description (markdown), the
caption as plain text, the date, the tags (watch or weather conditions,
seasons, the species or phenomenon) and a link back to where the site
shows it (the essay's page, /?i=<id>, weather.html?i=<id>); alt text from
the record; source, the work's cited page (the scan or the institution's
record). No shop, postcard or support links: Are.na's terms are
non-commercial.

What it keeps (data/syndication.json, "arena"):

  channels  each channel's Are.na id and title, its "description"
            (markdown; set on Are.na whenever it changes, "descriptionSent"
            keeping a digest of the last one sent), and "in", the channel it
            sits in. A channel with no id is made (closed: anyone can see
            it, only the owner adds to it); a missing link to its parent
            is made. The keys are the site's own: the umbrella, "seasons"
            and the four seasons, "hours" and the eight watches, "weather".
  blocks    per image ID, the block's "id", its "channel" key and a
            "digest" of what was sent. When a record's title, description
            or alt text changes, the block is updated to match.
  maxBlocks the most blocks it will make (the free plan allows 200 in all,
            including blocks made by hand).

An image that stops being shareable (now a draft, or its rights changed)
is only reported; its block is left for a person to remove. Writes pause
half a second apart and wait out Are.na's rate limit (30 writes a minute
on the free plan) when it runs low.
"""

import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from datafile import load, save  # noqa: E402
from syndicate import OPEN_RIGHTS, plain, posts  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://earthlyhours.com'
API = 'https://api.are.na/v3'
USER_AGENT = 'EarthlyHours/1.0 (+https://earthlyhours.com)'
PAUSE = 0.5
WEB_WIDTH = '1600'


# ---------- reading the collection ----------

class Collection:
    def __init__(self):
        self.config = load('syndication')
        self.images = load('images')
        self.files = load('image-files')['files']
        self.vocab = load('vocab')
        self.subjects = {r['id']: r for r in load('species') + load('phenomena')}
        self.posts = {}
        for season, items in load('lectio-data')['seasons'].items():
            for p in items:
                self.posts[p['id']] = dict(p, season=p.get('season') or season)

    @property
    def arena(self):
        return self.config.setdefault('arena', {})

    def label(self, kind, key):
        for v in self.vocab[kind]:
            if v['id'] == key:
                return v['label']
        return key

    def web_copy(self, image):
        for copy in (self.files.get(image['file']) or {}).get('copies', []):
            if copy['file'].endswith(f'-{WEB_WIDTH}.webp'):
                return copy['file']
        return None

    def channel_of(self, image):
        """The channel key an image belongs in, or None if it isn't shared."""
        where = image.get('shownIn')
        tags = image.get('tags') or {}
        if where == 'seasons':
            post = self.posts.get((image.get('lectio') or {}).get('post'))
            return post['season'] if post and post['season'] in self.arena['channels'] else None
        if where == 'hours':
            watches = tags.get('hours') or []
            return watches[0] if len(watches) == 1 else 'hours'
        if where == 'weather':
            return 'weather'
        return None

    def shareable(self, image):
        return (not image.get('draft')
                and (image.get('rights') or '').startswith(OPEN_RIGHTS)
                and image.get('media') != 'video'
                and not str(image.get('file', '')).startswith('http')
                and (ROOT / image['file']).exists()
                and self.web_copy(image)
                and self.channel_of(image))

    def figures(self):
        """The shareable images, in the order they go up: the essays'
        figures by publication and place, then the Hours by watch, then
        the Weather."""
        watch_order = {v['id']: n for n, v in enumerate(self.vocab['hours'])}

        def key(i):
            if i['shownIn'] == 'seasons':
                post = self.posts[i['lectio']['post']]
                return (0, post.get('published', ''), i['lectio'].get('place', 0), i['id'])
            if i['shownIn'] == 'hours':
                return (1, str(watch_order.get(self.channel_of(i), 99)), 0, i['id'])
            return (2, '', 0, i['id'])
        return sorted((i for i in self.images if self.shareable(i)), key=key)


# ---------- composing a block ----------

def edtf(value):
    """An EDTF date as a reader would write it: 1910~ → c. 1910,
    1872~/1878~ → c. 1872–1878, -1649~ → c. 1650 BCE, 1899-05-02 →
    2 May 1899."""
    if not value:
        return None
    months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
              'August', 'September', 'October', 'November', 'December']

    def one(v):
        approx = v.endswith('~') or v.endswith('?') or v.endswith('%')
        v = v.rstrip('~?%')
        bce = v.startswith('-')
        parts = v.lstrip('-').split('-')
        year = int(parts[0])
        if bce:
            text = f'{year + 1} BCE'
        else:
            text = str(year)
            if len(parts) >= 2:
                text = f'{months[int(parts[1]) - 1]} {text}'
            if len(parts) == 3:
                text = f'{int(parts[2])} {text}'
        return ('c. ' if approx else '') + text, approx, bce
    if '/' in value:
        (a, approx_a, bce_a), (b, approx_b, bce_b) = (one(v) for v in value.split('/'))
        if approx_a and approx_b:
            b = b[3:]
        if bce_a and bce_b:
            a = a[:-4]
        text = f'{a}–{b}'
    else:
        text, _, bce_b = one(value)
    early = re.search(r'(\d+)$', text)
    if not bce_b and early and int(early.group(1)) < 1000:
        text += ' CE'
    return text


def work_and_creator(image):
    edition = image.get('edition') or {}
    work = (image.get('title') or edition.get('title')
            or (image.get('partOf') or {}).get('title'))
    creator = (image.get('creator') or {}).get('name')
    if not creator:
        authors = [c['name'] for c in edition.get('contributors', []) if c.get('role') == 'author']
        creator = authors[0] if authors else None
    return work, creator


def block_title(image):
    work, creator = work_and_creator(image)
    if work:
        work = plain(work)
        return f'{work} — {creator}' if creator else work
    return plain(image.get('caption'))[:200]


def image_date(image):
    edition = image.get('edition') or {}
    return edtf(image.get('date') or edition.get('original-date') or edition.get('issued'))


def source(image):
    """The work's cited page: the scan opened at the plate, or the
    institution's record."""
    loc = image.get('locator')
    if isinstance(loc, list):
        loc = loc[0] if loc else None
    if loc and loc.get('url'):
        return loc['url'], loc.get('label')
    for link in image.get('links') or []:
        if link.get('role') == 'cited' and link.get('url'):
            return link['url'], link.get('label') or image.get('institution')
    m = re.search(r'href="([^"]+)"', image.get('caption') or '')
    if m:
        return m.group(1), image.get('institution')
    return None, None


def link_back(c, image):
    if image['shownIn'] == 'seasons':
        post = c.posts[image['lectio']['post']]
        if post.get('page'):
            return f'{SITE}/{post["page"]}', f'Lectio Terra, “{post["title"]}”'
        return f'{SITE}/seasons.html', 'The Seasons'
    if image['shownIn'] == 'hours':
        return f'{SITE}/?i={image["id"]}', 'The Hours'
    return f'{SITE}/weather.html?i={image["id"]}', 'The Weather'


def tags_lines(c, image):
    tags = image.get('tags') or {}
    lines = []
    if tags.get('hours') and image['shownIn'] == 'hours':
        watches = [v for v in c.vocab['hours'] if v['id'] in tags['hours']]
        lines.append('Watch: ' + ', '.join(f'{v["label"]} ({v["subtitle"].lower()})' for v in watches))
    if tags.get('weather'):
        lines.append('Weather: ' + ', '.join(c.label('weather', w) for w in tags['weather']))
    seasons = list(tags.get('seasons') or [])
    if image['shownIn'] == 'seasons':
        season = c.posts[image['lectio']['post']]['season']
        if season not in seasons:
            seasons.insert(0, season)
    if seasons:
        lines.append('Season: ' + ', '.join(c.label('seasons', s) for s in seasons))
    subjects = []
    for t in (tags.get('species') or []) + (tags.get('phenomena') or []):
        sid = t['id'] if isinstance(t, dict) else t
        s = c.subjects.get(sid)
        if s:
            name = s.get('name')
            if s.get('scientific'):
                name += f' (*{s["scientific"]}*)'
            subjects.append(name)
    if subjects:
        lines.append('Subject: ' + ', '.join(subjects))
    return lines


def compose(c, image):
    caption = plain(image.get('caption'))
    url, where = link_back(c, image)
    parts = [caption] if caption else []
    date = image_date(image)
    meta = ([f'Date: {date}'] if date else []) + tags_lines(c, image)
    if meta:
        parts.append('  \n'.join(meta))
    parts.append(f'From *The Earthly Book of Hours*: [{where}]({url})')
    src_url, src_title = source(image)
    block = {
        'value': f'{SITE}/{c.web_copy(image)}',
        'title': block_title(image),
        'description': '\n\n'.join(parts),
        'alt_text': plain(image.get('alt')) or caption,
    }
    if src_url:
        block['original_source_url'] = src_url
        block['original_source_title'] = src_title or urllib.parse.urlparse(src_url).netloc
    return block


def digest(block):
    keep = {k: block.get(k) for k in ('title', 'description', 'alt_text')}
    return hashlib.sha256(json.dumps(keep, sort_keys=True).encode()).hexdigest()[:16]


# ---------- the API ----------

class Arena:
    def __init__(self, token):
        self.token = token
        self.reset_at = 0

    def call(self, method, path, body=None, query=None):
        url = API + path + ('?' + urllib.parse.urlencode(query) if query else '')
        data = json.dumps(body).encode() if body is not None else None
        for attempt in range(5):
            req = urllib.request.Request(url, data=data, method=method, headers={
                'Authorization': f'Bearer {self.token}',
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
                **({'Content-Type': 'application/json'} if data else {}),
            })
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    self.pace(r.headers, write=method != 'GET')
                    text = r.read().decode()
                    return json.loads(text) if text else {}
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < 4:
                    wait = int(e.headers.get('Retry-After') or 60)
                    print(f'  (rate limited; waiting {wait}s)', file=sys.stderr)
                    time.sleep(wait + 1)
                    continue
                if e.code >= 500 and attempt < 4:
                    time.sleep(5 * (attempt + 1))
                    continue
                raise RuntimeError(f'{method} {path}: HTTP {e.code} {e.read().decode()[:500]}') from None

    def pace(self, headers, write):
        if not write:
            return
        time.sleep(PAUSE)
        remaining = headers.get('X-RateLimit-Remaining')
        reset = headers.get('X-RateLimit-Reset')
        if remaining is not None and reset and int(remaining) <= 1:
            wait = max(0, int(reset) - time.time()) + 1
            print(f'  (write limit reached; waiting {int(wait)}s)', file=sys.stderr)
            time.sleep(wait)

    def contents(self, channel_id):
        items, page = [], 1
        while True:
            d = self.call('GET', f'/channels/{channel_id}/contents', query={'per': 100, 'page': page})
            items += d.get('data', [])
            if not (d.get('meta') or {}).get('has_more_pages'):
                return items
            page += 1


def live(url):
    req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status == 200
    except urllib.error.URLError:
        return False


# ---------- what is due ----------

def ensure_channels(c, api, out, dry):
    """Make any channel without an id, and any missing link to its parent."""
    channels = c.arena['channels']
    for key, ch in channels.items():
        if ch.get('id'):
            continue
        out.write(f'- channel {key}: make “{ch["title"]}”\n')
        if not dry:
            made = api.call('POST', '/channels', {'title': ch['title'], 'visibility': 'closed'})
            ch['id'] = made['id']
            ch['slug'] = made.get('slug')
            save('syndication', c.config)
    for key, ch in channels.items():
        sent = hashlib.sha256((ch.get('description') or '').encode()).hexdigest()[:16]
        if not ch.get('description') or ch.get('descriptionSent') == sent:
            continue
        out.write(f'- channel {key}: set its description\n')
        if not dry:
            api.call('PUT', f'/channels/{ch["id"]}', {'description': ch['description']})
            ch['descriptionSent'] = sent
            save('syndication', c.config)
    parents = {ch['in'] for ch in channels.values() if ch.get('in')}
    for parent in parents:
        pid = channels[parent].get('id')
        held = set()
        if pid and api:
            held = {i['id'] for i in api.contents(pid) if i.get('type') == 'Channel'}
        for key, ch in channels.items():
            if ch.get('in') != parent or (ch.get('id') and ch['id'] in held):
                continue
            out.write(f'- channel {key}: put it in {parent}\n')
            if not dry:
                api.call('POST', '/connections', {'connectable_id': ch['id'],
                                                  'connectable_type': 'Channel',
                                                  'channel_ids': [pid]})


def plan(c):
    blocks = c.arena.setdefault('blocks', {})
    new, changed = [], []
    for image in c.figures():
        block = compose(c, image)
        done = blocks.get(image['id'])
        if not done:
            new.append((image, block))
        elif done.get('digest') != digest(block):
            changed.append((image, block))
    shared = {i['id'] for i in c.figures()}
    gone = [(iid, b) for iid, b in blocks.items() if iid not in shared]
    return new, changed, gone


def show(c, image, block, out):
    key = c.channel_of(image)
    out.write(f'### {image["id"]} → {c.arena["channels"][key]["title"]}\n\n')
    out.write(f'- **image:** {block["value"]}\n')
    out.write(f'- **title:** {block["title"]}\n')
    out.write(f'- **alt text:** {block["alt_text"]}\n')
    if block.get('original_source_url'):
        out.write(f'- **source:** {block["original_source_title"]}, {block["original_source_url"]}\n')
    out.write('- **description:**\n\n')
    out.write(''.join(f'    {line}\n' for line in block['description'].split('\n')) + '\n')


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--show', nargs='+', metavar='IMAGE')
    ap.add_argument('--limit', type=int, metavar='N', help='make at most N new blocks this run')
    args = ap.parse_args()
    c = Collection()
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    out = open(summary, 'a') if summary else sys.stdout

    if args.show:
        by_id = {i['id']: i for i in c.images}
        for iid in args.show:
            image = by_id.get(iid)
            if not image or not c.shareable(image):
                out.write(f'{iid}: not shared on Are.na (draft, rights, video or not shown)\n\n')
                continue
            show(c, image, compose(c, image), out)
        return

    cfg = c.arena
    if not cfg.get('on'):
        out.write('## Are.na\n\nOff ("on" is not true in data/syndication.json).\n')
        return
    token = os.environ.get('ARENA_TOKEN')
    dry = args.dry_run or not token or cfg.get('dryRun')
    out.write('## Are.na' + (' (dry run)' if dry else '') + '\n\n')
    if not token:
        out.write('No ARENA_TOKEN, so nothing is sent.\n\n')
    api = Arena(token) if token else None

    ensure_channels(c, api, out, dry)
    new, changed, gone = plan(c)
    blocks = cfg['blocks']
    room = max(0, cfg.get('maxBlocks', 190) - len(blocks))
    if len(new) > room:
        out.write(f'- {len(new) - room} new figures held back: maxBlocks ({cfg.get("maxBlocks", 190)}) reached\n')
        new = new[:room]
    if args.limit is not None:
        new = new[:args.limit]
    counts = {}
    for image, block in new:
        counts[c.channel_of(image)] = counts.get(c.channel_of(image), 0) + 1
    out.write(f'- {len(new)} new blocks'
              + (': ' + ', '.join(f'{c.arena["channels"][k]["title"]} {n}' for k, n in counts.items()) if counts else '')
              + f'; {len(changed)} to update; {len(blocks)} already up\n')
    for iid, b in gone:
        out.write(f'- {iid} is no longer shared (draft or rights) but its block {b["id"]} is still up: remove it by hand\n')

    if dry:
        for image, block in new[:3]:
            out.write('\n')
            show(c, image, block, out)
        return

    made = 0
    for image, block in new:
        if not live(block['value']):
            out.write(f'- {image["id"]}: {block["value"]} is not on the site yet; next run\n')
            continue
        key = c.channel_of(image)
        body = dict(block, channel_ids=[c.arena['channels'][key]['id']])
        res = api.call('POST', '/blocks', body)
        blocks[image['id']] = {'id': res['id'], 'channel': key, 'digest': digest(block)}
        save('syndication', c.config)
        made += 1
        if res.get('type') not in (None, 'Image', 'PendingBlock'):
            out.write(f'- {image["id"]}: block {res["id"]} came out as {res.get("type")}, not Image\n')
    for image, block in changed:
        b = blocks[image['id']]
        api.call('PUT', f'/blocks/{b["id"]}', {k: block[k] for k in ('title', 'description', 'alt_text')})
        b['digest'] = digest(block)
        save('syndication', c.config)
        out.write(f'- {image["id"]}: block {b["id"]} updated to match its record\n')
    out.write(f'- made {made} blocks\n')


if __name__ == '__main__':
    main()
