/* ══════════════════════════════════════════════════════════════
   THE SEASONS — seasons.html
   Both of the section's ways in live here: The Current Season (one
   species reading at a time, turn the page for another) and Wander
   the Seasons (the dial + every season's species cards, in a pane).
   Picking a card swaps the reading in place and closes the pane.

   Expects seasonal-data.js (season data, pick helpers, dial geometry,
   loadLectioData) and nav.js (requireDfosSignIn, closeOverlayPane).
══════════════════════════════════════════════════════════════ */

const SEASON_LABELS = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };

let lectioSeasons = null;   // lectio-data.json's { spring: [...], ... }, once loaded
let season = null;          // the season whose readings are showing
let currentEntryId = null;

function seasonFromURL() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('season');
  return {
    key: SEASON_KEYS.includes(key) ? key : currentSeason(),
    entryId: params.get('entry')
  };
}

/* ── The reading ──────────────────────────────────────────────── */

function renderSeasonReading(entry) {
  currentEntryId = entry.id;

  // Only real fetched entries are ever rendered here (no fallback-sample
  // path), so isRealEntry is always true — see resolveSpeciesFields() in
  // seasonal-data.js, shared with the species cards below.
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

function setSeason(key) {
  const entries = lectioSeasons[key];
  if (!Array.isArray(entries) || !entries.length) throw new Error(`No posts assigned to ${key}.`);
  season = {
    key,
    label: SEASON_LABELS[key],
    subtitle: `${SEASON_LABELS[key]} ✦ ${SEASON_MONTH_RANGES[key]}`,
    entries
  };
  // Only one post assigned to this season so far — a "turn the page" that
  // always lands back on the same reading reads as broken, not quiet, so
  // hide it until there's a second post to turn to.
  const turnPageWrap = document.getElementById('season-turn-page').closest('.turn-the-page');
  turnPageWrap.hidden = entries.length < 2;
}

// Shows a given entry (or a random one from that season, if the id is
// missing or unknown), switching seasons first if needed.
function showSeasonEntry(key, entryId) {
  if (!season || season.key !== key) setSeason(key);
  const entry = season.entries.find(e => e.id === entryId) || pick(season.entries);
  renderSeasonReading(entry);
}

function turnSeasonPage() {
  renderSeasonReading(pickExcluding(season.entries, entry => entry.id === currentEntryId));
}

/* ── Wander the Seasons: the dial ─────────────────────────────── */

// Center and arc radius are shared with the Hours dial (CX/CY/R_ARC in
// seasonal-data.js) — same wheel, different labels. Only the label
// radius is deliberately different (112 vs the Hours dial's 110): the
// season quadrant labels needed a hair more clearance from the arc.
const SEASON_R_LABEL = 112;

// Quadrant order matches clock position: spring NE, summer NW,
// autumn SW mirrored to sit opposite spring, winter SE — arranged
// so the current season always renders in the same screen position
// as it would on a real yearly calendar face (spring at upper-right).
const SEASON_QUADRANTS = [
  { key: 'spring', startDeg: -90, endDeg: 0   },
  { key: 'summer', startDeg: 0,   endDeg: 90  },
  { key: 'autumn', startDeg: 90,  endDeg: 180 },
  { key: 'winter', startDeg: 180, endDeg: 270 }
];

function buildSeasonDial() {
  const svg = document.getElementById('season-dial');
  svg.innerHTML = '';

  const bgRing = document.createElementNS(svgNS, 'circle');
  bgRing.setAttribute('cx', CX); bgRing.setAttribute('cy', CY);
  bgRing.setAttribute('r', R_ARC);
  bgRing.setAttribute('fill', 'none');
  bgRing.setAttribute('stroke', 'currentColor');
  bgRing.setAttribute('stroke-width', '14');
  bgRing.setAttribute('opacity', '0.06');
  svg.appendChild(bgRing);

  const line1 = document.createElementNS(svgNS, 'line');
  line1.setAttribute('x1', CX); line1.setAttribute('y1', CY - R_ARC - 14);
  line1.setAttribute('x2', CX); line1.setAttribute('y2', CY + R_ARC + 14);
  line1.setAttribute('stroke', 'currentColor'); line1.setAttribute('stroke-width', '0.5'); line1.setAttribute('opacity', '0.15');
  svg.appendChild(line1);

  const line2 = document.createElementNS(svgNS, 'line');
  line2.setAttribute('x1', CX - R_ARC - 14); line2.setAttribute('y1', CY);
  line2.setAttribute('x2', CX + R_ARC + 14); line2.setAttribute('y2', CY);
  line2.setAttribute('stroke', 'currentColor'); line2.setAttribute('stroke-width', '0.5'); line2.setAttribute('opacity', '0.15');
  svg.appendChild(line2);

  SEASON_QUADRANTS.forEach(q => {
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', arcPath(q.startDeg, q.endDeg, R_ARC));
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('fill', 'none');
    path.setAttribute('class', 'season-arc');
    path.setAttribute('data-season', q.key);
    svg.appendChild(path);

    const midDeg = (q.startDeg + q.endDeg) / 2;
    const lp = polarToXY(midDeg, SEASON_R_LABEL);
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', lp.x);
    text.setAttribute('y', lp.y);
    text.setAttribute('class', 'season-label');
    text.setAttribute('data-season', q.key);
    text.textContent = SEASON_LABELS[q.key].toUpperCase();
    svg.appendChild(text);
  });

  const centerDot = document.createElementNS(svgNS, 'circle');
  centerDot.setAttribute('cx', CX); centerDot.setAttribute('cy', CY);
  centerDot.setAttribute('r', '3');
  centerDot.setAttribute('fill', 'currentColor'); centerDot.setAttribute('opacity', '0.35');
  svg.appendChild(centerDot);
}

function setSeasonDialActive(seasonKey) {
  document.querySelectorAll('.season-arc').forEach(el => {
    el.classList.toggle('active', el.dataset.season === seasonKey);
  });
  document.querySelectorAll('.season-label').forEach(el => {
    el.classList.toggle('active', el.dataset.season === seasonKey);
  });
}

/* ── Wander the Seasons: the species cards ────────────────────── */

// Only used if lectio-data.json can't be loaded: the hand-curated
// species lists in seasonal-data.js, so the grid isn't empty.
const SEASON_SPECIES = Object.fromEntries(
  SEASON_KEYS.map(key => [key, SEASONAL_DATA[key].species.map(([common, latin]) => ({ common, latin }))])
);

// The grid always shows all four seasons stacked (see .species-grid in
// css/styles.css). Built once per page load.
let speciesGridBuilt = false;
async function buildSpeciesGrid() {
  if (speciesGridBuilt) return;
  speciesGridBuilt = true;
  const grid = document.getElementById('species-grid');
  grid.innerHTML = '';
  let importedSeasons = null;
  try {
    const data = await loadLectioData();
    importedSeasons = data.seasons;
  } catch (error) {
    console.error(error);
  }

  SEASON_KEYS.forEach(key => {
    const group = document.createElement('section');
    group.className = 'species-season-section';
    group.dataset.season = key;

    const heading = document.createElement('h3');
    heading.className = 'species-season-heading';
    heading.textContent = SEASON_LABELS[key];
    group.appendChild(heading);

    const entryGrid = document.createElement('div');
    entryGrid.className = 'species-season-grid';
    const isRealEntries = !!(importedSeasons && importedSeasons[key]);
    const entries = isRealEntries
      ? importedSeasons[key]
      : SEASON_SPECIES[key].map(species => ({
          id: species.common.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: species.common,
          subtitle: species.latin
        }));
    entries.forEach(entry => {
      const card = document.createElement('a');
      card.className = 'species-card';
      card.href = `seasons.html?season=${key}&entry=${encodeURIComponent(entry.id)}`;

      // A real entry opens right here, in place — the link stays a real
      // link so a new-tab/cmd-click still works the ordinary way.
      if (isRealEntries) {
        card.addEventListener('click', e => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          // Remember which reading was showing (it may have been reached
          // by turning pages, which the URL doesn't record), so Back
          // returns to it rather than to a fresh random pick.
          history.replaceState({ season: season.key, entry: currentEntryId }, '', window.location.href);
          showSeasonEntry(key, entry.id);
          history.pushState({ season: key, entry: entry.id }, '', card.href);
          closeOverlayPane(document.getElementById('season-pane'));
          window.scrollTo(0, 0);
        });
      }

      const { species, latin, readings } = resolveSpeciesFields(entry, isRealEntries);

      if (entry.images && entry.images[0]) {
        const thumb = document.createElement('img');
        thumb.className = 'species-thumb';
        thumb.src = entry.images[0].src;
        thumb.alt = entry.images[0].alt || species;
        thumb.loading = 'lazy';
        card.appendChild(thumb);
      }

      const common = document.createElement('span');
      common.className = 'species-common';
      common.textContent = species;
      card.appendChild(common);

      if (latin) {
        const latinEl = document.createElement('span');
        latinEl.className = 'species-latin';
        latinEl.textContent = latin;
        card.appendChild(latinEl);
      }

      if (readings.length) {
        const credit = document.createElement('span');
        credit.className = 'species-credit';
        credit.textContent = creditLine(readings);
        card.appendChild(credit);
      }

      entryGrid.appendChild(card);
    });
    group.appendChild(entryGrid);
    grid.appendChild(group);
  });
}

/* ── Wander the Seasons: the pane ─────────────────────────────── */

// Opens on the season currently being read, so the dial and subheading
// match the page behind the pane.
function openSeasonPane() {
  const pane = document.getElementById('season-pane');
  if (!document.querySelector('.season-arc')) buildSeasonDial();
  const key = season ? season.key : currentSeason();
  const isReal = key === currentSeason();
  document.getElementById('season-subheading').textContent = isReal
    ? `Species drawn from Lectio Terra, this season (${SEASON_LABELS[key]})`
    : `Species drawn from Lectio Terra, browsing ${SEASON_LABELS[key]}`;
  setSeasonDialActive(key);
  buildSpeciesGrid();
  pane.style.display = 'flex';
  requestAnimationFrame(() => pane.classList.add('open'));
}

function openWanderSeasons() {
  if (requireDfosSignIn('season')) openSeasonPane();
}

// Name kept distinct from nav.js's openWanderIfHashed() (the Hours
// deep-link) — both are globals, and the later script would win.
function openWanderSeasonsIfHashed() {
  if (window.location.hash !== '#wander') return;
  history.replaceState(null, '', window.location.pathname + window.location.search);
  openWanderSeasons();
}

window.addEventListener('dfossignin', e => {
  if (e.detail && e.detail.intent === 'season') openSeasonPane();
});

/* ── Init ─────────────────────────────────────────────────────── */

async function initialiseSeason() {
  document.getElementById('season-turn-page').addEventListener('click', turnSeasonPage);

  // DOMContentLoaded (this runs from it, below), not script load: the
  // DFOS gate needs dfos-siwd.js, a module, to have run first.
  openWanderSeasonsIfHashed();
  // The nav's "Wander the Seasons" link on this same page only changes
  // the hash, it doesn't reload.
  window.addEventListener('hashchange', openWanderSeasonsIfHashed);

  try {
    const data = await loadLectioData();
    lectioSeasons = data.seasons;
    const { key, entryId } = seasonFromURL();
    showSeasonEntry(key, entryId);
  } catch (error) {
    document.getElementById('season-reading-body').innerHTML = '<p>The seasonal reading could not be opened. Please return soon.</p>';
    console.error(error);
    return;
  }

  // Back/forward between readings opened from the species cards.
  // popstate also fires for the in-page #wander link, which carries no
  // state and leaves the season unchanged — the reading behind the pane
  // stays put.
  window.addEventListener('popstate', e => {
    const { key, entryId } = e.state
      ? { key: e.state.season, entryId: e.state.entry }
      : seasonFromURL();
    if (key === season.key && (!entryId || entryId === currentEntryId)) return;
    showSeasonEntry(key, entryId);
  });
}

window.addEventListener('DOMContentLoaded', initialiseSeason);
