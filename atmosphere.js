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
      const value = window.localStorage.getItem(WEATHER_KEY);
      return WEATHER.includes(value) ? value : null;
    } catch (error) {
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
      window.localStorage.setItem(WEATHER_KEY, value);
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
