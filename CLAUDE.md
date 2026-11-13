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
  `build_postcards.py`, `build_records.py` (a page and JSON copy for every
  record at `id/<id>/`, noindex for now), `build_lectio_pages.py [lt-NNNN | --all]` (post
  pages, one per post, and the RSS feed `feed.xml`, the essays alone,
  dated by each post's first publication), `build_year_feed.py`
  (`year.xml`, "The Year": the last 14 days, each day's card and each
  essay on its own day, returning every year as a new item; open-rights
  images and reading texts only, otherwise the citation; the Syndicate
  workflow moves it on to each new day), `build_sitemap.py`,
  `build_sources.py` (needs Chrome; see below).
- Species registry IDs: `python3 scripts/link_species.py [--write]`.
  Edition identifiers (DOI, HathiTrust, OCLC and the like, read off the
  cited scans): `python3 scripts/link_editions.py [--write]`. People to
  Wikidata (confident matches only; the query service may allow only one
  request a minute): `python3 scripts/link_people.py [--write]`.
- Bluesky (`scripts/syndicate.py`, run by `.github/workflows/syndicate.yml`
  daily and after posts change): posts each new essay as earthlyhours.com
  and makes its standard.site record, and on Tuesdays and Saturdays
  "Back in season", an earlier essay of the current season with its next
  excerpt and figure, and "the hour", one watch's keep card a day,
  posted in that watch (`scripts/hour_card.js` draws it with keep.js;
  the workflow also runs every three hours for it). At most two posts a
  day; `"dryRun": true` on a stream in `data/syndication.json` keeps it
  to the run summary.
  `--dry-run` says what it would post; `--preview lt-NNNN` shows any
  essay's post. The plan is the
  "Syndication Plan" doc (https://claude.ai/artifact/89YN6Mjfc3v31muCrCDNQC).
- Are.na (`scripts/arena.py`, run with the daily Syndicate workflow,
  token in the `ARENA_TOKEN` secret): every open-rights image the site
  shows goes up once as an image block (its 1600 px web copy), in the one
  channel where the site shows it, under "The Earthly Book of Hours"
  (are.na/ryan-weberling): the essays' figures in The Seasons' Winter,
  Spring, Summer or Autumn, the Hours images in their watch's channel
  inside The Hours, the Weather images in The Weather. Free plan: 200
  blocks in all, so never put a block in two channels (`maxBlocks` caps
  it). Blocks follow their records' changes; a figure that stops being
  shareable is only reported. `--dry-run`, `--show i-NNNN`, `--limit N`;
  `data/syndication.json` ("arena") keeps the channel and block IDs. No
  shop or support links there (Are.na's terms are non-commercial).
- The calendar (`scripts/build_calendar.py`, sold on DFOS as a
  subscription to the year, $3 or pay what you want from $2; the plan's
  "The days, everywhere"): every card and essay as an all-day event
  repeating yearly, each day shown as soon as it is added; open-rights
  reading texts only, otherwise the citation; no images. Not kept in the
  repo (it is public): `.github/workflows/calendar.yml` builds it when the
  data changes and uploads it to Workers KV (secret
  `CLOUDFLARE_CALENDAR_TOKEN`), and the Worker `earthlyhours-calendar`
  (`workers/calendar.js`) serves it at calendar.earthlyhours.com under a
  private path, a secret of the Worker that is never written in the repo.
  `--out FILE`, `--show`, `--upload`; settings in `data/syndication.json`
  ("calendar"). When the year is complete, the finished file replaces the
  subscription on DFOS.
- Substack import: `python3 scripts/import_substack.py --fetch --write`
  takes every new post from Substack (no export needed), gives each
  "Week NN:" post its season by month, runs the rest in turn, and ends
  with what needs a person (a subject record, possible poems).

## The pages

- The Hours page is `index.html` + `hours.js` (there is no hours.html).
  `?block=hush` (etc.) forces an hour.
- Weighting lives in `shared.js` (`pickAtmosphereAware`, one lean for
  both pages): weather matches and the current season lean the picks
  (season tags only add weight, ×3). On the Hours page only the first
  page of a visit is weighted; turning the page then shows the rest of
  the hour evenly, without repeats. On the Weather page the set weather
  first decides which pieces can appear; the lean then applies on every
  turn, and the reading also leans toward the image's tags.
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

## The days (begun Thanksgiving 2026)

- The Seasons' year runs in 52 fixed weeks counted from the winter
  solstice: Week 1 begins 21 December; 20 December stands outside the
  weeks; 29 February joins Week 10; a week's season is its middle day's
  (13 weeks each). `scripts/weeks.py [MM-DD]` says which week a date is
  in; `weekOf()` in `shared.js` keeps the same rule.
- `data/days.json` holds the daily cards (`dy-`): a date (`MM-DD`, no
  year), a subject (`sp-`/`ph-`), one reading and one image, ordinary
  records shown in `"days"` and tagged with the subject. No headnote for
  now. `data/README.md` ("The days") has the fields.
- `seasons.html` opens on today's card when there is one (`?day=MM-DD`
  for another day), with the week above: its number and dates, its essay
  (the post published within the week) and its seven days. On the
  essay's own day it opens the essay with the same header. With no card
  it shows the season's essays as before. The cards and essays also go
  out a day at a time in the year's feed, `year.xml`.
- Three clocks (the working plan, 13 November 2026; to revisit as the
  daily layer grows; the Syndication Plan's "The days, everywhere"): the
  book's year is fixed by date (the weeks, and where each card and essay
  sits); the civil week only says when a piece first comes out; the sun
  moves the sun-tied days. So an essay shows on its publication day the
  year it comes out, then every year on the last day of its week
  (`essay_day()` in `scripts/weeks.py`, `essayDayKey()` in `shared.js`,
  used by the Seasons page, `year.xml` and the calendar). The weekday
  drifts a day a year: until 20 December 2026 the weeks run Sunday to
  Saturday (essays out on Sundays, the week's first day); from Week 1, 21
  December 2026, Monday to Sunday, so the seventh day is a Sunday through
  2027, and the cards fill Monday to Saturday either way. In 2027–28 the
  seventh day is a Monday: decide then whether essays come out on it.
- Sun-tied cards (planned, to build when the first is approved, before
  the March 2027 equinox): a card marked `"sun": "summer-solstice"` (or
  `vernal-equinox`, `autumnal-equinox`) keeps its `date` as its home and
  each year moves to that year's actual date in Boston (summer solstice
  20 or 21 June, equinoxes 19/20 March and 22/23 September), swapping
  with the card there; the calendar lists it by each year's date. The
  winter solstice falls on 21 December in Boston every year through at
  least 2035 (the postcards' table), Week 1's first day, so a winter
  solstice card (Snowy Owl) needs no mark.
- The first cards go live on Thanksgiving, 26 November 2026 (Week 49:
  Thursday to Saturday), then Week 50 in full; it's a trial of how well
  each week can be chosen, built and shown.

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

## Rights

- Ryan's standing decision (9 November 2026): Claude applies rights
  statements on its own judgment and brings him only questions and limit
  cases. Clear cases go straight in: the holding institution's own
  statement (its page as the basis), or the facts (published in the US
  before 1931, or abroad before 1931 by an author dead over 70 years →
  NoC-US; an explicit Creative Commons licence or public-domain mark →
  that URI). Each is still logged in the Rights review sheet as "applied
  by Claude <date>", so he can see it.
- Always Ryan's: permission from a living artist or rights holder, the
  excerpt-use rule for in-copyright texts (`rights.excerptUse`), whether
  a rights note stays public on the Sources page, and any case where the
  evidence conflicts. These go in the sheet as "needs Ryan: <question>",
  and he hears about them by email only when there are some.

## The review desk

- Each week's candidates (new readings and images, nominated by the
  weekly candidates task) are reviewed on the review desk, a private
  Claude artifact: https://claude.ai/artifact/JmjvhTBxkpjsudYL1mg1hw.
  Ryan reads one candidate at a time and chooses "add it", "not now" or
  "no", with a note. The page's database (collection `candidates`, one
  record per nomination, id `<proposed date>-NN`) holds them; sessions
  read and write it with the ArtifactData tool, and upload image
  previews with the Artifact tool (`asset: true`).
- The candidates Google Sheet stays the lasting copy. Each weekly run:
  1. Reads the desk's decisions (ArtifactData `list`) and copies each
     decided record into its Sheet row: "Ryan's decision" (`add`,
     `later` or `no`; `later` rows are nominated again in a later week)
     and Ryan's note after the Notes, marked "Ryan:". Only then acts on
     the approvals, as before, skipping any already added (an "Added
     as" in the Sheet, or `addedAs` on the desk record). Each piece it
     adds gets its new ID in both: the Sheet's "Added as" and
     `addedAs` on the desk record.
  1a. Brings back each "not now" (`later`) record whose `decidedAt` is
     three weeks old or more, or sooner when the week's nominations are
     for its condition (its `for`): the same record, not a new
     nomination, updated with `decision: null`, `returned: <today>` and
     `setAside: <its decidedAt>`, keeping Ryan's note. Its Sheet row's
     decision reads `later (back <today>)`. Counting what a condition
     still lacks, a returned piece counts as pending.
  2. Writes the new nominations to the Sheet, then puts them on the
     desk: save the new rows as JSON, run `python3 scripts/desk.py
     <rows.json> <scratch dir>` (records, previews, and the batch), upload
     the previews, set each one's id with `desk.py --preview`, and send
     the batch. Its docstring has the steps.
  2a. The days: first builds each approved day record not yet added, as
     "Day candidates" below says, and reports the days built in the
     email. Then puts day candidates on the desk. The first went on early,
     in a run of 13 November 2026 (days only): about five for Week 49's
     last three days (26–28 November, the Thanksgiving trial) and about
     ten for Week 50 (29 November – 5 December). From the 18 November run
     on, about ten for the next calendar week (`scripts/weeks.py`) that
     begins at least 10 days after the run and isn't yet full or on the
     desk. The pace (decided 13 November): once Ryan says the Thanksgiving
     trial went well (recorded here, with the date), two such weeks a run
     through December, until the desk is about four weeks ahead (by the
     solstice, into mid-January), then one a week, keeping that lead; if
     two weeks' candidates are too many, alternate one and two. Day
     candidates never go in the Sheet. The email says which weeks, how
     many candidates, and how many days each week still needs. (The
     trial's question of time is Ryan's: how long each week takes him
     to review and to see through the site, the calendar and the rest,
     not how fast a run finds candidates, so a run reports no timing of
     its own; Ryan, 13 November 2026.)
  3. If any desk read or write is refused or fails, carries on with the
     Sheet alone and says so in the email.
- Where a nominated piece comes from (Ryan's rule of thumb, 11 November
  2026): the Hours are global, the Seasons local and regional (New
  England, North America), the Weather a bit of both. A Weather
  nomination opens by saying which register it is. "Faithful:" is the
  weather as it falls in the Northeast, whoever made the piece
  (Twachtman's Connecticut brook for snowpack; Hiroshige's shower
  counts, since that rain falls here too). "Wry:" is the condition taken
  to its extreme as a knowing joke, like Muybridge for Transit
  (Bradford's Arctic sea ice for ice, O'Sullivan's Nevada dunes for
  parched; a tropical picture for humid would be one). Keep the two in
  balance for each condition: where it has one, nominate the other.
- Day candidates (`kind: "day"`, ids `<date>-dNN`) fill a coming week's
  days: each a subject in season that week in New England, with a line on
  why now, a proposed image and a proposed reading (the passage exactly as
  in its source), and the week's essay subject. Never copy them to the
  candidates Sheet or count them as nominations. Make them with
  `python3 scripts/desk.py --days <candidates.json> <scratch dir>` (its
  docstring has the fields), then previews and the batch as for
  nominations. Ryan chooses "Add to the week", "not now" or "no"; a week
  is done at six (Week 49, the trial, at three). Each approved day
  becomes a reading and an image (`shownIn: "days"`), a new `sp-`/`ph-`
  record if the subject has none, and a `days.json` record, on the day
  Ryan's note names, or else the first free day Monday to Saturday in the
  week's order; set `addedAs` to the `dy-` ID. Where a day comes from
  follows the Seasons' rule: local and regional. Take the time to reach
  wide (Ryan, 13 November 2026): mix birds with plants, fungi, insects,
  mammals, weather, sky and the farm and kitchen; many voices, not one
  journal for the week; and some days eccentric, an odd object, a
  surprising text, a sideways way into the season.
- Records with `kind: "season"` (ids `<date>-sNN`) are season-tag
  proposals for pieces already on the site, not nominations: never copy
  them to the Sheet or count them as candidates. Each run applies the
  decided ones: "Tag it" (`add`) sets the piece's (`piece`) `tags.seasons`
  to `seasons`, or to what Ryan's note says instead; "Leave untagged"
  (`no`) changes nothing. Then set `addedAs` to the piece's ID on the
  desk record, and push with the week's other changes.
- The page's own source can be fetched with the Artifact tool (`read`);
  republish to the same URL. Its records are never edited by hand except
  to fix a nomination's text; decisions are Ryan's.

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
  play H.264 video. The DFOS client is fetched from the CDN only when a
  sign-in returns (`?jws=…&did=…`), not on an ordinary visit.
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
