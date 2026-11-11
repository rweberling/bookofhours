/* ══════════════════════════════════════════════════════════════
   THE SOURCES — sources.html
   The bibliography is built from the collection in data/ (and, for
   the Seasons, from data/lectio-data.json), so it always matches what the
   Hours and Weather pages show. Three parts, each in its own order:
     The Hours    — each watch, readings then images
     The Weather  — the weather picker's rows, plus "All Weather" for
                    the pieces shown before any condition is chosen;
                    a piece is listed once, under the first row any of
                    its conditions belongs to
     The Seasons  — each season's Lectio Terra posts, by week, each with
                    the passages and figures copied from it

   Each entry is a works-cited line: its hand-written bibliography line
   (or its display citation, until one is written), its title linked to
   where it was cited from, and the ¶ to its record page (/id/<id>/). Everything else about
   the piece (other copies, the suggested edition, further reading,
   rights, where it appears) is on the record page.

   The published page is static: scripts/build_sources.py opens
   sources.html?rebuild in headless Chrome, lets this script build the
   entries, and saves the result into sources.html between the
   sources:start and sources:end markers, so readers, citation tools and
   crawlers get plain HTML. On an ordinary visit this script does nothing
   while that saved content is there; it builds live only if the page
   has never been saved, or when the address ends in ?rebuild (a preview
   of the next save).

   Expects shared.js (loadCollection, loadLectioData,
   escapeHTML, SEASON_KEYS, SEASON_LABELS, SEASON_MONTH_RANGES,
   MONTH_NAMES) loaded before this file.
══════════════════════════════════════════════════════════════ */


// How the one link on each entry is labelled.
const LINK_LABELS = { cited: 'Source' };

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* ── One entry ────────────────────────────────────────────────── */

function linkGroupHTML(label, links) {
  if (!links.length) return '';
  const anchors = links.map(link =>
    `<a href="${escapeHTML(link.url)}" target="_blank">${escapeHTML(link.label)}</a>`
  ).join('<span class="sep">·</span>');
  return `<span class="links-label">${label}</span>${anchors}`;
}

// A record's cited link is its locator: where in the book to look, as
// directly as a click can go (a reading's, each text it quotes, a book
// plate's; one locator, or a list when a reading joins two places).
// Editions keep links to the book as a whole; other images their own.
function locatorLinks(holder) {
  const loc = holder && holder.locator;
  return (Array.isArray(loc) ? loc : loc ? [loc] : [])
    .filter(l => l.url)
    .map(l => ({ role: 'cited', label: l.label, url: l.url }));
}

function citationLinks(record) {
  if (record.citation) {
    const holders = [record.citation, ...(record.citation.quotes || [])];
    return [...holders.flatMap(locatorLinks), ...holders.flatMap(h => (h.edition && h.edition.links) || [])];
  }
  return [...locatorLinks(record), ...(record.links || [])];
}

// The citation with its source links set on the titles it names, in
// order: an italic title (<em>) whole, a quoted one inside its quotation
// marks (a comma or full stop closing it stays outside the link). Links
// left over, where a citation names fewer titles, come back as a list.
function linkTitles(citation, links) {
  const rest = links.slice();
  const html = String(citation || '').replace(
    /(<em>[\s\S]*?<\/em>)|(<[^>]+>)|(“)([^”]+?)([,.]?)(”)|(")([^"<>]+?)([,.]?)(")/g,
    (all, em, tag, o1, q1, p1, c1, o2, q2, p2, c2) => {
      if (tag || !rest.length) return all;
      const a = `<a href="${escapeHTML(rest.shift().url)}" target="_blank">`;
      if (em) return a + em + '</a>';
      const [open, inner, punct, close] = o1 ? [o1, q1, p1, c1] : [o2, q2, p2, c2];
      return `${open}${a}${inner}</a>${punct}${close}`;
    });
  return { html, rest };
}

function entryHTML(record) {
  const citation = record.citation
    ? (record.citation.bibliography || record.citation.display)
    : (record.bibliography || record.caption);
  // Where it was cited from, on its title: copies, the suggested edition,
  // further reading, rights and where it appears are on the record page,
  // one ¶ away.
  const { html, rest } = linkTitles(citation, citationLinks(record).filter(l => l.role === 'cited'));
  const source = linkGroupHTML(LINK_LABELS.cited, rest);
  return `
    <div class="entry" id="${escapeHTML(record.id)}">${(record.aliases || []).map(a =>
      `<span class="anchor-alias" id="${escapeHTML(a)}"></span>`).join('')}
      <p class="citation">${html}<a class="record-mark" href="/id/${escapeHTML(record.id)}/" title="The record: ${escapeHTML(record.id)}" aria-label="The record, ${escapeHTML(record.id)}">¶</a></p>
      ${source ? `<p class="entry-links">${source}</p>` : ''}
    </div>`;
}

function sectionHTML(id, name, sub, readings, images) {
  const group = (label, records) => records.length
    ? `<p class="category-label">${label}</p>${records.map(r => entryHTML(r)).join('')}`
    : '';
  const body = readings.length || images.length
    ? group('Readings', readings) + group('Images', images)
    : '<p class="empty-note">No sources yet.</p>';
  return `
  <section class="block-section" id="${id}">
    <div class="block-header"><h3>${escapeHTML(name)}</h3><span class="block-hours">${escapeHTML(sub)}</span></div>
    ${body}
  </section>`;
}

function partHeaderHTML(id, title, note) {
  return `
  <header class="part-header" id="${id}">
    <h2 class="part-title">${title}</h2>
    <p class="part-note">${note}</p>
  </header>`;
}

/* ── The Weather's rows ───────────────────────────────────────── */

// The picker's rows, in order, from data/vocab.json's weather groups.
function weatherRows(vocab) {
  const rows = [];
  vocab.weather.forEach(condition => {
    let row = rows.find(r => r.name === condition.group);
    if (!row) rows.push(row = { name: condition.group, id: `weather-${slugify(condition.group.replace(/^the /i, ''))}`, conditions: [] });
    row.conditions.push(condition);
  });
  return rows;
}

function tagsOf(record, scheme) {
  return ((record.tags && record.tags[scheme]) || []).map(tagId);
}

function isWeatherUnset(record) {
  return !!(record.display && record.display.weatherUnset);
}

// The first row any of a record's conditions belongs to.
function weatherRowOf(record, rows) {
  const tags = tagsOf(record, 'weather');
  return rows.find(row => row.conditions.some(c => tags.includes(c.id))) || null;
}

/* ── The page ─────────────────────────────────────────────────── */

function contentsHTML(hours, rows, seasons) {
  const group = (id, title, items) => `
    <div class="contents-group">
      <p class="contents-label"><a href="#${id}">${title}</a></p>
      <ul>${items.map(([href, label]) => `<li><a href="#${href}">${escapeHTML(label)}</a></li>`).join('')}</ul>
    </div>`;
  return `
  <nav class="contents" aria-label="Contents">
    ${group('hours', 'The Hours', hours.map(h => [`hours-${h.id}`, h.label]))}
    ${group('weather', 'The Weather', [['weather-all', 'All Weather'], ...rows.map(r => [r.id, r.name])])}
    ${group('seasons', 'The Seasons', seasons.map(s => [`seasons-${s}`, SEASON_LABELS[s]]))}
  </nav>`;
}

function buildSources(collection, lectio) {
  const { readings, images, vocab } = collection;
  const rows = weatherRows(vocab);

  // Each piece is listed once, where it's shown (its shownIn).
  const inHours = readings.filter(r => r.shownIn === 'hours');
  const inHoursImages = images.filter(i => i.shownIn === 'hours');
  const inWeather = readings.filter(r => r.shownIn === 'weather');
  const inWeatherImages = images.filter(i => i.shownIn === 'weather');

  let html = contentsHTML(vocab.hours, rows, SEASON_KEYS);

  // The Hours
  html += partHeaderHTML('hours', 'The Hours', 'The readings and images for each of the eight watches.');
  vocab.hours.forEach(hour => {
    const tagged = r => tagsOf(r, 'hours').includes(hour.id);
    html += sectionHTML(`hours-${hour.id}`, hour.label, `${hour.subtitle} · ${watchHoursWords(hour)}`,
      inHours.filter(tagged), inHoursImages.filter(tagged));
  });

  // The Weather
  html += partHeaderHTML('weather', 'The Weather',
    'The readings and images for the weather, arranged by the rows of the weather picker. A piece tagged with several conditions is listed once, under the first row they belong to.');
  html += sectionHTML('weather-all', 'All Weather', 'Shown before any condition is chosen',
    inWeather.filter(isWeatherUnset), inWeatherImages.filter(isWeatherUnset));
  rows.forEach(row => {
    const inRow = r => !isWeatherUnset(r) && weatherRowOf(r, rows) === row;
    html += sectionHTML(row.id, row.name, row.conditions.map(c => c.label).join(' · '),
      inWeather.filter(inRow), inWeatherImages.filter(inRow));
  });

  // The Seasons
  html += partHeaderHTML('seasons', 'The Seasons',
    "The weekly readings from <em>Lectio Terra</em>, by season, each with the passages it quotes and the figures it shows.");
  // A week's own passages and figures, in the order the post gives them.
  const piecesOf = (records, week) => records
    .filter(r => r.lectio && r.lectio.post === week.id)
    .sort((a, b) => a.lectio.place - b.lectio.place);
  const weekGroup = (label, records) => records.length
    ? `<p class="category-label">${label}</p>${records.map(r => entryHTML(r)).join('')}`
    : '';
  SEASON_KEYS.forEach(key => {
    const weeks = ((lectio && lectio.seasons && lectio.seasons[key]) || [])
      .slice().sort((a, b) => (a.published || '').localeCompare(b.published || ''));
    const body = weeks.length ? weeks.map(week => {
      const [y, m, d] = (week.published || '').split('-');
      const date = y ? `${Number(d)} ${MONTH_NAMES[Number(m) - 1]} ${y}` : '';
      // Each week folds shut, its title and date the fold's label; open,
      // it gives the essay's link and the week's readings and figures.
      const essay = week.page ? escapeHTML(week.page) : `seasons.html?season=${key}&amp;entry=${encodeURIComponent(week.id)}`;
      return `
    <details class="week" id="${escapeHTML(week.id)}">
      <summary><span class="week-title">${escapeHTML(week.title)}</span>${date ? `<span class="week-date">${date}</span>` : ''}</summary>
      <p class="week-essay"><a href="${essay}">Read the essay</a></p>
      ${weekGroup('Readings', piecesOf(readings, week))}${weekGroup('Figures', piecesOf(images, week))}
    </details>`;
    }).join('') : '<p class="empty-note">No sources yet.</p>';
    html += `
  <section class="block-section" id="seasons-${key}">
    <div class="block-header"><h3>${SEASON_LABELS[key]}</h3><span class="block-hours">${SEASON_MONTH_RANGES[key]}</span></div>
    ${body}
  </section>`;
  });

  return html;
}

function isRebuild() {
  return new URLSearchParams(window.location.search).has('rebuild');
}

async function initSources() {
  const container = document.getElementById('sources-body');
  if (!container) return;
  // The saved, static bibliography is already on the page.
  if (!isRebuild() && container.querySelector('.entry')) return;
  try {
    const [collection, lectio] = await Promise.all([
      loadCollection(),
      loadLectioData().catch(error => { console.error(error); return null; })
    ]);
    // The markers let scripts/build_sources.py find exactly what was built.
    container.innerHTML = `<!--sources:start-->${buildSources(collection, lectio)}\n  <!--sources:end-->`;
  } catch (error) {
    console.error(error);
    container.innerHTML = '<p class="empty-note">The sources could not be loaded. Please return soon.</p>';
    return;
  }
  // The page was empty when the browser first looked for #hours-void and
  // the like, so follow the link now that the sections exist.
  openFoldFor(window.location.hash);
}

/* ── The folds ─────────────────────────────────────────────────────
   A link to an entry inside a closed week (sources.html#i-0077, or a
   week itself, #lt-0015) opens that week and goes to it, on arrival and
   whenever the address's # changes. */
function openFoldFor(hash) {
  if (!hash || hash.length < 2) return;
  const target = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!target) return;
  const fold = target.closest('details');
  if (fold && !fold.open) fold.open = true;
  target.scrollIntoView();
}

window.addEventListener('DOMContentLoaded', initSources);
window.addEventListener('DOMContentLoaded', () => openFoldFor(window.location.hash));
window.addEventListener('hashchange', () => openFoldFor(window.location.hash));

// A closed fold prints shut, so print every week open, then put the
// folds back as they were.
let foldsShut = [];
window.addEventListener('beforeprint', () => {
  foldsShut = [...document.querySelectorAll('#sources-body details:not([open])')];
  foldsShut.forEach(fold => { fold.open = true; });
});
window.addEventListener('afterprint', () => {
  foldsShut.forEach(fold => { fold.open = false; });
  foldsShut = [];
});
