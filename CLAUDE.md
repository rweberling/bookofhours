# The Earthly Book of Hours

A static site (GitHub Pages, earthlyhours.com) built from a hand-kept data
collection, heading toward the 2027 print and digital editions. There is no
build step for the pages themselves: the HTML and JS read `data/` directly.

## How Ryan works

- Push straight to `main`. Ryan tests on the live site, not on branches or
  PRs, unless he asks for one.
- Plain explanations, a recommendation rather than a survey of options.
- Ask before choices that change what readers see (which image, which
  reading); just do mechanical fixes.

## The collection (`data/`)

Read `data/README.md` first: it explains every file and field. The essentials:

- IDs are neutral and permanent (`r-` readings, `i-` images, `w-` writing,
  `lt-` posts, `sp-` species, `ph-` phenomena, `pc-` postcards). An ID is
  fixed once published or referred to; before that it can be tidied. Old IDs
  live on in `aliases`. Never reuse an ID for a different work: to replace an
  image with another work, add a new record and set the old one
  `"draft": true`.
- `shownIn` (hours / weather / seasons) controls where a piece appears;
  `tags` only describe it (and lean the weighting).
- The Lectio Terra posts (`lectio-data.json`) are the master copy of their
  passages, figures and writing; `scripts/copy_lectio.py` copies them out.
  Correct a post and its copy together.
- Write each fact once, on its own record; other records name it by ID.

## Commands

- After any data edit: `python3 scripts/check_data.py` (it says what else
  to rebuild; `--gaps` lists missing details).
- Save JSON with `scripts/datafile.py` (`load('images')`, `save('images', d)`)
  so the house formatting is kept. A plain `json.dump` rewrites the whole
  file and makes an unreadable diff.
- New or changed image files: `python3 scripts/build_images.py` (web copies).
- Menu, head and frame: edit `partials/`, then `python3 scripts/build_shared.py`.
- Sources page: `python3 scripts/build_sources.py` (needs Chrome; see below).
- Species registry IDs: `python3 scripts/link_species.py [--write]`.
- Post pages (`lectio-terra/<name>/`, one per post, and the RSS feed
  `feed.xml`, dated by each post's first publication):
  `python3 scripts/build_lectio_pages.py [lt-NNNN | --all]`. Rebuild after
  editing a post, `seasons.html` or `partials/`.
- Substack import: `scripts/import_substack.py` (runs the rest in turn).

## The pages

- The Hours page is `index.html` + `hours.js` (there is no hours.html).
  `?block=hush` (etc.) forces an hour.
- Weighting lives in `shared.js`: weather matches and the current season
  lean the picks (season tags only add weight, ×3). On the Hours page only
  the first page of a visit is weighted; turning the page then shows the
  rest of the hour evenly, without repeats.
- The Hours frame crops every image to 4:3; the lightbox shows it whole.

## The postcards (`c/`)

- Five winter-solstice cards (series `w26`), sold as a set through
  Metalabel. Each card's QR code points at `earthlyhours.com/c/w26/N`: a
  page, not a redirect, so the printed link never breaks.
- `data/postcards.csv` (`pc-` IDs) → `python3 scripts/build_postcards.py`
  → `c/w26/N/index.html`. The script's docstring explains every column.
  Pages stay `noindex` while a card's `status` is `draft` (or `unlisted`,
  for good: the pages are reached only by QR code, not linked from the
  site); all five are still drafts.
- The cards carry no year, so the pages name the relevant December
  solstice: `postcards.js` updates it in the browser, and the build script
  writes the same line for readers without JavaScript. Both hold a table
  of published solstice times (2024–2035); keep them in step.
- Print files are made by Ryan in Affinity, not in this repo. What worked
  for the press PDF (Smartpress): PDF/X-4, CMYK U.S. Web Coated (SWOP) v2,
  0.125 in bleed, crop marks only, Rasterize: Nothing, 300 dpi images,
  text and QR codes in a K100 swatch (not rich black), QR codes opened and
  pasted as curves (in a picture frame Affinity rasterises them), at least
  3/16 in from the cut. The buyers' print-at-home PDF: RGB, sRGB, bleed
  and crop marks, JPEG 90%.
- Open: the back of the Orion card reads *Uranographia* "(1960)"; it
  should be 1690.

## Working in the cloud container

- A start-up script (`.claude/hooks/session-start.sh`) runs as each
  session opens: it fast-forwards `main` (several sessions push to it),
  makes the no-sandbox Chrome wrapper and sets `CHROME` for
  `build_sources.py`, and installs Pillow and fontTools if missing. Still
  pull before pushing if the session has been open a while.
- Testing pages: `python3 -m http.server 8765` from the repo root (run it in
  the background), then Playwright with
  `executablePath: '/opt/pw-browsers/chromium'`. The headless browser can't
  play H.264 video. The DFOS sign-in script fails to load from the CDN in
  tests; that error is harmless.
  Analytics (Google and Cloudflare) load only on earthlyhours.com, so local
  tests count nothing; keep it that way.
- Wikimedia needs a `User-Agent` header and rate-limits this container
  (HTTP 429). The API is often blocked; `Special:FilePath/<name>` and
  `index.php?title=File:<name>&action=raw` usually work with pauses between
  requests.
- `pkill -f <pattern>` matches its own command line and kills the shell
  (exit 144); stop background servers by task instead.

## Elsewhere

- Notes (Claude Docs): "Site Project Notes"
  (https://claude.ai/artifact/SQLVXud94FQLubXUV18179) is the front page:
  goals, to-dos, progress log, plans, and links to the other notes.
  "Metadata Standards" (https://claude.ai/artifact/TTG2XaCWGUvvAScCvBKGM9)
  holds the data collection's map, ID rule and open items; a bibliography
  review doc tracks citation questions. Record decisions and open items
  there, not on side branches or in a session's local files.
- Rebuilt posts (on trial): each post in `lectio-data.json` has a `body`
  listing its pieces, and `renderPostBody()` in `shared.js` rebuilds the post
  from the records (`scripts/build_post_manifests.py` makes the lists). The
  Seasons page shows the rebuilt post only with `?rebuilt` in the address;
  otherwise each post's imported `bodyHtml`, which is kept unchanged.
