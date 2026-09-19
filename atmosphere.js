
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
 const WEATHER = ['clear', 'overcast', 'drizzle', 'rain', 'snow', 'snow-on-ground', 'fog', 'wind', 'thunderstorm', 'freezing-rain', 'heat'];

 // How long a chosen/detected condition stays in effect before the site
 // quietly falls back to ambient (ordinary ticking clock/season, no
 // weather class). 3 hours, not 1 — real weather doesn't usually flip
 // inside an hour, and reverting too eagerly would undo someone's
 // choice mid-visit. Adjust this one line if that balance feels off.
 const WEATHER_TTL_MS = 3 * 60 * 60 * 1000;

 function timeKey(date) {
 const hour = date.getHours();
 return TIME_BLOCKS.slice().reverse().find(block => hour >= block.start).key;
 }

 function seasonKey(date) {
 const month = date.getMonth();
 if (month >= 2 && month <= 4) return 'spring';
 if (month >= 5 && month <= 7) return 'summer';
 if (month >= 8 && month <= 10) return 'autumn';
 return 'winter';
 }

 function storedWeather() {
 try {
 const raw = window.localStorage.getItem(WEATHER_KEY);
 if (!raw) return null;

 const parsed = JSON.parse(raw);
 const value = parsed && parsed.value;
 const setAt = parsed && parsed.setAt;

 if (!WEATHER.includes(value) || typeof setAt !== 'number') {
 window.localStorage.removeItem(WEATHER_KEY);
 return null;
 }
 if (Date.now() - setAt > WEATHER_TTL_MS) {
 window.localStorage.removeItem(WEATHER_KEY);
 return null;
 }
 return value;
 } catch (error) {
 // Covers a leftover value from before this TTL existed (a plain
 // string, not JSON) as well as any other parse failure.
 try { window.localStorage.removeItem(WEATHER_KEY); } catch (_) {}
 return null;
 }
 }

 function applyAtmosphere(date = new Date()) {
 const body = document.body;
 if (!body) return;

 body.classList.remove(...TIME_BLOCKS.map(block => `block-${block.key}`));
 body.classList.remove(...SEASONS.map(season => `season-${season}`));
 body.classList.remove(...WEATHER.map(weather => `weather-${weather}`));

 const currentTime = timeKey(date);
 const currentSeason = seasonKey(date);
 const currentWeather = storedWeather();

 body.classList.add(`block-${currentTime}`, `season-${currentSeason}`);
 if (currentWeather) body.classList.add(`weather-${currentWeather}`);

 window.siteAtmosphere = {
 time: currentTime,
 season: currentSeason,
 weather: currentWeather
 };
 }

 window.setWeatherCondition = function (condition) {
 const value = String(condition || '').toLowerCase().replace(/\s+/g, '-');
 if (!WEATHER.includes(value)) return;
 try {
 window.localStorage.setItem(WEATHER_KEY, JSON.stringify({ value, setAt: Date.now() }));
 } catch (error) {
 // The visual state still applies when storage is unavailable.
 }
 applyAtmosphere();
 window.dispatchEvent(new CustomEvent('atmospherechange', { detail: window.siteAtmosphere }));
 };

 window.clearWeatherCondition = function () {
 try {
 window.localStorage.removeItem(WEATHER_KEY);
 } catch (error) {
 // Ignore storage restrictions; the next page load will recalculate state.
 }
 applyAtmosphere();
 window.dispatchEvent(new CustomEvent('atmospherechange', { detail: window.siteAtmosphere }));
 };

 applyAtmosphere();
 window.setInterval(() => applyAtmosphere(), 60000);
})();