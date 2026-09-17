const requestedSeason = new URLSearchParams(window.location.search).get('season');
const requestedEntry = new URLSearchParams(window.location.search).get('entry');
const seasonKey = ['spring', 'summer', 'autumn', 'winter'].includes(requestedSeason)
  ? requestedSeason
  : currentSeason();
let season;
let readingIndex = 0;

function renderSeasonReading() {
  const entry = season.entries[readingIndex];
  document.title = `${entry.title} — The Current Season`;
  document.getElementById('season-reading-subtitle').textContent = entry.subtitle || season.subtitle;
  document.getElementById('season-reading-label').textContent = season.label;
  document.getElementById('season-reading-title').textContent = entry.title;
  document.getElementById('season-reading-latin').textContent = entry.latin;
  document.getElementById('season-reading-dek').textContent = entry.subtitle || `A seasonal reading from ${season.label}.`;
  document.getElementById('season-reading-observation').textContent = entry.published
    ? `Published ${entry.published} · ${season.label}`
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
    season = {
      label: seasonKey.charAt(0).toUpperCase() + seasonKey.slice(1),
      subtitle: 'Species drawn from Lectio Terra, this season',
      entries
    };
    const requestedIndex = entries.findIndex(entry => entry.id === requestedEntry);
    if (requestedIndex >= 0) readingIndex = requestedIndex;
    document.getElementById('season-turn-page').addEventListener('click', () => {
      readingIndex = (readingIndex + 1) % season.entries.length;
      renderSeasonReading();
    });
    renderSeasonReading();
  } catch (error) {
    document.getElementById('season-reading-body').innerHTML = '<p>The seasonal reading could not be opened. Please return soon.</p>';
    console.error(error);
  }
}

initialiseSeason();
