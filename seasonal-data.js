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

const SEASON_KEYS = ['spring', 'summer', 'autumn', 'winter'];

// Month-range label for the reading page's header, e.g. "Spring ✦ March
// through May". Meteorological seasons, same as currentSeason() below.
const SEASON_MONTH_RANGES = {
  spring: 'March through May',
  summer: 'June through August',
  autumn: 'September through November',
  winter: 'December through February'
};

function currentSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
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