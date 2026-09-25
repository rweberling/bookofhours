
/* Shared atmospheric state for every page. */
(function () {
 const TIME_BLOCKS = [
 { key: 'void', start: 0 },
 { key: 'hush', start: 3 },
 { key: 'chorus', start: 6 },
 { key: 'transit', start: 9 },
 { key: 'fulcrum', start: 12 },
 { key: 'doldrums', start: 15 },
 { key: 'convivium', start: 18 },
 { key: 'denouement', start: 21 }
 ];
 const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
 const WEATHER_KEY = 'earthly-hours-weather';
 const WEATHER = ['clear', 'partly-cloudy', 'overcast', 'drizzle', 'rain', 'snow', 'snow-on-ground', 'fog', 'wind', 'thunderstorm', 'freezing-rain', 'heat', 'cold'];

 // The one list of valid conditions — hours.js's weather picker builds its
 // tiles from this (deriving display labels mechanically, see
 // weatherLabel() there) instead of hand-maintaining a second, differently-
 // cased copy that has to be kept in sync by hand.
 window.WEATHER_VALUES = WEATHER.slice();

 // How long a chosen/detected condition stays in effect before the site
 // quietly falls back to ambient (ordinary ticking clock/season, no
 // weather class). 3 hours, not 1 — real weather doesn't usually flip
 // inside an hour, and reverting too eagerly would undo someone's
 // choice mid-visit. Adjust this one line if that balance feels off.
 // Multiple conditions can be active at once (e.g. cold + snow), each
 // with its own setAt, so toggling one on doesn't reset the clock on
 // conditions already active.
 const WEATHER_TTL_MS = 3 * 60 * 60 * 1000;

 function timeKey(date) {
 const hour = date.getHours();
 return TIME_BLOCKS.slice().reverse().find(block => hour >= block.start).key;
 }

 // Delegates to seasonal-data.js's currentSeason() when it's loaded
 // (index.html, seasons.html) instead of keeping a second copy of the
 // month-range thresholds. atmosphere.js also runs alone on about.html,
 // sources.html and 404.html, so this still needs its own fallback for
 // when that file isn't present — and can't assume load order even when
 // it is: seasons.html loads seasonal-data.js first, index.html loads it
 // second, and this runs immediately on script load either way.
 function seasonKey(date) {
 if (typeof currentSeason === 'function') return currentSeason(date);
 const month = date.getMonth();
 if (month >= 2 && month <= 4) return 'spring';
 if (month >= 5 && month <= 7) return 'summer';
 if (month >= 8 && month <= 10) return 'autumn';
 return 'winter';
 }

 function readEntries() {
 try {
 const raw = window.localStorage.getItem(WEATHER_KEY);
 if (!raw) return [];
 const parsed = JSON.parse(raw);
 const entries = parsed && parsed.entries;
 if (!Array.isArray(entries)) throw new Error('not a multi-condition record');
 return entries.filter(e => e && WEATHER.includes(e.value) && typeof e.setAt === 'number');
 } catch (error) {
 // Covers a leftover single-condition record from before conditions
 // could stack (a bare {value, setAt}, not {entries}) as well as any
 // other parse failure.
 try { window.localStorage.removeItem(WEATHER_KEY); } catch (_) {}
 return [];
 }
 }

 function writeEntries(entries) {
 try {
 if (entries.length) {
 window.localStorage.setItem(WEATHER_KEY, JSON.stringify({ entries }));
 } else {
 window.localStorage.removeItem(WEATHER_KEY);
 }
 } catch (error) {
 // The visual state still applies when storage is unavailable.
 }
 }

 function storedWeather() {
 const now = Date.now();
 const entries = readEntries();
 const active = entries.filter(e => now - e.setAt <= WEATHER_TTL_MS);
 if (active.length !== entries.length) writeEntries(active);
 return active.map(e => e.value);
 }

 function applyAtmosphere(date = new Date()) {
 const body = document.body;
 if (!body) return;

 body.classList.remove(...TIME_BLOCKS.map(block => `block-${block.key}`));
 body.classList.remove(...SEASONS.map(season => `season-${season}`));
 body.classList.remove(...WEATHER.map(weather => `weather-${weather}`));

 const currentTime = timeKey(date);
 // Named currentSeasonKey, not currentSeason — that name belongs to the
 // global function from seasonal-data.js that seasonKey() above may
 // delegate to; shadowing it here would be confusing even though it's
 // harmless (seasonKey's own reference to currentSeason() resolves
 // lexically, not against this local).
 const currentSeasonKey = seasonKey(date);
 const currentWeather = storedWeather();

 body.classList.add(`block-${currentTime}`, `season-${currentSeasonKey}`);
 currentWeather.forEach(w => body.classList.add(`weather-${w}`));

 window.siteAtmosphere = {
 time: currentTime,
 season: currentSeasonKey,
 weather: currentWeather
 };
 }

 // For the self-select picker: flips one condition on or off, leaving
 // whatever else is already active untouched. Contradictory combinations
 // (e.g. Heat + Cold) are allowed on purpose — see setWeatherConditions
 // for the same call on detected results, which replaces wholesale instead.
 window.toggleWeatherCondition = function (condition) {
 const value = String(condition || '').toLowerCase().replace(/\s+/g, '-');
 if (!WEATHER.includes(value)) return;
 const entries = readEntries();
 const without = entries.filter(e => e.value !== value);
 const wasActive = without.length !== entries.length;
 writeEntries(wasActive ? without : [...without, { value, setAt: Date.now() }]);
 applyAtmosphere();
 window.dispatchEvent(new CustomEvent('atmospherechange', { detail: window.siteAtmosphere }));
 };

 // For detection: replaces the active set wholesale with what Open-Meteo
 // reported (sky condition + any independent temperature/wind/ground
 // layers), rather than merging with whatever was manually toggled before.
 window.setWeatherConditions = function (conditions) {
 const setAt = Date.now();
 const values = (conditions || [])
 .map(c => String(c || '').toLowerCase().replace(/\s+/g, '-'))
 .filter(v => WEATHER.includes(v));
 writeEntries(values.map(value => ({ value, setAt })));
 applyAtmosphere();
 window.dispatchEvent(new CustomEvent('atmospherechange', { detail: window.siteAtmosphere }));
 };

 window.clearWeatherCondition = function () {
 writeEntries([]);
 applyAtmosphere();
 window.dispatchEvent(new CustomEvent('atmospherechange', { detail: window.siteAtmosphere }));
 };

 applyAtmosphere();
 // One shared heartbeat instead of every consumer running its own
 // setInterval(..., 60000) — hours.js's render loop listens for this
 // instead of keeping a second, independently-drifting 60s timer.
 // Distinct from 'atmospherechange' (dispatched only when something
 // actually changed, e.g. a weather toggle) since this fires every
 // tick regardless.
 window.setInterval(() => {
 applyAtmosphere();
 window.dispatchEvent(new CustomEvent('atmospheretick', { detail: window.siteAtmosphere }));
 }, 60000);
})();