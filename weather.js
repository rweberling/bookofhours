/* ══════════════════════════════════════════════════════════════
   THE WEATHER — weather.html
   A full-page "window" view: one image (painting, photograph,
   diagram) filling the page behind the frame, and a paper fragment
   laid over it carrying the reading and the work's attribution.
   Images and readings come from the collection in data/ (weatherView()
   in shared.js: everything tagged with a condition) as two
   separate lists, each drawn on its own, weighted toward whatever conditions are
   active (pickWeatherAware, shared.js).

   Expects atmosphere.js (conditions, weatherLabel) and
   shared.js (pick helpers) loaded before this file.
══════════════════════════════════════════════════════════════ */

const WEATHER_CARD_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'bottom-center'];
const WEATHER_CARD_DEFAULT_POSITION = 'bottom-right';

// weatherView(): { images: [...], readings: [...] }, drawn independently
// of each other (as the hours page's images and quotes are).
let weatherImages = null;
let weatherReadings = null;
let lastWeatherImageSrc = null;
let lastWeatherReadingText = null;

function activeWeather() {
  return (window.siteAtmosphere && window.siteAtmosphere.weather) || [];
}

// plainText() lives in shared.js.

/* ── The view ─────────────────────────────────────────────────── */

// One pick from either list, images or readings — the same rules for both.
// Entries flagged "unset": true (Emslie's chart of every kind of weather,
// Lubbock's "no such thing as bad weather") are the opening view when no
// conditions are set — nothing chosen, nothing detected. They're never
// drawn otherwise, and "turn the page" always moves on to the ordinary
// entries, so an unset visit can still browse everything instead of being
// stuck on one picture. Otherwise, weighted toward the active conditions —
// or by weightFn, when given (see readingWeight below).
function pickWeatherEntry(entries, excludeFn, { turning = false } = {}, weightFn = null) {
  if (!entries || !entries.length) return null;
  const unset = entries.filter(e => e.unset);
  const ordinary = entries.filter(e => !e.unset);
  if (!turning && !activeWeather().length && unset.length) {
    return pickExcluding(unset, excludeFn);
  }
  const pool = ordinary.length ? ordinary : entries;
  return weightFn ? pickWeightedExcluding(pool, weightFn, excludeFn) : pickWeatherAware(pool, excludeFn);
}

// The image is drawn first; the reading then leans toward both the weather
// outside and the image's own tags, so the card and the picture tend to
// agree — Whistler's fog nocturne mostly brings a mist poem — while any
// reading can still turn up with any image. Nothing is ruled out: every
// reading keeps the base weight.
// READING_IMAGE_PULL sets how strongly the image pulls: 0 ignores the image
// entirely (readings follow only the weather), 1 weighs it the same as the
// weather outside, 2+ makes matching the picture the stronger pull.
const READING_IMAGE_PULL = 1;
// The reading just shown isn't ruled out on the next turn the way the last
// image is — only made this much less likely. With few readings, a hard
// "never twice running" rule forces them to simply alternate and drowns
// out the pull toward the image; this keeps repeats rare but lets a
// reading that fits the new picture come back.
const READING_REPEAT_FACTOR = 0.25;

function readingWeight(image) {
  const active = activeWeather();
  const imageTags = (image && image.weather) || [];
  return reading => (WEATHER_BASE_WEIGHT
    + weatherMatchCount(reading, active) ** 2
    + READING_IMAGE_PULL * weatherMatchCount(reading, imageTags) ** 2)
    * (reading.text === lastWeatherReadingText ? READING_REPEAT_FACTOR : 1);
}

function renderWeatherView(options) {
  if (!weatherImages || !weatherImages.length) return;
  const image = pickWeatherEntry(weatherImages, e => e.src === lastWeatherImageSrc, options) || weatherImages[0];
  // No hard exclusion for readings — readingWeight() makes the last one
  // less likely instead.
  const reading = pickWeatherEntry(weatherReadings, () => false, options, readingWeight(image));
  lastWeatherImageSrc = image.src;
  lastWeatherReadingText = reading ? reading.text : null;

  // Fade the old view out, swap once the new one has actually loaded —
  // otherwise a slow image pops in half-drawn over the previous one.
  const img = document.getElementById('weather-window-img');
  if (img.getAttribute('src') !== image.src) {
    img.classList.remove('is-loaded');
    img.src = image.src;
  }
  img.alt = plainText(image.caption) || 'The view from the window';
  document.getElementById('weather-caption').innerHTML = image.caption || '';

  // No readings at all (or an empty one) still leaves the card — it
  // carries the image credit and the page's controls — just without the
  // reading.
  const hasReading = !!(reading && reading.text);
  document.getElementById('weather-reading').hidden = !hasReading;
  document.getElementById('weather-quote-text').innerHTML = hasReading ? reading.text : '';
  document.getElementById('weather-quote-attr').innerHTML = hasReading && reading.attr ? reading.attr : '';

  // Where the card sits belongs to the image: it's about keeping clear of
  // the part of the picture that matters.
  const card = document.getElementById('weather-card');
  card.dataset.position = WEATHER_CARD_POSITIONS.includes(image.cardPosition)
    ? image.cardPosition
    : WEATHER_CARD_DEFAULT_POSITION;
}

function renderWeatherReadout(message) {
  const el = document.getElementById('weather-readout');
  if (message) { el.textContent = message; return; }
  const active = activeWeather();
  const reading = window.siteAtmosphere && window.siteAtmosphere.reading;
  const temperature = reading && typeof reading.temperature === 'number'
    ? `<span class="sep" aria-hidden="true">·</span>${Math.round(reading.temperature)}°`
    : '';
  el.innerHTML = active.length ? weatherConditionsHTML(active) + temperature : 'The weather is unset';
}

/* ── Folding the card ─────────────────────────────────────────────
   The card opens in full (reading first); folding it leaves just the
   image credit, so the whole picture can be seen. Stays folded across
   "turn the page" until unfolded — it's a way of looking, not a
   per-view setting.
────────────────────────────────────────────────────────────────── */
function toggleWeatherCard() {
  const card = document.getElementById('weather-card');
  const folded = card.classList.toggle('is-folded');
  const btn = document.getElementById('weather-fold');
  btn.setAttribute('aria-expanded', String(!folded));
  btn.setAttribute('aria-label', folded ? 'Show the reading' : 'Fold the card down to the image credit');
}

/* ── Condition tiles (Wander the Weather) ─────────────────────── */

function syncWeatherTiles() {
  const active = activeWeather();
  document.querySelectorAll('.weather-tile').forEach(tile => {
    tile.classList.toggle('is-current', active.includes(tile.dataset.value));
  });
  renderStationModel(active);
}

/* ── Station model ────────────────────────────────────────────────
   The picker's counterpart to the Hours and Seasons dials: the
   synoptic "station model" from weather maps — one circle at the
   station, each kind of weather in its own fixed place around it:
     sky          — how much of the circle is filled (fog: sky obscured, ×)
     wind         — a staff pointing to where the wind comes from, barbed
                    by speed (half barb 5 knots, full 10, pennant 50)
     what falls   — traditional present-weather symbols (and mist's =),
                    left of the circle
     temperature  — upper left
     dew point    — lower left (Humid, Dew, Frost)
     pressure     — upper right, with its 3-hour trend mark to the right
                    of the circle (Changing)
     ground       — lower right (Puddles, Parched, Snowpack)
   After "look outside", the measured reading (siteAtmosphere.reading)
   fills in the real values: cloud cover in eighths (oktas), true wind
   direction and speed, temperature, dew point, pressure and its trend.
   Chosen by hand, there's no reading, so each part shows a stand-in for
   its condition instead (half/full circle, a 20-knot north wind, 90°+ /
   32°− / 65°+, a droplet for dew, a crystal for frost, ∧ for changing).
   The dew and frost marks are this site's own — real station models
   have no symbol for either.
   Inactive positions stay as faint ghosts, labelled when nothing is set,
   so the figure reads as a key and fills in as tiles are chosen. Parts
   tied to an active condition take its tint (see [data-wx] in
   styles.css); measured values with no matching condition (a light
   breeze, a mild 58°) are drawn in quieter ink, and numbers carry a
   halo in the page color so a wind staff can cross them legibly.
   Display only for now — nothing in it is clickable.
────────────────────────────────────────────────────────────────── */
const STATION_R = 20;
const STATION_STAFF = 56;   // wind staff length beyond the circle
const MPH_TO_KNOTS = 0.869;

// on: tinted by its condition · reading: a measured value with no active
// condition to match, in quieter ink · otherwise a ghost
function stationPart(active, wx, inner, isReading = false) {
  if (wx && active.includes(wx)) return `<g class="station-on" data-wx="${wx}">${inner}</g>`;
  return `<g class="${isReading ? 'station-reading' : 'station-ghost'}">${inner}</g>`;
}

function stationReading() {
  return (window.siteAtmosphere && window.siteAtmosphere.reading) || null;
}

// A filled wedge of the station circle, clockwise from fromDeg to toDeg
// (0 = up).
function stationSector(fromDeg, toDeg) {
  const r = STATION_R;
  const at = deg => polarToXY(deg - 90, r);
  const [a, b] = [at(fromDeg), at(toDeg)];
  return `<path d="M ${CX} ${CY} L ${a.x} ${a.y} A ${r} ${r} 0 ${toDeg - fromDeg > 180 ? 1 : 0} 1 ${b.x} ${b.y} Z" fill="currentColor"/>`;
}

// Cloud cover in oktas (eighths), drawn the standard way: a quarter of the
// circle per two oktas, with a bar for each odd one in between.
function stationOktas(oktas) {
  const r = STATION_R;
  const vBar = (y1, y2) => `<path d="M ${CX} ${y1} L ${CX} ${y2}" stroke="currentColor" stroke-width="1.8"/>`;
  switch (oktas) {
    case 0: return '';
    case 1: return vBar(CY - r, CY + r);
    case 2: return stationSector(0, 90);
    case 3: return stationSector(0, 90) + vBar(CY, CY + r);
    case 4: return stationSector(0, 180);
    case 5: return stationSector(0, 180) + `<path d="M ${CX - r} ${CY} L ${CX} ${CY}" stroke="currentColor" stroke-width="1.8"/>`;
    case 6: return stationSector(0, 270);
    case 7: return `<circle cx="${CX}" cy="${CY}" r="${r}" fill="currentColor"/><rect x="${CX - 2.5}" y="${CY - r}" width="5" height="${2 * r}" class="station-gap"/>`;
    default: return `<circle cx="${CX}" cy="${CY}" r="${r}" fill="currentColor"/>`;
  }
}

function stationSky(active) {
  const r = STATION_R;
  const circle = `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="currentColor" stroke-width="1.6"/>`;
  if (active.includes('fog'))
    return stationPart(active, 'fog', `${circle}<path d="M ${CX - 13} ${CY - 13} L ${CX + 13} ${CY + 13} M ${CX + 13} ${CY - 13} L ${CX - 13} ${CY + 13}" stroke="currentColor" stroke-width="1.6"/>`);
  const skyCondition = ['overcast', 'dappled', 'clear'].find(v => active.includes(v)) || null;
  const reading = stationReading();
  if (reading && typeof reading.cloudCover === 'number') {
    const oktas = Math.min(8, Math.max(0, Math.round(reading.cloudCover / 12.5)));
    // Measured cover is tinted by its own amount — even when what's falling
    // (snow, rain) took the place of a sky condition in the detected set.
    const coverTint = oktas === 0 ? 'clear' : oktas <= 5 ? 'dappled' : 'overcast';
    return `<g class="station-on" data-wx="${coverTint}">${stationOktas(oktas)}${circle}</g>`;
  }
  if (skyCondition === 'overcast') return stationPart(active, skyCondition, stationOktas(8) + circle);
  if (skyCondition === 'dappled') return stationPart(active, skyCondition, stationOktas(4) + circle);
  return stationPart(active, skyCondition, circle);
}

function stationWind(active) {
  const reading = stationReading();
  const measured = reading && typeof reading.windSpeed === 'number';
  const knots = measured ? reading.windSpeed * MPH_TO_KNOTS : 20;
  // Calm (under ~3 knots): a second ring around the station, no staff.
  if (measured && knots < 3) {
    return stationPart(active, 'wind', `<circle cx="${CX}" cy="${CY}" r="${STATION_R + 5}" fill="none" stroke="currentColor" stroke-width="1.2"/>`, true);
  }
  // The staff points toward where the wind blows *from* (0° = north, up);
  // by hand, a north wind — straight up, clear of the pressure (upper
  // right) and temperature (upper left).
  const staffDeg = (measured && typeof reading.windDirection === 'number' ? reading.windDirection : 0) - 90;
  const along = d => polarToXY(staffDeg, d);
  const start = along(STATION_R), end = along(STATION_R + STATION_STAFF);
  // Barbs sit on the staff's clockwise side, as plotted in the northern
  // hemisphere, working inward from the tip: pennants (filled), then full
  // barbs, then a half barb.
  const barbRad = (staffDeg - 70) * Math.PI / 180;
  const out = (p, len) => ({ x: p.x + Math.cos(barbRad) * len, y: p.y + Math.sin(barbRad) * len });
  let remaining = Math.round(knots / 5) * 5;
  let d = STATION_R + STATION_STAFF;
  let pennants = '';
  let barbs = '';
  while (remaining >= 50) {
    const p = along(d), q = out(p, 17), base = along(d - 7);
    pennants += `<path d="M ${p.x} ${p.y} L ${q.x} ${q.y} L ${base.x} ${base.y} Z" fill="currentColor"/>`;
    d -= 10; remaining -= 50;
  }
  while (remaining >= 10) {
    const p = along(d), q = out(p, 17);
    barbs += ` M ${p.x} ${p.y} L ${q.x} ${q.y}`;
    d -= 8; remaining -= 10;
  }
  if (remaining >= 5) {
    // A lone half barb sits one step in from the tip, so it isn't
    // mistaken for a full one.
    if (d === STATION_R + STATION_STAFF) d -= 8;
    const p = along(d), q = out(p, 9);
    barbs += ` M ${p.x} ${p.y} L ${q.x} ${q.y}`;
  }
  return stationPart(active, 'wind',
    `<path d="M ${start.x} ${start.y} L ${end.x} ${end.y}${barbs}" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>${pennants}`,
    measured);
}

// Present-weather symbols, drawn around (0,0).
const STATION_FALLS = {
  drizzle: `<circle cx="-5" cy="0" r="2.8" fill="currentColor"/><path d="M -2.4 0.8 Q -2 5 -6 7" stroke="currentColor" stroke-width="1.4" fill="none"/><circle cx="6" cy="0" r="2.8" fill="currentColor"/><path d="M 8.6 0.8 Q 9 5 5 7" stroke="currentColor" stroke-width="1.4" fill="none"/>`,
  rain: `<circle cx="-6" cy="0" r="3.4" fill="currentColor"/><circle cx="6" cy="0" r="3.4" fill="currentColor"/>`,
  snow: [-7, 7].map(x => `<path transform="translate(${x} 0)" d="M 0 -5 L 0 5 M -4.3 -2.5 L 4.3 2.5 M -4.3 2.5 L 4.3 -2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`).join(''),
  mist: `<path d="M -10 -3 L 10 -3 M -10 3 L 10 3" stroke="currentColor" stroke-width="1.5"/>`,
  ice: `<path d="M -11 2 C -8 -8, -2 -8, 0 0 C 2 8, 8 8, 11 -2" stroke="currentColor" stroke-width="1.4" fill="none"/><circle cx="-5.5" cy="-1" r="2.4" fill="currentColor"/><circle cx="5.5" cy="1" r="2.4" fill="currentColor"/>`,
  thunder: `<path d="M -9 11 L -9 -9 L 7 -9 L 1 0 L 7 3 L 0 12 M 0 12 L 0.5 6.5 M 0 12 L 4.5 9" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`,
  fog: `<path d="M -10 -5 L 10 -5 M -10 0 L 10 0 M -10 5 L 10 5" stroke="currentColor" stroke-width="1.5"/>`
};

function stationFalls(active) {
  const present = Object.keys(STATION_FALLS).filter(k => active.includes(k));
  if (!present.length)
    return stationPart(active, null, `<g transform="translate(${CX - 44} ${CY})">${STATION_FALLS.rain}</g>`);
  // Several at once step further out to the left, nearest first.
  return present.map((k, i) =>
    stationPart(active, k, `<g transform="translate(${CX - 44 - i * 30} ${CY})">${STATION_FALLS[k]}</g>`)).join('');
}

function stationTemperature(active) {
  const [x, y] = [CX - 28, CY - 30];
  const text = t => `<text class="station-temp" x="${x}" y="${y}">${t}</text>`;
  const tempCondition = ['heat', 'cold'].find(v => active.includes(v)) || null;
  const reading = stationReading();
  if (reading && typeof reading.temperature === 'number')
    return stationPart(active, tempCondition, text(`${Math.round(reading.temperature)}°`), true);
  if (tempCondition === 'heat') return stationPart(active, 'heat', text('90°+'));
  if (tempCondition === 'cold') return stationPart(active, 'cold', text('32°−'));
  return stationPart(active, null, text('—°'));
}

function stationDewPoint(active) {
  const [x, y] = [CX - 28, CY + 32];
  const text = t => `<text class="station-temp" x="${x}" y="${y}">${t}</text>`;
  const dewCondition = ['frost', 'dew', 'humid'].find(v => active.includes(v)) || null;
  const reading = stationReading();
  if (reading && typeof reading.dewPoint === 'number')
    return stationPart(active, dewCondition, text(`${Math.round(reading.dewPoint)}°`), true);
  if (dewCondition === 'frost')
    return stationPart(active, 'frost', `<path transform="translate(${x - 8} ${y})" d="M 0 -7 L 0 7 M -6 -3.5 L 6 3.5 M -6 3.5 L 6 -3.5 M -2 -5.5 L 0 -3.5 L 2 -5.5 M -2 5.5 L 0 3.5 L 2 5.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>`);
  if (dewCondition === 'dew')
    return stationPart(active, 'dew', `<path transform="translate(${x - 8} ${y})" d="M 0 -7 C 3 -2, 5 1, 5 3 A 5 5 0 0 1 -5 3 C -5 1, -3 -2, 0 -7 Z" fill="currentColor"/>`);
  if (dewCondition === 'humid') return stationPart(active, 'humid', text('65°+'));
  return stationPart(active, null, text('—°'));
}

// Pressure (upper right, in hPa) and its 3-hour tendency (right of the
// circle): / rising, \ falling, — steady; ∧ when chosen by hand, since
// Changing doesn't say which way.
function stationPressure(active) {
  const [px, py] = [CX + 28, CY - 30];
  const [tx, ty] = [CX + 36, CY];
  const reading = stationReading();
  const measured = reading && typeof reading.pressure === 'number';
  const number = measured
    ? stationPart(active, null, `<text class="station-pressure" x="${px}" y="${py}">${Math.round(reading.pressure)}</text>`, true)
    : stationPart(active, null, `<text class="station-pressure" x="${px}" y="${py}">——</text>`);
  let mark;
  if (measured && typeof reading.pressureChange === 'number') {
    const change = reading.pressureChange;
    mark = change >= 1 ? `M ${tx} ${ty + 6} L ${tx + 10} ${ty - 6}`
      : change <= -1 ? `M ${tx} ${ty - 6} L ${tx + 10} ${ty + 6}`
      : `M ${tx} ${ty} L ${tx + 10} ${ty}`;
  } else {
    mark = `M ${tx} ${ty + 5} L ${tx + 5} ${ty - 5} L ${tx + 10} ${ty + 5}`;
  }
  const tendency = stationPart(active, 'changing',
    `<path d="${mark}" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    measured && typeof reading.pressureChange === 'number');
  return number + tendency;
}

// Lower right: a ground line, with one mark for its state — snowpack
// first, then puddles, then parched.
function stationGround(active) {
  const [x, y] = [CX + 42, CY + 34];
  const line = `<path d="M ${x - 12} ${y + 7} L ${x + 12} ${y + 7}" stroke="currentColor" stroke-width="1.5"/>`;
  if (active.includes('snowpack'))
    return stationPart(active, 'snowpack', line
      + `<path transform="translate(${x} ${y - 1})" d="M 0 -4.5 L 0 4.5 M -3.9 -2.2 L 3.9 2.2 M -3.9 2.2 L 3.9 -2.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`);
  if (active.includes('puddles'))
    return stationPart(active, 'puddles', line
      + `<ellipse cx="${x - 5}" cy="${y + 3.5}" rx="5" ry="1.8" fill="currentColor"/><ellipse cx="${x + 6}" cy="${y + 4}" rx="3.5" ry="1.4" fill="currentColor"/>`);
  if (active.includes('parched'))
    return stationPart(active, 'parched', line
      + `<path d="M ${x - 8} ${y + 7} L ${x - 5.5} ${y + 12} L ${x - 2} ${y + 9.5} M ${x + 3} ${y + 7} L ${x + 5.5} ${y + 11.5} L ${x + 9} ${y + 10}" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linejoin="round"/>`);
  return stationPart(active, null, line);
}

// Position names, like the dials' quadrant labels — only while nothing
// is set, when the figure is serving as its own key.
function stationLabels(active) {
  if (active.length) return '';
  const label = (x, y, t) => `<text class="station-label" x="${x}" y="${y}">${t}</text>`;
  return label(CX, CY + 30, 'sky') + label(CX + 12, CY - 76, 'wind') + label(CX - 44, CY + 13, 'what falls')
    + label(CX - 42, CY - 44, 'air') + label(CX - 42, CY + 46, 'dew point')
    + label(CX + 44, CY - 44, 'pressure') + label(CX + 42, CY + 54, 'ground');
}

function renderStationModel(active) {
  const svg = document.getElementById('station-model');
  if (!svg) return;
  // Wind first, so the numbers' halos draw over the staff where it crosses them.
  svg.innerHTML = `<g transform="translate(0 -20)">${stationWind(active)}${stationTemperature(active)}${stationDewPoint(active)}${stationPressure(active)}${stationFalls(active)}${stationGround(active)}${stationSky(active)}${stationLabels(active)}</g>`;
}

// Picker rows, five conditions each, loosely following the layers
// detection reads: what the sky is doing, what's falling from it, the air,
// and the ground. Display grouping only — the list of valid conditions is
// still atmosphere.js's WEATHER_VALUES, and any condition added there but
// not placed here lands in a trailing row rather than going missing.
const WEATHER_GROUPS = [
  { label: 'The Sky',    values: ['clear', 'dappled', 'overcast', 'mist', 'fog'] },
  { label: 'What Falls', values: ['drizzle', 'rain', 'thunder', 'ice', 'snow'] },
  { label: 'The Air',    values: ['wind', 'heat', 'cold', 'humid', 'changing'] },
  { label: 'The Ground', values: ['dew', 'frost', 'puddles', 'parched', 'snowpack'] }
];

function buildWeatherTile(value) {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'weather-tile';
  tile.textContent = weatherLabel(value);
  tile.dataset.value = value;
  tile.dataset.wx = value;
  tile.addEventListener('click', () => toggleWeatherCondition(value));
  return tile;
}

function buildWeatherGrid() {
  const grid = document.getElementById('weather-grid');
  if (grid.children.length) { syncWeatherTiles(); return; }
  const all = window.WEATHER_VALUES || [];
  const placed = WEATHER_GROUPS.flatMap(g => g.values);
  const groups = [
    ...WEATHER_GROUPS,
    { label: 'Also', values: all.filter(v => !placed.includes(v)) }
  ];
  groups.forEach(({ label, values }) => {
    const valid = values.filter(v => all.includes(v));
    if (!valid.length) return;
    const section = document.createElement('section');
    section.className = 'weather-group';
    const heading = document.createElement('h3');
    heading.className = 'weather-group-heading';
    heading.textContent = label;
    const row = document.createElement('div');
    row.className = 'weather-group-row';
    valid.forEach(value => row.appendChild(buildWeatherTile(value)));
    section.append(heading, row);
    grid.appendChild(section);
  });
  syncWeatherTiles();
}

function openWeatherPane() {
  const pane = document.getElementById('weather-pane');
  buildWeatherGrid();
  openOverlayPane(pane);
}

/* ── DFOS gate ────────────────────────────────────────────────────
   Choosing a condition by hand (Wander the Weather) is gated, via
   requireDfosSignIn() in nav.js; looking outside (The Current
   Weather) isn't.
────────────────────────────────────────────────────────────────── */
function openWanderWeather() {
  // Say so on the card, not just on the menu's (closed) Wander button:
  // arriving from another page's #wander link, the card is what's in view.
  const unavailable = () => {
    renderWeatherReadout('Sign-in is unavailable; try again soon');
    setTimeout(() => renderWeatherReadout(), 5000);
  };
  if (requireDfosSignIn('weather', unavailable)) openWeatherPane();
}

window.addEventListener('dfossignin', e => {
  if (e.detail && e.detail.intent === 'weather') openWeatherPane();
});

/* ── Look outside (geolocation → Open-Meteo) ──────────────────── */

// Everything "look outside" asks Open-Meteo for, in US units: °F, mph,
// inches of rain — and, as a consequence of those, visibility in feet.
// Pressure (hPa) is fetched hourly for the past 3 hours to get its trend,
// and precipitation for the past day and fortnight for the ground.
function openMeteoURL(latitude, longitude) {
  const params = new URLSearchParams({
    latitude, longitude,
    current: 'temperature_2m,dew_point_2m,weather_code,cloud_cover,visibility,pressure_msl,wind_speed_10m,wind_direction_10m,snow_depth',
    hourly: 'pressure_msl,precipitation',
    past_hours: 24, forecast_hours: 1,
    daily: 'precipitation_sum',
    past_days: 14, forecast_days: 1,
    temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch',
    timezone: 'auto'
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

// The response boiled down to the measured values the site keeps (see
// siteAtmosphere.reading in atmosphere.js) plus a few used only for
// detection.
function readingFromOpenMeteo(data) {
  const c = data.current;
  const pressures = (data.hourly && data.hourly.pressure_msl) || [];
  const hourlyRain = (data.hourly && data.hourly.precipitation) || [];
  const dailyRain = (data.daily && data.daily.precipitation_sum) || [];
  const sum = values => values.reduce((total, v) => total + (v || 0), 0);
  // The hourly series ends at the current hour, so three entries back is
  // three hours ago.
  const earlier = pressures.length >= 4 ? pressures[pressures.length - 4] : null;
  return {
    weatherCode: c.weather_code,
    temperature: c.temperature_2m,
    dewPoint: c.dew_point_2m,
    cloudCover: c.cloud_cover,
    visibility: c.visibility,                 // feet
    pressure: c.pressure_msl,                 // hPa
    pressureChange: typeof earlier === 'number' ? c.pressure_msl - earlier : null,   // hPa over 3 hours
    windSpeed: c.wind_speed_10m,
    windDirection: c.wind_direction_10m,
    snowDepth: c.snow_depth,
    rainPastDay: sum(hourlyRain),             // inches
    rainPastFortnight: sum(dailyRain)         // inches
  };
}

const FEET_PER_KM = 3281;

// Every condition that independently applies at once, rather than a single
// "best" one — what the sky is doing and what's falling are one layer
// (from the WMO weather code, plus visibility for mist); the air and the
// ground are separate layers that stack on top, so a real report can come
// back as e.g. ['overcast', 'rain', 'cold', 'changing', 'puddles'].
// Thresholds are rules of thumb, not official definitions.
function conditionsFromReading(r) {
  const conditions = [];
  const code = r.weatherCode;
  const falling = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99].includes(code);

  // The sky and what falls
  if ([71, 73, 75, 77, 85, 86].includes(code)) conditions.push('snow');
  else if ([45, 48].includes(code)) conditions.push('fog');
  else if ([56, 57, 66, 67].includes(code)) conditions.push('ice');
  else if ([95, 96, 99].includes(code)) conditions.push('thunder');
  else if ([61, 63, 65, 80, 81, 82].includes(code)) conditions.push('rain');
  else if ([51, 53, 55].includes(code)) conditions.push('drizzle');
  else if (code === 3) conditions.push('overcast');
  else if (code === 1 || code === 2) conditions.push('dappled');
  else conditions.push('clear');
  // Mist: visibility cut to 1–5 km (fog is under 1 km, and has its own
  // weather code).
  if (!conditions.includes('fog') && typeof r.visibility === 'number'
      && r.visibility >= 1 * FEET_PER_KM && r.visibility < 5 * FEET_PER_KM) {
    conditions.push('mist');
  }

  // The air
  if (r.windSpeed >= 20) conditions.push('wind');
  if (r.temperature >= 90) conditions.push('heat');
  else if (r.temperature <= 32) conditions.push('cold');
  if (r.dewPoint >= 65) conditions.push('humid');                  // muggy, by the usual dew point rule
  if (typeof r.pressureChange === 'number' && Math.abs(r.pressureChange) >= 3) conditions.push('changing');

  // The ground
  const spread = r.temperature - r.dewPoint;   // near zero: air at saturation
  if (!falling && spread <= 4 && r.temperature <= 34) conditions.push('frost');
  else if (!falling && spread <= 3) conditions.push('dew');
  if (r.snowDepth > 0) conditions.push('snowpack');
  else if (r.rainPastDay >= 0.1) conditions.push('puddles');
  else if (r.rainPastFortnight < 0.25 && r.temperature > 40) conditions.push('parched');

  return conditions;
}

function lookOutside(event) {
  const btn = event.currentTarget;
  if (!navigator.geolocation) {
    renderWeatherReadout('Location is unavailable here');
    return;
  }
  const label = btn.textContent;
  const done = () => { btn.disabled = false; btn.textContent = label; };
  btn.disabled = true;
  btn.textContent = 'Looking…';
  navigator.geolocation.getCurrentPosition(async position => {
    try {
      // Rounded to 2 decimal places (~1 km) before leaving the browser: the
      // weather models behind Open-Meteo are gridded far more coarsely than
      // that, so it costs no accuracy and shares less about where someone is.
      const round = n => Math.round(n * 100) / 100;
      const latitude = round(position.coords.latitude);
      const longitude = round(position.coords.longitude);
      const response = await fetch(openMeteoURL(latitude, longitude));
      if (!response.ok) throw new Error(`Weather request failed (${response.status}).`);
      // The rounded coordinates ride along so atmosphere.js can keep them
      // (in this browser only) for the Hours dial's sunrise and sunset.
      const reading = { ...readingFromOpenMeteo(await response.json()), latitude, longitude };
      // setWeatherConditions fires 'atmospherechange', which re-renders
      // the readout, the station model and the view.
      setWeatherConditions(conditionsFromReading(reading), reading);
    } catch (error) {
      console.error(error);
      renderWeatherReadout('The weather could not be found');
    } finally {
      done();
    }
  }, () => {
    renderWeatherReadout('Location was not shared');
    done();
  }, { timeout: 10000, maximumAge: 300000 });
}

/* ── Init ─────────────────────────────────────────────────────── */

function openWanderWeatherIfHashed() {
  if (window.location.hash !== '#wander') return;
  history.replaceState(null, '', window.location.pathname);
  openWanderWeather();
}

// Toggling several tiles in a row shouldn't load a new image per click —
// wait for a short pause, then re-roll once.
let rerollTimeout = null;
window.addEventListener('atmospherechange', () => {
  renderWeatherReadout();
  syncWeatherTiles();
  clearTimeout(rerollTimeout);
  rerollTimeout = setTimeout(() => renderWeatherView(), 450);
});

async function initWeatherPage() {
  const img = document.getElementById('weather-window-img');
  img.addEventListener('load', () => img.classList.add('is-loaded'));

  document.getElementById('weather-turn-page').addEventListener('click', () => renderWeatherView({ turning: true }));
  document.getElementById('weather-look').addEventListener('click', lookOutside);
  document.getElementById('weather-fold').addEventListener('click', toggleWeatherCard);
  // Clicking the picture itself (anywhere off the card) folds/unfolds too.
  document.querySelector('.weather-spread').addEventListener('click', e => {
    if (e.target === e.currentTarget) toggleWeatherCard();
  });
  document.getElementById('weather-pane-look').addEventListener('click', lookOutside);
  renderWeatherReadout();

  // DOMContentLoaded, not script load: dfos-siwd.js is a module and only
  // defines dfosIsSignedIn once it has run, which is guaranteed by now.
  openWanderWeatherIfHashed();
  window.addEventListener('hashchange', openWanderWeatherIfHashed);
  // On this page the menu's Wander item is a button (see nav.js).
  const wanderButton = document.getElementById('weather-wander-open');
  if (wanderButton) wanderButton.addEventListener('click', openWanderWeather);

  try {
    const oracle = weatherView(await loadCollection());
    weatherImages = oracle.images;
    weatherReadings = oracle.readings;
  } catch (error) {
    console.error(error);
    document.getElementById('weather-caption').textContent = 'The window could not be opened. Please return soon.';
    return;
  }
  renderWeatherView();
}

window.addEventListener('DOMContentLoaded', initWeatherPage);
