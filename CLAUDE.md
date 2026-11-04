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
- Readers see each Lectio Terra post rebuilt from its records (the
  readings, images and writing it lists in its `body`), so a correction
  goes on the record. Each post's Substack original is kept in
  `data/substack/<post id>.html` (not downloaded by the pages), and
  `scripts/copy_lectio.py` reports where it and the records disagree:
  correct a post's text in both. Read and save the posts through
  `datafile.py` (`load('lectio-data')`), which joins the two.
- Write each fact once, on its own record; other records name it by ID.

## Commands

- **Build:** `python3 scripts/build.py` brings every built file up to date
  with the data, running only the steps that are due, in order (image web
  copies, shared parts, postcard pages, post pages and feed, sitemap,
  Sources page). `--check` only says what's due.
- **Check, before every push:** `scripts/check.sh` (about two minutes): the
  built files are current, the data is whole (`check_data.py`), and the
  pages work in a browser (`check_pages.js`: verse, footnotes, citations,
  the Latin line, spacing, script errors). `scripts/check.sh first-frost`
  limits the browser part to the posts named. The same checks run on
  GitHub after every push to `main` and email Ryan if one fails.
- `python3 scripts/check_data.py --gaps` lists missing details (rights,
  bibliography lines) by record: a to-do list, not a failure.
- Save JSON with `scripts/datafile.py` (`load('images')`, `save('images', d)`)
  so the house formatting is kept. A plain `json.dump` rewrites the whole
  file and makes an unreadable diff.
- The build's parts, if one is wanted alone: `build_images.py` (web
  copies), `build_shared.py` (menu, head and frame, from `partials/`),
  `build_postcards.py`, `build_lectio_pages.py [lt-NNNN | --all]` (post
  pages, one per post, and the RSS feed `feed.xml`, dated by each post's
  first publication), `build_sitemap.py`, `build_sources.py` (needs
  Chrome; see below).
- Species registry IDs: `python3 scripts/link_species.py [--write]`.
  Edition identifiers (DOI, HathiTrust, OCLC and the like, read off the
  cited scans): `python3 scripts/link_editions.py [--write]`. People to
  Wikidata (confident matches only; the query service may allow only one
  request a minute): `python3 scripts/link_people.py [--write]`.
- Substack import: `python3 scripts/import_substack.py --fetch --write`
  takes every new post from Substack (no export needed), gives each
  "Week NN:" post its season by month, runs the rest in turn, and ends
  with what needs a person (a subject record, possible poems).

## The pages

- The Hours page is `index.html` + `hours.js` (there is no hours.html).
  `?block=hush` (etc.) forces an hour.
- Weighting lives in `shared.js`: weather matches and the current season
  lean the picks (season tags only add weight, ×3). On the Hours page only
  the first page of a visit is weighted; turning the page then shows the
  rest of the hour evenly, without repeats.
- The Hours frame crops every image to 4:3; the lightbox shows it whole.
- "keep this page" (`keep.js`) is on the Hours, Weather and Seasons
  pages (and the post pages). It opens a pane, made by `keep.js`, with
  the page drawn as a card on a canvas (wide 1200×630 or tall
  1080×1350, saved at 2×), the page's link with copy, and save image ·
  print (share on phones). Each page's script defines `keepPageData()`
  (the contract is at the top of `keep.js`), which says which card to
  draw: Hours (image 4:3, reading), Weather (the picture filling the
  card, the reading on its card) or Seasons (species, first figure
  whole, the headnote's opening, the readers). Links: Hours
  `/?r=<reading>&i=<image>` (reopened in its watch, held as if wandered
  to), Weather `weather.html?r=…&i=…`, Seasons the post's own page.
  Print is the page's own printout. The iPhone home-screen app can't
  print: there Hours and Weather share a PDF drawn by `keep.js` (its
  share sheet has Print) and Seasons offers no print. Safari opens the
  share sheet only straight from a tap, so the files are made when the
  pane opens. Saved cards are named "The Earthly Book of Hours — Hush —
  Lispector, Lockyer.png" (Weather: "— The Weather — …"; Seasons: the
  species), from the records' own names (reading author, image creator).

## The postcards (`c/`)

- Five winter-solstice cards (series `w26`), sold as a set through
  Metalabel. Each card's QR code points at `earthlyhours.com/c/w26/N`: a
  page, not a redirect, so the printed link never breaks.
- `data/postcards.csv` (`pc-` IDs) → `python3 scripts/build_postcards.py`
  → `c/w26/N/index.html`. The script's docstring explains every column.
  Pages stay `noindex` while a card's `status` is `draft` (or `unlisted`,
  for good: the pages are reached only by QR code, not linked from the
  site). The five are printed and in circulation (November 2026), all
  `unlisted`. Each card links to its Lectio Terra essay (`post`) once
  there is one: Paper Birch and Witch Hazel do; Orion and Snowy Owl are
  due before the solstice, Aurora about February. The Substack import
  links a waiting card to a new post on the same subject by itself and
  says so in its report.
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
  `executablePath: '/opt/pw-browsers/chromium'`. Run node with
  `LANG=C.UTF-8`, or downloads with non-ASCII names come out as
  "download". The headless browser can't
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
- Rebuilt posts (since 3 November 2026, after the October trial): each
  post in `lectio-data.json` has a `body` listing its pieces
  (`scripts/build_post_manifests.py` makes the lists). Its page is built
  from them by `scripts/post_render.py` (run by `build_lectio_pages.py`),
  the one renderer of a post: verse, citations, footnotes and figures are
  written there. The Seasons page shows a post by fetching its page, so a
  change to how posts look shows there once the pages are rebuilt. The
  browser adds only the margin labels and numerals, the drawn rules, the
  lightbox and the video players (seasons.js).
