#!/usr/bin/env python3
"""Build fonts/earthly-star/EarthlyStar.woff2 from fonts/earthly-star/star.svg.

The site's ornament star (U+2726, ✦) isn't in any of its text fonts, so
each device used to draw its own. This makes a one-character font from the
site's own drawing; css/styles.css lists it first in every font role,
limited to that one character, so the star looks the same everywhere.

Usage (needs fontTools and brotli: pip install fonttools brotli):
  python3 scripts/build_star_font.py

To redraw the star, edit the path in star.svg (a 100 × 100 box, star
centered) and run this again. SIZE and RAISE below set how large it is and
how high it sits beside the text.
"""

import re
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path

ROOT = Path(__file__).resolve().parent.parent
FOLDER = ROOT / 'fonts' / 'earthly-star'

UPM = 1000
SIZE = 780        # the star's height and width, in font units (1000 = 1 em)
RAISE = -60       # where the bottom of its drawing box sits, relative to the baseline
SIDE = 40         # space on each side
ADVANCE = SIZE + 2 * SIDE


def star_charstring():
    svg = (FOLDER / 'star.svg').read_text()
    d = re.search(r'<path d="([^"]+)"', svg).group(1)
    pen = T2CharStringPen(ADVANCE, None)
    scale = SIZE / 100
    # SVG y runs downward; font y runs upward from the baseline.
    transform = (scale, 0, 0, -scale, SIDE, RAISE + SIZE)
    parse_path(d, TransformPen(pen, transform))
    return pen.getCharString()


def main():
    fb = FontBuilder(UPM, isTTF=False)
    fb.setupGlyphOrder(['.notdef', 'uni2726'])
    fb.setupCharacterMap({0x2726: 'uni2726'})
    empty = T2CharStringPen(ADVANCE, None).getCharString()
    fb.setupCFF('EarthlyStar-Regular', {'FullName': 'Earthly Star'},
                {'.notdef': empty, 'uni2726': star_charstring()}, {})
    fb.setupHorizontalMetrics({'.notdef': (ADVANCE, 0), 'uni2726': (ADVANCE, SIDE)})
    # Modest vertical metrics, so a line containing the star is no taller
    # than the text around it.
    fb.setupHorizontalHeader(ascent=750, descent=-250)
    fb.setupOS2(version=4, sTypoAscender=750, sTypoDescender=-250, sTypoLineGap=0,
                usWinAscent=750, usWinDescent=250, fsSelection=0x40 | 0x80)
    fb.setupNameTable({
        'familyName': 'Earthly Star', 'styleName': 'Regular',
        'copyright': 'Drawn for The Earthly Book of Hours',
        'licenseDescription': 'Released with the site under CC0 1.0 (public domain dedication).',
    })
    fb.setupPost()
    fb.font.flavor = 'woff2'
    out = FOLDER / 'EarthlyStar.woff2'
    fb.save(out)
    print(f'Saved {out.relative_to(ROOT)} ({out.stat().st_size} bytes)')


if __name__ == '__main__':
    main()
