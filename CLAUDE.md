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
- Sources page: `python3 scripts/build_sources.py` (needs Chrome; see below).
- Species registry IDs: `python3 scripts/link_species.py [--write]`.
- Substack import: `scripts/import_substack.py` (runs the rest in turn).

## The pages

- The Hours page is `index.html` + `hours.js` (there is no hours.html).
  `?block=hush` (etc.) forces an hour.
- Weighting lives in `shared.js`: weather matches and the current season
  lean the picks (season tags only add weight, ×3). On the Hours page only
  the first page of a visit is weighted; turning the page then shows the
  rest of the hour evenly, without repeats.
- The Hours frame crops every image to 4:3; the lightbox shows it whole.

## Working in the cloud container

- `build_sources.py` needs Chrome: make a wrapper script containing
  `exec /opt/pw-browsers/chromium --no-sandbox "$@"`, make it executable,
  and pass its path as `CHROME=…`.
- Testing pages: `python3 -m http.server 8765` from the repo root (run it in
  the background), then Playwright with
  `executablePath: '/opt/pw-browsers/chromium'`. The headless browser can't
  play H.264 video. The DFOS sign-in script fails to load from the CDN in
  tests; that error is harmless.
- Wikimedia needs a `User-Agent` header and rate-limits this container
  (HTTP 429). The API is often blocked; `Special:FilePath/<name>` and
  `index.php?title=File:<name>&action=raw` usually work with pauses between
  requests.
- `pkill -f <pattern>` matches its own command line and kills the shell
  (exit 144); stop background servers by task instead.

## Elsewhere

- Notes (Claude Docs): "Metadata Standards" holds the map of how the pieces
  fit, the ID rule and the open items; a separate bibliography review doc
  tracks citation questions.
- Branch `rebuild-posts`: a prototype that rebuilds each post from the data
  (`renderPostBody`, `scripts/build_post_manifests.py`); not yet merged.
