#!/usr/bin/env python3
"""Import a Substack export into the static Lectio Terra data file.

Usage:
  python3 scripts/import_substack.py --export /path/to/substack-export --template
  python3 scripts/import_substack.py --export /path/to/substack-export --assignments season-assignments.json
  python3 scripts/import_substack.py --export /path/to/substack-export --assignments season-assignments.json --write
"""

import argparse
import csv
import hashlib
import html
import json
import re
import shutil
import subprocess
import sys
import urllib.request
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

SEASONS = ('spring', 'summer', 'autumn', 'winter')
ALLOWED_TAGS = {
    'a', 'blockquote', 'br', 'em', 'figcaption', 'figure', 'h2', 'h3', 'h4',
    'hr', 'img', 'li', 'ol', 'p', 'strong', 'u', 'ul'
}
ALLOWED_ATTRIBUTES = {
    'a': {'href', 'target', 'rel'},
    'img': {'alt', 'height', 'loading', 'src', 'title', 'width'},
}
DROP_CONTENT_TAGS = {'script', 'style', 'iframe', 'form', 'button', 'svg', 'video', 'audio'}
POST_ID_PATTERN = re.compile(r'^(\d+)\.')


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--export', required=True, type=Path, help='Substack export directory')
    parser.add_argument('--assignments', type=Path, default=Path('season-assignments.json'))
    parser.add_argument('--output', type=Path, default=Path('lectio-data.json'))
    parser.add_argument('--images', type=Path, default=Path('images/lectio-terra'))
    parser.add_argument('--template', action='store_true', help='Print an assignment template instead of writing data')
    parser.add_argument('--write', action='store_true', help='Write the generated JSON and downloaded images')
    parser.add_argument('--refresh', nargs='*', default=[], metavar='SLUG',
                         help='Re-import these already-imported posts from the export instead of leaving them untouched '
                              '(discards any hand edits made to that entry in the existing output file)')
    return parser.parse_args()


class SafeHTML(HTMLParser):
    def __init__(self, image_dir, post_id, post_title, download_images):
        super().__init__(convert_charrefs=False)
        self.image_dir = image_dir
        self.post_id = post_id
        self.post_title = post_title
        self.download_images = download_images
        self.output = []
        self.skip_depth = 0
        self.image_index = 0
        self.images = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if self.skip_depth:
            if tag in DROP_CONTENT_TAGS:
                self.skip_depth += 1
            return
        if tag in DROP_CONTENT_TAGS:
            self.skip_depth = 1
            return
        if tag not in ALLOWED_TAGS:
            return

        attributes = dict(attrs)
        if tag == 'img' and attributes.get('src', '').startswith(('http://', 'https://')):
            remote_src = attributes['src']
            local_src = self.local_image(remote_src)
            attributes['src'] = local_src
            attributes['alt'] = attributes.get('alt') or self.post_title
            attributes['loading'] = 'lazy'
            self.images.append({
                'src': local_src,
                'alt': attributes.get('alt', ''),
                'remoteSrc': remote_src
            })
        elif tag == 'a':
            attributes['rel'] = 'noopener'
            if attributes.get('target') != '_self':
                attributes['target'] = '_blank'

        # Iterate the updated `attributes` dict directly, not the original
        # `attrs` list — src/alt/loading/rel/target fallbacks above are set
        # on `attributes` even when the source tag never had that key at
        # all (a plain <a href="..."> with no target/rel of its own, most
        # commonly), and a loop over `attrs` only ever sees keys the source
        # tag already had, silently dropping every fallback for a key the
        # tag was missing. dict() preserves insertion order, so already-
        # present keys still serialize in their original source order;
        # only genuinely new keys (alt, loading, rel, target when absent)
        # land at the end.
        serialized = []
        for key, value in attributes.items():
            if key not in ALLOWED_ATTRIBUTES.get(tag, set()):
                continue
            serialized.append(f' {key}="{html.escape(value or "", quote=True)}"')
        if tag == 'a' and not any(item.startswith(' href=') for item in serialized):
            return
        self.output.append(f'<{tag}{"".join(serialized)}>')

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        tag = tag.lower()
        if self.skip_depth:
            if tag in DROP_CONTENT_TAGS:
                self.skip_depth -= 1
            return
        if tag in ALLOWED_TAGS and tag not in {'br', 'hr', 'img'}:
            self.output.append(f'</{tag}>')

    def handle_data(self, data):
        if not self.skip_depth:
            self.output.append(html.escape(data, quote=False))

    def handle_entityref(self, name):
        if not self.skip_depth:
            self.output.append(f'&{name};')

    def handle_charref(self, name):
        if not self.skip_depth:
            self.output.append(f'&#{name};')

    def local_image(self, remote_src):
        parsed = urlparse(remote_src)
        extension = Path(parsed.path).suffix.lower() or '.jpg'
        if extension == '.heic':
            extension = '.jpg'
        digest = hashlib.sha1(remote_src.encode('utf-8')).hexdigest()[:12]
        filename = f'{self.post_id}-{self.image_index + 1}-{digest}{extension}'
        self.image_index += 1
        destination = self.image_dir / filename
        local_src = f'images/lectio-terra/{filename}'
        if self.download_images and not destination.exists():
            try:
                self.image_dir.mkdir(parents=True, exist_ok=True)
                request = urllib.request.Request(remote_src, headers={'User-Agent': 'EarthlyHours importer'})
                download_path = destination.with_suffix('.heic') if Path(parsed.path).suffix.lower() == '.heic' else destination
                with urllib.request.urlopen(request, timeout=30) as response, download_path.open('wb') as output:
                    shutil.copyfileobj(response, output)
                if download_path != destination:
                    sips = shutil.which('sips')
                    if not sips:
                        raise RuntimeError('HEIC image requires macOS sips for conversion')
                    subprocess.run([sips, '-s', 'format', 'jpeg', str(download_path), '--out', str(destination)], check=True, stdout=subprocess.DEVNULL)
                    download_path.unlink()
            except Exception as error:
                print(f'  image download failed: {remote_src} ({error})', file=sys.stderr)
        return local_src


def read_posts(export_dir):
    csv_path = export_dir / 'posts.csv'
    with csv_path.open(newline='', encoding='utf-8-sig') as source:
        metadata = {}
        for row in csv.DictReader(source):
            match = POST_ID_PATTERN.match(row.get('post_id', ''))
            if match:
                metadata[match.group(1)] = row

    posts_dir = export_dir / 'posts'
    posts = []
    for path in sorted(posts_dir.glob('*.html')):
        match = POST_ID_PATTERN.match(path.name)
        if not match:
            continue
        post_id = match.group(1)
        row = metadata.get(post_id)
        if not row or row.get('is_published', '').lower() != 'true':
            continue
        posts.append((row, path))
    return posts


def load_assignments(path):
    if not path.exists():
        return {}
    with path.open(encoding='utf-8') as source:
        return json.load(source)


def load_existing(path):
    """Load a previously written output file, if one exists, keyed by slug.

    Only entries already sorted into a real season count as "already
    imported" — those are the ones this script will leave untouched from
    now on, hand edits (species/latin/readings, title corrections,
    whatever) included. Rows in the old 'unassigned' list are lightweight
    stubs with no real content, so they're always re-evaluated fresh
    against the current season-assignments.json rather than preserved.
    """
    if not path.exists():
        return {}
    with path.open(encoding='utf-8') as source:
        data = json.load(source)
    existing_by_slug = {}
    for season in SEASONS:
        for entry in data.get('seasons', {}).get(season, []):
            existing_by_slug[entry['id']] = (season, entry)
    return existing_by_slug


def parse_date(value):
    if not value:
        return ''
    return datetime.fromisoformat(value.replace('Z', '+00:00')).date().isoformat()


def slug_for(path):
    return path.stem.split('.', 1)[1] if '.' in path.stem else path.stem


def build_entry(row, path, season, image_dir, download_images):
    post_id = row['post_id']
    raw_html = path.read_text(encoding='utf-8')
    parser = SafeHTML(image_dir, post_id, row.get('title', '').strip(), download_images)
    parser.feed(raw_html)
    body_html = ''.join(parser.output).strip()
    return {
        'id': slug_for(path),
        'postId': post_id,
        'season': season,
        'title': row.get('title', '').strip(),
        'subtitle': row.get('subtitle', '').strip(),
        'published': parse_date(row.get('post_date', '')),
        'canonicalUrl': f"https://lectio-terra.substack.com/p/{slug_for(path)}",
        'bodyHtml': body_html,
        'images': parser.images
    }


def main():
    args = parse_args()
    posts = read_posts(args.export)
    assignments = load_assignments(args.assignments)
    existing_by_slug = load_existing(args.output)
    refresh = set(args.refresh)

    if args.template:
        for row, path in posts:
            slug = slug_for(path)
            if slug not in assignments and slug not in existing_by_slug:
                print(f'  "{slug}": ""')
        return

    # Start from whatever's already on disk, in its original order, so
    # anything hand-edited into an existing entry (species/latin/
    # readings, a corrected title, whatever) survives this run
    # untouched — unless its slug was explicitly passed to --refresh.
    grouped = {season: [] for season in SEASONS}
    for season, entry in existing_by_slug.values():
        if entry['id'] not in refresh:
            grouped[season].append(entry)

    unassigned = []
    new_count = 0
    skipped_count = 0
    for row, path in posts:
        slug = slug_for(path)
        if slug in existing_by_slug and slug not in refresh:
            skipped_count += 1
            continue

        season = assignments.get(slug, '')
        if season not in SEASONS:
            unassigned.append({'id': slug, 'title': row.get('title', ''), 'published': parse_date(row.get('post_date', ''))})
            continue

        verb = 'Refreshing' if slug in existing_by_slug else 'Importing'
        print(f'{verb} {slug} [{season}]')
        grouped[season].append(build_entry(row, path, season, args.images, args.write))
        new_count += 1

    print(f'{new_count} new/refreshed post(s), {skipped_count} left untouched.')

    result = {
        'generatedBy': 'scripts/import_substack.py',
        'generatedAt': datetime.now().astimezone().isoformat(timespec='seconds'),
        'seasons': grouped,
        'unassigned': unassigned
    }
    if args.write:
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'Wrote {args.output} with {sum(len(items) for items in grouped.values())} assigned posts.')
    else:
        print(json.dumps({season: len(items) for season, items in grouped.items()}, indent=2))
        print(f'Unassigned posts: {len(unassigned)}. Use --template to create assignment entries.')


if __name__ == '__main__':
    main()