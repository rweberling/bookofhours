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

// The season's emblem, a small line drawing (an SVG's inner markup, 24×24):
// at the foot of the Hours page and of the Seasons page.
const SEASON_EMBLEMS = {
  // Spring: a heraldic rose — five petals, small lozenge barbs between them, a washed boss with a point at its heart.
  spring: `<path transform="translate(12 12) rotate(0)" d="M0 -1.6 C1.9 -2.2 3.4 -4.1 2.5 -6.2 C1.9 -7.6 0.5 -7.3 0 -6.4 C-0.5 -7.3 -1.9 -7.6 -2.5 -6.2 C-3.4 -4.1 -1.9 -2.2 0 -1.6 Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round"/>
           <path transform="translate(12 12) rotate(72)" d="M0 -1.6 C1.9 -2.2 3.4 -4.1 2.5 -6.2 C1.9 -7.6 0.5 -7.3 0 -6.4 C-0.5 -7.3 -1.9 -7.6 -2.5 -6.2 C-3.4 -4.1 -1.9 -2.2 0 -1.6 Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round"/>
           <path transform="translate(12 12) rotate(144)" d="M0 -1.6 C1.9 -2.2 3.4 -4.1 2.5 -6.2 C1.9 -7.6 0.5 -7.3 0 -6.4 C-0.5 -7.3 -1.9 -7.6 -2.5 -6.2 C-3.4 -4.1 -1.9 -2.2 0 -1.6 Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round"/>
           <path transform="translate(12 12) rotate(216)" d="M0 -1.6 C1.9 -2.2 3.4 -4.1 2.5 -6.2 C1.9 -7.6 0.5 -7.3 0 -6.4 C-0.5 -7.3 -1.9 -7.6 -2.5 -6.2 C-3.4 -4.1 -1.9 -2.2 0 -1.6 Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round"/>
           <path transform="translate(12 12) rotate(288)" d="M0 -1.6 C1.9 -2.2 3.4 -4.1 2.5 -6.2 C1.9 -7.6 0.5 -7.3 0 -6.4 C-0.5 -7.3 -1.9 -7.6 -2.5 -6.2 C-3.4 -4.1 -1.9 -2.2 0 -1.6 Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round"/>
           <path transform="translate(16.29 6.09) rotate(36) scale(0.65)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path transform="translate(18.94 14.26) rotate(108) scale(0.65)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path transform="translate(12 19.3) rotate(180) scale(0.65)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path transform="translate(5.06 14.26) rotate(252) scale(0.65)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path transform="translate(7.71 6.09) rotate(324) scale(0.65)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <circle cx="12" cy="12" r="1.75" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.38"/>
           <circle cx="12" cy="12" r="0.45" fill="currentColor"/>`,
  // Summer: the sun — a washed disc and eight tapered rays, each tipped with a lozenge.
  summer: `<path d="M11.68 7.41 L12 3.7 L12.32 7.41" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.38" stroke-linejoin="round"/>
           <path d="M15.02 8.53 L17.87 6.13 L15.47 8.98" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.38" stroke-linejoin="round"/>
           <path d="M16.59 11.68 L20.3 12 L16.59 12.32" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.38" stroke-linejoin="round"/>
           <path d="M15.47 15.02 L17.87 17.87 L15.02 15.47" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.38" stroke-linejoin="round"/>
           <path d="M12.32 16.59 L12 20.3 L11.68 16.59" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.38" stroke-linejoin="round"/>
           <path d="M8.98 15.47 L6.13 17.87 L8.53 15.02" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.38" stroke-linejoin="round"/>
           <path d="M7.41 12.32 L3.7 12 L7.41 11.68" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.38" stroke-linejoin="round"/>
           <path d="M8.53 8.98 L6.13 6.13 L8.98 8.53" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.38" stroke-linejoin="round"/>
           <path transform="translate(12 2.7) rotate(0) scale(0.6)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path transform="translate(18.58 5.42) rotate(45) scale(0.6)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path transform="translate(21.3 12) rotate(90) scale(0.6)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path transform="translate(18.58 18.58) rotate(135) scale(0.6)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path transform="translate(12 21.3) rotate(180) scale(0.6)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path transform="translate(5.42 18.58) rotate(225) scale(0.6)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path transform="translate(2.7 12) rotate(270) scale(0.6)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path transform="translate(5.42 5.42) rotate(315) scale(0.6)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <circle cx="12" cy="12" r="3.6" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.55"/>`,
  // Autumn: an acorn "slipped and leaved", as heraldry has it — the nut in its scaled cup, on a stalk with a leaf either side.
  autumn: `<g transform="translate(0 1.1)">
           <g transform="translate(12 7) rotate(-40) scale(1.1)">
           <path d="M0 0 C1.5 -1.1 1.7 -3.4 0 -5.2 C-1.7 -3.4 -1.5 -1.1 0 0 Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"/>
           <path d="M0 -0.3 L0 -4.4" stroke="currentColor" stroke-width="0.29"/>
           </g>
           <g transform="translate(12 7) rotate(40) scale(1.1)">
           <path d="M0 0 C1.5 -1.1 1.7 -3.4 0 -5.2 C-1.7 -3.4 -1.5 -1.1 0 0 Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"/>
           <path d="M0 -0.3 L0 -4.4" stroke="currentColor" stroke-width="0.29"/>
           </g>
           <path d="M12 8.6 C12 7.4 12.1 5.6 12.0 3.9" stroke="currentColor" stroke-width="0.55" stroke-linecap="round" fill="none"/>
           <path transform="translate(12 3.1) rotate(0) scale(0.6)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path d="M8.6 12.3 C8.5 15.5 10.3 17.9 12 18.7 C13.7 17.9 15.5 15.5 15.4 12.3 Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round"/>
           <path d="M7.7 12.3 C7.5 9.8 9.4 8.4 12 8.4 C14.6 8.4 16.5 9.8 16.3 12.3 C13.4 13.1 10.6 13.1 7.7 12.3 Z" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="0.55" stroke-linejoin="round"/>
           <clipPath id="acorn-cup">
           <path d="M7.7 12.3 C7.5 9.8 9.4 8.4 12 8.4 C14.6 8.4 16.5 9.8 16.3 12.3 C13.4 13.1 10.6 13.1 7.7 12.3 Z"/>
           </clipPath>
           <g clip-path="url(#acorn-cup)">
           <path d="M8.60 11.2 Q9.50 10.07 10.40 11.2" stroke="currentColor" stroke-width="0.3" fill="none"/>
           <path d="M10.40 11.2 Q11.30 10.07 12.20 11.2" stroke="currentColor" stroke-width="0.3" fill="none"/>
           <path d="M12.20 11.2 Q13.10 10.07 14.00 11.2" stroke="currentColor" stroke-width="0.3" fill="none"/>
           <path d="M14.00 11.2 Q14.90 10.07 15.80 11.2" stroke="currentColor" stroke-width="0.3" fill="none"/>
           </g>
           </g>`,
  // Winter: a snow crystal — six arms with paired branches and lozenge tips, meeting at a point.
  winter: `<g transform="translate(12 12) rotate(0)">
           <path d="M0 -1.0 L0 -8.1" stroke="currentColor" stroke-width="0.55" stroke-linecap="round"/>
           <path d="M0 -4.4 L-1.35 -5.4 M0 -4.4 L1.35 -5.4 M0 -6.4 L-0.85 -7.05 M0 -6.4 L0.85 -7.05" stroke="currentColor" stroke-width="0.34" stroke-linecap="round"/>
           </g>
           <g transform="translate(12 12) rotate(60)">
           <path d="M0 -1.0 L0 -8.1" stroke="currentColor" stroke-width="0.55" stroke-linecap="round"/>
           <path d="M0 -4.4 L-1.35 -5.4 M0 -4.4 L1.35 -5.4 M0 -6.4 L-0.85 -7.05 M0 -6.4 L0.85 -7.05" stroke="currentColor" stroke-width="0.34" stroke-linecap="round"/>
           </g>
           <g transform="translate(12 12) rotate(120)">
           <path d="M0 -1.0 L0 -8.1" stroke="currentColor" stroke-width="0.55" stroke-linecap="round"/>
           <path d="M0 -4.4 L-1.35 -5.4 M0 -4.4 L1.35 -5.4 M0 -6.4 L-0.85 -7.05 M0 -6.4 L0.85 -7.05" stroke="currentColor" stroke-width="0.34" stroke-linecap="round"/>
           </g>
           <g transform="translate(12 12) rotate(180)">
           <path d="M0 -1.0 L0 -8.1" stroke="currentColor" stroke-width="0.55" stroke-linecap="round"/>
           <path d="M0 -4.4 L-1.35 -5.4 M0 -4.4 L1.35 -5.4 M0 -6.4 L-0.85 -7.05 M0 -6.4 L0.85 -7.05" stroke="currentColor" stroke-width="0.34" stroke-linecap="round"/>
           </g>
           <g transform="translate(12 12) rotate(240)">
           <path d="M0 -1.0 L0 -8.1" stroke="currentColor" stroke-width="0.55" stroke-linecap="round"/>
           <path d="M0 -4.4 L-1.35 -5.4 M0 -4.4 L1.35 -5.4 M0 -6.4 L-0.85 -7.05 M0 -6.4 L0.85 -7.05" stroke="currentColor" stroke-width="0.34" stroke-linecap="round"/>
           </g>
           <g transform="translate(12 12) rotate(300)">
           <path d="M0 -1.0 L0 -8.1" stroke="currentColor" stroke-width="0.55" stroke-linecap="round"/>
           <path d="M0 -4.4 L-1.35 -5.4 M0 -4.4 L1.35 -5.4 M0 -6.4 L-0.85 -7.05 M0 -6.4 L0.85 -7.05" stroke="currentColor" stroke-width="0.34" stroke-linecap="round"/>
           </g>
           <path transform="translate(12 3.05) rotate(0) scale(0.6)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path transform="translate(19.75 7.53) rotate(60) scale(0.6)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path transform="translate(19.75 16.47) rotate(120) scale(0.6)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path transform="translate(12 20.95) rotate(180) scale(0.6)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path transform="translate(4.25 16.48) rotate(240) scale(0.6)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <path transform="translate(4.25 7.53) rotate(300) scale(0.6)" d="M0 -0.85 L0.55 0 L0 0.85 L-0.55 0 Z" fill="currentColor"/>
           <circle cx="12" cy="12" r="0.55" fill="currentColor"/>`
};

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

// The season leans the Hours the same gentle way: a piece tagged with
// the season it is now is three times as likely, one with no season tag
// is neutral (it belongs to the whole year), and one tagged only with
// other seasons is a third as likely, never excluded, so a thinly
// stocked hour never runs dry.
const SEASON_MATCH_FACTOR = 3;
function seasonFactor(item, season) {
  if (!Array.isArray(item.seasons) || item.seasons.length === 0) return 1;
  return item.seasons.includes(season) ? SEASON_MATCH_FACTOR : 1 / SEASON_MATCH_FACTOR;
}

// hours.js's picks: weather and season both lean the odds.
function pickHoursAware(items, excludeFn) {
  const weather = (window.siteAtmosphere && window.siteAtmosphere.weather) || [];
  const season = currentSeason();
  return pickWeightedExcluding(items, item => weatherMatchWeight(item, weather) * seasonFactor(item, season), excludeFn);
}

// weather.js's window views (and any page that leans on weather alone).
function pickWeatherAware(items, excludeFn) {
  const weather = (window.siteAtmosphere && window.siteAtmosphere.weather) || [];
  if (!weather.length) return pickExcluding(items, excludeFn);
  return pickWeightedExcluding(items, item => weatherMatchWeight(item, weather), excludeFn);
}

// --- Species cards and reading pages ----------------------------------------
// A post's subject (its species or phenomenon) lives in data/species.json
// or data/phenomena.json; the post names it by ID ("subject"), and
// loadLectioData() below joins the two. A post without a subject yet (a
// new import) falls back to its title, parsed here.
//
// `readings` names the 2-3 writers whose work is paired with each post —
// deliberately not "contributors," since it's scoped to written readings
// only.
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

// The names a species card and a reading page show for a post: its
// subject record's common and scientific (or Latin) name, else what its
// title gives.
function resolveSpeciesFields(entry) {
  const parsed = parsePostTitle(entry.title);
  const readings = entry.readings || parsed.readings;
  const subject = entry.subjectRecord;
  if (subject) {
    return { species: subject.name, latin: subject.scientific || subject.latin || null, readings };
  }
  return { species: parsed.species, latin: null, readings };
}

// The Lectio Terra posts, each with its subject record joined on as
// subjectRecord. Shared by seasons.js and sources.js, and cached per page
// load. If the species files can't be loaded, the posts still are, and
// fall back to their titles.
let lectioDataPromise = null;
function loadLectioData() {
  if (!lectioDataPromise) {
    const getJSON = (url, what) => fetch(url).then(response => {
      if (!response.ok) throw new Error(`Unable to load ${what} (${response.status}).`);
      return response.json();
    });
    const subjects = Promise.all([
      getJSON('data/species.json', 'data/species.json'),
      getJSON('data/phenomena.json', 'data/phenomena.json')
    ]).then(([species, phenomena]) => new Map([...species, ...phenomena].map(r => [r.id, r])))
      .catch(error => { console.error(error); return new Map(); });
    lectioDataPromise = Promise.all([getJSON('data/lectio-data.json', 'Lectio Terra posts'), subjects])
      .then(([data, byId]) => {
        Object.values(data.seasons || {}).forEach(entries => entries.forEach(entry => {
          if (entry.subject && byId.has(entry.subject)) entry.subjectRecord = byId.get(entry.subject);
        }));
        return data;
      });
    lectioDataPromise.catch(() => { lectioDataPromise = null; });
  }
  return lectioDataPromise;
}

// --- A Lectio Terra post, rebuilt from the collection ------------------------
// A post's "body" lists its pieces in order (scripts/build_post_manifests.py):
// headings, rules, figures (image records), passages (reading records) and
// runs of its own writing (writing records). renderPostBody() turns that list
// back into the post's HTML, in the markup the Seasons page expects: each
// passage a one-item list followed by its citation, figures numbered in
// order, footnotes after everything else.

// The top-level blocks of some HTML, as scripts/post_html.py splits it:
// each element, and each run of text that isn't only whitespace.
function topLevelBlocks(html) {
  const template = document.createElement('template');
  template.innerHTML = html || '';
  return [...template.content.childNodes]
    .filter(node => node.nodeType === 1 || (node.nodeType === 3 && node.textContent.trim()))
    .map(node => node.nodeType === 1 ? node.outerHTML : escapeHTML(node.textContent));
}

function figureHTML(image, number) {
  const display = image.display || {};
  const label = display.unlabelled ? '' : `Fig. ${number}. `;
  const caption = display.noCaption ? '' : `<figcaption>${label}${image.caption || ''}</figcaption>`;
  // The size the post sets it at (images narrower than the column stay so).
  const size = display.size ? ` width="${display.size[0]}" height="${display.size[1]}"` : '';
  if (image.media === 'video') {
    const source = (src, type) => src ? `<source src="${escapeHTML(src)}" type="${type}">` : '';
    return `<figure><video poster="${escapeHTML(image.poster || '')}"${size} controls muted loop playsinline preload="metadata">`
      + `${source(image.file, 'video/mp4')}${source(image.fallback, 'video/webm')}</video>${caption}</figure>`;
  }
  return `<figure><a target="_blank" href="${escapeHTML(image.link || image.file)}">`
    + `<img src="${escapeHTML(image.file)}"${size} alt=""></a>${caption}</figure>`;
}

function renderPostBody(post, byId) {
  let figures = 0;
  const footnotes = [];
  const seen = new Set();
  const figure = id => {
    const image = byId.get(id);
    if (!image) return '';
    if (!(image.display && image.display.noCaption)) figures += 1;
    return figureHTML(image, figures);
  };
  const noteFrom = record => {
    if (seen.has(record.id)) return;
    seen.add(record.id);
    (record.footnotes || []).forEach(note => footnotes.push(note));
  };
  const parts = (post.body || []).map(item => {
    if (item.heading) return `<${item.tag || 'h3'}>${escapeHTML(item.heading)}</${item.tag || 'h3'}>`;
    if (item.hr) return '<hr>';
    if (item.image) return figure(item.image);
    if (item.reading) {
      const reading = byId.get(item.reading);
      if (!reading) return '';
      noteFrom(reading);
      const inside = (item.figures || []).map(figure).join('');
      return `<ol><li>${reading.text}${inside}</li></ol>${(reading.citation && reading.citation.display) || ''}`;
    }
    if (item.writing) {
      const piece = byId.get(item.writing);
      if (!piece) return '';
      noteFrom(piece);
      let html = topLevelBlocks(piece.text).slice(item.blocks[0], item.blocks[1]).join('');
      if (item.figures) {
        // At the end of the list's last item, before any empty paragraphs.
        const inside = item.figures.map(figure).join('');
        html = html.replace(/((?:<p>\s*<\/p>)*<\/li>\s*<\/[uo]l>\s*)$/, `${inside}$1`);
      }
      return html;
    }
    return '';
  });
  footnotes.sort((a, b) => a.marker - b.marker);
  const notes = footnotes.map(note =>
    `<a href="#footnote-anchor-${note.marker}" target="_self">${note.marker}</a>${note.text}`);
  return parts.join('') + notes.join('');
}

// --- The collection ---------------------------------------------------------
// data/ holds the collection itself: readings (others' words), images,
// writing (the site's own words: versicles, phenomenon lines) and the
// vocabularies their tags point to (hours, seasons, weather),
// plus site.json, the site's settings (such as the suggested-edition link).
// Pages read it through loadCollection() and reshape it with the views
// below into the forms their code already expects, so there is one set of
// files to edit and nothing generated in between. Records marked
// "draft": true are kept in the files but never shown.
const COLLECTION_FILES = ['readings', 'images', 'writing', 'vocab', 'site'];
let collectionPromise = null;
function loadCollection() {
  if (!collectionPromise) {
    collectionPromise = Promise.all(COLLECTION_FILES.map(name =>
      fetch(`data/${name}.json`).then(response => {
        if (!response.ok) throw new Error(`Unable to load data/${name}.json (${response.status}).`);
        return response.json();
      })
    )).then(([readings, images, writing, vocab, site]) => ({
      readings: readings.filter(r => !r.draft),
      images: images.filter(i => !i.draft),
      writing: writing.filter(w => !w.draft),
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
    seasons: (reading.tags && reading.tags.seasons) || [],
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
    seasons: (image.tags && image.tags.seasons) || [],
    cardPosition: display.cardPosition,
    unset: !!display.weatherUnset
  };
}

// Where a reading or image appears on the site is its "shownIn": the
// Hours, the Weather or the Seasons, one only. Its tags only describe it
// (its hours, seasons, weather, species), so tagging a piece never moves it.
function shownIn(record, place) {
  return record.shownIn === place;
}

// The hours page's blocks, in vocabulary order: each watch with its
// versicle and phenomena, and every reading and image shown in the Hours
// and tagged for that watch.
function hoursView(collection) {
  return collection.vocab.hours.map(hour => {
    const writing = kind => collection.writing
      .filter(w => w.kind === kind && shownIn(w, 'hours') && taggedWith(w, 'hours', hour.id));
    const versicle = writing('versicle')[0];
    return {
      key: hour.id,
      name: hour.label,
      cssClass: `block-${hour.id}`,
      startHour: hour.startHour,
      subtitle: hour.subtitle,
      versicle: versicle ? versicle.text : '',
      phenomena: writing('phenomenon').sort((a, b) => (a.place || 0) - (b.place || 0)).map(w => w.text),
      quotes: collection.readings.filter(r => shownIn(r, 'hours') && taggedWith(r, 'hours', hour.id)).map(quoteView),
      images: collection.images.filter(i => shownIn(i, 'hours') && taggedWith(i, 'hours', hour.id)).map(imageView)
    };
  });
}

// The weather page's window: every image and reading shown in the
// Weather, including the "unset" ones shown before any condition is chosen.
function weatherView(collection) {
  const onWeatherPage = record => shownIn(record, 'weather');
  return {
    images: collection.images.filter(onWeatherPage).map(imageView),
    readings: collection.readings.filter(onWeatherPage).map(quoteView)
  };
}
