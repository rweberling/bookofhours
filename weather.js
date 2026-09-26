/* ══════════════════════════════════════════════════════════════
   THE WEATHER — weather.html
   A full-page "window" view: one image (painting, photograph,
   diagram) filling the page behind the frame, and a paper fragment
   laid over it carrying the reading and the work's attribution.
   Views come from weather-oracle.json, weighted toward whatever
   conditions are active (pickWeatherAware, seasonal-data.js).

   Expects atmosphere.js (conditions, weatherLabel) and
   seasonal-data.js (pick helpers) loaded before this file.
══════════════════════════════════════════════════════════════ */

const WEATHER_CARD_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'bottom-center'];
const WEATHER_CARD_DEFAULT_POSITION = 'bottom-right';

let weatherViews = null;
let lastWeatherViewSrc = null;

function activeWeather() {
  return (window.siteAtmosphere && window.siteAtmosphere.weather) || [];
}

function stripHTML(str) {
  return str ? str.replace(/<[^>]*>/g, '') : '';
}

/* ── The view ─────────────────────────────────────────────────── */

// Views flagged "unset": true (e.g. Emslie's chart of every kind of
// weather) are the opening view when no conditions are set — nothing
// chosen, nothing detected. They're never drawn otherwise, and "turn the
// page" always moves on to the ordinary views, so an unset visit can still
// browse everything instead of being stuck on one picture.
function pickWeatherView({ turning = false } = {}) {
  const notLast = v => v.src === lastWeatherViewSrc;
  const unsetViews = weatherViews.filter(v => v.unset);
  const ordinaryViews = weatherViews.filter(v => !v.unset);
  if (!turning && !activeWeather().length && unsetViews.length) {
    return pickExcluding(unsetViews, notLast);
  }
  return pickWeatherAware(ordinaryViews.length ? ordinaryViews : weatherViews, notLast);
}

function renderWeatherView(options) {
  if (!weatherViews || !weatherViews.length) return;
  const view = pickWeatherView(options) || weatherViews[0];
  lastWeatherViewSrc = view.src;

  // Fade the old view out, swap once the new one has actually loaded —
  // otherwise a slow image pops in half-drawn over the previous one.
  const img = document.getElementById('weather-window-img');
  if (img.getAttribute('src') !== view.src) {
    img.classList.remove('is-loaded');
    img.src = view.src;
  }
  img.alt = stripHTML(view.caption) || 'The view from the window';
  document.getElementById('weather-caption').innerHTML = view.caption || '';

  // An entry with an empty quote (e.g. a plain chart or diagram) still
  // gets the card — it carries the attribution and the page's controls —
  // just without the reading.
  const hasQuote = !!(view.quote && view.quote.text);
  document.getElementById('weather-reading').hidden = !hasQuote;
  document.getElementById('weather-quote-text').innerHTML = hasQuote ? view.quote.text : '';
  document.getElementById('weather-quote-attr').innerHTML = hasQuote && view.quote.attr ? view.quote.attr : '';

  const card = document.getElementById('weather-card');
  card.dataset.position = WEATHER_CARD_POSITIONS.includes(view.cardPosition)
    ? view.cardPosition
    : WEATHER_CARD_DEFAULT_POSITION;
}

function renderWeatherReadout(message) {
  const el = document.getElementById('weather-readout');
  if (message) { el.textContent = message; return; }
  const active = activeWeather();
  el.innerHTML = active.length ? weatherConditionsHTML(active) : 'The weather is unset';
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
}

function buildWeatherGrid() {
  const grid = document.getElementById('weather-grid');
  if (grid.children.length) { syncWeatherTiles(); return; }
  (window.WEATHER_VALUES || []).forEach(value => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'weather-tile';
    tile.textContent = weatherLabel(value);
    tile.dataset.value = value;
    tile.dataset.wx = value;
    tile.addEventListener('click', () => toggleWeatherCondition(value));
    grid.appendChild(tile);
  });
  syncWeatherTiles();
}

function openWeatherPane() {
  const pane = document.getElementById('weather-pane');
  buildWeatherGrid();
  pane.style.display = 'flex';
  requestAnimationFrame(() => pane.classList.add('open'));
}

/* ── DFOS gate ────────────────────────────────────────────────────
   A smaller copy of hours.js's dfosGate() — this page doesn't load
   hours.js. Choosing a condition by hand (Wander the Weather) is
   gated; looking outside (The Current Weather) isn't, same as it
   was on the hour page.
────────────────────────────────────────────────────────────────── */
function openWanderWeather() {
  if (typeof window.dfosIsSignedIn === 'function' && window.dfosIsSignedIn()) {
    openWeatherPane();
    return;
  }
  // Reached from the nav's "Wander the Weather" link (via #wander), so
  // there's no button of our own to relabel — say so on the card instead.
  const failed = () => {
    renderWeatherReadout('Sign-in is unavailable; try again soon');
    setTimeout(() => renderWeatherReadout(), 5000);
  };
  if (typeof window.dfosBeginSignIn === 'function') {
    Promise.resolve(window.dfosBeginSignIn('weather')).catch(failed);
  } else {
    failed();
  }
}

window.addEventListener('dfossignin', e => {
  if (e.detail && e.detail.intent === 'weather') openWeatherPane();
});

/* ── Look outside (geolocation → Open-Meteo) ──────────────────── */

// Returns every condition that independently applies at once, rather
// than picking a single "best" one — sky/precipitation is one mutually
// exclusive layer, ground cover / temperature / wind are separate layers
// that can stack on top (so a real report can come back as e.g.
// ['snow', 'cold'] or ['thunderstorm', 'heat']).
function normalizeOpenMeteoWeather(code, temperature, windSpeed, snowDepth) {
  const conditions = [];

  if ([71, 73, 75, 77, 85, 86].includes(code)) conditions.push('snow');
  else if ([45, 48].includes(code)) conditions.push('fog');
  else if ([56, 57, 66, 67].includes(code)) conditions.push('freezing-rain');
  else if ([95, 96, 99].includes(code)) conditions.push('thunderstorm');
  else if ([61, 63, 65, 80, 81, 82].includes(code)) conditions.push('rain');
  else if ([51, 53, 55].includes(code)) conditions.push('drizzle');
  else if (code === 3) conditions.push('overcast');
  else if (code === 1 || code === 2) conditions.push('partly-cloudy');
  else conditions.push('clear');

  if (snowDepth > 0) conditions.push('snow-on-ground');
  if (temperature >= 90) conditions.push('heat');
  else if (temperature <= 32) conditions.push('cold');
  if (windSpeed >= 20) conditions.push('wind');

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
      const { latitude, longitude } = position.coords;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,snow_depth&temperature_unit=fahrenheit&wind_speed_unit=mph`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Weather request failed (${response.status}).`);
      const data = await response.json();
      // setWeatherConditions fires 'atmospherechange', which re-renders
      // the readout and the view below.
      setWeatherConditions(normalizeOpenMeteoWeather(data.current.weather_code, data.current.temperature_2m, data.current.wind_speed_10m, data.current.snow_depth));
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
  // The nav's "Wander the Weather" link on this same page only changes
  // the hash, it doesn't reload.
  window.addEventListener('hashchange', openWanderWeatherIfHashed);

  try {
    const response = await fetch('weather-oracle.json');
    if (!response.ok) throw new Error(`Unable to load weather-oracle.json (${response.status}).`);
    weatherViews = await response.json();
  } catch (error) {
    console.error(error);
    document.getElementById('weather-caption').textContent = 'The window could not be opened. Please return soon.';
    return;
  }
  renderWeatherView();
}

window.addEventListener('DOMContentLoaded', initWeatherPage);
