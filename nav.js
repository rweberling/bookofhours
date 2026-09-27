
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

/* ── DFOS gate (shared) ───────────────────────────────────────────
   One sign-in check for every Wander pane — Hours (hours.js),
   Seasons (seasons.js), Weather (weather.js). Cosmetic only; see
   dfos-siwd.js. Returns true when signed in; otherwise starts the
   DFOS sign-in (which navigates away, then comes back and fires
   'dfossignin' with the same intent) and returns false.
   onUnavailable runs when sign-in can't even start — dfos-siwd.js
   never loaded (ad blocker, offline, CDN outage) or its CDN import
   failed — so each page can say so in its own place.

   Only call this from a click or after DOMContentLoaded, never while
   scripts are still loading: dfos-siwd.js is a module, so it defines
   window.dfosIsSignedIn after every classic script has run. Called
   earlier, a signed-in visitor looks signed out.
────────────────────────────────────────────────────────────────── */
function requireDfosSignIn(intent, onUnavailable) {
if (typeof window.dfosIsSignedIn === 'function' && window.dfosIsSignedIn()) return true;
const unavailable = typeof onUnavailable === 'function' ? onUnavailable : () => {};
if (typeof window.dfosBeginSignIn === 'function') {
Promise.resolve(window.dfosBeginSignIn(intent)).catch(unavailable);
} else {
unavailable();
}
return false;
}

/* ── Overlay pane close (Wander, Season, Weather panes) ───────────
   Each pane lives on its own page now — wander-pane on index.html,
   season-pane on seasons.html, weather-pane on weather.html — and
   whichever one is present gets wired up here.
   Wander-the-Hours' hold duration (how long a picked block stays put
   before the clock resumes) is a timed expiry in hours.js now, not a
   flag this needs to clear — so one close function covers all three
   panes.
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

// weather.html's condition picker (weather.js opens it; #wander deep-link
// handled there too, after the DFOS module has loaded).
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
wanderClose.addEventListener('click', () => closeOverlayPane(wanderPane));
wanderPane.addEventListener('click', e => {
if (e.target === wanderPane) closeOverlayPane(wanderPane);
});
}


document.addEventListener('keydown', e => {
if (e.key === 'Escape') {
if (typeof closeLightbox === 'function') closeLightbox();
closeOverlayPane(wanderPane);
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