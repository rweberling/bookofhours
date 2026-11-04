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
| `site.json` | Site settings, such as the pattern for suggested-edition links |
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
  and `phenomena.json`.
- **`lectio`**: for a piece copied from a Lectio Terra post, the post's ID
  and its place there (`{"post": "lt-0004", "place": 2}`: the post's second
  passage, or second figure).
- **`draft`**: `true` keeps a record in the file but off the site. `r-0035`
  is a draft kept as a template for new readings.

Then each kind has its own:

- **Readings**: `text` (lines joined by `<br>`, stanzas or paragraphs by
  `<br><br>`; a Lectio Terra passage of prose keeps the post's own paragraphs), `citation` (`display`, the line shown with the reading; and,
  where researched, a `bibliography` line and the `edition` it comes from),
  `suggestedEdition` (an ISBN for a recommended edition), `footnotes`, and
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
  ID, and `check_data.py` checks their copies of its details agree. An
  edition one reading quotes inside another (`citation.quotes`) has its
  own. An image from a printed volume has an `edition` too, from the same
  series, shared with a reading quoting the same book (the Sugar Maple
  reading and figure share Crockett's pamphlet, `e-0042`); two volumes of
  one set are two editions.
- **What an edition holds**: what the site shows of it (title,
  contributors, dates, publisher), and `identifiers` pointing to the
  authority records that hold the rest, rather than copies of them:
  `doi`; for a book `hathitrust` (its catalogue record), `oclc`
  (WorldCat), `lccn`, `openlibrary`, `isbn` (none before about 1970),
  `internetArchive`; and `wikidata` for the work. The copy actually used
  (the scan) is the edition's link marked `cited`. `python3
  scripts/link_editions.py [--write]` reads the identifiers off the cited
  copies (HathiTrust, Internet Archive, DOIs), only ever adding, and lists
  records whose copies share a catalogue record, for a person to decide
  whether they're one edition. `check_data.py` checks each identifier's
  form. Citations stay hand-written in the house style.
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
  caption or no "Fig." number), `link` (where a figure links, if not to
  itself), `bibliography`, `creator`, `title`, `date`,
  `institution`, `links` (where the work was cited from), `rights` (a
  [RightsStatements.org](https://rightsstatements.org) or Creative Commons
  URI).
- **Writing**: `kind` (`versicle`, `phenomenon`, `note`, `headnote` or
  `supplementum`), `text` (HTML), `place` (a phenomenon line's order within
  its hour), and `footnotes`.
- **Footnotes** belong to the piece their references are in: a list of
  `{"marker": 1, "text": "…"}`, each referred to in the piece's text.
- **Species**: `name`, `scientific` (name), `rank`, and their Wikidata, GBIF
  and iNaturalist IDs. **Phenomena**: `name`, `latin`, and a Wikidata ID.

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

Each post also has a `body`: its pieces in order (headings, figures,
passages, runs of its writing), which the Seasons page rebuilds the post
from. `scripts/build_post_manifests.py` makes these lists after an import.

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

The selection, arrangement, tagging and description in these files, and the
writing in `writing.json` and `lectio-data.json`, are © Ryan Weberling, all
rights reserved, with the permissions given in the repository's
[LICENSE](../LICENSE): quoting short passages with credit, linking, sharing
screenshots, and printing for personal, devotional or classroom use. Please
ask first (hello@earthlyhours.com) before copying the collection in bulk,
republishing it, using it commercially, or using it to train AI systems.

Works in the public domain that the collection quotes or reproduces stay in
the public domain; each image's `rights` field says which. Texts and images
credited to another person or institution keep their own terms.
