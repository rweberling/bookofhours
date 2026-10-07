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

Each copy carries its credit, as XMP (the metadata photo software and
image search read), so it stays attached when someone saves the image:
title, creator, date, the caption, the rights statement and its URI, and
the source link, from the image's record in data/images.json. A Lectio
Terra image is credited to its post. Editing a record remakes its copies.

data/image-files.json records, for every master, its size in pixels and
bytes, a SHA-256 checksum, and the copies made from it. It's written by
this script only; don't edit it by hand. The checksum says which file is
the master and whether it has changed since its copies were made:
scripts/check_data.py reports any master whose copies are missing or out
of date.
"""

import argparse
import hashlib
import html
import io
import json
import re
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


SITE = 'The Earthly Book of Hours, ' + 'https://' + (ROOT / 'CNAME').read_text().strip()
RIGHTS_LABELS = {
    'http://rightsstatements.org/vocab/NoC-US/1.0/': 'No Copyright - United States',
    'http://rightsstatements.org/vocab/InC/1.0/': 'In Copyright',
    'http://rightsstatements.org/vocab/InC-EDU/1.0/': 'In Copyright - Educational Use Permitted',
    'http://rightsstatements.org/vocab/NoC-NC/1.0/': 'No Copyright - Non-Commercial Use Only',
    'http://rightsstatements.org/vocab/NoC-OKLR/1.0/': 'No Copyright - Other Known Legal Restrictions',
    'http://rightsstatements.org/vocab/CNE/1.0/': 'Copyright Not Evaluated',
    'http://rightsstatements.org/vocab/UND/1.0/': 'Copyright Undetermined',
    'https://creativecommons.org/publicdomain/mark/1.0/': 'Public Domain Mark 1.0',
    'https://creativecommons.org/publicdomain/zero/1.0/': 'CC0 1.0',
}


def plain(text):
    """Caption or citation markup as plain text."""
    return html.unescape(re.sub(r'<[^>]*>', '', text or '')).strip()


def rights_label(uri):
    if uri in RIGHTS_LABELS:
        return RIGHTS_LABELS[uri]
    m = re.match(r'https://creativecommons.org/licenses/([a-z-]+)/([\d.]+)', uri or '')
    return f'CC {m.group(1).upper()} {m.group(2)}' if m else uri


def credits():
    """The credit to embed in each master's copies, keyed by master path."""
    out = {}
    for rec in datafile.load('images'):
        links = rec.get('links') or []
        source = ((rec.get('source') or {}).get('url')
                  or next((l['url'] for l in links if l['role'] == 'cited'), None)
                  or next((l['url'] for l in links if l['role'] in ('original', 'copy')), None))
        out[rec['file']] = {
            'title': plain(rec.get('title') or rec.get('container')),
            'creator': (rec.get('creator') or {}).get('name'),
            'date': rec.get('date'),
            'description': plain(rec.get('caption')),
            'rights': rec.get('rights'),
            'source': source,
        }
    lectio = json.loads((ROOT / 'lectio-data.json').read_text())
    entries = [e for group in lectio['seasons'].values() for e in group] + lectio.get('unassigned', [])
    for entry in entries:
        for img in entry.get('images') or []:
            out.setdefault(img['src'], {
                'title': plain(entry.get('title')),
                'description': f'An image from the Lectio Terra post "{plain(entry.get("title"))}"',
                'source': entry.get('canonicalUrl'),
            })
    return out


def xmp(meta):
    """An XMP packet with the credit in Dublin Core and XMP Rights terms."""
    esc = lambda t: html.escape(str(t), quote=True)
    alt = lambda t: f'<rdf:Alt><rdf:li xml:lang="x-default">{esc(t)}</rdf:li></rdf:Alt>'
    fields = []
    if meta.get('title'):
        fields.append(f'<dc:title>{alt(meta["title"])}</dc:title>')
    if meta.get('creator'):
        fields.append(f'<dc:creator><rdf:Seq><rdf:li>{esc(meta["creator"])}</rdf:li></rdf:Seq></dc:creator>')
    if meta.get('date') and re.fullmatch(r'\d{4}(-\d{2}(-\d{2})?)?', str(meta['date'])):
        fields.append(f'<dc:date><rdf:Seq><rdf:li>{esc(meta["date"])}</rdf:li></rdf:Seq></dc:date>')
    if meta.get('description'):
        fields.append(f'<dc:description>{alt(meta["description"])}</dc:description>')
    if meta.get('source'):
        fields.append(f'<dc:source>{esc(meta["source"])}</dc:source>')
    if meta.get('rights'):
        fields.append(f'<dc:rights>{alt(rights_label(meta["rights"]))}</dc:rights>')
        fields.append(f'<xmpRights:WebStatement>{esc(meta["rights"])}</xmpRights:WebStatement>')
        fields.append(f'<xmpRights:Marked>{"True" if "/InC" in meta["rights"] else "False"}</xmpRights:Marked>')
    fields.append(f'<photoshop:Credit>{esc(SITE)}</photoshop:Credit>')
    body = '\n   '.join(fields)
    return (
        '<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>\n'
        '<x:xmpmeta xmlns:x="adobe:ns:meta/">\n'
        ' <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n'
        '  <rdf:Description rdf:about=""\n'
        '    xmlns:dc="http://purl.org/dc/elements/1.1/"\n'
        '    xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"\n'
        '    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/">\n'
        f'   {body}\n'
        '  </rdf:Description>\n'
        ' </rdf:RDF>\n'
        '</x:xmpmeta>\n'
        '<?xpacket end="w"?>'
    ).encode('utf-8')


def credit_key(meta):
    return hashlib.sha256(json.dumps(meta or {}, sort_keys=True).encode()).hexdigest()[:12]


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


def is_current(record, digest, meta):
    """Whether a master's recorded copies were made from this file, settings and credit."""
    return bool(record and record['sha256'] == digest and record.get('settings') == SETTINGS_KEY
                and record.get('credit') == credit_key(meta)
                and all((ROOT / c['file']).exists() for c in record['copies']))


def stale_masters():
    """Masters with no web copies, or copies made from an older file, settings or credit."""
    recorded, meta = load_manifest(), credits()
    return [m for m in masters()
            if not is_current(recorded.get(m), sha256(ROOT / m), meta.get(m))]


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


def make_copies(master, meta):
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
        copy.save(out, 'WEBP', quality=QUALITY[fmt], method=6, xmp=xmp(meta or {}))
        made.append({'file': web_path(master, target, fmt), 'width': w, 'height': h,
                     'bytes': out.stat().st_size})
    return {'width': width, 'height': height}, made


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--force', action='store_true', help='remake every copy')
    args = parser.parse_args()

    old_files, meta = load_manifest(), credits()
    files, made_count = {}, 0
    for master in masters():
        digest = sha256(ROOT / master)
        prev = old_files.get(master)
        if is_current(prev, digest, meta.get(master)) and not args.force:
            files[master] = prev
            continue
        size, copies = make_copies(master, meta.get(master))
        made_count += 1
        files[master] = {
            'bytes': (ROOT / master).stat().st_size,
            **size,
            'sha256': digest,
            'settings': SETTINGS_KEY,
            'credit': credit_key(meta.get(master)),
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
