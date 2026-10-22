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
| `lectio-data.json` | The Lectio Terra posts, whole, as imported from Substack (`lt-`) |
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

The posts in `lectio-data.json` are the master copy of their passages,
figures and writing. `scripts/copy_lectio.py` copies each into its own
record in `readings.json`, `images.json` and `writing.json`. It runs after
every Substack import. It only ever adds new pieces, never changes one
already copied, and reports when a post and its copy no longer match. If you
correct a post, correct its copy too (or the other way round).

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
