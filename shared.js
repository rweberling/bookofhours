/* ══════════════════════════════════════════════════════════════
   SHARED — the foundation every page loads first.
   One definition per fact: the watches, the seasons and their months,
   month and day names, date and text helpers, the pick helpers, the dial
   geometry, the Lectio Terra species lists
   (until they move into data/vocab.json), and the loader for the
   collection in data/. Loaded before atmosphere.js on every page.
══════════════════════════════════════════════════════════════ */

// --- The watches ------------------------------------------------------------
// The eight three-hour watches of the day, with the color each is drawn in
// on the Wander the Hours dial. atmosphere.js works out the current watch
// from these start hours, and hours.js draws the dial from the colors.
// data/vocab.json repeats the ids, names and start hours for reuse outside
// the site; scripts/check_data.py checks that the two agree.
const HOURS = [
  { key: 'void', label: 'Void', start: 0, color: '#2a2440' },
  { key: 'hush', label: 'Hush', start: 3, color: '#3a3050' },
  { key: 'chorus', label: 'Chorus', start: 6, color: '#c89030' },
  { key: 'transit', label: 'Transit', start: 9, color: '#f0c050' },
  { key: 'fulcrum', label: 'Fulcrum', start: 12, color: '#d4b870' },
  { key: 'doldrums', label: 'Doldrums', start: 15, color: '#c08040' },
  { key: 'convivium', label: 'Convivium', start: 18, color: '#a84828' },
  { key: 'denouement', label: 'Denouement', start: 21, color: '#404870' }
];

// --- Seasons and months -----------------------------------------------------
// The site's meteorological seasons. Everything about a season's months
// comes from this table: which season it is now (currentSeason), the
// "March through May" wording, and the labels. data/vocab.json repeats the
// months for reuse outside the site; scripts/check_data.py checks that the
// two agree.
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SEASONS = [
  { key: 'spring', label: 'Spring', months: [3, 4, 5] },
  { key: 'summer', label: 'Summer', months: [6, 7, 8] },
  { key: 'autumn', label: 'Autumn', months: [9, 10, 11] },
  { key: 'winter', label: 'Winter', months: [12, 1, 2] }
];

const SEASON_KEYS = SEASONS.map(season => season.key);
const SEASON_LABELS = Object.fromEntries(SEASONS.map(season => [season.key, season.label]));

// e.g. "March through May", for the reading page's header and the Sources page.
const SEASON_MONTH_RANGES = Object.fromEntries(SEASONS.map(season => [
  season.key,
  `${MONTH_NAMES[season.months[0] - 1]} through ${MONTH_NAMES[season.months[season.months.length - 1] - 1]}`
]));

// date defaults to "now", but takes an explicit Date too. atmosphere.js's
// seasonKey() uses this, so the month thresholds exist only here.
function currentSeason(date = new Date()) {
  const month = date.getMonth() + 1;
  return SEASONS.find(season => season.months.includes(month)).key;
}

const SEASONAL_DATA = {
  spring: {
    label: 'Spring',
    subtitle: 'Species drawn from Lectio Terra, this season',
    species: [
      ['Pink lady\'s slipper', 'Cypripedium acaule'], ['Common lilac', 'Syringa vulgaris'], ['Ostrich fern', 'Matteuccia struthiopteris'], ['Red maple', 'Acer rubrum'], ['Trillium', 'Trillium grandiflorum'], ['Columbine', 'Aquilegia canadensis'], ['Mayapple', 'Podophyllum peltatum'], ['Jack-in-the-pulpit', 'Arisaema triphyllum'], ['Bloodroot', 'Sanguinaria canadensis'], ['Dutchman\'s breeches', 'Dicentra cucullaria'], ['Serviceberry', 'Amelanchier canadensis'], ['Spring beauty', 'Claytonia virginica']
    ]
  },
  summer: {
    label: 'Summer',
    subtitle: 'Species drawn from Lectio Terra, this season',
    species: [
      ['Butterfly weed', 'Asclepias tuberosa'], ['Common reed', 'Phragmites australis'], ['Sheet moss', 'Hypnum imponens'], ['Black-eyed Susan', 'Rudbeckia hirta'], ['Wild bergamot', 'Monarda fistulosa'], ['Joe-Pye weed', 'Eutrochium purpureum'], ['Queen Anne\'s lace', 'Daucus carota'], ['Milkweed', 'Asclepias syriaca'], ['Blue vervain', 'Verbena hastata'], ['Bee balm', 'Monarda didyma'], ['Yarrow', 'Achillea millefolium'], ['Fireweed', 'Chamerion angustifolium']
    ]
  },
  autumn: {
    label: 'Autumn',
    subtitle: 'Species drawn from Lectio Terra, this season',
    species: [
      ['Sugar maple', 'Acer saccharum'], ['Paper birch', 'Betula papyrifera'], ['Corn', 'Zea mays'], ['White oak', 'Quercus alba'], ['American beech', 'Fagus grandifolia'], ['Sumac', 'Rhus typhina'], ['Goldenrod', 'Solidago canadensis'], ['New England aster', 'Symphyotrichum novae-angliae'], ['Pawpaw', 'Asimina triloba'], ['Black walnut', 'Juglans nigra'], ['Highbush blueberry', 'Vaccinium corymbosum'], ['Cranberry', 'Vaccinium macrocarpon']
    ]
  },
  winter: {
    label: 'Winter',
    subtitle: 'Species drawn from Lectio Terra, this season',
    species: [
      ['Witch hazel', 'Hamamelis virginiana'], ['Red currant', 'Ribes rubrum'], ['Eastern hemlock', 'Tsuga canadensis'], ['White pine', 'Pinus strobus'], ['Red cedar', 'Juniperus virginiana'], ['Winterberry', 'Ilex verticillata'], ['Mountain laurel', 'Kalmia latifolia'], ['Christmas fern', 'Polystichum acrostichoides'], ['American holly', 'Ilex opaca'], ['Paper wasp gall', 'Rhopalomyia solidaginis'], ['Snowberry', 'Symphoricarpos albus'], ['Juniper', 'Juniperus communis']
    ]
  }
};


// --- Dates and text -----------------------------------------------------------
// "3:45 pm"
function formatTime(d) {
  const h = d.getHours(), m = d.getMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}

// "Wednesday, 30 September 2026"
function formatDate(d) {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// A caption or citation with its markup removed, e.g. for an image's alt text.
function plainText(html) {
  return html ? String(html).replace(/<[^>]*>/g, '') : '';
}

// Text made safe to place inside HTML, including inside an attribute's quotes.
function escapeHTML(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Web copies of images -------------------------------------------------
// Pages show web copies of the master images, made by
// scripts/build_images.py: images/fulcrum_klint.jpg is shown as
// images/web/fulcrum_klint-800.webp, -1600.webp and -2400.webp.
// webVersion() builds the same names; anything outside images/ is left as is.
const WEB_WIDTHS = [800, 1600, 2400];

function webVersion(src, width) {
  return /^images\//.test(src)
    ? src.replace(/^images\//, 'images/web/').replace(/\.[^./]+$/, `-${width}.webp`)
    : src;
}

// Points an <img> at the web copies of a master, letting the browser pick
// the width for its screen. sizes says how wide the image is drawn. If a
// copy is missing (the build script not yet run for a new image), it
// falls back to the master. The master's path is kept in data-master.
function setWebImage(img, src, sizes, widths = WEB_WIDTHS) {
  img.dataset.master = src;
  if (!/^images\//.test(src)) {
    img.removeAttribute('srcset');
    img.src = src;
    return;
  }
  img.onerror = () => {
    img.onerror = null;
    img.removeAttribute('srcset');
    img.src = src;
  };
  img.sizes = sizes;
  img.srcset = widths.map(w => `${webVersion(src, w)} ${w}w`).join(', ');
  img.src = webVersion(src, 1600);
}

// --- Dial geometry --------------------------------------------------------
// Shared by both dials — Wander the Hours (hours.js) and Wander the Seasons
// (seasons.js) draw on the same 240×240 wheel: same center point, same arc
// radius. Angles are in degrees; hour-domain callers convert via
// hourToAngleDeg() in hours.js first.
const CX = 120, CY = 120;
const R_ARC = 88;
const svgNS = 'http://www.w3.org/2000/svg';

function polarToXY(angleDeg, r) {
  const rad = angleDeg * Math.PI / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(startDeg, endDeg, r) {
  const p1 = polarToXY(startDeg, r);
  const p2 = polarToXY(endDeg, r);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`;
}

// Shared by hours.js (quotes/images) and seasons.js (seasonal readings) —
// one implementation instead of two, the same lesson getSeason()/
// currentSeason() already taught: genuinely generic logic belongs in the
// shared-foundation tier from the start, not duplicated per consumer.
function pick(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickExcluding(arr, excludeFn) {
  if (!arr || arr.length === 0) return null;
  const pool = arr.filter(item => !excludeFn(item));
  const source = pool.length > 0 ? pool : arr;
  return source[Math.floor(Math.random() * source.length)];
}

// Random pick where each item's odds are proportional to weightFn(item)
// instead of flat — used to lean toward stronger matches (e.g. more
// overlapping weather tags) without ever making a match the only
// possible outcome. Falls back to a flat pick() if every weight is zero.
function pickWeighted(arr, weightFn) {
  if (!arr || arr.length === 0) return null;
  const weights = arr.map(item => Math.max(0, weightFn(item) || 0));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return pick(arr);
  let roll = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function pickWeightedExcluding(arr, weightFn, excludeFn) {
  if (!arr || arr.length === 0) return null;
  const pool = arr.filter(item => !excludeFn(item));
  const source = pool.length > 0 ? pool : arr;
  return pickWeighted(source, weightFn);
}

// How many of the currently-active weather conditions an item's tags hit.
function weatherMatchCount(item, weather) {
  return Array.isArray(item.weather) ? item.weather.filter(w => weather.includes(w)).length : 0;
}

// Every item starts from the same baseline weight — no tags, or tags that
// don't match, is never a hard exclusion, just the least-likely outcome —
// then each matching condition adds on quadratically: 1 match only a
// modest nudge above baseline, but a triple match (e.g. cold+snow+wind,
// all active at once) stands out sharply as the "resonant" pick.
const WEATHER_BASE_WEIGHT = 1;
function weatherMatchWeight(item, weather) {
  return WEATHER_BASE_WEIGHT + weatherMatchCount(item, weather) ** 2;
}

// Shared by hours.js (quotes/images) and weather.js (window views).
function pickWeatherAware(items, excludeFn) {
  const weather = (window.siteAtmosphere && window.siteAtmosphere.weather) || [];
  if (!weather.length) return pickExcluding(items, excludeFn);
  return pickWeightedExcluding(items, item => weatherMatchWeight(item, weather), excludeFn);
}

// --- Species-card / post-title rework -------------------------------------
// STOPGAP: real lectio-data.json posts carry no separate species/latin/
// readings fields — only a raw weekly title string, e.g.
//   "Week 12: Sugar Maple, Annika Hansteen-Izora, Walter H. Crockett"
// This parses that title client-side so cards/reading pages can lead with
// the species name instead of the full post title. It's a stopgap because
// it's guessing structure from a string built for a different (weekly-post)
// context. THE DURABLE FIX is to add real `species`, `latin`, and
// `readings` fields at the point lectio-data.json is generated (or by hand,
// directly in the file), so this parsing (and its "Week N:" / comma-list
// assumptions) can be deleted.
//
// `readings` names the 2-3 writers whose work is paired with each post —
// deliberately not "contributors," since it's scoped to written readings
// only. Artists/images are a separate, not-yet-built concern; if that ever
// gets its own field, it'll be additive (e.g. `artists`), not a rename of
// this one.
//
// Expected shape: "<label>: <Species Name>, <Reading 1>, <Reading 2>, ..."
// Falls back gracefully (whole title as species, no readings) if the
// title doesn't match that shape.
function parsePostTitle(title) {
  if (!title || typeof title !== 'string') {
    return { species: title || '', readings: [] };
  }
  const afterColon = title.includes(':') ? title.split(':').slice(1).join(':').trim() : title.trim();
  // Newer titles put the readings in parentheses after the species —
  // "Week 37: Northern Red Oak (Susan Fenimore Cooper, George Francis
  // Heath, James George Frazer)". Only when nothing before the "(" has a
  // comma, so an older title's trailing aside ("Cucumis, Robert Hass,
  // Marcus Aurelius (and William Cowper, too)") still parses the old way.
  const parenthesized = afterColon.match(/^([^,(]+?)\s*\((.+)\)\s*$/);
  if (parenthesized) {
    return {
      species: parenthesized[1].trim(),
      readings: parenthesized[2].split(',').map(s => s.trim()).filter(Boolean)
    };
  }
  const parts = afterColon.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { species: title.trim(), readings: [] };
  }
  const [species, ...readings] = parts;
  return { species, readings };
}

// Condensed credit line for a readings list, e.g.
// "Annika Hansteen-Izora, Walter H. Crockett" or "" if none.
function creditLine(readings) {
  if (!readings || readings.length === 0) return '';
  return readings.join(', ');
}

// Latin-name lookup, keyed by lowercased common name, built from the
// hand-curated SEASONAL_DATA species lists above. Only covers species that
// happen to match one of those ~48 entries — real posts outside that list
// fall back to showing the credit line instead of a Latin name. That's a
// known, visible limitation of the stopgap, not a bug: the durable fix
// (real `latin` field in lectio-data.json) covers every post, not just the
// hand-curated sample.
const SPECIES_LATIN_LOOKUP = new Map();
SEASON_KEYS.forEach(key => {
  SEASONAL_DATA[key].species.forEach(([common, latin]) => {
    SPECIES_LATIN_LOOKUP.set(common.toLowerCase(), latin);
  });
});

// Shared by hours.js's species grid and seasons.js's reading page — same
// species/latin/readings extraction, so a parsing-edge-case fix doesn't
// have to be made twice (or, worse, made in only one of the two and left
// to quietly disagree with the other for the same post).
//
// isRealEntry distinguishes a real fetched lectio-data.json entry from
// hours.js's fallback-sample entries (SEASON_SPECIES, used only if the
// fetch fails) — the fallback entries already carry a clean title/subtitle
// and never need the raw-title parse. seasons.js only ever renders real
// entries, so it always passes true.
function resolveSpeciesFields(entry, isRealEntry) {
  if (isRealEntry && entry.species) {
    return { species: entry.species, latin: entry.latin || null, readings: entry.readings || [] };
  }
  if (isRealEntry) {
    const parsed = parsePostTitle(entry.title);
    return {
      species: parsed.species,
      readings: parsed.readings,
      latin: SPECIES_LATIN_LOOKUP.get(parsed.species.toLowerCase()) || null
    };
  }
  return { species: entry.title, latin: entry.subtitle || null, readings: [] };
}

// Shared by hours.js (species grid) and seasons.js (reading page) — one
// fetch+error path instead of two copies that could drift (different
// error copy, different caching, a future retry/timeout added to one and
// not the other). Cached per page load: repeatedly opening the species
// grid, or anything else that calls this again, reuses the same promise
// instead of re-fetching.
let lectioDataPromise = null;
function loadLectioData() {
  if (!lectioDataPromise) {
    lectioDataPromise = fetch('lectio-data.json').then(response => {
      if (!response.ok) throw new Error(`Unable to load Lectio Terra posts (${response.status}).`);
      return response.json();
    });
  }
  return lectioDataPromise;
}
// --- The collection ---------------------------------------------------------
// data/ holds the collection itself: readings, images, editorial writing and
// the vocabularies their tags point to (hours, seasons, weather, subjects),
// plus site.json, the site's settings (such as the suggested-edition link).
// Pages read it through loadCollection() and reshape it with the views
// below into the forms their code already expects, so there is one set of
// files to edit and nothing generated in between. Records marked
// "draft": true are kept in the files but never shown.
const COLLECTION_FILES = ['readings', 'images', 'editorial', 'vocab', 'site'];
let collectionPromise = null;
function loadCollection() {
  if (!collectionPromise) {
    collectionPromise = Promise.all(COLLECTION_FILES.map(name =>
      fetch(`data/${name}.json`).then(response => {
        if (!response.ok) throw new Error(`Unable to load data/${name}.json (${response.status}).`);
        return response.json();
      })
    )).then(([readings, images, editorial, vocab, site]) => ({
      readings: readings.filter(r => !r.draft),
      images: images.filter(i => !i.draft),
      editorial: editorial.filter(e => !e.draft),
      vocab,
      site
    }));
    // A failed load isn't cached, so a retry fetches again.
    collectionPromise.catch(() => { collectionPromise = null; });
  }
  return collectionPromise;
}

// Suggested editions are stored as an ISBN only. The link is built from
// the pattern in data/site.json (suggestedEditionUrl, with {isbn} where
// the ISBN goes), so changing retailer or affiliate ID is one data edit.
function suggestedEditionUrl(suggestedEdition, site) {
  const pattern = site && site.suggestedEditionUrl;
  return pattern && suggestedEdition && suggestedEdition.isbn
    ? pattern.replace('{isbn}', suggestedEdition.isbn)
    : null;
}

function taggedWith(record, scheme, id) {
  return !!(record.tags && Array.isArray(record.tags[scheme]) && record.tags[scheme].includes(id));
}

// The shapes the page code reads: a quote is { text, attr, weather } and
// an image { src, caption, weather, cardPosition, unset }. attr is the
// hand-written display citation.
function quoteView(reading) {
  return {
    id: reading.id,
    text: reading.text,
    attr: reading.citation ? reading.citation.display : '',
    weather: (reading.tags && reading.tags.weather) || [],
    unset: !!(reading.display && reading.display.weatherUnset)
  };
}

function imageView(image) {
  const display = image.display || {};
  return {
    id: image.id,
    src: image.file,
    caption: image.caption || '',
    weather: (image.tags && image.tags.weather) || [],
    cardPosition: display.cardPosition,
    unset: !!display.weatherUnset
  };
}

// The hours page's blocks, in vocabulary order: each watch with its
// versicle and phenomena, and every reading and image tagged for it.
function hoursView(collection) {
  return collection.vocab.hours.map(hour => {
    const note = collection.editorial.find(e => e.kind === 'hour-note' && e.about && (e.about.hours || []).includes(hour.id)) || {};
    return {
      key: hour.id,
      name: hour.label,
      cssClass: `block-${hour.id}`,
      startHour: hour.startHour,
      subtitle: hour.subtitle,
      versicle: note.versicle || '',
      phenomena: note.phenomena || [],
      quotes: collection.readings.filter(r => taggedWith(r, 'hours', hour.id)).map(quoteView),
      images: collection.images.filter(i => taggedWith(i, 'hours', hour.id)).map(imageView)
    };
  });
}

// The weather page's window: every image and reading tagged with a
// condition, plus the "unset" ones shown before any condition is chosen.
function weatherView(collection) {
  const onWeatherPage = record => ((record.tags && record.tags.weather) || []).length > 0
    || !!(record.display && record.display.weatherUnset);
  return {
    images: collection.images.filter(onWeatherPage).map(imageView),
    readings: collection.readings.filter(onWeatherPage).map(quoteView)
  };
}
