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
  record at `id/<id>/`, and for each vocabulary term, `id/hush/`; open to
  search and in the sitemap since 16 November 2026, a day's pieces only
  once the day is released; each released day has its own page too,
  `id/dy-NNNN/`: its date and week, subject, reading and image, the one
  plain page search engines and chatbots can read a card from), `build_lectio_pages.py [lt-NNNN | --all]` (post
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
  with what needs a person (a subject record, possible poems). Before
  pushing an import, give every new figure its `alt` (look at the image)
  and its `rights` (clear cases applied and logged in the Rights review
  sheet, the rest "needs Ryan"; Ryan, 15 November 2026): the push posts
  the essay to Bluesky at once with its shareable figures, and a posted
  image's alt text can't be changed. Also before pushing, draft the
  post's Bluesky lines yourself (Ryan, 16 November 2026: drafted
  automatically, not held for him): on the post, `syndication.excerpts`,
  three lines of 220 characters or fewer, each word for word from one
  record (`from`: his headnote, supplementum or note, `w-`, or a passage
  of a paired reading, `r-`, which goes out signed with its author), the
  first the one that best opens the essay, the most striking sentence of
  his own; and `syndication.hashtags`, one or two for the essay's own
  angle (a writer, an idea). A subject new to the collection also gets
  `hashtags` on its `sp-`/`ph-` record, three for the thing itself (its
  common name, a group it belongs to), used for every later post about
  it. Tags are lower case, one word, no `#`; `check_data.py` checks both
  tags and excerpts. `syndicate.py --preview lt-NNNN` shows the post as
  it will go out; the import's email gives it, so Ryan can correct the
  records for the later Back in season posts.

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
  it shows the season's essays as before. On a day (or an essay's day),
  "turn the page" goes round the week's pages, its cards and its essay,
  back to the first (Ryan, 15 November 2026: no "day before" button, to
  match the other pages); dates read month first ("November 26"); on
  phones the week keeps to one line, only the day showing naming its
  subject. No weekday letters: the weekday drifts, and the page leans to
  the seasons, not the civil calendar. The Seasons page carries the
  calendar's line ("the year, a day at a time… Subscribe"), not the
  postcards' (`CALENDAR_RUBRIC` in `shared.js`, linking to the
  subscription's page, https://otherwise.dfos.com/p/daily-calendar-feed;
  shown only with `?preview` until its `live` is set true, when the
  subscription can be bought). Wander the Seasons, with `?preview` only
  for now (`buildPaneDays()` in `seasons.js`): the subheading "One
  species or phenomenon for each day of the year, and an essay for each
  week.", a dot on the dial for each day with a card (kept for now; Ryan
  unsure), then the calendar's line, This Week (its seven days, each
  card's subject with its writer and artist, labelled "words" and
  "image", and the essay), and The
  Essays (each card's writers and figure makers, "words" and "images";
  no images line where no maker is named), with "Sign in to wander"
  under that heading. The
  cards and essays also go out a day at a time in the year's feed,
  `year.xml`.
- Three clocks (the working plan, 13 November 2026; to revisit as the
  daily layer grows; the Syndication Plan's "The days, everywhere"): the
  book's year is fixed by date (the weeks, and where each card and essay
  sits); the civil week only says when a piece first comes out; the sun
  moves the sun-tied days. So an essay stays on its fixed day every year,
  its post's `day`: its publication day, unless Ryan pins another
  (decided 15 November 2026; `essay_day()` in `scripts/weeks.py`,
  `essayDayKey()` in `shared.js`, used by the Seasons page, `year.xml`
  and the calendar). A week can then hold its essay on any of its days,
  and in later years more than one. For the first cycle every essay
  keeps the day it came out, with none pinned (Ryan, 15 November 2026:
  rationalize and move days near the end of the first cycle, not now).
  The weekday
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
  solstice card (Snowy Owl) needs no mark. In 2026 Snowy Owl is instead
  the essay on the solstice itself, Monday 21 December (Week 1's first
  day), and 20 December, outside the weeks, gets an ordinary card as the
  solstice eve, with no essay that Sunday (Ryan, 15 November 2026).
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
  2a. The days: first releases the built days Ryan has passed and fixes
     those he hasn't, then builds each approved day record not yet added,
     as "Day candidates" below says ("Building, review and release"), and
     reports the days built, fixed and released in the email, each built
     one with its preview link. Then puts day candidates on the desk. The first went on early,
     in a run of 13 November 2026 (days only): about five for Week 49's
     last three days (26–28 November, the Thanksgiving trial) and about
     ten for Week 50 (29 November – 5 December). From the 18 November run
     on, about ten for the next calendar week (`scripts/weeks.py`) that
     begins at least 10 days after the run and isn't yet full or on the
     desk. The pace (decided 13 November; brought forward 15 November, so
     the first weeks of the calendar are ready to share and sell in
     December): two such weeks a run from the 18 November run
     (Weeks 51 and 52 then, with 20 December, the solstice eve) through
     December, until the desk is about four weeks ahead (by the
     solstice, into mid-January), then one a week, keeping that lead; if
     two weeks' candidates are too many, alternate one and two. Day
     candidates never go in the Sheet. Essay candidates ride with them
     (Ryan, 16 November 2026): where a week's essay has no subject yet
     (its `essay-<date>` record on the desk), four or five of that week's
     day candidates are ones that could carry a whole essay, their
     nomination opening "Essay or day:", in the same form (one image and
     one reading to start him off), including sky and season subjects
     the iNaturalist list can't see (the Geminids peak about 13–14
     December, Week 52). Ryan takes one as the essay with "make this the
     week's essay instead"; the rest stay in the pool for the days. First
     for Weeks 51 and 52 in the 18 November run. The email says which weeks, how
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
  why that week, not the season in general (Ryan, 22 November 2026): what
  peaks, arrives, ends or happens in those seven days (a sighting peak in
  `inat_week.py`, a meteor shower, a harvest or a count, the sun's
  turning), and a subject good all winter goes in only with a reason for
  its week, a proposed image and a proposed reading (the passage exactly as
  in its source), and the week's essay subject. Never copy them to the
  candidates Sheet or count them as nominations. Make them with
  `python3 scripts/desk.py --days <candidates.json> <scratch dir>` (its
  docstring has the fields), then previews and the batch as for
  nominations. Ryan chooses "Add to the week", "not now" or "no"; a week
  is done at six (Week 49, the trial, at three). Each approved day
  becomes a reading and an image (`shownIn: "days"`), a new `sp-`/`ph-`
  record if the subject has none, and a `days.json` record, on the day
  Ryan's note names (or the record's `proposedDay`, set at his word in a
  session), or else the first free day Monday to Saturday in the
  week's order; set `addedAs` to the `dy-` ID and `day` to its date
  (`MM-DD`). Where a day comes from
  follows the Seasons' rule: local and regional. Take the time to reach
  wide (Ryan, 13 November 2026): mix birds with plants, fungi, insects,
  mammals, weather, sky and the farm and kitchen; many voices, not one
  journal for the week; and some days eccentric, an odd object, a
  surprising text, a sideways way into the season. For now, no Thoreau
  (Ryan, 15 November 2026: constantly relevant and perfect, so give him
  a rest; the days already approved keep theirs). Images are cultural
  (Ryan, same day): historic, artistic, somehow strange or mediated
  (prints, plates, paintings, early photographs, specimens, objects),
  not straight contemporary field photographs, unless the photograph
  is itself strange or on an unusual medium. Lean away from birds,
  mammals and the beautiful naturalist page (Ryan, 21 November 2026):
  at most two birds and mammals together in a week's candidates, and
  at least three of each week's ten from other registers:
  contemporary art and art–science experiments, found text (labels,
  logs, almanacs, patents, instructions, records, the sea-ice bulletin),
  experimental poetry and nonfiction, philosophy. Contemporary pieces
  are in copyright: nominate them anyway, a short passage or one image,
  with the rights marked "needs Ryan" (excerpt use, or the artist's
  permission), so he can choose which are worth asking for. The week's shortlist of
  what is in season can start from `python3 scripts/inat_week.py <week>`
  (iNaturalist sightings in New England, each species' share of the
  week against its share of the year).
- Building, review and release of the days (decided 14 November 2026):
  a day is built as a draft (`"draft": true` on its `days.json` record
  only; its reading and image are ordinary records, `shownIn: "days"`),
  so it stays off the Seasons page, `year.xml` and the calendar, which
  all skip drafts. Ryan looks at it on the live site,
  `seasons.html?day=MM-DD&preview` (`?preview` shows drafts on the
  Seasons page alone, marked "A draft for review"; the week's links keep
  it), from the desk: a built day comes back to his queue with that link
  and "Release it" / "Needs a fix" (`review`: `ok` or `fix`, with
  `reviewNote`). A run, or any session he asks, then releases the `ok`
  ones (removes `draft`, sets `released: <date>` on the desk record) and
  fixes the `fix` ones on the records, per the note, then sets `fixed:
  <date>` and clears `review` so the day comes back to him. Releasing is
  the push: the Calendar workflow uploads the new calendar on it and the
  Syndicate run adds the day to `year.xml` on its date. Subscribers see a
  released card at once, even ahead of its date, so release only what he
  has passed, a few days ahead at least.
- The essays ahead (`kind: "essay"`, ids `essay-<publication date>`,
  fields `week`, `published`, `subject`, `planned`, `note`, `chosenAt`,
  `from`, `leadsSent`): the subject of each coming Sunday's Lectio Terra
  post (one a week, on its Sunday unless Ryan sets another day), shown
  at the foot of the desk, where Ryan sets or changes it (or
  takes a day candidate as the essay with "make this the week's essay
  instead"). The Monday leads task (trig_01SjVsateoeRdEPG91uRzxej)
  reads the next one for its subject and sets `leadsSent`. Each weekly
  run keeps a record for each of the next five weeks (adding a missing
  week's, on its Sunday, with an empty subject; never moving or changing
  one Ryan set), shows the week's
  essay on its day candidates, and says in the email which coming essays
  have no subject. Never copy them to the Sheet or count them as
  candidates.
- The days ahead (Ryan, 15 November 2026): from the Sunday after
  Thanksgiving (29 November) Ryan's essay email lists the six days that
  follow it. Each Wednesday run's email opens with that list for the
  coming Sunday, ready to paste: one line a day (weekday and date, month
  first; the subject; "words" and the reading's author; "image" and the
  image's maker; "(not yet released)" on a draft, "—" for a day with no
  card), headed "The days ahead" with those days' own week as the site
  gives it ("The days ahead — Week 50 · November 29 – December 5"; Ryan
  uses "the days ahead" all year, not "this week's days"). Until 20
  December a Sunday opens its week, so the days are the essay's own
  week; from Week 1 (21 December) a Sunday closes its week, so the days
  after it are the next week's, and the heading says so ("Week 2 ·
  December 28 – January 3").
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
