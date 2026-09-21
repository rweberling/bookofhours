const HOUR_NAMES = {
  spring: [
    "Midnight","The Middle Watch","Dead of Night",
    "Somnium","Soundings","Twilight",
    "Dawn","Insolation","Lift",
    "Prime","Tilt","Forenoon",
    "Noon","Zenith","Declension",
    "Lull","Deep Afternoon","The Golden Hour",
    "Sunset","Dusk","Eventide",
    "Tenebrae","Nocturne","Eleventh"
  ],
  summer: [
    "Midnight","The Middle Watch","Dead of Night",
    "Somnium","Twilight","Dawn",
    "Insolation","Lift","Prime",
    "Tilt","Late Morning","Forenoon",
    "Noon","Zenith","Zenith",
    "Declension","Lull","Deep Afternoon",
    "Early Evening","The Golden Hour","Sunset",
    "Dusk","Eventide","Eleventh"
  ],
  autumn: [
    "Midnight","The Middle Watch","Dead of Night",
    "Somnium","Soundings","Twilight",
    "Dawn","Insolation","Lift",
    "Prime","Tilt","Forenoon",
    "Noon","Zenith","Declension",
    "Lull","Deep Afternoon","The Golden Hour",
    "Sunset","Dusk","Eventide",
    "Tenebrae","Nocturne","Eleventh"
  ],
  winter: [
    "Midnight","The Middle Watch","Dead of Night",
    "Somnium","Somnium","Soundings",
    "Soundings", "Dawn","Lift",
    "Prime","Tilt","Forenoon",
    "Noon","Zenith","Declension",
    "The Golden Hour","Sunset","Dusk",
    "Eventide","Eventide","Flicker",
    "Tenebrae","Nocturne","Eleventh"
  ]
};

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const SEASON_EMBLEMS = {
  spring: `<path d="M8 20 Q10 13 16 5" stroke="currentColor" stroke-width="0.75" opacity="0.5" fill="none"/>
           <path d="M10 16 Q8.3 15 7 14" stroke="currentColor" stroke-width="0.55" opacity="0.45" fill="none"/>
           <path d="M11.7 11.5 Q15 10.8 17 10" stroke="currentColor" stroke-width="0.55" opacity="0.45" fill="none"/>
           <path d="M14 8 Q12.5 7 11.5 6" stroke="currentColor" stroke-width="0.55" opacity="0.45" fill="none"/>
           <g transform="translate(7 14) rotate(-55) scale(1.65)">
             <path d="M0 0 C0.9 -0.6 0.9 -1.8 0 -2.6 C-0.9 -1.8 -0.9 -0.6 0 0 Z" fill="currentColor" opacity="0.45"/>
           </g>
           <g transform="translate(17 10) rotate(75) scale(1.7)">
             <path d="M0 0 C0.9 -0.6 0.9 -1.8 0 -2.6 C-0.9 -1.8 -0.9 -0.6 0 0 Z" fill="currentColor" opacity="0.45"/>
           </g>
           <g transform="translate(11.5 6) rotate(-50) scale(1.4)">
             <path d="M0 0 C0.9 -0.6 0.9 -1.8 0 -2.6 C-0.9 -1.8 -0.9 -0.6 0 0 Z" fill="currentColor" opacity="0.45"/>
           </g>`,
  summer: `<circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="0.7" opacity="0.5"/>
           <path d="M12 3.5 L12 6 M12 18 L12 20.5 M3.5 12 L6 12 M18 12 L20.5 12
                    M5.9 5.9 L7.6 7.6 M16.4 16.4 L18.1 18.1 M5.9 18.1 L7.6 16.4 M16.4 7.6 L18.1 5.9"
                 stroke="currentColor" stroke-width="0.6" opacity="0.4"/>`,
  autumn: `<path d="M8 20 Q10 13 16 5" stroke="currentColor" stroke-width="0.75" opacity="0.5" fill="none"/>
           <path d="M10 16 Q8.3 15 7 14" stroke="currentColor" stroke-width="0.55" opacity="0.35" fill="none"/>
           <path d="M11.7 11.5 Q15 10.8 17 10" stroke="currentColor" stroke-width="0.55" opacity="0.35" fill="none"/>
           <path d="M14 8 Q12.5 7 11.5 6" stroke="currentColor" stroke-width="0.55" opacity="0.35" fill="none"/>
           <g transform="translate(7 14) rotate(-55) scale(1.65)">
             <path d="M0 0 C0.9 -0.6 0.9 -1.8 0 -2.6 C-0.9 -1.8 -0.9 -0.6 0 0 Z" fill="currentColor" opacity="0.42"/>
           </g>`,
  winter: `<g transform="translate(12 12)">
             <g transform="rotate(0)">
               <path d="M0 0 L0 -8" stroke="currentColor" stroke-width="0.6" opacity="0.45"/>
               <path d="M0 -2.8 L-1.3 -3.8 M0 -2.8 L1.3 -3.8" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
               <path d="M0 -5.6 L-1.1 -6.4 M0 -5.6 L1.1 -6.4" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
             </g>
             <g transform="rotate(60)">
               <path d="M0 0 L0 -8" stroke="currentColor" stroke-width="0.6" opacity="0.45"/>
               <path d="M0 -2.8 L-1.3 -3.8 M0 -2.8 L1.3 -3.8" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
               <path d="M0 -5.6 L-1.1 -6.4 M0 -5.6 L1.1 -6.4" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
             </g>
             <g transform="rotate(120)">
               <path d="M0 0 L0 -8" stroke="currentColor" stroke-width="0.6" opacity="0.45"/>
               <path d="M0 -2.8 L-1.3 -3.8 M0 -2.8 L1.3 -3.8" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
               <path d="M0 -5.6 L-1.1 -6.4 M0 -5.6 L1.1 -6.4" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
             </g>
             <g transform="rotate(180)">
               <path d="M0 0 L0 -8" stroke="currentColor" stroke-width="0.6" opacity="0.45"/>
               <path d="M0 -2.8 L-1.3 -3.8 M0 -2.8 L1.3 -3.8" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
               <path d="M0 -5.6 L-1.1 -6.4 M0 -5.6 L1.1 -6.4" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
             </g>
             <g transform="rotate(240)">
               <path d="M0 0 L0 -8" stroke="currentColor" stroke-width="0.6" opacity="0.45"/>
               <path d="M0 -2.8 L-1.3 -3.8 M0 -2.8 L1.3 -3.8" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
               <path d="M0 -5.6 L-1.1 -6.4 M0 -5.6 L1.1 -6.4" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
             </g>
             <g transform="rotate(300)">
               <path d="M0 0 L0 -8" stroke="currentColor" stroke-width="0.6" opacity="0.45"/>
               <path d="M0 -2.8 L-1.3 -3.8 M0 -2.8 L1.3 -3.8" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
               <path d="M0 -5.6 L-1.1 -6.4 M0 -5.6 L1.1 -6.4" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
             </g>
           </g>`
};
  
// pick() / pickExcluding() now live in seasonal-data.js, loaded before
// this file — shared with seasons.js instead of duplicated here.

function pickWeatherAware(items, excludeFn) {
  const weather = (window.siteAtmosphere && window.siteAtmosphere.weather) || [];
  if (!weather.length) return pickExcluding(items, excludeFn);
  const tagged = items.filter(item => Array.isArray(item.weather) && item.weather.some(w => weather.includes(w)));
  return pickExcluding(tagged.length ? tagged : items, excludeFn);
}

let lastQuoteText = null;
let lastImageSrc  = null;

function getSeason() {
  // The actual month-range logic lives in one place now: currentSeason()
  // in seasonal-data.js (loaded before this script). This wrapper exists
  // so every existing getSeason() call site in this file — and the
  // getSeason(now) call below, which, like the original, ignores its
  // argument — keeps working unchanged.
  return currentSeason();
}

function stripHTML(str) {
  return str ? str.replace(/<[^>]*>/g, '').replace(/"/g, '&quot;') : '';
}

function formatTime(d) {
  const h = d.getHours(), m = d.getMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'pm' : 'am'}`;
}
  
function formatDate(d) {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function phenomenaHTML(list) {
  if (!list || list.length === 0) return '';
  return list.map((p, i) =>
    p + (i < list.length - 1 ? '<span class="sep" aria-hidden="true">✦</span>' : '')
  ).join('');
}

function placeholderSVG(blockName) {
  return `<div class="image-placeholder">
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="0.75" opacity="0.4"/>
      <path d="M24 8 L24 40 M8 24 L40 24" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
      <circle cx="24" cy="24" r="3" fill="currentColor" opacity="0.35"/>
    </svg>
    <span>${blockName}</span>
  </div>`;
}

function getBlockOverride() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('block');
  return requested ? requested.toLowerCase() : null;
}

function blockForHour(blocks, h) {
  const override = getBlockOverride();
  if (override) {
    const match = blocks.find(b => b.cssClass === `block-${override}`);
    if (match) return match;
  }
  return blocks.find(b => h >= b.startHour && h < b.startHour + 3) || blocks[0];
}

let currentBlockName = null;
let displayedHour = null;
let lastRenderedHour = null;
let blocks = null;
let isWandering = false;

function render(blocksData, force) {
  const now   = new Date();
  const h     = now.getHours();
  const block = blockForHour(blocksData, h);

  document.getElementById('clock-time').textContent    = formatTime(now);
  document.getElementById('colophon-date').textContent = formatDate(now);
  document.getElementById('season-emblem').innerHTML   = SEASON_EMBLEMS[getSeason(now)];
  renderWeatherLine();

  if (isWandering && !force) return; 
  
  if (block.name === currentBlockName && !force && h === lastRenderedHour) return;

  lastRenderedHour = h;
  const veil = document.getElementById('veil');

  function doUpdate() {
    blocksData.forEach(b => {
      if (b.cssClass) document.body.classList.remove(b.cssClass);
    });
    if (block.cssClass) document.body.classList.add(block.cssClass);

    const q   = pickWeatherAware(block.quotes, item => item.text === lastQuoteText) || { text: '', attr: '' };
    const img = pickWeatherAware(block.images, item => item.src === lastImageSrc) || { src: null, caption: '' };
    lastQuoteText = q.text;
    lastImageSrc  = img.src;

    document.getElementById('block-subtitle').textContent = block.subtitle || '';
    document.getElementById('block-name').textContent     = block.name;
    document.getElementById('hour-name').textContent = HOUR_NAMES[getSeason()][h] || '';

    document.getElementById('quote-text').innerHTML       = q.text;
    document.getElementById('quote-attr').innerHTML       = q.attr ? `— ${q.attr}` : '';
    document.getElementById('phenomena-list').innerHTML   = phenomenaHTML(block.phenomena);
    document.getElementById('versicle').innerHTML         = block.versicle || '';
    document.getElementById('image-caption').innerHTML    = img.caption || '';

    const inner = document.getElementById('image-inner');
      inner.innerHTML = img.src
      ? `<img src="${img.src}" alt="${stripHTML(img.caption) || block.name}">`
      : placeholderSVG(block.name);

    currentBlockName = block.name;
    displayedHour = h;
  }

  if (force) {
    doUpdate();
  } else {
    veil.classList.add('active');
    setTimeout(() => {
      doUpdate();
      veil.classList.remove('active');
    }, 1200);
  }
}

function showError(msg, details = '') {
  const errorHTML = `
    <p class="load-error">
      ${msg}
      ${details ? `<div class="error-detail">${details}</div>` : ''}
      <button class="retry-button" onclick="location.reload()">Try Again</button>
    </p>
  `;
  document.querySelector('.page').innerHTML = errorHTML;
}

async function fetchWithRetry(retries = 3, timeout = 8000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const res = await fetch('hours-data.json', { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const text = await res.text();
      
      if (!text.trim().startsWith('[') && !text.trim().startsWith('{')) {
        throw new Error('Response is not valid JSON');
      }
      
      const data = JSON.parse(text);
      
      if (!Array.isArray(data)) {
        throw new Error('JSON data is not an array');
      }
      
      return data;
    } catch (err) {
      console.error(`Attempt ${attempt}/${retries} failed:`, err.message);
      
      if (attempt === retries) {
        throw err;
      }
      
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

async function init() {
  try {
    blocks = await fetchWithRetry(3, 8000);
    
    render(blocks, true);
    openWanderIfHashed();
    blocksRef = blocks;
    
    setInterval(() => render(blocks, false), 60000);
    setTimeout(() => document.getElementById('reading-actions').classList.add('visible'), 5000);
  } catch (err) {
    const errorType = err.name === 'AbortError' ? 'timeout' : 'parse_error';
    const errorMsg = errorType === 'timeout' 
      ? 'The request took too long to respond.'
      : err.message;
    
    showError(
      `Could not load <em>hours-data.json</em>.<br>
       ${errorMsg}<br><br>
       If you are working locally, run:<br>
       <code>python3 -m http.server 8000</code><br>
       then open <code>http://localhost:8000</code>`,
      `Error: ${err.message}`
    );
    
    console.error('Data fetch failed after retries:', err);
  }
}

init();

const lightbox        = document.getElementById('lightbox');
const lightboxImg     = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');

document.getElementById('image-inner').addEventListener('click', () => {
  const img     = document.querySelector('#image-inner img');
  const caption = document.getElementById('image-caption');
  if (!img) return;
  lightboxImg.src           = img.src;
  lightboxImg.alt           = img.alt || 'Expanded image';
  lightboxCaption.innerHTML = caption.innerHTML;
  lightbox.style.display    = 'flex';
  lightbox.focus();
  requestAnimationFrame(() => lightbox.classList.add('open'));
});

lightbox.addEventListener('click', closeLightbox);

function closeLightbox() {
  lightbox.classList.remove('open');
  setTimeout(() => { lightbox.style.display = 'none'; }, 300);
}

const CX = 120, CY = 120;
const R_ARC  = 88;
const R_TICK = 100;
const R_TICK_INNER = 96;
const R_LABEL = 110;

const BLOCK_PALETTES = {
  'Void':       '#2a2440',
  'Hush':       '#3a3050',
  'Chorus':     '#c89030',
  'Transit':    '#f0c050',
  'Fulcrum':    '#d4b870',
  'Doldrums':   '#c08040',
  'Convivium':  '#a84828',
  'Denouement': '#404870',
};
  
function hourToAngleDeg(h) {
  return h * 15 - 90;
}

function polarToXY(angleDeg, r) {
  const rad = angleDeg * Math.PI / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(startHour, spanHours, r) {
  const a1 = hourToAngleDeg(startHour);
  const a2 = hourToAngleDeg(startHour + spanHours);
  const p1 = polarToXY(a1, r);
  const p2 = polarToXY(a2, r);
  const large = spanHours > 12 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`;
}

const svgNS = 'http://www.w3.org/2000/svg';

function buildDial(blocksData) {
  const svg = document.getElementById('wander-dial');

  const bgRing = document.createElementNS(svgNS, 'circle');
  bgRing.setAttribute('cx', CX); bgRing.setAttribute('cy', CY);
  bgRing.setAttribute('r', R_ARC);
  bgRing.setAttribute('fill', 'none');
  bgRing.setAttribute('stroke', 'currentColor');
  bgRing.setAttribute('stroke-width', '14');
  bgRing.setAttribute('opacity', '0.06');
  svg.insertBefore(bgRing, svg.firstChild);

  for (let i = 0; i < 24; i++) {
    const ang = hourToAngleDeg(i);
    const isBlock = i % 3 === 0;
    const p1 = polarToXY(ang, isBlock ? R_TICK_INNER - 2 : R_TICK_INNER + 1);
    const p2 = polarToXY(ang, isBlock ? R_TICK + 2 : R_TICK);
    const tick = document.createElementNS(svgNS, 'line');
    tick.setAttribute('x1', p1.x); tick.setAttribute('y1', p1.y);
    tick.setAttribute('x2', p2.x); tick.setAttribute('y2', p2.y);
    tick.setAttribute('stroke', 'currentColor');
    tick.setAttribute('stroke-width', isBlock ? '1' : '0.5');
    tick.setAttribute('opacity', isBlock ? '0.3' : '0.14');
    svg.insertBefore(tick, document.getElementById('dial-hand'));
  }

  blocksData.forEach((block, i) => {
    const color = BLOCK_PALETTES[block.name] || '#888888';

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', arcPath(block.startHour, 3, R_ARC));
    path.setAttribute('stroke', color);
    path.setAttribute('fill', 'none');
    path.setAttribute('class', 'dial-arc');
    path.setAttribute('data-block', block.name);
    svg.insertBefore(path, document.getElementById('dial-hand'));

    const midAngle = hourToAngleDeg(block.startHour + 1.5);
    const lp = polarToXY(midAngle, R_LABEL);
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', lp.x);
    text.setAttribute('y', lp.y);
    text.setAttribute('class', 'dial-label');
    text.setAttribute('data-block', block.name);
    text.setAttribute('transform', `rotate(${midAngle + 90}, ${lp.x}, ${lp.y})`);
    text.textContent = block.name.toUpperCase();
    svg.insertBefore(text, document.getElementById('dial-hand'));
  });

    const nowDot = document.createElementNS(svgNS, 'text');
    nowDot.setAttribute('id', 'dial-now-dot');
    nowDot.setAttribute('font-size', '9');
    nowDot.setAttribute('fill', 'currentColor');
    nowDot.setAttribute('opacity', '0.75');
    nowDot.setAttribute('text-anchor', 'middle');
    nowDot.setAttribute('dominant-baseline', 'middle');
    nowDot.textContent = '✦';
    svg.insertBefore(nowDot, document.getElementById('dial-hand'));
    updateDialNowDot();
}

function updateDialNowDot() {
  const dot = document.getElementById('dial-now-dot');
  if (!dot) return;
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  const p = polarToXY(hourToAngleDeg(h), R_ARC);
  dot.setAttribute('x', p.x);
  dot.setAttribute('y', p.y);
}

function setDialHand(hour) {
  const hand = document.getElementById('dial-hand');
  hand.setAttribute('transform', `rotate(${hour * 15}, ${CX}, ${CY})`);
}

function setDialActive(blockName) {
  document.querySelectorAll('.dial-arc').forEach(el => {
    el.classList.toggle('active', el.dataset.block === blockName);
  });
  document.querySelectorAll('.dial-label').forEach(el => {
    el.classList.toggle('active', el.dataset.block === blockName);
  });
}

function formatBlockHours(startHour) {
  const fmt = h => {
    const ampm = h >= 12 ? 'pm' : 'am';
    return `${h % 12 || 12}${ampm}`;
  };
  return `${fmt(startHour)} – ${fmt((startHour + 3) % 24)}`;
}

function buildWander(blocksData) {
  buildDial(blocksData);

  const grid = document.getElementById('wander-grid');
  const realHour = new Date().getHours();
  const realBlock = blockForHour(blocksData, realHour);

  blocksData.forEach((block, i) => {
    const tile = document.createElement('div');
    tile.className = 'wander-tile';
    tile.dataset.blockName = block.name;
    tile.dataset.startHour = block.startHour;
    if (block.name === realBlock.name) tile.classList.add('is-current');

    tile.innerHTML = `
      <span class="tile-name">${block.name}</span>
      <span class="tile-hours">${formatBlockHours(block.startHour)}</span>
      ${block.subtitle ? `<span class="tile-subtitle">${block.subtitle}</span>` : ''}
    `;

    tile.addEventListener('mouseenter', () => {
      setDialActive(block.name);
      setDialHand(block.startHour + 1.5);
    });
    tile.addEventListener('mouseleave', () => {
      const cur = blockForHour(blocksData, new Date().getHours());
      setDialActive(cur.name);
      setDialHand(cur.startHour + 1.5);
    });
    tile.addEventListener('click', () => {
      selectWanderBlock(block, blocksData);
    });

    grid.appendChild(tile);
  });

  const curBlock = blockForHour(blocksData, realHour);
  setDialActive(curBlock.name);
  setDialHand(curBlock.startHour + 1.5);
  document.querySelectorAll('.dial-arc').forEach(el => {
    if (el.dataset.block === curBlock.name) el.classList.add('current');
  });
}

function updateWanderTileCurrent(blockName) {
  document.querySelectorAll('.wander-tile').forEach(el => {
    el.classList.toggle('is-current', el.dataset.blockName === blockName);
  });
}

function renderAtHour(blocksData, overrideHour, useRealTime = false) {
  const now = new Date();
  const h = overrideHour;
  const displayTime = useRealTime ? now : new Date(now);
  if (!useRealTime) displayTime.setHours(overrideHour + 1, 30, 0, 0);
  const block = blockForHour(blocksData, h);
  const veil = document.getElementById('veil');

  veil.classList.add('active');
  setTimeout(() => {
    blocksData.forEach(b => {
      if (b.cssClass) document.body.classList.remove(b.cssClass);
    });
    if (block.cssClass) document.body.classList.add(block.cssClass);

    const q   = pickWeatherAware(block.quotes, item => item.text === lastQuoteText) || { text: '', attr: '' };
    const img = pickWeatherAware(block.images, item => item.src === lastImageSrc) || { src: null, caption: '' };
    lastQuoteText = q.text;
    lastImageSrc  = img.src;

    document.getElementById('block-subtitle').textContent = block.subtitle || '';
    document.getElementById('block-name').textContent     = block.name;
    document.getElementById('hour-name').textContent      = HOUR_NAMES[getSeason()][h] || '';
    document.getElementById('clock-time').textContent     = formatTime(displayTime);
    document.getElementById('colophon-date').textContent  = formatDate(now);
    document.getElementById('quote-text').innerHTML       = q.text;
    document.getElementById('quote-attr').innerHTML       = q.attr ? `— ${q.attr}` : '';
    document.getElementById('phenomena-list').innerHTML   = phenomenaHTML(block.phenomena);
    document.getElementById('versicle').innerHTML         = block.versicle || '';
    document.getElementById('image-caption').innerHTML    = img.caption || '';

    const inner = document.getElementById('image-inner');
    inner.innerHTML = img.src
      ? `<img src="${img.src}" alt="${stripHTML(img.caption) || block.name}">`
      : placeholderSVG(block.name);

    currentBlockName = block.name;
    displayedHour = h;
    updateWanderTileCurrent(block.name);
    veil.classList.remove('active');
  }, 1200);
}

function selectWanderBlock(block, blocksData) {
  isWandering = true;
  renderAtHour(blocksData, block.startHour);
  closeWander();
}

const ttpBtn = document.getElementById('turn-the-page');
let blocksRef = null;

ttpBtn.addEventListener('click', () => {
  if (!blocksRef) return;
  currentBlockName = null;
  renderAtHour(blocksRef, new Date().getHours(), true);
});

const keepPageBtn = document.getElementById('keep-page');
keepPageBtn.addEventListener('click', () => {
  document.getElementById('print-block-name').textContent = currentBlockName || '';
  const now = new Date();
  document.getElementById('print-timestamp').textContent = formatDate(now) + ' · ' + formatTime(now);
  window.print();
});

/* ══════════════════════════════════════════════════════════════
   THE SEASONS
   Prototype data — eventually this should come from a
   lectio-data.json file (Lectio Terra posts tagged by season),
   the same way hours-data.json feeds Wander the Hours.
══════════════════════════════════════════════════════════════ */

const SEASON_SPECIES = Object.fromEntries(
  SEASON_KEYS.map(key => [key, SEASONAL_DATA[key].species.map(([common, latin]) => ({ common, latin }))])
);
let lectioDataPromise = null;

function loadLectioData() {
  if (!lectioDataPromise) {
    lectioDataPromise = fetch('lectio-data.json').then(response => {
      if (!response.ok) throw new Error(`Unable to load Lectio Terra posts (${response.status}).`);
      return response.json();
    });
  }
  return lectioDataPromise;
}

const SEASON_LABELS = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };

const SCX = 120, SCY = 120, S_R_ARC = 88, S_R_LABEL = 112;

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

function seasonPolarToXY(deg, r) {
  const rad = deg * Math.PI / 180;
  return { x: SCX + r * Math.cos(rad), y: SCY + r * Math.sin(rad) };
}

function seasonArcPath(startDeg, endDeg, r) {
  const p1 = seasonPolarToXY(startDeg, r);
  const p2 = seasonPolarToXY(endDeg, r);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`;
}

let displayedSeason = null; // null = ambient (real getSeason()); set = browsing a chosen season

function buildSeasonDial() {
  const svg = document.getElementById('season-dial');
  svg.innerHTML = '';

  const bgRing = document.createElementNS(svgNS, 'circle');
  bgRing.setAttribute('cx', SCX); bgRing.setAttribute('cy', SCY);
  bgRing.setAttribute('r', S_R_ARC);
  bgRing.setAttribute('fill', 'none');
  bgRing.setAttribute('stroke', 'currentColor');
  bgRing.setAttribute('stroke-width', '14');
  bgRing.setAttribute('opacity', '0.06');
  svg.appendChild(bgRing);

  const line1 = document.createElementNS(svgNS, 'line');
  line1.setAttribute('x1', SCX); line1.setAttribute('y1', SCY - S_R_ARC - 14);
  line1.setAttribute('x2', SCX); line1.setAttribute('y2', SCY + S_R_ARC + 14);
  line1.setAttribute('stroke', 'currentColor'); line1.setAttribute('stroke-width', '0.5'); line1.setAttribute('opacity', '0.15');
  svg.appendChild(line1);

  const line2 = document.createElementNS(svgNS, 'line');
  line2.setAttribute('x1', SCX - S_R_ARC - 14); line2.setAttribute('y1', SCY);
  line2.setAttribute('x2', SCX + S_R_ARC + 14); line2.setAttribute('y2', SCY);
  line2.setAttribute('stroke', 'currentColor'); line2.setAttribute('stroke-width', '0.5'); line2.setAttribute('opacity', '0.15');
  svg.appendChild(line2);

  SEASON_QUADRANTS.forEach(q => {
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', seasonArcPath(q.startDeg, q.endDeg, S_R_ARC));
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('fill', 'none');
    path.setAttribute('class', 'season-arc');
    path.setAttribute('data-season', q.key);
    svg.appendChild(path);

    const midDeg = (q.startDeg + q.endDeg) / 2;
    const lp = seasonPolarToXY(midDeg, S_R_LABEL);
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', lp.x);
    text.setAttribute('y', lp.y);
    text.setAttribute('class', 'season-label');
    text.setAttribute('data-season', q.key);
    text.textContent = SEASON_LABELS[q.key].toUpperCase();
    svg.appendChild(text);
  });

  const centerDot = document.createElementNS(svgNS, 'circle');
  centerDot.setAttribute('cx', SCX); centerDot.setAttribute('cy', SCY);
  centerDot.setAttribute('r', '3');
  centerDot.setAttribute('fill', 'currentColor'); centerDot.setAttribute('opacity', '0.35');
  svg.appendChild(centerDot);

  setSeasonDialActive(displayedSeason || getSeason());
}

function setSeasonDialActive(seasonKey) {
  document.querySelectorAll('.season-arc').forEach(el => {
    el.classList.toggle('active', el.dataset.season === seasonKey);
  });
  document.querySelectorAll('.season-label').forEach(el => {
    el.classList.toggle('active', el.dataset.season === seasonKey);
  });
}

async function buildSpeciesGrid(seasonKey) {
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
    const entries = importedSeasons && importedSeasons[key]
      ? importedSeasons[key]
      : SEASON_SPECIES[key].map(species => ({
          id: species.common.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: species.common,
          subtitle: species.latin
        }));
    const isRealEntries = importedSeasons && importedSeasons[key];
    entries.forEach(entry => {
      const card = document.createElement('a');
      card.className = 'species-card';
      card.href = `seasons.html?season=${key}&entry=${encodeURIComponent(entry.id)}`;

      // Hand-edited real posts carry their own species/latin/readings
      // fields directly now — use those first. Anything not yet hand-edited
      // (freshly pulled, or one of the still-unclassified phenomena entries)
      // falls back to parsing the raw weekly title client-side. Fallback
      // sample entries (SEASON_SPECIES) already have clean title/subtitle
      // and no images. See seasonal-data.js for the durable-fix note.
      let species, latin, readings;
      if (isRealEntries && entry.species) {
        species = entry.species;
        latin = entry.latin || null;
        readings = entry.readings || [];
      } else if (isRealEntries) {
        const parsed = parsePostTitle(entry.title);
        species = parsed.species;
        readings = parsed.readings;
        latin = SPECIES_LATIN_LOOKUP.get(species.toLowerCase()) || null;
      } else {
        species = entry.title;
        latin = entry.subtitle || null;
        readings = [];
      }

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

function selectSeason(seasonKey) {
  displayedSeason = seasonKey;
  const isReal = seasonKey === getSeason();
  document.getElementById('season-subheading').textContent = isReal
    ? `Species drawn from Lectio Terra, this season (${SEASON_LABELS[seasonKey]})`
    : `Species drawn from Lectio Terra, browsing ${SEASON_LABELS[seasonKey]}`;
  setSeasonDialActive(seasonKey);
  buildSpeciesGrid(seasonKey);
}

/* ── Gated pane chokepoint ────────────────────────────────────────
   Every wander-style pane (Wander the Hours, Wander the Seasons,
   Wander the Weather) opens through this one function. Today it
   just opens the pane; once Wander moves behind membership, the
   auth check goes here — one place, not one per pane, per button,
   and per hash-triggered deep link.
────────────────────────────────────────────────────────────────── */
function openGatedPane(paneEl, { ensureBuilt, onOpen } = {}) {
  if (!paneEl) return;
  paneEl.style.display = 'flex';
  requestAnimationFrame(() => paneEl.classList.add('open'));
  if (typeof ensureBuilt === 'function') ensureBuilt();
  if (typeof onOpen === 'function') onOpen();
}

function openWanderPane() {
  openGatedPane(document.getElementById('wander-pane'), {
    onOpen: () => {
      if (typeof updateDialNowDot === 'function') updateDialNowDot();
      if (!document.querySelector('.wander-tile') && blocks) buildWander(blocks);
    }
  });
}

document.getElementById('wander-open').addEventListener('click', openWanderPane);

function openSeasonPane(seasonKey) {
  openGatedPane(document.getElementById('season-pane'), {
    ensureBuilt: () => { if (!document.querySelector('.season-arc')) buildSeasonDial(); },
    onOpen: () => selectSeason(seasonKey || getSeason())
  });
}

document.getElementById('seasons-wander-open').addEventListener('click', () => openSeasonPane(getSeason()));

/* ══════════════════════════════════════════════════════════════
   THE WEATHER
   Self-select only for now — no location permission requested.
   Detection (opt-in) and real wander-weighted cards are tabled
   for a later pass once weather tags exist in the data.
══════════════════════════════════════════════════════════════ */

const WEATHER_CONDITIONS = [
  'Clear', 'Partly cloudy', 'Overcast', 'Drizzle', 'Rain', 'Snow', 'Snow on ground',
  'Fog', 'Wind', 'Thunderstorm', 'Freezing rain', 'Heat', 'Cold'
];
const WEATHER_LABELS = Object.fromEntries(
  WEATHER_CONDITIONS.map(cond => [cond.toLowerCase().replace(/\s+/g, '-'), cond])
);

// Tiles toggle independently now (multiple conditions can be active at
// once, e.g. Cold + Snow); this just re-syncs their is-current state from
// whatever atmosphere.js currently has stored.
function syncWeatherTiles() {
  const active = (window.siteAtmosphere && window.siteAtmosphere.weather) || [];
  document.querySelectorAll('.weather-tile').forEach(tile => {
    tile.classList.toggle('is-current', active.includes(tile.dataset.value));
  });
}

function buildWeatherGrid() {
  const grid = document.getElementById('weather-grid');
  if (grid.children.length) { syncWeatherTiles(); return; }
  WEATHER_CONDITIONS.forEach(cond => {
    const value = cond.toLowerCase().replace(/\s+/g, '-');
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'weather-tile';
    tile.textContent = cond;
    tile.dataset.value = value;
    tile.addEventListener('click', () => {
      if (typeof toggleWeatherCondition === 'function') toggleWeatherCondition(cond);
      syncWeatherTiles();
    });
    grid.appendChild(tile);
  });
  syncWeatherTiles();
}

function renderWeatherLine() {
  const el = document.getElementById('weather-line');
  if (!el) return;
  const active = (window.siteAtmosphere && window.siteAtmosphere.weather) || [];
  el.innerHTML = phenomenaHTML(active.map(value => WEATHER_LABELS[value] || value));
  el.hidden = !active.length;
}
window.addEventListener('atmospherechange', renderWeatherLine);

function openWeatherPane() {
  openGatedPane(document.getElementById('weather-pane'), {
    onOpen: () => buildWeatherGrid()
  });
}

const weatherOpenBtn = document.getElementById('weather-open');
if (weatherOpenBtn) weatherOpenBtn.addEventListener('click', openWeatherPane);

const weatherCurrentBtn = document.getElementById('weather-current-open');
if (weatherCurrentBtn) {
  weatherCurrentBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      document.getElementById('weather-subheading').textContent = 'Location is unavailable; choose a condition instead.';
      openWeatherPane();
      return;
    }

    weatherCurrentBtn.disabled = true;
    weatherCurrentBtn.textContent = 'Locating...';
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const { latitude, longitude } = position.coords;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,snow_depth&temperature_unit=fahrenheit&wind_speed_unit=mph`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Weather request failed (${response.status}).`);
        const data = await response.json();
        const conditions = normalizeOpenMeteoWeather(data.current.weather_code, data.current.temperature_2m, data.current.wind_speed_10m, data.current.snow_depth);
        setWeatherConditions(conditions);
        openWeatherPane();
      } catch (error) {
        console.error(error);
        document.getElementById('weather-subheading').textContent = 'The current weather could not be found; choose a condition instead.';
        openWeatherPane();
      } finally {
        weatherCurrentBtn.disabled = false;
        weatherCurrentBtn.textContent = 'The Current Weather';
      }
    }, () => {
      document.getElementById('weather-subheading').textContent = 'Location was not shared; choose a condition instead.';
      weatherCurrentBtn.disabled = false;
      weatherCurrentBtn.textContent = 'The Current Weather';
      openWeatherPane();
    }, { timeout: 10000, maximumAge: 300000 });
  });
}

// Returns every condition that independently applies at once, rather
// than picking a single "best" one — sky/precipitation is one mutually
// exclusive layer, ground cover / temperature / wind are separate layers
// that can stack on top (so a real report can come back as e.g.
// ['snow', 'cold'] or ['thunderstorm', 'heat']).
function normalizeOpenMeteoWeather(code, temperature, windSpeed, snowDepth) {
  const conditions = [];

  if ([71, 73, 75, 77, 85, 86].includes(code)) conditions.push('snow');
  else if ([45, 48].includes(code)) conditions.push('fog');
  else if ([56, 57, 66, 67].includes(code)) conditions.push('freezing-rain');
  else if ([95, 96, 99].includes(code)) conditions.push('thunderstorm');
  else if ([61, 63, 65, 80, 81, 82].includes(code)) conditions.push('rain');
  else if ([51, 53, 55].includes(code)) conditions.push('drizzle');
  else if (code === 3) conditions.push('overcast');
  else if (code === 1 || code === 2) conditions.push('partly-cloudy');
  else conditions.push('clear');

  if (snowDepth > 0) conditions.push('snow-on-ground');
  if (temperature >= 90) conditions.push('heat');
  else if (temperature <= 32) conditions.push('cold');
  if (windSpeed >= 20) conditions.push('wind');

  return conditions;
}