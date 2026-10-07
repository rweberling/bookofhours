const HOUR_NAMES = {
  spring: [
    "Midnight","The Middle Watch","Dead of Night",
    "Somnium","Soundings","Twilight",
    "Dawn","Insolation","Lift",
    "Prime","Tilt","Forenoon",
    "Noon","Zenith","Declension",
    "Lull","Deep Afternoon","The Golden Hour",
    "Sunset","Dusk","Eventide",
    "Tenebrae","Nocturne","Eleventh"
  ],
  summer: [
    "Midnight","The Middle Watch","Dead of Night",
    "Somnium","Twilight","Dawn",
    "Insolation","Lift","Prime",
    "Tilt","Late Morning","Forenoon",
    "Noon","Zenith","Zenith",
    "Declension","Lull","Deep Afternoon",
    "Early Evening","The Golden Hour","Sunset",
    "Dusk","Eventide","Eleventh"
  ],
  autumn: [
    "Midnight","The Middle Watch","Dead of Night",
    "Somnium","Soundings","Twilight",
    "Dawn","Insolation","Lift",
    "Prime","Tilt","Forenoon",
    "Noon","Zenith","Declension",
    "Lull","Deep Afternoon","The Golden Hour",
    "Sunset","Dusk","Eventide",
    "Tenebrae","Nocturne","Eleventh"
  ],
  winter: [
    "Midnight","The Middle Watch","Dead of Night",
    "Somnium","Somnium","Soundings",
    "Soundings", "Dawn","Lift",
    "Prime","Tilt","Forenoon",
    "Noon","Zenith","Declension",
    "The Golden Hour","Sunset","Dusk",
    "Eventide","Eventide","Flicker",
    "Tenebrae","Nocturne","Eleventh"
  ]
};

// Month names are MONTH_NAMES, in shared.js.

const SEASON_EMBLEMS = {
  spring: `<path d="M8 20 Q10 13 16 5" stroke="currentColor" stroke-width="0.75" opacity="0.5" fill="none"/>
           <path d="M10 16 Q8.3 15 7 14" stroke="currentColor" stroke-width="0.55" opacity="0.45" fill="none"/>
           <path d="M11.7 11.5 Q15 10.8 17 10" stroke="currentColor" stroke-width="0.55" opacity="0.45" fill="none"/>
           <path d="M14 8 Q12.5 7 11.5 6" stroke="currentColor" stroke-width="0.55" opacity="0.45" fill="none"/>
           <g transform="translate(7 14) rotate(-55) scale(1.65)">
             <path d="M0 0 C0.9 -0.6 0.9 -1.8 0 -2.6 C-0.9 -1.8 -0.9 -0.6 0 0 Z" fill="currentColor" opacity="0.45"/>
           </g>
           <g transform="translate(17 10) rotate(75) scale(1.7)">
             <path d="M0 0 C0.9 -0.6 0.9 -1.8 0 -2.6 C-0.9 -1.8 -0.9 -0.6 0 0 Z" fill="currentColor" opacity="0.45"/>
           </g>
           <g transform="translate(11.5 6) rotate(-50) scale(1.4)">
             <path d="M0 0 C0.9 -0.6 0.9 -1.8 0 -2.6 C-0.9 -1.8 -0.9 -0.6 0 0 Z" fill="currentColor" opacity="0.45"/>
           </g>`,
  summer: `<circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="0.7" opacity="0.5"/>
           <path d="M12 3.5 L12 6 M12 18 L12 20.5 M3.5 12 L6 12 M18 12 L20.5 12
                    M5.9 5.9 L7.6 7.6 M16.4 16.4 L18.1 18.1 M5.9 18.1 L7.6 16.4 M16.4 7.6 L18.1 5.9"
                 stroke="currentColor" stroke-width="0.6" opacity="0.4"/>`,
  autumn: `<path d="M8 20 Q10 13 16 5" stroke="currentColor" stroke-width="0.75" opacity="0.5" fill="none"/>
           <path d="M10 16 Q8.3 15 7 14" stroke="currentColor" stroke-width="0.55" opacity="0.35" fill="none"/>
           <path d="M11.7 11.5 Q15 10.8 17 10" stroke="currentColor" stroke-width="0.55" opacity="0.35" fill="none"/>
           <path d="M14 8 Q12.5 7 11.5 6" stroke="currentColor" stroke-width="0.55" opacity="0.35" fill="none"/>
           <g transform="translate(7 14) rotate(-55) scale(1.65)">
             <path d="M0 0 C0.9 -0.6 0.9 -1.8 0 -2.6 C-0.9 -1.8 -0.9 -0.6 0 0 Z" fill="currentColor" opacity="0.42"/>
           </g>`,
  winter: `<g transform="translate(12 12)">
             <g transform="rotate(0)">
               <path d="M0 0 L0 -8" stroke="currentColor" stroke-width="0.6" opacity="0.45"/>
               <path d="M0 -2.8 L-1.3 -3.8 M0 -2.8 L1.3 -3.8" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
               <path d="M0 -5.6 L-1.1 -6.4 M0 -5.6 L1.1 -6.4" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
             </g>
             <g transform="rotate(60)">
               <path d="M0 0 L0 -8" stroke="currentColor" stroke-width="0.6" opacity="0.45"/>
               <path d="M0 -2.8 L-1.3 -3.8 M0 -2.8 L1.3 -3.8" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
               <path d="M0 -5.6 L-1.1 -6.4 M0 -5.6 L1.1 -6.4" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
             </g>
             <g transform="rotate(120)">
               <path d="M0 0 L0 -8" stroke="currentColor" stroke-width="0.6" opacity="0.45"/>
               <path d="M0 -2.8 L-1.3 -3.8 M0 -2.8 L1.3 -3.8" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
               <path d="M0 -5.6 L-1.1 -6.4 M0 -5.6 L1.1 -6.4" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
             </g>
             <g transform="rotate(180)">
               <path d="M0 0 L0 -8" stroke="currentColor" stroke-width="0.6" opacity="0.45"/>
               <path d="M0 -2.8 L-1.3 -3.8 M0 -2.8 L1.3 -3.8" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
               <path d="M0 -5.6 L-1.1 -6.4 M0 -5.6 L1.1 -6.4" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
             </g>
             <g transform="rotate(240)">
               <path d="M0 0 L0 -8" stroke="currentColor" stroke-width="0.6" opacity="0.45"/>
               <path d="M0 -2.8 L-1.3 -3.8 M0 -2.8 L1.3 -3.8" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
               <path d="M0 -5.6 L-1.1 -6.4 M0 -5.6 L1.1 -6.4" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
             </g>
             <g transform="rotate(300)">
               <path d="M0 0 L0 -8" stroke="currentColor" stroke-width="0.6" opacity="0.45"/>
               <path d="M0 -2.8 L-1.3 -3.8 M0 -2.8 L1.3 -3.8" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
               <path d="M0 -5.6 L-1.1 -6.4 M0 -5.6 L1.1 -6.4" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
             </g>
           </g>`
};
  
// pick() / pickExcluding() now live in shared.js, loaded before
// this file — shared with seasons.js instead of duplicated here.

// pickWeatherAware() (weather-weighted picks) lives there too, shared
// with weather.js.

let lastQuoteText = null;
let lastImageSrc  = null;

function getSeason() {
  // The actual month-range logic lives in one place now: currentSeason()
  // in shared.js (loaded before this script). This wrapper exists
  // so every existing getSeason() call site in this file — and the
  // getSeason(now) call below, which, like the original, ignores its
  // argument — keeps working unchanged.
  return currentSeason();
}

// formatTime(), formatDate(), plainText() and escapeHTML() live in shared.js.

function phenomenaHTML(list) {
  if (!list || list.length === 0) return '';
  return list.map((p, i) =>
    p + (i < list.length - 1 ? '<span class="sep" aria-hidden="true">✦</span>' : '')
  ).join('');
}

function placeholderSVG(blockName) {
  return `<div class="image-placeholder">
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="0.75" opacity="0.4"/>
      <path d="M24 8 L24 40 M8 24 L40 24" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
      <circle cx="24" cy="24" r="3" fill="currentColor" opacity="0.35"/>
    </svg>
    <span>${blockName}</span>
  </div>`;
}

function getBlockOverride() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('block');
  return requested ? requested.toLowerCase() : null;
}

function blockForHour(blocks, h) {
  const override = getBlockOverride();
  if (override) {
    const match = blocks.find(b => b.cssClass === `block-${override}`);
    if (match) return match;
  }
  return blocks.find(b => h >= b.startHour && h < b.startHour + 3) || blocks[0];
}

let currentBlockName = null;
let lastRenderedHour = null;
let blocks = null;

// How long a hand-picked Wander-the-Hours block stays put before the
// 60s auto-render loop is allowed to snap it back to the real current
// hour. Long enough to actually read the block you picked without the
// clock yanking you back to "now" mid-read; short enough that an idle
// tab doesn't stay frozen on a stale hour indefinitely. Same shape as
// WEATHER_TTL_MS in atmosphere.js — a timed hold, not a manual toggle,
// so there's nothing for a pane-close/turn-the-page/etc. to forget to
// reset.
const WANDER_HOLD_MS = 10 * 60 * 1000;
let wanderHoldUntil = 0;
let wanderHour = null; // which hour selectWanderBlock() picked — "turn the page" reads this during the hold so it re-rolls that hour's content instead of jumping to real time

let lastRenderedSeason = null;

// Writes one block's content into the DOM — shared by render()'s regular
// tick and renderAtHour()'s hand-picked-hour view (Wander the Hours,
// "turn the page"), which used to carry two near-identical copies of the
// same ~11 getElementById writes. clockTime/colophonDate are optional:
// render()'s tick already wrote those once, unconditionally, before
// deciding whether anything else needs updating, so it doesn't pass them
// again here.
function applyBlockToDOM(blocksData, block, h, { clockTime, colophonDate, afterUpdate } = {}) {
  blocksData.forEach(b => {
    if (b.cssClass) document.body.classList.remove(b.cssClass);
  });
  if (block.cssClass) document.body.classList.add(block.cssClass);

  const q   = pickWeatherAware(block.quotes, item => item.text === lastQuoteText) || { text: '', attr: '' };
  const img = pickWeatherAware(block.images, item => item.src === lastImageSrc) || { src: null, caption: '' };
  lastQuoteText = q.text;
  lastImageSrc  = img.src;

  document.getElementById('block-subtitle').textContent = block.subtitle || '';
  document.getElementById('block-name').textContent     = block.name;
  document.getElementById('hour-name').textContent      = HOUR_NAMES[getSeason()][h] || '';
  if (clockTime)    document.getElementById('clock-time').textContent    = clockTime;
  if (colophonDate) document.getElementById('colophon-date').textContent = colophonDate;
  document.getElementById('quote-text').innerHTML       = q.text;
  document.getElementById('quote-attr').innerHTML       = q.attr ? `— ${q.attr}` : '';
  document.getElementById('phenomena-list').innerHTML   = phenomenaHTML(block.phenomena);
  document.getElementById('versicle').innerHTML         = block.versicle || '';
  document.getElementById('image-caption').innerHTML    = img.caption || '';

  const inner = document.getElementById('image-inner');
  if (img.src) {
    const el = document.createElement('img');
    el.alt = plainText(img.caption) || block.name;
    // The frame is at most 440px wide, less its padding, and narrower on phones.
    setWebImage(el, img.src, '(max-width: 480px) 85vw, 410px', [800, 1600]);
    inner.replaceChildren(el);
  } else {
    inner.innerHTML = placeholderSVG(block.name);
  }

  currentBlockName = block.name;
  if (typeof afterUpdate === 'function') afterUpdate();
}

function render(blocksData, force) {
  const now   = new Date();
  const h     = now.getHours();
  const block = blockForHour(blocksData, h);

  document.getElementById('clock-time').textContent    = formatTime(now);
  document.getElementById('colophon-date').textContent = formatDate(now);

  // The emblem is a multi-path inline SVG — cheap to skip re-parsing on
  // every 60s tick when the season (changes ~4x/year) hasn't actually
  // moved since the last render.
  const season = getSeason(now);
  if (force || season !== lastRenderedSeason) {
    document.getElementById('season-emblem').innerHTML = SEASON_EMBLEMS[season];
    lastRenderedSeason = season;
  }

  renderWeatherLine();

  if (Date.now() < wanderHoldUntil && !force) return;
  
  if (block.name === currentBlockName && !force && h === lastRenderedHour) return;

  lastRenderedHour = h;
  const veil = document.getElementById('veil');

  function doUpdate() {
    applyBlockToDOM(blocksData, block, h);
  }

  if (force) {
    doUpdate();
  } else {
    veil.classList.add('active');
    setTimeout(() => {
      doUpdate();
      veil.classList.remove('active');
    }, 1200);
  }
}

function showError(msg, details = '') {
  const errorHTML = `
    <p class="load-error">
      ${msg}
      ${details ? `<div class="error-detail">${details}</div>` : ''}
      <button class="retry-button" onclick="location.reload()">Try Again</button>
    </p>
  `;
  document.querySelector('.page').innerHTML = errorHTML;
}

// The watches, built from the collection in data/ (loadCollection() and
// hoursView() in shared.js).
async function fetchWithRetry(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const data = hoursView(await loadCollection());
      if (!data.length) throw new Error('No hours found in data/vocab.json');
      return data;
    } catch (err) {
      console.error(`Attempt ${attempt}/${retries} failed:`, err.message);
      
      if (attempt === retries) {
        throw err;
      }
      
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

async function init() {
  try {
    blocks = await fetchWithRetry(3);
    
    render(blocks, true);
    openWanderIfHashed();
    blocksRef = blocks;
    
    // Shares atmosphere.js's one 60s heartbeat instead of running a second,
    // independently-scheduled setInterval doing the same "what time/season
    // is it now" work a few milliseconds apart.
    window.addEventListener('atmospheretick', () => render(blocks, false));
    setTimeout(() => document.getElementById('reading-actions').classList.add('visible'), 5000);
  } catch (err) {
    showError(
      `Could not load the collection in <em>data/</em>.<br>
       ${err.message}<br><br>
       If you are working locally, run:<br>
       <code>python3 -m http.server 8000</code><br>
       then open <code>http://localhost:8000</code>`,
      `Error: ${err.message}`
    );
    
    console.error('Data fetch failed after retries:', err);
  }
}

init();

const lightbox        = document.getElementById('lightbox');
const lightboxImg     = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');

document.getElementById('image-inner').addEventListener('click', () => {
  const img     = document.querySelector('#image-inner img');
  const caption = document.getElementById('image-caption');
  if (!img) return;
  setWebImage(lightboxImg, img.dataset.master || img.src, '100vw');
  lightboxImg.alt           = img.alt || 'Expanded image';
  lightboxCaption.innerHTML = caption.innerHTML;
  lightbox.style.display    = 'flex';
  lightbox.focus();
  requestAnimationFrame(() => lightbox.classList.add('open'));
});

lightbox.addEventListener('click', closeLightbox);

function closeLightbox() {
  lightbox.classList.remove('open');
  setTimeout(() => { lightbox.style.display = 'none'; }, 300);
}

// CX/CY/R_ARC (dial center and arc radius) live in shared.js,
// shared with seasons.js's Wander the Seasons dial.
const R_TICK = 100;
const R_TICK_INNER = 96;
const R_LABEL = 110;

// Each watch's dial color is in HOURS, in shared.js.
  
function hourToAngleDeg(h) {
  return h * 15 - 90;
}

// polarToXY() / arcPath() / svgNS live in shared.js too.

function buildDial(blocksData) {
  const svg = document.getElementById('wander-dial');

  const bgRing = document.createElementNS(svgNS, 'circle');
  bgRing.setAttribute('cx', CX); bgRing.setAttribute('cy', CY);
  bgRing.setAttribute('r', R_ARC);
  bgRing.setAttribute('fill', 'none');
  bgRing.setAttribute('stroke', 'currentColor');
  bgRing.setAttribute('stroke-width', '14');
  bgRing.setAttribute('opacity', '0.06');
  svg.insertBefore(bgRing, svg.firstChild);

  for (let i = 0; i < 24; i++) {
    const ang = hourToAngleDeg(i);
    const isBlock = i % 3 === 0;
    const p1 = polarToXY(ang, isBlock ? R_TICK_INNER - 2 : R_TICK_INNER + 1);
    const p2 = polarToXY(ang, isBlock ? R_TICK + 2 : R_TICK);
    const tick = document.createElementNS(svgNS, 'line');
    tick.setAttribute('x1', p1.x); tick.setAttribute('y1', p1.y);
    tick.setAttribute('x2', p2.x); tick.setAttribute('y2', p2.y);
    tick.setAttribute('stroke', 'currentColor');
    tick.setAttribute('stroke-width', isBlock ? '1' : '0.5');
    tick.setAttribute('opacity', isBlock ? '0.3' : '0.14');
    svg.insertBefore(tick, document.getElementById('dial-hand'));
  }

  blocksData.forEach((block, i) => {
    const color = (HOURS.find(hour => hour.key === block.key) || {}).color || '#888888';

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', arcPath(hourToAngleDeg(block.startHour), hourToAngleDeg(block.startHour + 3), R_ARC));
    path.setAttribute('stroke', color);
    path.setAttribute('fill', 'none');
    path.setAttribute('class', 'dial-arc');
    path.setAttribute('data-block', block.name);
    svg.insertBefore(path, document.getElementById('dial-hand'));

    const midAngle = hourToAngleDeg(block.startHour + 1.5);
    const lp = polarToXY(midAngle, R_LABEL);
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', lp.x);
    text.setAttribute('y', lp.y);
    text.setAttribute('class', 'dial-label');
    text.setAttribute('data-block', block.name);
    // Read along the ring, turned upright on the lower half — as the
    // seasons dial and the sunrise/sunset labels do.
    const upright = midAngle > 0 && midAngle < 180;
    text.setAttribute('transform', `rotate(${upright ? midAngle - 90 : midAngle + 90}, ${lp.x}, ${lp.y})`);
    text.textContent = block.name.toUpperCase();
    svg.insertBefore(text, document.getElementById('dial-hand'));
  });

    const nowDot = document.createElementNS(svgNS, 'text');
    nowDot.setAttribute('id', 'dial-now-dot');
    nowDot.setAttribute('font-size', '9');
    nowDot.setAttribute('fill', 'currentColor');
    nowDot.setAttribute('opacity', '0.75');
    nowDot.setAttribute('text-anchor', 'middle');
    nowDot.setAttribute('dominant-baseline', 'middle');
    nowDot.textContent = '✦';
    svg.insertBefore(nowDot, document.getElementById('dial-hand'));
    updateDialNowDot();
    renderDialSky();
}

function updateDialNowDot() {
  const dot = document.getElementById('dial-now-dot');
  if (!dot) return;
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  const p = polarToXY(hourToAngleDeg(h), R_ARC);
  dot.setAttribute('x', p.x);
  dot.setAttribute('y', p.y);
}

/* ── The dial's sky: moon, daylight, caption ──────────────────────
   Three quiet layers on Wander the Hours, echoing the seasons dial's
   solstices and equinoxes:
     moon      — today's phase, drawn in the dial's empty center. Worked
                 out offline from a known new moon and the mean length of
                 the lunar month, so it needs no location. The real moon
                 wanders around that mean by up to most of a day, so a
                 phase can occasionally be named a day early or late —
                 fine for "full moon in 3 days", not for an almanac.
     daylight  — a full band inside the ring: gold from sunrise to
                 sunset, shadow through the night, and half an hour of
                 twilight at each end, with sunrise and sunset marked. Only once "look outside"
                 has run in this browser: atmosphere.js keeps its rounded
                 location and works out each day's times from it
                 (siteAtmosphere.sun).
     caption   — the time, the watch, how long until the next one, and
                 the moon and sun in words.
────────────────────────────────────────────────────────────────── */
const SYNODIC_MONTH = 29.530588853;                        // days
const REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);   // 6 Jan 2000, 18:14 UTC
const R_MOON = 13;
const R_NIGHT = 74, NIGHT_WIDTH = 7;   // just inside the watches' ring
const R_SUN_LABEL = 60;

function moonPhase(now = new Date()) {
  const days = (now.getTime() - REFERENCE_NEW_MOON) / 86400000;
  const age = ((days / SYNODIC_MONTH) % 1 + 1) % 1;       // 0 new → 0.5 full → 1 new
  const illumination = (1 - Math.cos(2 * Math.PI * age)) / 2;
  const day = 1 / SYNODIC_MONTH;                          // "on the day" window
  const name =
    age < day || age > 1 - day ? 'New moon'
    : age < 0.25 - day ? 'Waxing crescent'
    : age < 0.25 + day ? 'First quarter'
    : age < 0.5 - day ? 'Waxing gibbous'
    : age < 0.5 + day ? 'Full moon'
    : age < 0.75 - day ? 'Waning gibbous'
    : age < 0.75 + day ? 'Last quarter'
    : 'Waning crescent';
  return {
    age, illumination, name,
    daysToFull: ((0.5 - age + 1) % 1) * SYNODIC_MONTH,
    daysToNew: ((1 - age) % 1) * SYNODIC_MONTH
  };
}

// The lit part of the moon's disc: the bright limb (right side while
// waxing, left while waning) closed by the terminator, an ellipse whose
// width follows the phase — bulging toward the lit side as a crescent,
// away from it as a gibbous moon.
function moonLitPath(cx, cy, r, age) {
  const k = Math.cos(2 * Math.PI * age);   // 1 at new, −1 at full
  const rx = Math.abs(k) * r;
  const waxing = age < 0.5;
  const limbSweep = waxing ? 1 : 0;
  const terminatorSweep = waxing ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${limbSweep} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${terminatorSweep} ${cx} ${cy - r} Z`;
}

// Like arcPath(), but for spans over 180° too (a long winter night).
function longArcPath(startDeg, endDeg, r) {
  const p1 = polarToXY(startDeg, r), p2 = polarToXY(endDeg, r);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${endDeg - startDeg > 180 ? 1 : 0} 1 ${p2.x} ${p2.y}`;
}

function hoursOf(date) {
  return date.getHours() + date.getMinutes() / 60;
}

function renderDialSky() {
  const svg = document.getElementById('wander-dial');
  if (!svg) return;
  const old = document.getElementById('dial-sky');
  if (old) old.remove();
  const sky = document.createElementNS(svgNS, 'g');
  sky.setAttribute('id', 'dial-sky');

  const sun = window.siteAtmosphere && window.siteAtmosphere.sun;
  if (sun) {
    const set = hoursOf(sun.sunset), rise = hoursOf(sun.sunrise) + 24;
    const TWILIGHT = 0.5;
    const band = (from, to, cls) => {
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', longArcPath(hourToAngleDeg(from), hourToAngleDeg(to), R_NIGHT));
      path.setAttribute('class', cls);
      path.setAttribute('stroke-width', NIGHT_WIDTH);
      sky.appendChild(path);
    };
    // A full inner circle, as on old astronomical clocks: day in gold,
    // night in shadow, and half an hour of twilight at each end between.
    band(rise - 24, set, 'dial-day');
    band(set, set + TWILIGHT, 'dial-twilight');
    band(set + TWILIGHT, rise - TWILIGHT, 'dial-night');
    band(rise - TWILIGHT, rise, 'dial-twilight');

    [['sunrise', sun.sunrise], ['sunset', sun.sunset]].forEach(([word, time]) => {
      const deg = hourToAngleDeg(hoursOf(time));
      const a = polarToXY(deg, R_NIGHT - NIGHT_WIDTH / 2 - 2), b = polarToXY(deg, R_NIGHT + NIGHT_WIDTH / 2 + 2);
      const mark = document.createElementNS(svgNS, 'line');
      mark.setAttribute('x1', a.x); mark.setAttribute('y1', a.y);
      mark.setAttribute('x2', b.x); mark.setAttribute('y2', b.y);
      mark.setAttribute('class', 'dial-sun-mark');
      sky.appendChild(mark);
      // Set along the ring, turned upright on the lower half.
      const lp = polarToXY(deg, R_SUN_LABEL);
      const upright = deg > 0 && deg < 180;
      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', lp.x); text.setAttribute('y', lp.y);
      text.setAttribute('class', 'dial-sun-label');
      text.setAttribute('transform', `rotate(${upright ? deg - 90 : deg + 90}, ${lp.x}, ${lp.y})`);
      text.textContent = `${word} ${formatTime(time)}`;
      sky.appendChild(text);
    });
  }

  // The moon, in the center; the hand's pivot sits on top of it.
  const phase = moonPhase();
  const moon = document.createElementNS(svgNS, 'g');
  moon.setAttribute('class', 'dial-moon');
  moon.innerHTML = `<title>${phase.name}, ${Math.round(phase.illumination * 100)}% lit</title>`
    + `<circle cx="${CX}" cy="${CY}" r="${R_MOON}" class="dial-moon-disc"/>`
    + `<path d="${moonLitPath(CX, CY, R_MOON, phase.age)}" class="dial-moon-lit"/>`;
  sky.appendChild(moon);

  svg.insertBefore(sky, document.getElementById('dial-hand'));
  renderDialCaption();
}

function durationWords(minutes) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  const part = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  if (!h) return part(m, 'minute');
  return m ? `${part(h, 'hour')} ${part(m, 'minute')}` : part(h, 'hour');
}

function renderDialCaption() {
  const el = document.getElementById('wander-dial-caption');
  const data = blocks || blocksRef;
  if (!el || !data) return;
  const now = new Date();
  const hour = hoursOf(now);
  const i = data.findIndex(b => hour >= b.startHour && hour < b.startHour + 3);
  const current = data[i], next = data[(i + 1) % data.length];
  const minutesLeft = ((next.startHour * 60 - (now.getHours() * 60 + now.getMinutes())) % 1440 + 1440) % 1440;

  const phase = moonPhase(now);
  const lit = `${phase.name}, ${Math.round(phase.illumination * 100)}% lit`;
  const upcoming = phase.name === 'Full moon' || phase.name === 'New moon' ? ''
    : phase.daysToFull < phase.daysToNew
      ? ` · full moon in ${durationDays(phase.daysToFull)}`
      : ` · new moon in ${durationDays(phase.daysToNew)}`;
  const sun = window.siteAtmosphere && window.siteAtmosphere.sun;
  const sunWords = sun ? ` · sunrise ${formatTime(sun.sunrise)}, sunset ${formatTime(sun.sunset)}` : '';

  el.innerHTML = `${formatTime(now)} · ${current.name} · ${durationWords(minutesLeft)} until ${next.name}`
    + `<br>${lit}${upcoming}${sunWords}`;
}

function durationDays(days) {
  const n = Math.max(1, Math.round(days));
  return n === 1 ? 'a day' : `${n} days`;
}

window.addEventListener('atmospheretick', () => {
  if (document.getElementById('wander-dial-caption')) renderDialCaption();
});

function setDialHand(hour) {
  const hand = document.getElementById('dial-hand');
  hand.setAttribute('transform', `rotate(${hour * 15}, ${CX}, ${CY})`);
}

function setDialActive(blockName) {
  document.querySelectorAll('.dial-arc').forEach(el => {
    el.classList.toggle('active', el.dataset.block === blockName);
  });
  document.querySelectorAll('.dial-label').forEach(el => {
    el.classList.toggle('active', el.dataset.block === blockName);
  });
}

function formatBlockHours(startHour) {
  const fmt = h => {
    const ampm = h >= 12 ? 'pm' : 'am';
    return `${h % 12 || 12}${ampm}`;
  };
  return `${fmt(startHour)} – ${fmt((startHour + 3) % 24)}`;
}

function buildWander(blocksData) {
  buildDial(blocksData);

  const grid = document.getElementById('wander-grid');
  const realHour = new Date().getHours();
  const realBlock = blockForHour(blocksData, realHour);

  blocksData.forEach((block, i) => {
    const tile = document.createElement('div');
    tile.className = 'wander-tile';
    tile.dataset.blockName = block.name;
    tile.dataset.startHour = block.startHour;
    if (block.name === realBlock.name) tile.classList.add('is-current');

    tile.innerHTML = `
      <span class="tile-name">${block.name}</span>
      <span class="tile-hours">${formatBlockHours(block.startHour)}</span>
      ${block.subtitle ? `<span class="tile-subtitle">${block.subtitle}</span>` : ''}
    `;

    tile.addEventListener('mouseenter', () => {
      setDialActive(block.name);
      setDialHand(block.startHour + 1.5);
    });
    tile.addEventListener('mouseleave', () => {
      const cur = blockForHour(blocksData, new Date().getHours());
      setDialActive(cur.name);
      setDialHand(cur.startHour + 1.5);
    });
    tile.addEventListener('click', () => {
      selectWanderBlock(block, blocksData);
    });

    grid.appendChild(tile);
  });

  const curBlock = blockForHour(blocksData, realHour);
  setDialActive(curBlock.name);
  setDialHand(curBlock.startHour + 1.5);
  document.querySelectorAll('.dial-arc').forEach(el => {
    if (el.dataset.block === curBlock.name) el.classList.add('current');
  });
}

function updateWanderTileCurrent(blockName) {
  document.querySelectorAll('.wander-tile').forEach(el => {
    el.classList.toggle('is-current', el.dataset.blockName === blockName);
  });
}

function renderAtHour(blocksData, overrideHour, useRealTime = false) {
  const now = new Date();
  const h = overrideHour;
  const displayTime = useRealTime ? now : new Date(now);
  if (!useRealTime) displayTime.setHours(overrideHour + 1, 30, 0, 0);
  const block = blockForHour(blocksData, h);
  const veil = document.getElementById('veil');

  veil.classList.add('active');
  setTimeout(() => {
    applyBlockToDOM(blocksData, block, h, {
      clockTime: formatTime(displayTime),
      colophonDate: formatDate(now),
      afterUpdate: () => updateWanderTileCurrent(block.name)
    });
    veil.classList.remove('active');
  }, 1200);
}

function selectWanderBlock(block, blocksData) {
  wanderHoldUntil = Date.now() + WANDER_HOLD_MS;
  wanderHour = block.startHour;
  renderAtHour(blocksData, block.startHour);
  if (typeof closeOverlayPane === 'function') closeOverlayPane(document.getElementById('wander-pane'));
}

const ttpBtn = document.getElementById('turn-the-page');
let blocksRef = null;

ttpBtn.addEventListener('click', () => {
  if (!blocksRef) return;
  currentBlockName = null;
  // Mid-wander-hold, re-roll content for the hour that was picked, not
  // real time — otherwise "turn the page" while reading a wandered-to
  // hour would yank you straight back to now.
  const isWandering = Date.now() < wanderHoldUntil;
  const hour = isWandering ? wanderHour : new Date().getHours();
  renderAtHour(blocksRef, hour, !isWandering);
});

const keepPageBtn = document.getElementById('keep-page');
keepPageBtn.addEventListener('click', () => {
  document.getElementById('print-block-name').textContent = currentBlockName || '';
  const now = new Date();
  document.getElementById('print-timestamp').textContent = formatDate(now) + ' · ' + formatTime(now);
  window.print();
});

/* ── Overlay pane opener ──────────────────────────────────────────
   Wander the Hours opens through this — display, fade-in,
   build-if-needed, on-open callback. No auth check here; the DFOS
   check lives one level up, in openWanderPane() below.
   (Wander the Seasons and Wander the Weather live on their own pages,
   seasons.html and weather.html.)
────────────────────────────────────────────────────────────────── */
function openGatedPane(paneEl, { ensureBuilt, onOpen } = {}) {
  if (!paneEl) return;
  openOverlayPane(paneEl);
  if (typeof ensureBuilt === 'function') ensureBuilt();
  if (typeof onOpen === 'function') onOpen();
}

// Checking here instead of per-caller means every path in (the menu's
// Wander button, and the #wander hash deep-link other pages link to) is
// gated for free, with nothing to remember to wrap. The sign-in check,
// and the button's "Sign in to wander" label, live in nav.js, shared
// with seasons.js and weather.js.
function openWanderPane() {
  if (!requireDfosSignIn('wander')) return;
  openGatedPane(document.getElementById('wander-pane'), {
    onOpen: () => {
      if (typeof updateDialNowDot === 'function') updateDialNowDot();
      if (!document.querySelector('.wander-tile') && blocks) buildWander(blocks);
      else renderDialSky();   // moon, daylight and caption as of now
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   THE DFOS GATE
   Cosmetic only — see dfos-siwd.js. Locks Wander the Hours behind
   Sign In With DFOS (scope=identity: proves *a* DFOS identity, nothing
   about this project specifically). Wander the Seasons and Wander the
   Weather are gated the same way, from seasons.js and weather.js.
══════════════════════════════════════════════════════════════ */

const wanderOpenBtn = document.getElementById('wander-open');
if (wanderOpenBtn) wanderOpenBtn.addEventListener('click', openWanderPane);

window.addEventListener('dfossignin', e => {
  const intent = e.detail && e.detail.intent;
  if (intent === 'wander') openWanderPane();
});


/* ══════════════════════════════════════════════════════════════
   THE WEATHER
   Choosing/detecting conditions lives on its own page now
   (weather.html / weather.js). The hour page only reads back whatever
   is active, as the #weather-line readout.
══════════════════════════════════════════════════════════════ */

function renderWeatherLine() {
  const el = document.getElementById('weather-line');
  if (!el) return;
  const active = (window.siteAtmosphere && window.siteAtmosphere.weather) || [];
  el.innerHTML = weatherConditionsHTML(active);
  el.hidden = !active.length;
}
window.addEventListener('atmospherechange', renderWeatherLine);
