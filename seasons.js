/* ══════════════════════════════════════════════════════════════
   THE SEASONS — seasons.html
   Both of the section's ways in live here: The Current Season (one
   species reading at a time, turn the page for another) and Wander
   the Seasons (the dial + every season's species cards, in a pane).
   Picking a card swaps the reading in place and closes the pane.

   Expects shared.js (season data, pick helpers, dial geometry,
   loadLectioData) and nav.js (requireDfosSignIn, closeOverlayPane).
══════════════════════════════════════════════════════════════ */

// SEASON_LABELS, SEASON_KEYS and SEASON_MONTH_RANGES come from shared.js.

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
  // shared.js, shared with the species cards below.
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
    ? `Published ${longDate(entry.published)}`
    : `A species reading for ${season.label}.`;

  const body = document.getElementById('season-reading-body');
  // The post's images point at the full-size masters. Their src is set
  // aside before the HTML goes in (so the browser doesn't start fetching
  // the masters), then each is pointed at its web copies.
  const html = entry.bodyHtml || `<p>${entry.body || ''}</p>`;
  body.innerHTML = html.replace(/<img\b([^>]*?)\ssrc="(images\/[^"]+)"/g, '<img$1 data-master="$2"');
  body.querySelectorAll('img[data-master]').forEach(img => {
    img.loading = 'lazy';
    setWebImage(img, img.dataset.master, '(max-width: 680px) 92vw, 640px');
  });
  markReadings(body, entry.readingLabels || []);
  markParts(body);
  updateRunningHead();
}

/* ── The post's parts, named in the margin ────────────────────────
   A post is in parts, each under its own heading: Headnote, Readings,
   Supplementum (More, in early posts). On wide screens each part's
   heading moves into the left margin, beside the part: Headnote and
   Supplementum travel down with their text, as the reading numerals
   do; Readings travels too, with each reading's numeral held just
   beneath it in turn. On narrower screens the headings stay where they
   are, and the running head (below) names the part instead.
   Other headings inside a post are left alone.
────────────────────────────────────────────────────────────────── */
/* ── The running head (narrower screens) ─────────────────────────
   Where there's no margin, a slim line at the top of the screen names
   where you are in the post once you've scrolled into it, as a book's
   running head does: "Headnote", or "Readings · II · Vladimir
   Nabokov". It changes as each part and reading reaches the top, and
   hides above and below the post. On wide screens the margin labels
   do this job and the line stays hidden (CSS).
────────────────────────────────────────────────────────────────── */
const RUNNING_HEAD_LINE = 72;   // px from the top: what has passed this is "where you are"
let runningHead = null;

function updateRunningHead() {
  if (!runningHead) {
    runningHead = document.createElement('div');
    runningHead.className = 'running-head';
    runningHead.setAttribute('aria-hidden', 'true');   // the headings themselves are in the page
    document.body.appendChild(runningHead);
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; updateRunningHead(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }
  const body = document.getElementById('season-reading-body');
  const passed = el => el.getBoundingClientRect().top < RUNNING_HEAD_LINE;
  const part = [...body.querySelectorAll('.post-part')].filter(passed).pop();
  const inPost = part && body.getBoundingClientRect().bottom > RUNNING_HEAD_LINE + 40;
  let text = '';
  if (inPost) {
    const heading = part.querySelector('.part-margin-label :is(h2, h3, h4)');
    text = heading ? heading.textContent.trim() : '';
    const reading = [...part.querySelectorAll('.reading')].filter(passed).pop();
    if (reading) {
      const label = reading.querySelector('.reading-margin-label');
      const bits = [...label.children].map(el => el.textContent.trim()).filter(Boolean);
      text += ' · ' + bits.slice(0, 2).join(' · ');   // numeral, and author if there is one
    }
  }
  if (text) runningHead.textContent = text;
  runningHead.classList.toggle('is-shown', !!text);
}

const POST_PARTS = /^\s*(headnote|readings|supplementum|more)\s*$/i;

function markParts(body) {
  const headings = [...body.children].filter(el => /^H[2-4]$/.test(el.tagName) && POST_PARTS.test(el.textContent));
  headings.forEach(heading => {
    const part = document.createElement('div');
    part.className = 'post-part';
    if (/readings/i.test(heading.textContent)) part.classList.add('post-part-readings');
    heading.before(part);
    // The part runs to the next part's heading.
    let node = heading.nextSibling;
    while (node && !headings.includes(node)) {
      const next = node.nextSibling;
      part.appendChild(node);
      node = next;
    }
    const margin = document.createElement('aside');
    margin.className = 'part-margin';
    const label = document.createElement('div');
    label.className = 'part-margin-label';
    label.appendChild(heading);
    margin.appendChild(label);
    part.prepend(margin);
  });
}

/* ── The readings, marked in the margin ───────────────────────────
   Under a post's "Readings" heading, each reading arrives as a
   one-item list holding the passage, followed by its citation. Each
   gets a label in the margin: a numeral (I, II, III) and, where the
   post has them, the author and work from entry.readingLabels — one
   { author, work } per reading, in order, written by hand in
   lectio-data.json (import_substack.py leaves them alone unless the
   post is re-imported with --refresh). On wide screens the label sits
   in the left margin and travels down beside its passage; on narrower
   ones it sits just above it.

   The reading itself is left exactly as it came: the passage and its
   citation are only gathered into a <section> so the label can stay
   beside them.
────────────────────────────────────────────────────────────────── */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const READING_BLOCKS = new Set(['P', 'OL', 'UL', 'H2', 'H3', 'H4', 'FIGURE', 'HR', 'BLOCKQUOTE']);

function markReadings(body, labels) {
  let inReadings = false;
  const lists = [];
  for (const el of body.children) {
    if (/^H[2-4]$/.test(el.tagName)) inReadings = /^\s*readings\s*$/i.test(el.textContent);
    else if (inReadings && el.tagName === 'OL') lists.push(el);
  }
  lists.forEach((list, i) => {
    const section = document.createElement('section');
    section.className = 'reading';
    list.before(section);
    // The passage, then its citation: everything up to the next block.
    let node = list;
    while (node && !(node !== list && node.nodeType === 1 && READING_BLOCKS.has(node.tagName))) {
      const next = node.nextSibling;
      section.appendChild(node);
      node = next;
    }
    const label = labels[i] || {};
    const margin = document.createElement('aside');
    margin.className = 'reading-margin';
    margin.innerHTML = `<div class="reading-margin-label">
      <span class="reading-numeral">${ROMAN[i] || i + 1}</span>
      ${label.author ? `<span class="reading-author">${escapeHTML(label.author)}</span>` : ''}
      ${label.work ? `<span class="reading-work">${escapeHTML(label.work)}</span>` : ''}
    </div>`;
    section.prepend(margin);
  });
}

// "2026-07-14" -> "July 14, 2026". Read as UTC so the date doesn't slip
// back a day for readers west of Greenwich.
function longDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US',
    { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' });
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

// The button sits at the foot of the post, so the next post opens at its
// top, as a turned page does.
function turnSeasonPage() {
  renderSeasonReading(pickExcluding(season.entries, entry => entry.id === currentEntryId));
  window.scrollTo(0, 0);
}

/* ── Wander the Seasons: the dial ─────────────────────────────── */

// Center and arc radius are shared with the Hours dial (CX/CY/R_ARC in
// shared.js) — same wheel, different labels. The season names sit
// further out than the Hours dial's watch names (122 vs 110): they're
// larger and unrotated, and need clear space off the arc and its ticks.
const SEASON_R_LABEL = 122;
const SEASON_R_TICK = 100, SEASON_R_TICK_INNER = 96;   // month ticks, as the Hours dial's
// Solstice/equinox/cross-quarter marks sit just inside the ring, each
// directly beside its name.
const SEASON_R_MARK = 76;
const SEASON_R_INNER_LABEL = 68;

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

/* ── The year's turning points ────────────────────────────────────
   Solstices and equinoxes named by season — spring equinox, summer
   solstice, and so on, matching the site's northern-hemisphere seasons
   (spring is March–May) — and the four cross-quarter days at the true
   midpoints between them. No feast or festival names, on purpose, so
   the dial belongs to no one tradition. Dates come from Meeus's mean-equinox polynomials
   (Astronomical Algorithms, ch. 27, valid 2000–3000), which land within
   about ten minutes of the published times: plenty for a dial.
────────────────────────────────────────────────────────────────── */
const SOLSTICE_TERMS = {
  march:     [2451623.80984, 365242.37404,  0.05169, -0.00411, -0.00057],
  june:      [2451716.56767, 365241.62603,  0.00325,  0.00888, -0.00030],
  september: [2451810.21715, 365242.01767, -0.11575,  0.00337,  0.00078],
  december:  [2451900.05952, 365242.74049, -0.06223, -0.00823,  0.00032]
};

function solsticeDate(key, year) {
  const Y = (year - 2000) / 1000;
  const [a, b, c, d, e] = SOLSTICE_TERMS[key];
  const jde = a + b * Y + c * Y ** 2 + d * Y ** 3 + e * Y ** 4;
  return new Date((jde - 2440587.5) * 86400000);
}

// The dial's year runs from 1 March (top of the wheel, the start of
// meteorological spring) to the next 1 March.
function dialYearOf(date) {
  return date.getMonth() >= 2 ? date.getFullYear() : date.getFullYear() - 1;
}

function dialDeg(date, dialYear) {
  const start = new Date(dialYear, 2, 1), end = new Date(dialYear + 1, 2, 1);
  return -90 + ((date - start) / (end - start)) * 360;
}

// Every marker falling within one dial year, in order.
function turningPoints(dialYear) {
  const quarters = [
    { name: 'spring equinox',  date: solsticeDate('march', dialYear) },
    { name: 'summer solstice', date: solsticeDate('june', dialYear) },
    { name: 'autumn equinox',  date: solsticeDate('september', dialYear) },
    { name: 'winter solstice', date: solsticeDate('december', dialYear) },
    { name: 'spring equinox',  date: solsticeDate('march', dialYear + 1) }
  ];
  const points = [];
  for (let i = 0; i < 4; i++) {
    points.push({ ...quarters[i], kind: 'quarter' });
    points.push({
      name: 'cross-quarter', kind: 'cross',
      date: new Date((quarters[i].date.getTime() + quarters[i + 1].date.getTime()) / 2)
    });
  }
  return points;
}

// Whole calendar days between two dates, in local time.
function daysBetween(a, b) {
  const day = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((day(b) - day(a)) / 86400000);
}

const DIAL_DATE_FORMAT = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' });

// "September 26 · 4 days after the autumn equinox · 41 days to the next
// cross-quarter" — where today sits between its two nearest markers.
function turningPointCaption(now = new Date()) {
  const year = dialYearOf(now);
  const points = [...turningPoints(year - 1), ...turningPoints(year), ...turningPoints(year + 1)];
  const today = points.find(p => daysBetween(now, p.date) === 0);
  const label = p => p.kind === 'cross' ? 'a cross-quarter day' : `the ${p.name}`;
  if (today) return `${DIAL_DATE_FORMAT.format(now)} · Today is ${label(today)}`;
  const previous = [...points].reverse().find(p => p.date < now);
  const next = points.find(p => p.date > now);
  const plural = n => `${n} day${n === 1 ? '' : 's'}`;
  const nextLabel = next.kind === 'cross' ? 'the next cross-quarter' : `the ${next.name}`;
  return `${DIAL_DATE_FORMAT.format(now)} · ${plural(daysBetween(previous.date, now))} after ${label(previous)} · ${plural(daysBetween(now, next.date))} to ${nextLabel}`;
}

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

  // Month ticks, like the Hours dial's hour ticks; the four that start a
  // season (1 Mar/Jun/Sep/Dec) sit on the quadrant lines, a little longer.
  const now = new Date();
  const year = dialYearOf(now);
  for (let m = 0; m < 12; m++) {
    const deg = dialDeg(new Date(year, 2 + m, 1), year);
    const isSeason = m % 3 === 0;
    const p1 = polarToXY(deg, isSeason ? SEASON_R_TICK_INNER - 2 : SEASON_R_TICK_INNER + 1);
    const p2 = polarToXY(deg, isSeason ? SEASON_R_TICK + 2 : SEASON_R_TICK);
    const tick = document.createElementNS(svgNS, 'line');
    tick.setAttribute('x1', p1.x); tick.setAttribute('y1', p1.y);
    tick.setAttribute('x2', p2.x); tick.setAttribute('y2', p2.y);
    tick.setAttribute('stroke', 'currentColor');
    tick.setAttribute('stroke-width', isSeason ? '1' : '0.5');
    tick.setAttribute('opacity', isSeason ? '0.3' : '0.14');
    svg.appendChild(tick);
  }

  // Solstices, equinoxes and cross-quarters: a mark just inside the arc
  // with its name beside it, clear of the season names outside. The ring
  // says only "Equinox"/"Solstice" — its quadrant already names the
  // season — while the hover title keeps the full name and date.
  turningPoints(year).forEach(point => {
    const deg = dialDeg(point.date, year);
    const g = document.createElementNS(svgNS, 'g');
    g.setAttribute('class', `turning-point turning-point-${point.kind}`);
    const title = document.createElementNS(svgNS, 'title');
    const titleName = point.kind === 'cross' ? 'Cross-quarter day' : point.name.charAt(0).toUpperCase() + point.name.slice(1);
    title.textContent = `${titleName} · ${DIAL_DATE_FORMAT.format(point.date)}`;
    g.appendChild(title);

    const m = polarToXY(deg, SEASON_R_MARK);
    const mark = document.createElementNS(svgNS, point.kind === 'quarter' ? 'rect' : 'circle');
    if (point.kind === 'quarter') {
      mark.setAttribute('x', m.x - 2.2); mark.setAttribute('y', m.y - 2.2);
      mark.setAttribute('width', 4.4); mark.setAttribute('height', 4.4);
      mark.setAttribute('transform', `rotate(45, ${m.x}, ${m.y})`);
    } else {
      mark.setAttribute('cx', m.x); mark.setAttribute('cy', m.y); mark.setAttribute('r', 1.6);
    }
    g.appendChild(mark);

    // Names read along the ring, turned upright on the lower half.
    const lp = polarToXY(deg, SEASON_R_INNER_LABEL);
    const upright = deg > 0 && deg < 180;
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', lp.x); text.setAttribute('y', lp.y);
    text.setAttribute('class', 'turning-point-label');
    text.setAttribute('transform', `rotate(${upright ? deg - 90 : deg + 90}, ${lp.x}, ${lp.y})`);
    text.textContent = point.kind === 'cross' ? 'Cross-Quarter' : point.name.split(' ')[1].replace(/^./, c => c.toUpperCase());
    g.appendChild(text);
    svg.appendChild(g);
  });

  // Today, as a star on the arc — the Hours dial's "now" mark.
  const nowPoint = polarToXY(dialDeg(now, year), R_ARC);
  const nowStar = document.createElementNS(svgNS, 'text');
  nowStar.setAttribute('x', nowPoint.x); nowStar.setAttribute('y', nowPoint.y);
  nowStar.setAttribute('class', 'season-now');
  nowStar.textContent = '✦';
  const nowTitle = document.createElementNS(svgNS, 'title');
  nowTitle.textContent = `Today · ${DIAL_DATE_FORMAT.format(now)}`;
  nowStar.appendChild(nowTitle);
  svg.appendChild(nowStar);

  const caption = document.getElementById('season-dial-caption');
  if (caption) caption.textContent = turningPointCaption(now);

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
// species lists in shared.js, so the grid isn't empty.
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
        setWebImage(thumb, entry.images[0].src, '240px', [800]);
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
  openOverlayPane(pane);
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
  window.addEventListener('hashchange', openWanderSeasonsIfHashed);
  // On this page the menu's Wander item is a button (see nav.js).
  const wanderButton = document.getElementById('season-wander-open');
  if (wanderButton) wanderButton.addEventListener('click', openWanderSeasons);

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
