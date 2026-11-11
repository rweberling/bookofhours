# The Earthly Book of Hours: the collection

This folder holds the collection behind [earthlyhours.com](https://earthlyhours.com):
every reading, image and piece of writing the site shows, what each is
about, and where it comes from. The site reads these files directly; there
is no database and nothing generated in between.

## The files

| File | What it holds |
| --- | --- |
| `readings.json` | Readings: passages quoted from other writers, one record each (`r-`) |
| `images.json` | Images: plates, photographs, scans and the figures in the Lectio Terra posts (`i-`) |
| `writing.json` | Writing: the site's own words, such as versicles, phenomenon lines, and the posts' headnotes, supplementa and notes (`w-`) |
| `lectio-data.json` | The Lectio Terra posts' records (`lt-`): title, season, subject, page, and `body`, the list of their pieces |
| `substack/` | Each post's text as it came from Substack, `<post id>.html`: the original, kept for reference and checks |
| `species.json` | The species and other organisms the posts are about (`sp-`) |
| `phenomena.json` | The posts' subjects that aren't organisms, such as clouds or the Perseids (`ph-`) |
| `vocab.json` | The terms everything is tagged with: the eight hours, the four seasons, the twenty weather conditions |
| `postcards.csv` | The postcards, one row each (`pc-`) |
| `syndication.json` | What `scripts/syndicate.py` posts to Bluesky: the account, the standard.site publication, the standing hashtags, the streams, and what was posted: each essay's records (`essays`) and the `log` of every post made (both written by the script) |
| `site.json` | Site settings: `suggestedEditionUrl`, the pattern for suggested-edition links (`{isbn}` where the ISBN goes); and `place`, where the Seasons' year is kept (the Boston Basin, near the Charles River: its rounded coordinates, Wikidata IDs and EPA ecoregion levels), named in each post page's structured data |
| `retired-ids.json` | IDs that were published and then retired, so they're never issued again |
| `image-files.json` | Written by `scripts/build_images.py`: the web copies made of each image. Don't edit it |

## How a record is put together

Every record has an `id`, and most share a few fields:

- **`id`**: permanent and neutral, such as `r-0001`. An ID is fixed once it
  has been published or referred to. It never changes and is never reused,
  even if the record is corrected or retired. Older IDs it replaced are kept
  in `aliases`, so old links still work. The same ID is meant to resolve at
  `https://earthlyhours.com/id/<id>`.
- **`shownIn`**: where the site shows it, one place only: `hours`, `weather`
  or `seasons` (inside its Lectio Terra post).
- **`tags`**: what it's about. They only describe a piece; they never move it.
  `hours`, `seasons` and `weather` take terms from `vocab.json` (`void`,
  `autumn`, `fog`); `species` and `phenomena` take IDs from `species.json`
  and `phenomena.json`. A tag is a plain ID, or an object carrying one with
  a `basis` and a `note`: `{"id": "sp-0001", "basis": "thematic", "note":
  "…"}`. The `basis` says how the piece bears on the tag: `grounded` (it
  is about the thing itself), `thematic` (it is paired for its ideas) or
  `both`. A tag with no basis is unclassified, not assumed grounded. The
  notes are working notes for now; the pages don't show them, and read
  either form of tag alike.
- **Season tags** on Hours and Weather pieces lean the picks toward the
  season it is now (×3; `shared.js`), and only ever add weight. So a piece
  is tagged only when it shows or names something that belongs to one
  season: snow, frost, autumn leaves, a harvest, a named month, a seasonal
  custom or effect (Hiroshige's summer river platforms, Hokusai's red
  Fuji). Green trees under a clear sky, especially in a Mediterranean
  landscape, could be most of the year: leave those untagged, which keeps
  them at their ordinary weight all year. When unsure, leave it untagged.
  The seasons are the northern hemisphere's, by month (`vocab.json`).
- **`lectio`**: for a piece copied from a Lectio Terra post, the post's ID
  and its place there (`{"post": "lt-0004", "place": 2}`: the post's second
  passage, or second figure).
- **`draft`**: `true` keeps a record in the file but off the site. `r-0035`
  is a draft kept as a template for new readings.

Then each kind has its own:

- **Readings**: `text` (lines joined by `<br>`, stanzas or paragraphs by
  `<br><br>`; a Lectio Terra passage of prose keeps the post's own paragraphs), `citation` (`display`, the line shown with the reading; and,
  where researched, a `bibliography` line and the `edition` it comes from),
  `title` (the work quoted: a poem, essay or chapter), `written` (when),
  `locator` (where in the edition, below),
  `suggestedEdition` (an edition to buy, recommended: its `isbn`, and a
  `note` where it differs from the one quoted, as a translation or an
  annotated edition does; the Sources page links it at Bookshop.org through
  `site.json`, and a display line that links the book there uses the same
  ISBN), `footnotes`, and
  `display` (`verse`, below; `weatherUnset` for the Weather page's reading
  when no weather is set; one also tagged with conditions is drawn for
  those as well).
- **Editions**: the edition a reading quotes is kept with the reading, in
  `citation.edition`, so each reading reads whole in one place (editions
  are rarely shared: the collection avoids repeating authors and works).
  Each has a neutral, permanent ID, `e-0001`, like every other record. A
  new reading takes the next free number (`copy_lectio.py` gives one to
  each passage it copies). Two readings quoting the same edition (as the
  Hours and Dog Days quote Patrick's 1889 Heraclitus, `e-0017`) share its
  ID, and `check_data.py` checks their copies are the same, field for field
  (only a contributor's `role` may differ). An
  edition one reading quotes inside another (`citation.quotes`) has its
  own. An image from a printed volume has an `edition` too, from the same
  series, shared with a reading quoting the same book (the Sugar Maple
  reading and figure share Crockett's pamphlet, `e-0042`); two volumes of
  one set are two editions.
- **What an edition holds**: what the site shows of it, and
  `identifiers` pointing to the authority records that hold the rest.
  What it shows: `type` (`book`, `article` or `manuscript`), `title`,
  `contributors`, `publisher`, `issued` (the edition's date) and
  `original-date` (when the work first appeared, if earlier); for an
  article, `container` (the journal), `volume` and `pages`; for a
  manuscript, `archive` (where it's held); `rights` and `rightsNote`, as
  for images. The `identifiers`, pointing to the
  records rather than copying them: `doi`; for a book `hathitrust` (its catalogue record), `oclc`
  (WorldCat), `lccn`, `openlibrary`, `isbn` (none before about 1970),
  `internetArchive`; and `wikidata` for the work. `python3
  scripts/link_editions.py [--write]` reads the identifiers off the cited
  copies (HathiTrust, Internet Archive, DOIs), only ever adding, and lists
  records whose copies share a catalogue record, for a person to decide
  whether they're one edition. `check_data.py` checks each identifier's
  form. Citations stay hand-written in the house style.
- **Links: the book, and the page.** Each link has one job. An edition
  says where to find the book as a whole: its `identifiers` lead to its
  catalogue records, so an edition stores a link of its own (in `links`)
  only where no catalogue has it, such as a text on Wikisource or a personal site, and then it is
  the text's front page. An edition never holds a link to one page, so
  every copy of it is the same. The reading or image says where in the
  book to look, as directly as a click can take a reader there:
  - A reading's `citation.locator`: `{"page": "230", "url": "…", "label":
    "HathiTrust"}`, the `label` naming the site, as the Sources page shows
    it. The `page` is the number printed in the book (a range, or ranges, as
    `"105–106, 107–108"`), and the `url` the most direct link to the
    passage: the scan opened at that page (the scan's own page number may
    differ, as scans count the cover and front matter). Where nothing
    links to the page (a Google Books result, a scan that can't open at a
    page), the `url` is the closest link there is and the `page` says
    where to turn; a print-only reading has a `page` and no `url`. The
    link in the reading's `display` line is its `locator.url`, or, where
    the reading recommends an edition, its Bookshop link (Auden's
    "Winds"); the locator is then still the reading's Source on the
    Sources page. A reading
    cut from two places has a list, one locator for each (Frazer's
    *Golden Bough*, pp. 110–111 and 159), and a text it quotes
    (`citation.quotes`) has its own.
  - An image from a book (a plate or figure, with an `edition`) has a
    `locator` the same way: `{"page": "Plate XIX", "url": "…"}`, the
    plate or page as the book numbers it, and the scan opened there.
  - Any other image (a museum object, a photograph) keeps its cited link
    in `links`, marked `cited`: the object's own page at the institution.
    A caption may link elsewhere when that serves readers better (the
    cyanometer links to Wikipedia's article), but the cited link stays.
  A first appearance elsewhere is an edition's `original` link (Frost's
  "Birches" in the *Atlantic*, before *Mountain Interval*), and another
  copy of the whole book or article its `copy`.
- **People**: an edition's `contributors` (each `name`, `role`: author,
  translator, editor) and an image's `creator`. The collection gives
  people no IDs of its own beyond informal keys (`a-robert-ridgway`, the
  same on every copy of a person); its link out is `wikidata` (a QID),
  the hub of linked open data for people, leading on to VIAF, the Library
  of Congress and the rest. `python3 scripts/link_people.py [--write]`
  adds confident matches only (the name agreeing, initials included; a
  person born before the work and not dead a century before it; the only
  one who fits), and lists the rest with their candidates.
- **Verse**: a poem is marked `"display": {"verse": true}`, and the pages
  set it out a line at a time: a line too long for the page carries on
  under a hanging indent rather than passing for a new line. Its `text` is
  always in one form, whatever the source: lines joined by `<br>`, one
  `<br><br>` between stanzas, the poem's own indents as leading `&nbsp;`s
  (one per space), and no `<p>` tags or raw line breaks. A prose poem
  (Stein's *Tender Buttons*) is left as prose. To add a poem, paste it in
  any of these shapes and run `python3 scripts/verse.py <id> --write`
  (`--lines` when each paragraph is a line rather than a stanza): it sets
  the text out and the flag, and never changes the words, so a Lectio Terra
  copy still matches its post. `check_data.py` reports a poem not in the form.
- **Images**: `file`, `caption`, `alt` (what the image shows, for screen
  readers and as its alt text; the caption says what it is, and is the
  fallback where there's no `alt`), `display` (for a Lectio Terra figure:
  its `size` in the post, and `noCaption` or `unlabelled` where it has no
  caption or no "Fig." number; for a Weather image, `cardPosition`, the
  corner the reading's card sits in, clear of what matters in the
  picture: `top-left`, `top-right`, `bottom-left`, `bottom-right` or
  `bottom-center`; `weatherUnset`, as for readings), `link` (where a figure links, if not to
  itself), `bibliography`, `creator`, `title`, `date` (when the image
  was made, which for a plate may be before the edition it's cited from),
  `institution` (who holds it), `shelfmark` (its call number there, for
  a manuscript), `edition` and `locator` (for a plate or
  figure from a book, above: the book's title and publisher are the
  edition's), `partOf` (the larger work an image belongs to when that
  isn't a printed book: a manuscript, a print series), `links` (where the work was cited from: `cited`, and any
  `copy`), `furtherReading` (pages worth reading next, below),
  `source` (the exact file downloaded and when: `url`, `retrieved`),
  `rights` (a
  [RightsStatements.org](https://rightsstatements.org) or Creative Commons
  URI) and `rightsNote` (a word on it, where the status needs one). A
  video figure has `"media": "video"`, its `file` an MP4, with a WebM
  `fallback` and a still `poster` shown before it plays; its `alt`
  describes the video. A YouTube figure (its `file` the YouTube address)
  shows no picture, only a play button named from its caption, so it
  takes no `alt`.
- **Further reading** (`furtherReading`, a list): pages for a reader who
  wants more, each with its `kind` (`about`: on this work itself;
  `related`: on its subject, its maker or its context), `source` (who
  published it: "Royal Institution", "Wikipedia"), `title` (the piece's
  own title, where it has one), `note` (why it's worth reading, where the
  title doesn't say: "its catalogue entry, with the date and the series of
  four sky studies") and `url`. The three are kept apart so any page can
  set them out its own way; the Sources page writes them as one link:
  Royal Institution, "John Tyndall's blue sky apparatus".
- **Writing**: `kind` (`versicle`, `phenomenon`, `note`, `headnote` or
  `supplementum`), `text` (HTML), `place` (a phenomenon line's order within
  its hour), and `footnotes`.
- **Footnotes** belong to the piece their references are in: a list of
  `{"marker": 1, "text": "…"}`, each referred to in the piece's text.
- **Species**: `name`, `scientific` (name), `rank`, and their IDs in
  Wikidata (`wikidata`), GBIF (`gbif`) and iNaturalist (`inaturalist`). **Phenomena**: `name`, `latin`, and a Wikidata ID.

The vocabularies in `vocab.json`: each watch of the Hours with its
`label`, `startHour` and `endHour` (on the clock) and `subtitle`; each
season with its `months`; each weather condition with the `group` it sits
in on the Weather page (The Sky, What Falls, The Air, The Ground).

Dates follow [EDTF](https://www.loc.gov/standards/datetime/) (`1872~/1878~`
means "about 1872 to about 1878").

## The Lectio Terra posts

Readers see each post rebuilt from its records. On import, each post's
text as it came from Substack is kept in `substack/<post id>.html`, and
`scripts/copy_lectio.py` copies its passages, figures and writing into
records of their own in `readings.json`, `images.json` and `writing.json`.
It only ever adds new pieces, never changes one already copied, and reports
when an original and its records no longer match. A correction goes on the
record; correct the original too, so the two still match. Scripts read the
posts through `scripts/datafile.py` (`load('lectio-data')`), which puts
each original back on its post as `bodyHtml`.

A post's record holds its `id` (`lt-`), Substack's `postId`, `season`,
`title`, `subtitle`, `published` (first publication), `canonicalUrl` (on
Substack), `subject` (its `sp-` or `ph-` record), `readings` (the names
of the writers it pairs, in order) and, where the post itself labels them
differently, `readingLabels` (each `author` and `work` as shown), and
`images` (each figure's `src`, its `alt`, and `remoteSrc`, where Substack
served it). Posts not yet set in a season (Works in Progress) are listed
under `unassigned`; `generatedBy` and `generatedAt` say what last wrote
the file.

When a post has gone out on Bluesky, `scripts/syndicate.py` records it in
`syndication.json`, under `essays` and the post's ID: the `card` post
(`uri`, `cid`), its `reply` with more figures, and the post's
standard.site `document` record, whose address the post's page names in
its head. The `streams` say what goes out and when: `essay` (`since`),
`records`, and `season` (Back in season: `days`, `minWeeks`, and
`dryRun` while its posts are only written to the run summary). The `log`
lists every post made (`date`, `stream`, `post`, `uri`; Back in season's
also its `excerpt`, an index into the post's list, and the `figure` ID
used as the card's picture), which is how the streams avoid repeats. A post may also carry `syndication`: `hashtags`
for that essay and `excerpts` (each `from`, a record ID, and `text`, word
for word from it) for its Bluesky posts (`check_data.py` checks each is still word for word in its record). A species or phenomenon record's
`hashtags` are used for every post about it.

Each post also has a `body`: its pieces in order (headings, figures,
passages, runs of its writing), which the Seasons page rebuilds the post
from. `scripts/build_post_manifests.py` makes these lists after an import,
and its opening describes each kind of piece (`heading`, `hr`, `image`,
`reading`, `writing`, with `blocks` and `figures`).

A post with a `page` (`"lectio-terra/sugar-maple/"`) has a page of its own at
that address, built by `scripts/build_lectio_pages.py`: the Seasons page
with the post written into the HTML, for readers and search engines that
don't run JavaScript. Like an ID, the address is fixed once published.

## Editing by hand

1. Find the record by its ID, or add a new one with the next free ID of its
   kind.
2. Write each fact once, on its own record. Other records name it by ID.
3. Run `python3 scripts/check_data.py`. It reports broken links, duplicate
   IDs, unknown tags and missing details, and says which pages need
   rebuilding (`--gaps` lists what each record still lacks).

## Rights

The collection's metadata (each record's citations, identifiers, people,
dates, tags, links and rights statements, and the selection and
arrangement of the records) is licensed under Creative Commons
Attribution-NonCommercial 4.0 (CC BY-NC 4.0): free to reuse for research,
teaching and other non-commercial work, with credit. Commercial use,
including training commercial AI systems, needs a licence, available on
request (hello@earthlyhours.com). [LICENSE.md](LICENSE.md) says exactly
what's covered and how to credit it.

Not covered, and © Ryan Weberling, all rights reserved, with the
permissions in the repository's [LICENSE](../LICENSE) (quoting short
passages with credit, linking, sharing screenshots, printing for personal,
devotional or classroom use): the writing in `writing.json` and the
Lectio Terra posts as written (`substack/`).

Works in the public domain that the collection quotes or reproduces stay in
the public domain; each image's `rights` field says which. Texts and images
credited to another person or institution keep their own terms; the
licence above doesn't extend to the quoted passages or the image files, so
a published dataset carries the metadata and only public-domain texts.
