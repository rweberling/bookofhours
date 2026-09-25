const requestedSeason = new URLSearchParams(window.location.search).get('season');
const requestedEntry = new URLSearchParams(window.location.search).get('entry');
const seasonKey = ['spring', 'summer', 'autumn', 'winter'].includes(requestedSeason)
  ? requestedSeason
  : currentSeason();
let season;
let currentEntryId = null;

function renderSeasonReading(entry) {
  currentEntryId = entry.id;

  // seasons.js only ever renders real fetched entries (no fallback-sample
  // path here), so isRealEntry is always true — see resolveSpeciesFields()
  // in seasonal-data.js, shared with hours.js's species grid.
  const { species, latin, readings } = resolveSpeciesFields(entry, true);
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
    const data = await loadLectioData();
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
    const turnPageWrap = document.getElementById('season-turn-page')?.closest('.turn-the-page');
    if (entries.length > 1) {
      document.getElementById('season-turn-page').addEventListener('click', () => {
        const next = pickExcluding(season.entries, entry => entry.id === currentEntryId);
        renderSeasonReading(next);
      });
    } else if (turnPageWrap) {
      // Only one post assigned to this season so far — a "turn the page"
      // that always lands back on the same reading reads as broken, not
      // quiet, so hide it until there's a second post to turn to.
      turnPageWrap.hidden = true;
    }
    renderSeasonReading(startingEntry);
  } catch (error) {
    document.getElementById('season-reading-body').innerHTML = '<p>The seasonal reading could not be opened. Please return soon.</p>';
    console.error(error);
  }
}

initialiseSeason();