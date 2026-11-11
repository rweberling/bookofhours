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
  { key: 'void', label: 'Void', start: 0, color: '#252b38' },
  { key: 'hush', label: 'Hush', start: 3, color: '#3a4664' },
  { key: 'chorus', label: 'Chorus', start: 6, color: '#c89030' },
  { key: 'transit', label: 'Transit', start: 9, color: '#f0c050' },
  { key: 'fulcrum', label: 'Fulcrum', start: 12, color: '#d4b870' },
  { key: 'doldrums', label: 'Doldrums', start: 15, color: '#c08040' },
  { key: 'convivium', label: 'Convivium', start: 18, color: '#a84828' },
  { key: 'denouement', label: 'Denouement', start: 21, color: '#2f3c66' }
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

// "Wednesday, September 30, 2026"
function formatDate(d) {
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// "9 pm to midnight": a watch's hours (its startHour in data/vocab.json),
// on the 12-hour clock.
function watchHoursWords(watch) {
  const word = h => h % 24 === 0 ? 'midnight' : h === 12 ? 'noon' : `${h % 12} ${h > 12 ? 'pm' : 'am'}`;
  return `${word(watch.startHour)} to ${word(watch.startHour + 3)}`;
}

// "Wed, Sep 30, 2026", for narrow screens.
function formatDateShort(d) {
  return `${DAY_NAMES[d.getDay()].slice(0, 3)}, ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
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

// --- The lightbox ---------------------------------------------------------
// An image shown whole, large, on a dark ground with its caption: the
// Hours page's framed image (cropped to 4:3 there) and the Lectio Terra
// posts' figures. The page holds the #lightbox markup; a click anywhere
// or Escape closes it.
function openLightbox(src, alt, captionHTML) {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  const img = document.getElementById('lightbox-img');
  setWebImage(img, src, '100vw');
  img.alt = alt || 'Expanded image';
  document.getElementById('lightbox-caption').innerHTML = captionHTML || '';
  if (!lightbox.dataset.wired) {
    lightbox.dataset.wired = 'yes';
    lightbox.tabIndex = -1;
    lightbox.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
    });
  }
  lightbox.style.display = 'flex';
  lightbox.focus();
  requestAnimationFrame(() => lightbox.classList.add('open'));
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.remove('open');
  setTimeout(() => { lightbox.style.display = 'none'; }, 300);
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

/* ── Rules drawn by hand ─────────────────────────────────────────
   The site's rules are ruled as if with a quill: a hairline that swells
   and thins, a curl at each end, as a scribe filled out a line, and the
   ◆ in the middle. Every page's .rule-ornament (under the masthead, at
   the foot) is drawn over in this hand as the page loads, keeping the
   element itself (nav.js's press-and-hold switch lives on the footer's);
   without JavaScript the plain ornament stays. The Hours page's band
   (hours.js) and its svg.drawn-rule divider use the same strokes. The
   wobble comes from fixed seeds, so the hand is the same on every visit.
────────────────────────────────────────────────────────────────── */
function seededRandom(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

// A closed outline through points, smoothed (each corner a quadratic
// curve through the midpoints).
function smoothOutline(pts) {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1], [cx, cy] = pts[i];
    d += ` Q ${px} ${py} ${(px + cx) / 2} ${(py + cy) / 2}`;
  }
  return d + ' Z';
}

// A pen stroke from x0 to x1 along y: a filled shape whose width swells
// to `weight` in the middle and thins to nothing at the ends, wavering a
// little.
function penStrokePath(x0, x1, y, weight, rand) {
  const n = Math.max(6, Math.round((x1 - x0) / 14));
  const top = [], bottom = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, x = x0 + f * (x1 - x0);
    const w = weight * Math.pow(Math.sin(Math.PI * f), 0.6) * (0.85 + 0.3 * rand());
    const dy = (rand() - 0.5) * 0.7;
    top.push([x, y + dy - w / 2]);
    bottom.unshift([x, y + dy + w / 2]);
  }
  return smoothOutline(top.concat(bottom));
}

function bandShape(svg, tag, attrs) {
  const el = document.createElementNS(svgNS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  svg.appendChild(el);
  return el;
}

// A rule from x0 to x1 along y with a curl at each end, drawn as one
// stroke of the pen: from the tip of the left curl, round it and along
// the line, and round the right curl to its tip. The line swells to
// `weight` in the middle and wavers a little; toward each end it holds
// steady at RULE_END_WEIGHT, the width the curl leaves it at; the curl
// swells a little as it turns and ends blunt and rounded, as a quill
// lifted off the page leaves its stroke rather than a hairline. As one
// outline the line and its curls meet without a seam at any zoom.
const RULE_END_WEIGHT = 0.6;
const RULE_CURL_SIZE = 0.85;   // the curl's size, against the first drawing
const RULE_CURL_TURN = 0.7;    // how far round its inward hook it goes (0–1)

// A curl's centre line from where it leaves the rule (x, y) to its tip,
// with the stroke's width at each point. side is -1 for the left end
// (curling up and back), 1 for the right (down and back).
function curlCentre(x, y, side) {
  const s = side * RULE_CURL_SIZE, X = dx => x + s * dx, Y = dy => y + s * dy;
  const curves = [
    [[X(0), Y(0)], [X(10), Y(-0.5)], [X(16), Y(4)], [X(12), Y(7.5)]],
    [[X(12), Y(7.5)], [X(9), Y(10)], [X(4.5), Y(7.5)], [X(7), Y(5)]]
  ];
  const at = ([a, b, c, d], t) => {
    const u = 1 - t;
    return [0, 1].map(k => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]);
  };
  const pts = [];
  curves.forEach((cv, ci) => {
    const end = ci ? RULE_CURL_TURN : 1;
    for (let i = ci ? 1 : 0; i <= 24; i++) pts.push(at(cv, end * i / 24));
  });
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = len[len.length - 1];
  // From the rule's width, swelling a little through the bowl of the
  // curl (the pen's downstroke), easing to about 70% of it at the tip.
  const widths = len.map(l => {
    const f = l / total;
    return RULE_END_WEIGHT * (1 - 0.3 * Math.pow(f, 1.4)) + 0.3 * Math.sin(Math.PI * Math.min(1, f * 1.25));
  });
  return { pts, widths };
}

function rulePath(x0, x1, y, weight, rand) {
  const pts = [], widths = [];
  // The left curl, from its tip in to the rule.
  const left = curlCentre(x0, y, -1);
  for (let i = left.pts.length - 1; i > 0; i--) { pts.push(left.pts[i]); widths.push(left.widths[i]); }
  // The line.
  const n = Math.max(6, Math.round((x1 - x0) / 14));
  for (let i = 0; i <= n; i++) {
    const f = i / n, swell = Math.pow(Math.sin(Math.PI * f), 0.6);
    widths.push(RULE_END_WEIGHT + (weight - RULE_END_WEIGHT) * swell * (0.85 + 0.3 * rand()));
    pts.push([x0 + f * (x1 - x0), y + (rand() - 0.5) * 0.7 * Math.sin(Math.PI * f)]);
  }
  // The right curl, from the rule out to its tip.
  const right = curlCentre(x1, y, 1);
  for (let i = 1; i < right.pts.length; i++) { pts.push(right.pts[i]); widths.push(right.widths[i]); }
  // The outline: half the width either side of the centre line, and a
  // rounded end at each tip.
  const top = [], bottom = [];
  const frame = i => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
    return { tx: tx / tl, ty: ty / tl, nx: -ty / tl, ny: tx / tl, h: widths[i] / 2 };
  };
  pts.forEach((p, i) => {
    const { nx, ny, h } = frame(i);
    top.push([p[0] + nx * h, p[1] + ny * h]);
    bottom.unshift([p[0] - nx * h, p[1] - ny * h]);
  });
  // Half a circle round a tip, from one side of the stroke to the other,
  // bulging forward (dir 1, the end) or back (dir -1, the start).
  const cap = (i, dir) => {
    const p = pts[i], { tx, ty, nx, ny, h } = frame(i), arc = [];
    for (let k = 1; k < 8; k++) {
      const th = Math.PI * k / 8, c = Math.cos(th) * dir, sn = Math.sin(th) * dir;
      arc.push([p[0] + h * (c * nx + sn * tx), p[1] + h * (c * ny + sn * ty)]);
    }
    return arc;
  };
  return smoothOutline(top.concat(cap(pts.length - 1, 1), bottom, cap(0, -1)));
}

// One rule, W wide, into svg: the hairline, its curls, and the ◆ if noon.
function drawRule(svg, W, noon, seed) {
  const y = 12, x0 = 22, x1 = W - 22;
  bandShape(svg, 'path', { class: 'band-ink', d: rulePath(x0, x1, y, 1.1, seededRandom(seed)) });
  if (noon) {
    const nx = W / 2;
    bandShape(svg, 'path', { class: 'band-noon',
      d: `M ${nx} ${y - 4.2} L ${nx + 2.9} ${y} L ${nx} ${y + 4.2} L ${nx - 2.9} ${y} Z` });
  }
}

function drawRules() {
  document.querySelectorAll('.rule-ornament').forEach((ornament, i) => {
    // The masthead's ornament (✦ ◆ ✦) runs wider than the footer's (◆).
    const W = ornament.querySelector('.lozenge') ? 420 : 260;
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} 24`);
    svg.setAttribute('aria-hidden', 'true');
    ornament.replaceChildren(svg);
    ornament.classList.add('is-drawn');
    drawRule(svg, W, true, 211 + i * 37);
  });
  document.querySelectorAll('svg.drawn-rule').forEach((svg, i) => {
    drawRule(svg, Number(svg.viewBox.baseVal.width), false, 503 + i * 41);
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', drawRules);
else drawRules();

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

// The season leans the picks the same gentle way, on the Hours and the
// Weather alike: a piece tagged with the season it is now is three times
// as likely; any other piece, untagged or tagged for other seasons, keeps
// the ordinary weight. Season tags only ever add weight, never take it
// away, so a piece is never pushed out of sight for most of the year
// (with only a few pieces to an hour or a condition, a penalty out of
// season would all but hide it). On the Weather page the weather has
// already chosen which pieces can appear (weather.js); the season only
// re-ranks those.
const SEASON_MATCH_FACTOR = 3;
function seasonFactor(item, season) {
  return Array.isArray(item.seasons) && item.seasons.includes(season) ? SEASON_MATCH_FACTOR : 1;
}

// The one lean both pages use: the weather outside (more matching
// conditions, much likelier) times the season.
function atmosphereWeight(item, weather, season) {
  return weatherMatchWeight(item, weather) * seasonFactor(item, season);
}

// A pick leaning on the weather and the season: the Hours page's first
// page of a visit (hours.js), and every Weather page view (weather.js).
function pickAtmosphereAware(items, excludeFn) {
  const weather = (window.siteAtmosphere && window.siteAtmosphere.weather) || [];
  const season = currentSeason();
  return pickWeightedExcluding(items, item => atmosphereWeight(item, weather, season), excludeFn);
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

// A tag is either a plain ID ("sp-0001", "spring") or an object that
// carries one ({ "id": "sp-0001", "basis": "thematic", "note": "..." });
// this reads the ID from either.
const tagId = t => (typeof t === 'string' ? t : (t.id || t.term));

function taggedWith(record, scheme, id) {
  return !!(record.tags && Array.isArray(record.tags[scheme]) && record.tags[scheme].some(t => tagId(t) === id));
}

// A reading as the page shows it. Verse ("display": {"verse": true}) is
// set one block to a line, so a line too long for the page carries on
// under a hanging indent, as in a printed book, rather than wrapping flush
// and passing for a new line. Its text is in the house verse form
// (scripts/verse.py): lines joined by <br>, a blank line between stanzas,
// and the poem's own indents as leading &nbsp;s, which become the line's
// --indent so a run-on always sits deeper than any of them. Prose is
// shown as written.
function readingHTML(reading) {
  if (!(reading.display && reading.display.verse)) return reading.text;
  return reading.text.split(/<br\s*\/?>/i).map(line => {
    const lead = line.match(/^(?:&nbsp;)*/)[0];
    if (!line.slice(lead.length).trim()) return '<span class="verse-gap"></span>';
    return `<span class="verse-line" style="--indent: ${lead.length / 6}">${line.slice(lead.length)}</span>`;
  }).join('');
}

// The shapes the page code reads: a quote is { text, attr, weather } and
// an image { src, caption, weather, cardPosition, unset }. attr is the
// hand-written display citation.
// A reading's first author, from its edition's contributors ('' if none
// is recorded).
function readingAuthor(reading) {
  const ed = reading.citation && reading.citation.edition;
  const a = ed && (ed.contributors || []).find(c => c.role === 'author');
  return (a && a.name) || '';
}

// The record behind a piece: a small ¶ after its credit, as on the
// Sources page, leading to its page at /id/<id>/. Kept out of the keep
// card, the lightbox and print (keep.js, styles.css).
function recordMark(id) {
  return id
    ? `<a class="record-mark" href="/id/${escapeHTML(id)}/" title="The record: ${escapeHTML(id)}" aria-label="The record, ${escapeHTML(id)}">¶</a>`
    : '';
}

// Following a ¶ from the Hours or the Weather: first write the reading
// and image on show into the page's own address (the link "keep this
// page" gives), so coming Back reopens that same pair, even when the
// browser reloads the page rather than restoring it.
document.addEventListener('click', e => {
  const mark = e.target.closest && e.target.closest('a.record-mark');
  if (!mark || typeof keepPageData !== 'function') return;
  try {
    const kept = keepPageData();
    if (kept && (kept.kind === 'hours' || kept.kind === 'weather') && kept.path) {
      history.replaceState(history.state, '', kept.path);
    }
  } catch (error) {}
});

function quoteView(reading) {
  return {
    id: reading.id,
    text: readingHTML(reading),
    attr: reading.citation ? reading.citation.display : '',
    author: readingAuthor(reading),
    weather: ((reading.tags && reading.tags.weather) || []).map(tagId),
    seasons: ((reading.tags && reading.tags.seasons) || []).map(tagId),
    unset: !!(reading.display && reading.display.weatherUnset)
  };
}

// A further-reading entry described in words: who published it, the
// piece's title and why it's worth reading, as "Royal Institution, “John
// Tyndall's blue sky apparatus”" (data/README.md keeps the three apart).
function furtherReadingText(item) {
  const title = item.title ? `, “${item.title}”` : '';
  const note = item.note ? ` (${item.note})` : '';
  return `${item.source}${title}${note}`;
}

function imageView(image) {
  const display = image.display || {};
  return {
    id: image.id,
    src: image.file,
    caption: image.caption || '',
    creator: (image.creator && !Array.isArray(image.creator) && image.creator.name) || '',
    alt: image.alt || '',
    weather: ((image.tags && image.tags.weather) || []).map(tagId),
    seasons: ((image.tags && image.tags.seasons) || []).map(tagId),
    cardPosition: display.cardPosition,
    further: image.furtherReading || [],
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

// ── The solstice rubric ─────────────────────────────────────────────
// One red line under the page's date (Hours), readers (Seasons) or
// readout (Weather) pointing to the winter-solstice postcards, and again,
// a size smaller and without its ×, under the dial's key in Wander the
// Seasons. Shown until the solstice ends (SOLSTICE_RUBRIC.until, local
// time). The × hides both for that reader for the season (browser storage
// only). For another season, change the text, link, until and key.
const SOLSTICE_RUBRIC = {
  key: 'eh-rubric-w26',
  until: new Date(2026, 11, 22),   // the start of 22 December, local time
  href: 'https://otherwise.metalabel.com/wintersolstice26?variantId=1',
  label: 'for the longest night:',
  text: 'five winter\u2011solstice postcards.',
  link: 'Order the set\u00a0\u2192'
};
function solsticeRubricLine(withDismiss) {
  const r = SOLSTICE_RUBRIC;
  const p = document.createElement('p');
  p.className = 'solstice-rubric' + (withDismiss ? '' : ' in-pane');
  const label = document.createElement('span');
  label.className = 'rubric-label';
  label.innerHTML = '<span class="rubric-pilcrow" aria-hidden="true">¶</span> ';
  label.append(r.label);
  const a = document.createElement('a');
  a.href = r.href; a.target = '_blank'; a.rel = 'noopener';
  a.textContent = r.link;
  p.append(label, ' ' + r.text + ' ', a);
  if (withDismiss) {
    const x = document.createElement('button');
    x.type = 'button'; x.className = 'rubric-dismiss';
    x.setAttribute('aria-label', 'Hide this notice');
    x.textContent = '×';
    x.addEventListener('click', () => {
      document.querySelectorAll('.solstice-rubric').forEach(el => el.remove());
      try { localStorage.setItem(r.key, '1'); } catch (e) { /* hidden for this visit only */ }
    });
    p.append(x);
  }
  return p;
}
function showSolsticeRubric() {
  const r = SOLSTICE_RUBRIC;
  if (new Date() >= r.until) return;
  try { if (localStorage.getItem(r.key)) return; } catch (e) { /* storage blocked: show it */ }
  if (document.querySelector('.solstice-rubric')) return;
  const page = document.querySelector('.hours-page .date-line, .season-reading .season-post-dek, .weather-readout');
  if (page) page.after(solsticeRubricLine(true));
  const pane = document.querySelector('#season-pane .dial-legend');
  if (pane) pane.after(solsticeRubricLine(false));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showSolsticeRubric);
else showSolsticeRubric();

// ── Letters from Otherwise: the sign-up form ─────────────────────────
// A short form above the footer of the Hours, the Seasons, each Lectio
// Terra post and each postcard page. Addresses go to the earthlyhours-auth
// Worker (worker/src/index.js, /subscribe), which keeps them privately
// until they're imported into the DFOS space's subscribers. A Cloudflare
// Turnstile check keeps bots out; its script loads only once someone
// starts typing an address, so the pages load nothing extra for it.
const SUBSCRIBE = {
  url: /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? 'http://localhost:8787/subscribe'
    : 'https://earthlyhours-auth.earthlyhours-com.workers.dev/subscribe',
  // The Turnstile widget's public key; Cloudflare's always-passing test
  // key when the pages are served locally.
  siteKey: /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? '1x00000000000000000000AA'
    : '0x4AAAAAAF2e6SL85amyATjD',
  label: 'Letters from Otherwise',
  text: 'New weekly readings and occasional print offerings, sent via email.',
  note: 'Your address is kept privately and used only for these letters. Each has a link to unsubscribe.',
  thanks: 'Thank you. The next letter will find you.'
};
let turnstileLoading = null;
function loadTurnstile() {
  if (!turnstileLoading) {
    turnstileLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = reject;
      document.head.append(s);
    });
  }
  return turnstileLoading;
}
function subscribeForm() {
  const n = document.querySelectorAll('.subscribe').length;
  const form = document.createElement('form');
  form.className = 'subscribe';
  form.noValidate = true;
  form.innerHTML = `
    <p class="subscribe-label"><span class="subscribe-pilcrow" aria-hidden="true">¶</span> <span></span></p>
    <p class="subscribe-text"></p>
    <div class="subscribe-row">
      <label class="visually-hidden" for="subscribe-email-${n}">Email address</label>
      <input class="subscribe-email" id="subscribe-email-${n}" type="email" name="email" autocomplete="email" inputmode="email" placeholder="your email" required>
      <button class="subscribe-button" type="submit">Subscribe</button>
    </div>
    <input class="subscribe-trap" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="subscribe-check"></div>
    <p class="subscribe-note" aria-live="polite"></p>`;
  form.querySelector('.subscribe-label span:last-child').textContent = SUBSCRIBE.label;
  form.querySelector('.subscribe-text').textContent = SUBSCRIBE.text;
  const note = form.querySelector('.subscribe-note');
  note.textContent = SUBSCRIBE.note;
  const email = form.querySelector('.subscribe-email');
  const button = form.querySelector('.subscribe-button');

  // Turnstile, rendered (invisibly, unless it has a question to ask) on
  // the first keystroke; its token is waited for at submit.
  let widget = null, token = null, waiting = [];
  const check = () => {
    if (widget !== null) return;
    widget = 'loading';
    loadTurnstile().then(ts => {
      widget = ts.render(form.querySelector('.subscribe-check'), {
        sitekey: SUBSCRIBE.siteKey,
        appearance: 'interaction-only',
        action: 'subscribe',
        callback: t => { token = t; waiting.splice(0).forEach(f => f(t)); },
        'expired-callback': () => { token = null; },
        'error-callback': () => { token = null; }
      });
    }).catch(() => { widget = null; });
  };
  email.addEventListener('focus', check, { once: true });
  email.addEventListener('input', check, { once: true });
  const tokenReady = () => token ? Promise.resolve(token)
    : new Promise((resolve, reject) => { waiting.push(resolve); setTimeout(() => reject(new Error('timeout')), 20000); });

  const say = (text, isError) => { note.textContent = text; note.classList.toggle('is-error', !!isError); };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const address = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) { say('That address doesn’t look complete.', true); email.focus(); return; }
    button.disabled = true;
    say('Sending…');
    check();
    try {
      const turnstile = await tokenReady();
      const response = await fetch(SUBSCRIBE.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: address, turnstile, source: location.pathname, website: form.website.value })
      });
      const answer = await response.json().catch(() => ({}));
      if (!response.ok || !answer.ok) throw new Error(answer.error || 'failed');
      form.classList.add('is-done');
      lettersRemember({ subscribed: new Date().toISOString().slice(0, 10) });
      form.replaceChildren(Object.assign(document.createElement('p'), { className: 'subscribe-thanks', textContent: SUBSCRIBE.thanks }));
    } catch (error) {
      button.disabled = false;
      token = null;
      if (window.turnstile && typeof widget === 'string' && widget !== 'loading') window.turnstile.reset(widget);
      say(error.message === 'invalid email' ? 'That address doesn’t look complete.' : 'Something went wrong. Please try again in a moment.', true);
    }
  });
  return form;
}
// Whether the card on the page is shown, kept in this browser only
// (localStorage 'eh-letters'): once someone has signed up here it stays
// away; its × puts it away for LETTERS_REST_DAYS. Signed-in Wanderers
// never see it: as members of the DFOS space they already get the
// letters. The Correspondence pane in the menu is always there.
const LETTERS_KEY = 'eh-letters';
const LETTERS_REST_DAYS = 30;
function lettersState() {
  try { return JSON.parse(localStorage.getItem(LETTERS_KEY)) || {}; } catch (e) { return {}; }
}
function lettersRemember(change) {
  try { localStorage.setItem(LETTERS_KEY, JSON.stringify({ ...lettersState(), ...change })); } catch (e) { /* this visit only */ }
}
function lettersCardWanted() {
  const state = lettersState();
  if (state.subscribed) return false;
  if (state.restUntil && Date.now() < state.restUntil) return false;
  try {
    const session = JSON.parse(localStorage.getItem('earthly-hours-dfos-session'));   // dfos-siwd.js
    if (session && session.keyHolder) return false;
  } catch (e) { /* not signed in */ }
  return true;
}
function pageCard() {
  const form = subscribeForm();
  const x = document.createElement('button');
  x.type = 'button'; x.className = 'subscribe-dismiss';
  x.setAttribute('aria-label', `Hide this for ${LETTERS_REST_DAYS} days`);
  x.title = `Hide for ${LETTERS_REST_DAYS} days`;
  x.textContent = '×';
  x.addEventListener('click', () => {
    lettersRemember({ restUntil: Date.now() + LETTERS_REST_DAYS * 86400000 });
    const note = document.createElement('p');
    note.className = 'subscribe-put-away';
    note.innerHTML = 'Put away for now. Letters are always under <a href="#letters">The Scriptorium</a> in the menu.';
    form.replaceWith(note);
  });
  form.prepend(x);
  return form;
}
function showSubscribe() {
  if (!document.querySelector('main .subscribe') && lettersCardWanted()) {
    // Postcard pages: straight after the links to the original, where
    // someone who came by the QR code is still reading.
    const postcard = document.querySelector('.postcard-links');
    const footer = document.querySelector('main.hours-page > .page-footer, main.season-reading > .page-footer');
    if (postcard) postcard.after(pageCard());
    else if (footer) footer.before(pageCard());
  }
  // "Letters from Otherwise" in the menu (partials/nav.html), and any
  // link to #letters, open the form in a pane of its own: on every page,
  // the Weather page included. earthlyhours.com/#letters opens it too.
  document.addEventListener('click', e => {
    const link = e.target.closest && e.target.closest('a[href="#letters"]');
    if (!link) return;
    e.preventDefault();
    e.stopPropagation();
    openLettersPane();
  }, true);   // before the menu's own handlers, which may stop the click
  if (location.hash === '#letters') {
    history.replaceState(null, '', location.pathname + location.search);
    openLettersPane();
  }
}
// What's for sale, shown under the form in the Correspondence pane: the
// postcard sets, newest first. The cards' own pages (c/) stay reached
// only by their QR codes, so the pictures here link to the shop.
const OFFERINGS = [
  {
    label: 'Postcards for the longest night',
    title: 'Winter Solstice',
    text: 'Five postcards: Orion, the aurora, the snowy owl, paper birch and witch hazel, sold as a set.',
    href: 'https://otherwise.metalabel.com/wintersolstice26?variantId=1',
    link: 'Order the set\u00a0\u2192',
    cards: [
      ['/c/w26/1/1-thumb.webp', 'Orion, from Johannes Hevelius’s star atlas (1690)'],
      ['/c/w26/2/2-thumb.webp', 'The aurora borealis, drawn by É. L. Trouvelot (1872)'],
      ['/c/w26/3/3-thumb.webp', 'A snowy owl, from Audubon’s Birds of America'],
      ['/c/w26/4/4-thumb.webp', 'Paper birch in winter, from New England Trees in Winter (1911)'],
      ['/c/w26/5/5-thumb.webp', 'Vernal witch hazel, from Curtis’s Botanical Magazine (1914)']
    ]
  }
];
function offeringCard(o) {
  const section = document.createElement('section');
  section.className = 'offering';
  const shop = document.createElement('a');
  shop.className = 'offering-cards';
  shop.href = o.href; shop.target = '_blank'; shop.rel = 'noopener';
  shop.setAttribute('aria-label', `${o.title}: ${o.link.replace(/\s*\u2192/, '')}`);
  o.cards.forEach(([src, alt]) => {
    const img = document.createElement('img');
    img.src = src; img.alt = alt; img.loading = 'lazy'; img.width = 480; img.height = 320;
    shop.append(img);
  });
  const label = Object.assign(document.createElement('p'), { className: 'offering-label' });
  label.innerHTML = '<span aria-hidden="true">¶</span> ';
  label.append(o.label);
  const title = Object.assign(document.createElement('h2'), { className: 'offering-title', textContent: o.title });
  const text = Object.assign(document.createElement('p'), { className: 'offering-text', textContent: o.text });
  const link = Object.assign(document.createElement('a'), { className: 'offering-link', href: o.href, target: '_blank', rel: 'noopener', textContent: o.link });
  section.append(label, title, shop, text, link);
  return section;
}
function openLettersPane() {
  let pane = document.getElementById('letters-pane');
  if (!pane) {
    pane = document.createElement('div');
    pane.className = 'wander-pane letters-pane';
    pane.id = 'letters-pane';
    pane.setAttribute('role', 'dialog');
    pane.setAttribute('aria-modal', 'true');
    pane.setAttribute('aria-label', SUBSCRIBE.label);
    pane.setAttribute('aria-label', 'Correspondence');
    pane.innerHTML = '<button class="wander-close" type="button" aria-label="Close">✦ &nbsp;Close</button>'
      + '<p class="wander-heading">Correspondence</p>'
      + '<p class="wander-subheading">Letters, postcards, etc.</p>';
    const form = subscribeForm();
    form.classList.add('in-pane');
    pane.append(form);
    OFFERINGS.forEach(o => pane.append(offeringCard(o)));
    document.body.append(pane);
    const close = () => {
      if (typeof closeOverlayPane === 'function') closeOverlayPane(pane);
      else { pane.classList.remove('open'); pane.style.display = 'none'; }
    };
    pane.querySelector('.wander-close').addEventListener('click', close);
    pane.addEventListener('click', e => { if (e.target === pane) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && pane.classList.contains('open')) close(); });
  }
  if (typeof openOverlayPane === 'function') openOverlayPane(pane);
  else { pane.style.display = 'flex'; requestAnimationFrame(() => pane.classList.add('open')); }
  setTimeout(() => { const f = pane.querySelector('.subscribe-email'); if (f) f.focus(); }, 350);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showSubscribe);
else showSubscribe();
