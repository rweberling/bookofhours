const requestedSeason = new URLSearchParams(window.location.search).get('season');
const requestedEntry = new URLSearchParams(window.location.search).get('entry');
const seasonKey = ['spring', 'summer', 'autumn', 'winter'].includes(requestedSeason)
  ? requestedSeason
  : currentSeason();
let season;
let currentEntryId = null;

function renderSeasonReading(entry) {
  currentEntryId = entry.id;

  // Hand-edited entries carry real species/latin/readings fields directly.
  // seasons.js only ever renders real fetched entries (no fallback-sample
  // path here), so anything without a `species` field just hasn't been
  // hand-edited yet — parse the raw weekly title as a stopgap. See
  // parsePostTitle()/creditLine()/SPECIES_LATIN_LOOKUP in seasonal-data.js.
  let species, latin, readings;
  if (entry.species) {
    species = entry.species;
    latin = entry.latin || null;
    readings = entry.readings || [];
  } else {
    const parsed = parsePostTitle(entry.title);
    species = parsed.species;
    readings = parsed.readings;
    latin = SPECIES_LATIN_LOOKUP.get(species.toLowerCase()) || null;
  }
  const credits = creditLine(readings);

  document.title = `${species} — The Current Season`;
  document.getElementById('season-reading-subtitle').textContent = season.subtitle;
  document.getElementById('season-reading-title').textContent = species;

  const latinEl = document.getElementById('season-reading-latin');
  latinEl.textContent = latin || '';
  latinEl.hidden = !latin;

  // Credits live in exactly one place (the dek, right under the title) —
  // the observation line below the body is for the publish date only, so
  // the two don't repeat the same names.
  document.getElementById('season-reading-dek').textContent = credits || `A seasonal reading from ${season.label}.`;
  document.getElementById('season-reading-observation').textContent = entry.published
    ? `Published ${entry.published}`
    : `A species reading for ${season.label}.`;

  const body = document.getElementById('season-reading-body');
  body.innerHTML = entry.bodyHtml || `<p>${entry.body || ''}</p>`;
}

async function initialiseSeason() {
  try {
    const response = await fetch('lectio-data.json');
    if (!response.ok) throw new Error(`Unable to load Lectio Terra posts (${response.status}).`);
    const data = await response.json();
    const entries = data.seasons[seasonKey];
    if (!Array.isArray(entries) || !entries.length) throw new Error(`No posts assigned to ${seasonKey}.`);
    const label = seasonKey.charAt(0).toUpperCase() + seasonKey.slice(1);
    season = {
      label,
      subtitle: `${label} ✦ ${SEASON_MONTH_RANGES[seasonKey]}`,
      entries
    };
    const requestedMatch = entries.find(entry => entry.id === requestedEntry);
    const startingEntry = requestedMatch || pick(entries);
    document.getElementById('season-turn-page').addEventListener('click', () => {
      const next = pickExcluding(season.entries, entry => entry.id === currentEntryId);
      renderSeasonReading(next);
    });
    renderSeasonReading(startingEntry);
  } catch (error) {
    document.getElementById('season-reading-body').innerHTML = '<p>The seasonal reading could not be opened. Please return soon.</p>';
    console.error(error);
  }
}

initialiseSeason();