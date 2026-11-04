"""Read and write the collection's JSON files in data/, keeping their layout.

Scripts that change data/ save through save(), which writes the same
hand-editable layout as the files already have: two-space indentation,
with short lists and small objects kept on one line. The text is checked
to parse back to exactly the same data before anything is written, so a
failed save never leaves a file half-written.
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'

_SCALAR = r'(?:"(?:[^"\\\n]|\\.)*"|-?[\d.]+|null|true|false)'
_PAIR = r'"[^"\n]+": ' + _SCALAR
_OBJ = re.compile(r'\{\n\s*(' + _PAIR + r'(?:,\n\s*' + _PAIR + r')*)\n\s*\}')
_ITEM = r'(?:' + _SCALAR + r'|\{ [^\n]* \})'
_LIST = re.compile(r'\[\n\s*(' + _ITEM + r'(?:,\n\s*' + _ITEM + r')*)\n\s*\]')
_WIDTH = 90


def dumps(obj):
    text = json.dumps(obj, ensure_ascii=False, indent=2)

    def inline_list(m):
        joined = '[' + ', '.join(re.split(r',\n\s*', m.group(1))) + ']'
        return joined if len(joined) <= _WIDTH else m.group(0)

    def inline_obj(m):
        joined = '{ ' + ', '.join(re.split(r',\n\s*', m.group(1))) + ' }'
        return joined if len(joined) <= _WIDTH else m.group(0)

    text = _LIST.sub(inline_list, text)
    text = _OBJ.sub(inline_obj, text)
    text = _LIST.sub(inline_list, text)
    return re.sub(r'\[\n\s*\]', '[]', text) + '\n'


def load(name):
    if name == 'lectio-data':
        return load_posts()
    return json.loads((DATA / f'{name}.json').read_text())


def save(name, obj):
    if name == 'lectio-data':
        return save_posts(obj)
    text = dumps(obj)
    if json.loads(text) != obj:
        raise ValueError(f'formatting data/{name}.json changed its contents; nothing written')
    (DATA / f'{name}.json').write_text(text)


# The Lectio Terra posts. data/lectio-data.json holds each post's record;
# its text as it came from Substack (bodyHtml) is kept beside it, a file a
# post, in data/substack/<post id>.html, so the pages, which don't use it,
# don't download it. load_posts() puts each text back on its post and
# save_posts() takes it off again, so scripts see the posts whole.
# The file keeps the plain two-space layout it has always had.
POSTS = DATA / 'lectio-data.json'


def _posts(data):
    return [e for entries in data.get('seasons', {}).values() for e in entries]


def load_posts(path=POSTS):
    path = Path(path)
    data = json.loads(path.read_text(encoding='utf-8'))
    folder = path.parent / 'substack'
    for entry in _posts(data):
        original = folder / f'{entry["id"]}.html'
        if 'bodyHtml' not in entry and original.exists():
            entry['bodyHtml'] = original.read_text(encoding='utf-8')
    return data


def save_posts(data, path=POSTS):
    path = Path(path)
    folder = path.parent / 'substack'
    folder.mkdir(exist_ok=True)
    stripped = json.loads(json.dumps(data))
    for entry in _posts(stripped):
        if 'bodyHtml' not in entry:
            continue
        original = folder / f'{entry["id"]}.html'
        text = entry.pop('bodyHtml')
        if not original.exists() or original.read_text(encoding='utf-8') != text:
            original.write_text(text, encoding='utf-8')
    path.write_text(json.dumps(stripped, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
