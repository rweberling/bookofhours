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
    return json.loads((DATA / f'{name}.json').read_text())


def save(name, obj):
    text = dumps(obj)
    if json.loads(text) != obj:
        raise ValueError(f'formatting data/{name}.json changed its contents; nothing written')
    (DATA / f'{name}.json').write_text(text)
