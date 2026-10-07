#!/usr/bin/env python3
"""Make the web copies of the site's images, and record what was done.

Usage:
  python3 scripts/build_images.py           # make any copies that are missing or stale
  python3 scripts/build_images.py --force   # remake them all

The images in images/ (the collection's, listed in data/images.json) and
in images/lectio-terra/ (the Lectio Terra posts') are the masters: the
files as they came from the library, museum or archive. They're never
changed. The pages show web copies made from them, in images/web/, at
the same path with the width added:

  images/fulcrum_klint.jpg
    -> images/web/fulcrum_klint-800.webp    the hours page, phones
       images/web/fulcrum_klint-1600.webp   the hours page, larger screens
       images/web/fulcrum_klint-2400.webp   full screen (weather, enlarged)

webVersion() in shared.js builds the same names, so the pages need no
list of them. A master narrower than a width is copied at its own width
rather than enlarged.

Each copy is turned upright (from the camera's orientation tag),
converted to sRGB (the colour space browsers assume), and saved without
the master's other metadata. The settings are in COPIES and QUALITY below.

data/image-files.json records, for every master, its size in pixels and
bytes, a SHA-256 checksum, and the copies made from it. It's written by
this script only; don't edit it by hand. The checksum says which file is
the master and whether it has changed since its copies were made:
scripts/check_data.py reports any master whose copies are missing or out
of date.
"""

import argparse
import hashlib
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageCms, ImageOps

import datafile

ROOT = datafile.ROOT
WEB = Path('images/web')
MANIFEST = 'image-files'

# (width, format) for each copy. WebP is read by every current browser
# (Safari since 2020), at about a third the size of a JPEG.
COPIES = [(800, 'webp'), (1600, 'webp'), (2400, 'webp')]
QUALITY = {'webp': 80}
SETTINGS = {
    'copies': [f'{w}px wide, {fmt}' for w, fmt in COPIES],
    'quality': QUALITY,
    'processing': 'turned upright from the orientation tag; converted to sRGB; '
                  'narrowed to the width (never enlarged); other metadata not kept',
}

Image.MAX_IMAGE_PIXELS = None  # the masters are trusted, and some are very large
SRGB = ImageCms.createProfile('sRGB')

# A short fingerprint of SETTINGS, so changing them remakes every copy.
SETTINGS_KEY = hashlib.sha256(json.dumps(SETTINGS, sort_keys=True).encode()).hexdigest()[:12]


def masters():
    """Every image the site shows, as paths from the site root."""
    paths = {record['file'] for record in datafile.load('images')}
    paths.update(f'images/lectio-terra/{p.name}'
                 for p in (ROOT / 'images/lectio-terra').iterdir() if p.is_file())
    return sorted(paths)


def web_path(master, width, fmt):
    """images/x/name.jpg -> images/web/x/name-800.webp (as webVersion() in shared.js)."""
    rel = Path(master).relative_to('images')
    return str(WEB / rel.parent / f'{rel.stem}-{width}.{fmt}')


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def load_manifest():
    try:
        return datafile.load(MANIFEST).get('files', {})
    except FileNotFoundError:
        return {}


def is_current(record, digest):
    """Whether a master's recorded copies were made from this file, with these settings."""
    return bool(record and record['sha256'] == digest and record.get('settings') == SETTINGS_KEY
                and all((ROOT / c['file']).exists() for c in record['copies']))


def stale_masters():
    """Masters with no web copies, or copies made from an older file or settings."""
    recorded = load_manifest()
    return [m for m in masters() if not is_current(recorded.get(m), sha256(ROOT / m))]


def to_srgb(im):
    """Upright, in sRGB, as RGB (or RGBA when the image has transparency)."""
    icc = im.info.get('icc_profile')
    im = ImageOps.exif_transpose(im)
    alpha = im.mode in ('RGBA', 'LA', 'PA') or (im.mode == 'P' and 'transparency' in im.info)
    mode = 'RGBA' if alpha else 'RGB'
    if icc and im.mode in ('RGB', 'RGBA', 'L', 'CMYK'):
        # The profile describes the pixels in their own mode (CMYK, greyscale
        # or RGB), so convert from that mode straight to sRGB.
        try:
            src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            return ImageCms.profileToProfile(im, src, SRGB, outputMode=mode)
        except (ImageCms.PyCMSError, OSError, ValueError):
            pass  # an unreadable profile: treat the pixels as sRGB
    return im.convert(mode)


def make_copies(master):
    with Image.open(ROOT / master) as im:
        width, height = im.size
        rgb = to_srgb(im)
    made = []
    for target, fmt in COPIES:
        w = min(target, rgb.width)
        h = round(rgb.height * w / rgb.width)
        copy = rgb if w == rgb.width else rgb.resize((w, h), Image.LANCZOS)
        out = ROOT / web_path(master, target, fmt)
        out.parent.mkdir(parents=True, exist_ok=True)
        copy.save(out, 'WEBP', quality=QUALITY[fmt], method=6)
        made.append({'file': web_path(master, target, fmt), 'width': w, 'height': h,
                     'bytes': out.stat().st_size})
    return {'width': width, 'height': height}, made


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--force', action='store_true', help='remake every copy')
    args = parser.parse_args()

    old_files = load_manifest()
    files, made_count = {}, 0
    for master in masters():
        digest = sha256(ROOT / master)
        prev = old_files.get(master)
        if is_current(prev, digest) and not args.force:
            files[master] = prev
            continue
        size, copies = make_copies(master)
        made_count += 1
        files[master] = {
            'bytes': (ROOT / master).stat().st_size,
            **size,
            'sha256': digest,
            'settings': SETTINGS_KEY,
            'copies': copies,
        }
        print(f'  {master}: {size["width"]}x{size["height"]} -> {len(copies)} copies')

    # Copies whose master is gone.
    wanted = {c['file'] for f in files.values() for c in f['copies']}
    removed = 0
    for path in (ROOT / WEB).rglob('*') if (ROOT / WEB).exists() else []:
        if path.is_file() and str(path.relative_to(ROOT)) not in wanted:
            path.unlink()
            removed += 1

    datafile.save(MANIFEST, {
        'about': 'Written by scripts/build_images.py; do not edit. The masters the site '
                 'shows, with a checksum of each and the web copies made from it.',
        'settings': SETTINGS,
        'files': files,
    })
    master_bytes = sum(f['bytes'] for f in files.values())
    print(f'{len(files)} masters ({master_bytes / 1e6:.0f} MB); made copies of {made_count}; '
          f'removed {removed} stale cop{"y" if removed == 1 else "ies"}.')


if __name__ == '__main__':
    sys.exit(main())
