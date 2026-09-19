
/* ═══════════════════════════════════════════════════════════════
nav.js — Shared navigation for Horae Terrenae
Include on every page after the nav HTML.
════════════════════════════════════════════════════════════════ */

function registerDropup(triggerId, menuId) {
const trigger = document.getElementById(triggerId);
const menu = document.getElementById(menuId);
if (!trigger || !menu) return;

trigger.addEventListener('click', (e) => {
e.stopPropagation();
const isOpen = menu.classList.contains('open');
menu.classList.toggle('open', !isOpen);
trigger.classList.toggle('open', !isOpen);
});

document.addEventListener('click', () => {
menu.classList.remove('open');
trigger.classList.remove('open');
});
}

registerDropup('nav-hours-trigger', 'nav-hours-menu');
registerDropup('nav-seasons-trigger', 'nav-seasons-menu');
registerDropup('nav-weather-trigger', 'nav-weather-menu');

/* ── Generic overlay-pane close (Season pane, Weather pane) ──────
Wander the Hours has its own dedicated close() below, since it
also has to reset isWandering. Season and Weather panes don't
carry that extra state yet, so a generic close covers them.
────────────────────────────────────────────────────────────────── */
function closeOverlayPane(paneEl) {
if (!paneEl) return;
paneEl.classList.remove('open');
paneEl.addEventListener('transitionend', () => {
if (!paneEl.classList.contains('open')) {
paneEl.style.display = 'none';
}
}, { once: true });
}

const seasonPane = document.getElementById('season-pane');
const seasonClose = document.getElementById('season-close');
if (seasonPane && seasonClose) {
seasonClose.addEventListener('click', () => closeOverlayPane(seasonPane));
seasonPane.addEventListener('click', e => {
if (e.target === seasonPane) closeOverlayPane(seasonPane);
});
}

const weatherPane = document.getElementById('weather-pane');
const weatherClose = document.getElementById('weather-close');
if (weatherPane && weatherClose) {
weatherClose.addEventListener('click', () => closeOverlayPane(weatherPane));
weatherPane.addEventListener('click', e => {
if (e.target === weatherPane) closeOverlayPane(weatherPane);
});
}


const wanderPane = document.getElementById('wander-pane');
const wanderClose = document.getElementById('wander-close');

// Opening Wander the Hours (button click, hash deep-link) is handled
// in hours.js via openWanderPane(), alongside Wander the Seasons and
// Wander the Weather — one place per pane, not split across files.
// Closing stays here since it isn't part of the gating concern.
if (wanderPane && wanderClose) {
wanderClose.addEventListener('click', closeWander);
wanderPane.addEventListener('click', e => {
if (e.target === wanderPane) closeWander();
});
}

function closeWander() {
if (!wanderPane) return;
wanderPane.classList.remove('open');
wanderPane.addEventListener('transitionend', () => {
if (!wanderPane.classList.contains('open')) {
wanderPane.style.display = 'none';
}
}, { once: true });
}


document.addEventListener('keydown', e => {
if (e.key === 'Escape') {
if (typeof closeLightbox === 'function') closeLightbox();
closeWander();
closeOverlayPane(seasonPane);
closeOverlayPane(weatherPane);
}
});


function openWanderIfHashed() {
if (window.location.hash === '#wander' && typeof openWanderPane === 'function') {
openWanderPane();
history.replaceState(null, '', window.location.pathname);
}
}

function openSeasonsIfHashed() {
if (window.location.hash === '#seasons-wander' && typeof openSeasonPane === 'function') {
openSeasonPane(typeof getSeason === 'function' ? getSeason() : null);
history.replaceState(null, '', window.location.pathname);
}
}

function openWeatherIfHashed() {
if (window.location.hash === '#weather' && typeof openWeatherPane === 'function') {
openWeatherPane();
history.replaceState(null, '', window.location.pathname);
}
}

openSeasonsIfHashed();
openWeatherIfHashed();

const installBtn = document.getElementById('install-btn');
const installTip = document.getElementById('install-tip');
const installDivider = document.getElementById('install-divider');

if (installBtn && installTip && installDivider) {
const standalone = window.matchMedia('(display-mode: standalone)').matches
|| window.navigator.standalone === true;

const ua = navigator.userAgent;

const isIPad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
const isMobile = /Android|iPhone|iPod/i.test(ua) || isIPad;
const isIOS = /iPhone|iPod/i.test(ua) || isIPad;

const isRealMac = /Macintosh/i.test(ua) && navigator.maxTouchPoints <= 1;
const isSafariEngine = /^((?!chrome|crios|fxios|edg|opr).)*safari/i.test(ua);
const isDesktopSafari = isRealMac && isSafariEngine;

function showTip(text) {
installBtn.classList.add('visible');
installDivider.classList.add('visible');
installTip.textContent = text;
installBtn.addEventListener('click', () => {
installTip.classList.toggle('open');
});
document.addEventListener('click', (e) => {
if (!installTip.contains(e.target) && e.target !== installBtn) {
installTip.classList.remove('open');
}
});
}

if (!standalone) {
if (isMobile && isIOS) {
showTip('Tap the Share icon, then "Add to Home Screen."');
} else if (isMobile) {
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
e.preventDefault();
deferredPrompt = e;
installBtn.classList.add('visible');
installDivider.classList.add('visible');
});
installBtn.addEventListener('click', async () => {
if (!deferredPrompt) return;
deferredPrompt.prompt();
await deferredPrompt.userChoice;
deferredPrompt = null;
installBtn.classList.remove('visible');
installDivider.classList.remove('visible');
});
} else if (isDesktopSafari) {
showTip('Click the Share icon in the toolbar, or choose File, then "Add to Dock."');
}
}
}