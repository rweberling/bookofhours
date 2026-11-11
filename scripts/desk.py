#!/usr/bin/env python3
"""Prepare a week's candidates for the review desk.

Usage:
  python3 scripts/desk.py <rows.json> <out-dir>

The review desk (https://claude.ai/artifact/JmjvhTBxkpjsudYL1mg1hw) is a
private page where Ryan reads each week's nominations one at a time and
chooses "add it", "not now" or "no", with a note. Its records live in the
page's own database (collection "candidates"), which sessions reach with
the ArtifactData tool; the candidates Google Sheet stays the lasting copy.

<rows.json> holds the week's new rows exactly as the Sheet has them: a JSON
object {"values": [[header...], [row...], ...]} (what get_values returns),
or a bare list of rows, with or without the header. The script writes to
<out-dir>:

  docs/<doc id>.json   one desk record per row (doc id: <proposed>-NN,
                       numbered from the Sheet row's place in the week)
  previews/<doc id>.jpg  for each image row, a copy at most 1600 px from the
                       first .jpg/.png URL in its leads (or source)
  writes.json          the ArtifactData "batch" writes for the records

Day candidates (kind "day": a subject, one image and one reading for a
coming week of the Seasons' days) are prepared the same way from a JSON
list, one object per candidate:

  python3 scripts/desk.py --days <candidates.json> <out-dir>

Each object: proposed (date), week (number), subject (its name), latin,
subjectId (sp-/ph-, if it has a record yet), essay (the week's essay
subject, if any), nomination (why now, that week), imageWork,
imageCreator, imageDate, imageUrl (the file, for the preview),
imageSource, readingWork, readingCreator, passage (exactly as in the
source), readingSource, leads, rights, notes. Their doc ids are
<proposed>-dNN; the week's dates are filled in from scripts/weeks.py.

Then, in order: upload the previews to the desk (Artifact publish with
url, asset: true, file_paths), put each returned id in its record with
python3 scripts/desk.py --preview <out-dir> <doc id> <asset id>, and send
writes.json as one ArtifactData batch. A record that already exists on the
desk is left alone (the batch would need its version): check with an
ArtifactData list first and drop those from writes.json.
"""

import json
import os
import re
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

KEYS = ['proposed', 'kind', 'for', 'tags', 'work', 'creator', 'date', 'nomination',
        'source', 'leads', 'rights', 'quality', 'sheetDecision', 'notes', 'addedAs']
KEEP = ['proposed', 'kind', 'for', 'tags', 'work', 'creator', 'date', 'nomination',
        'source', 'leads', 'rights', 'quality', 'notes']
AGENT = 'EarthlyHours/1.0 (https://earthlyhours.com; review desk previews)'


def rows_of(data):
    rows = data['values'] if isinstance(data, dict) else data
    if rows and rows[0] and rows[0][0] == 'Proposed':
        rows = rows[1:]
    return [r + [''] * (len(KEYS) - len(r)) for r in rows if any(c.strip() for c in r)]


def image_url(row):
    for field in (row['leads'], row['source']):
        m = re.search(r'https?://commons\.wikimedia\.org/wiki/File:(\S+?)(?=[\s);]|$)', field or '')
        if m:
            return f'https://commons.wikimedia.org/wiki/Special:FilePath/{m.group(1)}?width=2000'
        m = re.search(r'https?://\S+?\.(?:jpe?g|png|tiff?)(?=[\s);]|$)', field or '', re.I)
        if m:
            return m.group(0)
    return None


def fetch_preview(url, path):
    from PIL import Image
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': AGENT})
            with urllib.request.urlopen(req, timeout=120) as r, open(path + '.part', 'wb') as f:
                f.write(r.read())
            break
        except Exception as error:
            print(f'  {url}: {error}; waiting', file=sys.stderr)
            time.sleep(8 * (attempt + 1))
    else:
        return False
    try:
        im = Image.open(path + '.part').convert('RGB')
    except Exception as error:
        print(f'  {url}: not an image ({error})', file=sys.stderr)
        return False
    im.thumbnail((1600, 1600))
    im.save(path, quality=84, optimize=True, progressive=True)
    os.remove(path + '.part')
    return True


def prepare(rows_file, out):
    rows = rows_of(json.load(open(rows_file)))
    os.makedirs(f'{out}/docs', exist_ok=True)
    os.makedirs(f'{out}/previews', exist_ok=True)
    writes, counter = [], {}
    for values in rows:
        row = dict(zip(KEYS, values))
        week = row['proposed'].strip()
        counter[week] = counter.get(week, 0) + 1
        doc_id = f'{week}-{counter[week]:02d}'
        doc = {k: row[k] for k in KEEP}
        doc.update(order=counter[week], decision=None, note='', decidedAt=None)
        if row['kind'].strip() == 'image':
            url = image_url(row)
            name = f'{out}/previews/{doc_id}.jpg'
            if url and fetch_preview(url, name):
                print(f'{doc_id}: preview {name}')
            else:
                print(f'{doc_id}: no preview ({url or "no image link"}); the desk shows it without one')
            time.sleep(3)
        path = os.path.abspath(f'{out}/docs/{doc_id}.json')
        json.dump(doc, open(path, 'w'), ensure_ascii=False, indent=1)
        writes.append({'op': 'set', 'collection': 'candidates', 'doc_id': doc_id, 'file_path': path})
    json.dump(writes, open(f'{out}/writes.json', 'w'), indent=1)
    print(f'{len(writes)} records; writes in {out}/writes.json')


DAY_KEEP = ['proposed', 'week', 'subject', 'latin', 'subjectId', 'essay', 'nomination',
            'imageWork', 'imageCreator', 'imageDate', 'imageUrl', 'imageSource',
            'readingWork', 'readingCreator', 'passage', 'readingSource', 'leads', 'rights', 'notes']


def prepare_days(candidates_file, out):
    from weeks import range_words
    candidates = json.load(open(candidates_file))
    os.makedirs(f'{out}/docs', exist_ok=True)
    os.makedirs(f'{out}/previews', exist_ok=True)
    writes, counter = [], {}
    for cand in candidates:
        week = str(cand['proposed']).strip()
        counter[week] = counter.get(week, 0) + 1
        doc_id = f'{week}-d{counter[week]:02d}'
        doc = {k: cand.get(k, '') for k in DAY_KEEP}
        doc['week'] = int(cand['week'])
        # The desk shows a record's work and creator as its title and byline.
        doc.update(kind='day', weekRange=range_words(doc['week']), work=cand.get('subject', ''),
                   creator=cand.get('latin', ''), date='', source=cand.get('imageSource', ''),
                   order=counter[week], decision=None, note='', decidedAt=None)
        url = cand.get('imageUrl') or image_url({'leads': cand.get('leads', ''), 'source': cand.get('imageSource', '')})
        name = f'{out}/previews/{doc_id}.jpg'
        if url and fetch_preview(url, name):
            print(f'{doc_id}: preview {name}')
        else:
            print(f'{doc_id}: no preview ({url or "no image link"}); the desk shows it without one')
        time.sleep(3)
        path = os.path.abspath(f'{out}/docs/{doc_id}.json')
        json.dump(doc, open(path, 'w'), ensure_ascii=False, indent=1)
        writes.append({'op': 'set', 'collection': 'candidates', 'doc_id': doc_id, 'file_path': path})
    json.dump(writes, open(f'{out}/writes.json', 'w'), indent=1)
    print(f'{len(writes)} day records; writes in {out}/writes.json')


def set_preview(out, doc_id, asset_id):
    path = f'{out}/docs/{doc_id}.json'
    doc = json.load(open(path))
    doc['previewAsset'] = asset_id
    doc['preview'] = '/_blob/' + asset_id
    json.dump(doc, open(path, 'w'), ensure_ascii=False, indent=1)
    print(f'{doc_id}: preview {asset_id}')


if __name__ == '__main__':
    args = sys.argv[1:]
    if len(args) == 4 and args[0] == '--preview':
        set_preview(*args[1:])
    elif len(args) == 3 and args[0] == '--days':
        prepare_days(*args[1:])
    elif len(args) == 2:
        prepare(*args)
    else:
        print(__doc__)
        sys.exit(1)
