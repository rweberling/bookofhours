#!/usr/bin/env python3
"""Save the Sources page as static HTML, built from the collection.

Usage:
  python3 scripts/build_sources.py

sources.js builds the bibliography from data/ and lectio-data.json. This
runs that same script once, in headless Google Chrome, and saves what it
built into sources.html between the sources:start and sources:end
markers. The published page is then plain HTML that readers, citation
tools and crawlers can all read without JavaScript. Run it again whenever
the data changes; scripts/check_data.py reminds you when the saved page
is out of date.

To preview the next build in a browser without saving, open
sources.html?rebuild on a local server.

Chrome is found at its usual macOS location or on the PATH; set CHROME to
its path if it lives elsewhere.
"""

import functools
import hashlib
import http.server
import os
import re
import shutil
import subprocess
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / 'sources.html'

BUILT = re.compile(r'<!--sources:start-->(.*?)<!--sources:end-->', re.S)
SAVED = re.compile(r'<!-- sources:start[^>]*-->.*?<!-- sources:end -->', re.S)


def inputs_digest():
    """A short fingerprint of everything the page is built from."""
    # shared.js supplies the season month ranges and the loader.
    paths = sorted((ROOT / 'data').glob('*.json')) + [
        ROOT / 'lectio-data.json', ROOT / 'sources.js', ROOT / 'shared.js']
    digest = hashlib.sha256()
    for path in paths:
        digest.update(path.name.encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()[:12]


def find_chrome():
    candidates = [
        os.environ.get('CHROME'),
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        shutil.which('google-chrome'), shutil.which('chromium'), shutil.which('chromium-browser'),
    ]
    for path in candidates:
        if path and Path(path).exists():
            return path
    sys.exit('Google Chrome was not found. Set CHROME to its path and try again.')


def serve():
    """Serve the site from a local port, as the page expects."""
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def main():
    chrome = find_chrome()
    server = serve()
    try:
        url = f'http://127.0.0.1:{server.server_address[1]}/sources.html?rebuild'
        result = subprocess.run(
            [chrome, '--headless=new', '--disable-gpu', '--virtual-time-budget=15000', '--dump-dom', url],
            capture_output=True, text=True, timeout=120)
    finally:
        server.shutdown()

    built = BUILT.search(result.stdout)
    if not built or 'class="entry"' not in built.group(1):
        sys.exit('The page did not build (no entries found). Open sources.html?rebuild on a local '
                 'server to see what went wrong. sources.html was not changed.')

    page = PAGE.read_text()
    if not SAVED.search(page):
        sys.exit('sources.html has no sources:start / sources:end markers. Nothing was changed.')
    saved = f'<!-- sources:start inputs={inputs_digest()} -->{built.group(1).rstrip()}\n  <!-- sources:end -->'
    PAGE.write_text(SAVED.sub(lambda _: saved, page, count=1))

    content = built.group(1)
    print(f'Saved the Sources page: {content.count(chr(10) + "    <div class=" + chr(34) + "entry" + chr(34))} entries, '
          f'{content.count("class=" + chr(34) + "week" + chr(34))} weekly posts.')


if __name__ == '__main__':
    main()
