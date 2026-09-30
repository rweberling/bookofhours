
/* Shared atmospheric state for every page. */
(function () {
 // The watches and their start hours are HOURS, in shared.js.
 const TIME_BLOCKS = HOURS;
 const WEATHER_KEY = 'earthly-hours-weather';
 // The measured values behind a "look outside" detection (temperature,
 // wind, cloud cover) — kept apart from the conditions themselves, and
 // only ever present while the active conditions are exactly the detected
 // ones: any manual change drops it (see toggleWeatherCondition), so a
 // stored 75° can never sit beside a hand-picked Cold.
 const READING_KEY = 'earthly-hours-weather-reading';
 // The rounded location from the last "look outside" (the same ~1 km
 // coordinates it sends to Open-Meteo), kept in this browser only, so the
 // Hours dial can work out each day's sunrise and sunset — see sunTimes()
 // — without another lookup, and without the day running out at midnight.
 // Not undone by choosing weather by hand: it's where you are, not what
 // the weather is.
 const LOCATION_KEY = 'earthly-hours-location';
 // One word each, on purpose — they're read out on their own (the Weather
 // card, the hour page) as well as under weather.js's picker row headings.
 const WEATHER = [
 'clear', 'dappled', 'overcast', 'mist', 'fog',
 'drizzle', 'rain', 'thunder', 'ice', 'snow',
 'wind', 'heat', 'cold', 'humid', 'changing',
 'dew', 'frost', 'puddles', 'parched', 'snowpack'
 ];

 // The one list of valid conditions — weather.js's weather picker builds its
 // tiles from this (deriving display labels mechanically, see
 // weatherLabel() there) instead of hand-maintaining a second, differently-
 // cased copy that has to be kept in sync by hand.
 window.WEATHER_VALUES = WEATHER.slice();

 // Every condition's kebab-case value ('snow-on-ground') mechanically
 // produces its display label ('Snow on ground') — capitalize the first
 // letter, turn hyphens into spaces — so there's no separate hand-written
 // display list to keep in sync. Global so hours.js's #weather-line and
 // weather.js's tiles/readout share one copy.
 window.weatherLabel = function (value) {
 return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
 };

 // The one way a list of conditions is written out anywhere on the site
 // (the hour page's #weather-line, the Weather card's readout) — each name
 // in its own .wx element carrying data-wx, so styles.css can tint every
 // condition the same way wherever it appears.
 window.weatherConditionsHTML = function (values) {
 return (values || [])
 .map(value => `<span class="wx" data-wx="${value}">${window.weatherLabel(value)}</span>`)
 .join('<span class="sep" aria-hidden="true">✦</span>');
 };

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

 // The season's months are defined once, in shared.js, which every page
 // loads before this file (scripts/check_data.py checks the order).
 function seasonKey(date) {
 return currentSeason(date);
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

 function writeReading(reading) {
 try {
 if (reading) {
 window.localStorage.setItem(READING_KEY, JSON.stringify(reading));
 } else {
 window.localStorage.removeItem(READING_KEY);
 }
 } catch (error) {}
 }

 // Same TTL as the conditions it was detected alongside.
 function storedReading() {
 try {
 const raw = window.localStorage.getItem(READING_KEY);
 if (!raw) return null;
 const reading = JSON.parse(raw);
 if (!reading || typeof reading.setAt !== 'number' || Date.now() - reading.setAt > WEATHER_TTL_MS) {
 writeReading(null);
 return null;
 }
 return reading;
 } catch (error) {
 writeReading(null);
 return null;
 }
 }

 // Sunrise and sunset for a date and place, by the standard sunrise
 // equation (solar mean anomaly, equation of center, declination, hour
 // angle at −0.833° for refraction and the sun's radius). Within about 3
 // minutes of Open-Meteo's own times from the equator to the Arctic. Null
 // on days the sun doesn't rise or doesn't set (polar winter/summer).
 function sunTimes(latitude, longitude, date = new Date()) {
 const rad = Math.PI / 180;
 const jdNoon = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12) / 86400000 + 2440587.5;
 const n = Math.ceil(jdNoon - 2451545.0 + 0.0008);
 const meanSolarTime = n - longitude / 360;
 const M = (357.5291 + 0.98560028 * meanSolarTime) % 360;
 const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
 const lambda = (M + C + 180 + 102.9372) % 360;
 const transit = 2451545.0 + meanSolarTime + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * lambda * rad);
 const sinDecl = Math.sin(lambda * rad) * Math.sin(23.4397 * rad);
 const cosDecl = Math.cos(Math.asin(sinDecl));
 const cosHour = (Math.sin(-0.833 * rad) - Math.sin(latitude * rad) * sinDecl) / (Math.cos(latitude * rad) * cosDecl);
 if (cosHour < -1 || cosHour > 1) return null;
 const hourAngle = Math.acos(cosHour) / rad;
 const toDate = jd => new Date((jd - 2440587.5) * 86400000);
 return { sunrise: toDate(transit - hourAngle / 360), sunset: toDate(transit + hourAngle / 360) };
 }

 function storedLocation() {
 try {
 const raw = window.localStorage.getItem(LOCATION_KEY);
 if (!raw) return null;
 const loc = JSON.parse(raw);
 return loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number' ? loc : null;
 } catch (error) {
 return null;
 }
 }

 function writeLocation(reading) {
 if (!reading || typeof reading.latitude !== 'number' || typeof reading.longitude !== 'number') return;
 try {
 window.localStorage.setItem(LOCATION_KEY, JSON.stringify({ latitude: reading.latitude, longitude: reading.longitude }));
 // The earlier, date-bound sunrise/sunset record this replaces.
 window.localStorage.removeItem('earthly-hours-sun');
 } catch (error) {}
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
 body.classList.remove(...SEASON_KEYS.map(season => `season-${season}`));
 body.classList.remove(...WEATHER.map(weather => `weather-${weather}`));

 const currentTime = timeKey(date);
 // Named currentSeasonKey, not currentSeason — that name belongs to the
 // global function from shared.js that seasonKey() above may
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
 weather: currentWeather,
 // Everything readingFromOpenMeteo() in weather.js keeps — temperature
 // and dewPoint (°F), windSpeed (mph), windDirection (degrees the wind
 // blows *from*, 0 = north), cloudCover (%), visibility (ft), pressure
 // and pressureChange over 3 hours (hPa), and more — plus setAt; or null
 reading: currentWeather.length ? storedReading() : null,
 // Today's sunrise and sunset ({ sunrise, sunset } Dates), if "look
 // outside" has ever run here; null otherwise, or on a polar day/night.
 sun: (loc => loc ? sunTimes(loc.latitude, loc.longitude, date) : null)(storedLocation())
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
 writeReading(null);
 applyAtmosphere();
 window.dispatchEvent(new CustomEvent('atmospherechange', { detail: window.siteAtmosphere }));
 };

 // For detection: replaces the active set wholesale with what Open-Meteo
 // reported (sky condition + any independent temperature/wind/ground
 // layers), rather than merging with whatever was manually toggled before.
 // reading (optional) is the measured values those conditions came from.
 window.setWeatherConditions = function (conditions, reading) {
 const setAt = Date.now();
 const values = (conditions || [])
 .map(c => String(c || '').toLowerCase().replace(/\s+/g, '-'))
 .filter(v => WEATHER.includes(v));
 writeEntries(values.map(value => ({ value, setAt })));
 writeReading(reading && values.length ? { ...reading, setAt } : null);
 writeLocation(reading);
 applyAtmosphere();
 window.dispatchEvent(new CustomEvent('atmospherechange', { detail: window.siteAtmosphere }));
 };

 window.clearWeatherCondition = function () {
 writeEntries([]);
 writeReading(null);
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