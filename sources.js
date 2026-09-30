/* ══════════════════════════════════════════════════════════════
   THE SOURCES — sources.html
   The bibliography is built from the collection in data/ (and, for
   the Seasons, from lectio-data.json), so it always matches what the
   Hours and Weather pages show. Three parts, each in its own order:
     The Hours    — each watch, readings then images
     The Weather  — the weather picker's rows, plus "All Weather" for
                    the pieces shown before any condition is chosen;
                    a piece is listed once, under the first row any of
                    its conditions belongs to
     The Seasons  — each season's Lectio Terra posts, by week

   Each entry shows its hand-written bibliography line (or its display
   citation, until one is written), any rights note, and its links:
   where it was cited from, other copies, the suggested edition (a
   Bookshop.org affiliate link built from its ISBN and the pattern in
   data/site.json), and further reading.

   The published page is static: scripts/build_sources.py opens
   sources.html?rebuild in headless Chrome, lets this script build the
   entries, and saves the result into sources.html between the
   sources:start and sources:end markers, so readers, citation tools and
   crawlers get plain HTML. On an ordinary visit this script does nothing
   while that saved content is there; it builds live only if the page
   has never been saved, or when the address ends in ?rebuild (a preview
   of the next save).

   Expects shared.js (loadCollection, loadLectioData, suggestedEditionUrl,
   escapeHTML, SEASON_KEYS, SEASON_LABELS, SEASON_MONTH_RANGES,
   MONTH_NAMES) loaded before this file.
══════════════════════════════════════════════════════════════ */


// How each kind of link is labelled on the page.
const LINK_LABELS = { cited: 'Source', original: 'Original', copy: 'Also at' };
const FURTHER_LABEL = 'Further reading';
const SUGGESTED_LABEL = 'Suggested edition';

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function listWords(words) {
  return words.join(', ');
}

/* ── One entry ────────────────────────────────────────────────── */

function linkGroupHTML(label, links) {
  if (!links.length) return '';
  const anchors = links.map(link =>
    `<a href="${escapeHTML(link.url)}" target="_blank">${escapeHTML(link.label)}</a>`
  ).join('<span class="sep">·</span>');
  return `<span class="links-label">${label}</span>${anchors}`;
}

// A reading's citation links live on its edition (and on the editions of
// any texts it quotes); an image's live on the image itself.
function citationLinks(record) {
  if (record.citation) {
    const editions = [record.citation.edition, ...(record.citation.quotes || []).map(q => q.edition)];
    return editions.filter(Boolean).flatMap(e => e.links || []);
  }
  return record.links || [];
}

function entryHTML(record, notes = [], site = null) {
  const citation = record.citation
    ? (record.citation.bibliography || record.citation.display)
    : (record.bibliography || record.caption);
  const edition = record.citation && record.citation.edition;
  const rightsNote = (edition && edition.rightsNote) || record.rightsNote;

  const links = citationLinks(record);
  const groups = Object.keys(LINK_LABELS)
    .map(role => linkGroupHTML(LINK_LABELS[role], links.filter(l => l.role === role)));

  const suggested = record.suggestedEdition;
  if (suggested && suggested.isbn) {
    const note = suggested.note ? ` <span class="entry-inline-note">(${suggested.note})</span>` : '';
    groups.push(linkGroupHTML(SUGGESTED_LABEL, [{ label: 'Bookshop.org', url: suggestedEditionUrl(suggested, site) }]) + note);
  }
  groups.push(linkGroupHTML(FURTHER_LABEL, record.furtherReading || []));

  const linkLine = groups.filter(Boolean).join('<span class="sep">·</span>');
  return `
    <div class="entry" id="${escapeHTML(record.id)}">
      <p class="citation">${citation || ''}${rightsNote ? `<span class="flag-note">${escapeHTML(rightsNote)}</span>` : ''}</p>
      ${linkLine ? `<p class="entry-links">${linkLine}</p>` : ''}
      ${notes.length ? `<p class="entry-note">${notes.map(escapeHTML).join(' · ')}</p>` : ''}
    </div>`;
}

function sectionHTML(id, name, sub, readings, images, notesFor, site) {
  const group = (label, records) => records.length
    ? `<p class="category-label">${label}</p>${records.map(r => entryHTML(r, notesFor(r), site)).join('')}`
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
  return (record.tags && record.tags[scheme]) || [];
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
  const { readings, images, vocab, site } = collection;
  const hoursById = Object.fromEntries(vocab.hours.map(h => [h.id, h]));
  const rows = weatherRows(vocab);

  // Cross-references between the Hours and the Weather.
  const notesInHours = record => {
    const tags = tagsOf(record, 'weather');
    const row = weatherRowOf(record, rows);
    return row ? [`Also under the Weather: ${row.name} (${listWords(tags)})`] : [];
  };
  const notesInWeather = record => {
    const notes = [];
    const tags = tagsOf(record, 'weather');
    if (tags.length) notes.push(`Conditions: ${listWords(tags)}`);
    const hours = tagsOf(record, 'hours').map(id => hoursById[id] && hoursById[id].label).filter(Boolean);
    if (hours.length) notes.push(`Also under the Hours: ${listWords(hours)}`);
    return notes;
  };

  let html = contentsHTML(vocab.hours, rows, SEASON_KEYS);

  // The Hours
  html += partHeaderHTML('hours', 'The Hours', 'The readings and images for each of the eight watches.');
  vocab.hours.forEach(hour => {
    const tagged = r => tagsOf(r, 'hours').includes(hour.id);
    html += sectionHTML(`hours-${hour.id}`, hour.label, hour.subtitle,
      readings.filter(tagged), images.filter(tagged), notesInHours, site);
  });

  // The Weather
  html += partHeaderHTML('weather', 'The Weather',
    'The readings and images for the weather, arranged by the rows of the weather picker. A piece tagged with several conditions is listed once, under the first row they belong to.');
  html += sectionHTML('weather-all', 'All Weather', 'Shown before any condition is chosen',
    readings.filter(isWeatherUnset), images.filter(isWeatherUnset), notesInWeather, site);
  rows.forEach(row => {
    const inRow = r => !isWeatherUnset(r) && weatherRowOf(r, rows) === row;
    html += sectionHTML(row.id, row.name, row.conditions.map(c => c.label).join(' · '),
      readings.filter(inRow), images.filter(inRow), notesInWeather, site);
  });

  // The Seasons
  html += partHeaderHTML('seasons', 'The Seasons',
    "The weekly readings from <em>Lectio Terra</em>, by season. Citations for each week's readings and images will be listed beneath it.");
  SEASON_KEYS.forEach(key => {
    const weeks = ((lectio && lectio.seasons && lectio.seasons[key]) || [])
      .slice().sort((a, b) => (a.published || '').localeCompare(b.published || ''));
    const body = weeks.length ? weeks.map(week => {
      const [y, m, d] = (week.published || '').split('-');
      const date = y ? `${Number(d)} ${MONTH_NAMES[Number(m) - 1]} ${y}` : '';
      return `
    <div class="week">
      <p class="week-title"><a href="seasons.html?season=${key}&amp;entry=${encodeURIComponent(week.id)}">${escapeHTML(week.title)}</a></p>
      ${date ? `<p class="week-date">${date}</p>` : ''}
    </div>`;
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
  if (window.location.hash) {
    const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (target) target.scrollIntoView();
  }
}

window.addEventListener('DOMContentLoaded', initSources);
