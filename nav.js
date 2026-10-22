
/* ═══════════════════════════════════════════════════════════════
nav.js — Shared navigation for Horae Terrenae
Include on every page after the nav HTML.
════════════════════════════════════════════════════════════════ */

/* ── DFOS gate switch ─────────────────────────────────────────────
   true:  choosing in the Wander panes — the hour blocks, the species,
          the weather conditions — asks visitors to sign in with DFOS
          first; the panes themselves, with their dials, open for all.
   false: everyone can choose.
   That's the only change either way: sign-in itself (dfos-siwd.js)
   stays in place, so turning the gate back on is this one word.
────────────────────────────────────────────────────────────────── */
let DFOS_GATE = true;

// Preview: ?gate=preview on any page turns the gate on in this browser
// only, to try sign-in before everyone gets it; ?gate=off turns it back
// off. Remembered in localStorage across the round trip to DFOS.
(() => {
const GATE_PREVIEW_KEY = 'earthly-hours-gate-preview';
try {
const asked = new URLSearchParams(location.search).get('gate');
if (asked === 'preview') localStorage.setItem(GATE_PREVIEW_KEY, '1');
if (asked === 'off') localStorage.removeItem(GATE_PREVIEW_KEY);
if (localStorage.getItem(GATE_PREVIEW_KEY)) DFOS_GATE = true;
} catch (error) {}
})();

// Where the lock sends signed-in visitors who aren't key holders yet:
// the "Support the Project" item, whose purchase joins the Wanderers.
const KEY_HOLDER_URL = 'https://otherwise.dfos.com/p/earthlyhours';

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
registerDropup('nav-projects-trigger', 'nav-projects-menu');

// The Reading Room holds the ways to join or go deeper: the DFOS space
// embed, and Add to Home Screen beneath it. The iframe only gets its src
// the first time the menu opens, so pages don't load it unasked; the
// install tip folds away whenever the menu is toggled; clicks inside the
// menu don't count as clicking away.
const projectsTrigger = document.getElementById('nav-projects-trigger');
const projectsMenu = document.getElementById('nav-projects-menu');
if (projectsTrigger && projectsMenu) {
const embed = projectsMenu.querySelector('iframe[data-src]');
projectsTrigger.addEventListener('click', () => {
if (embed && !embed.src) embed.src = embed.dataset.src;
const tip = document.getElementById('install-tip');
if (tip) tip.classList.remove('open');
});
projectsMenu.addEventListener('click', e => e.stopPropagation());
}

/* ── DFOS gate (shared) ───────────────────────────────────────────
   Every Wander pane — Hours (hours.js), Seasons (seasons.js), Weather
   (weather.js) — opens for everyone: its upper part (dial, sky,
   station model) is the present moment, part of the site itself.
   Only the choosing below it is gated, when DFOS_GATE is on, and only
   key holders (members of the paid subgroup in the DFOS space) get
   it: each page calls syncWanderLock() with its pane's grid as the
   pane opens, which hides the grid behind a button — "Sign in to
   wander" for visitors who aren't signed in, "Hold a key to wander"
   (to KEY_HOLDER_URL) for those who are but aren't key holders.
   Cosmetic only; see dfos-siwd.js.

   Sign-in navigates away, then comes back to the page's #wander and
   fires 'dfossignin' with the same intent, and each page reopens its
   pane — with the grid, now.

   Only call these from a click or after DOMContentLoaded, never while
   scripts are still loading: dfos-siwd.js is a module, so it defines
   window.dfosIsKeyHolder after every classic script has run. Called
   earlier, a signed-in visitor looks signed out.
────────────────────────────────────────────────────────────────── */
function dfosMayWander() {
return !DFOS_GATE
  || (typeof window.dfosIsKeyHolder === 'function' && window.dfosIsKeyHolder());
}

function dfosSignedIn() {
return typeof window.dfosIsSignedIn === 'function' && window.dfosIsSignedIn();
}

// Starts sign-in; onUnavailable runs when it can't even start —
// dfos-siwd.js never loaded (ad blocker, offline, CDN outage) or its
// CDN import failed.
function beginDfosSignIn(intent, onUnavailable) {
if (typeof window.dfosBeginSignIn === 'function') {
Promise.resolve(window.dfosBeginSignIn(intent)).catch(onUnavailable);
} else {
onUnavailable();
}
}

// What each pane's lock lets you choose, for the note under it.
const WANDER_CHOICE = { wander: 'another hour', season: 'another season', weather: 'other weather' };

// Shows gridEl, or in its place the lock: a button that starts sign-in
// with intent (the page's name for its pane), or, for a visitor already
// signed in without a key, points them to KEY_HOLDER_URL. Under it, a
// note in parentheses says what the key is for, and thanks a visitor
// who has just signed in. Button and note are made once, just above
// the grid, and kept; each knows the other and the grid.
function syncWanderLock(gridEl, intent) {
if (!gridEl) return;
let lock = gridEl.wanderLock;
if (!lock) {
lock = document.createElement('button');
lock.type = 'button';
lock.className = 'wander-btn wander-lock';
lock.dataset.intent = intent;
lock.addEventListener('click', () => {
if (dfosSignedIn()) {
window.open(KEY_HOLDER_URL, '_blank', 'noopener');
return;
}
beginDfosSignIn(intent, () => {
lock.textContent = 'Sign-in unavailable — try again';
setTimeout(() => syncWanderLock(gridEl, intent), 5000);
});
});
const note = document.createElement('p');
note.className = 'wander-lock-note';
gridEl.before(lock, note);
gridEl.wanderLock = lock;
lock.wanderNote = note;
lock.wanderGrid = gridEl;
}
const open = dfosMayWander();
const signedIn = dfosSignedIn();
gridEl.hidden = !open;
lock.hidden = open;
lock.wanderNote.hidden = open;
lock.textContent = signedIn ? 'Hold a key to wander' : 'Sign in to wander';
const choosing = `Choosing ${WANDER_CHOICE[intent] || 'another hour'} is for Wanderers, who keep this book going; the present is open to all.`;
lock.wanderNote.textContent = signedIn ? `(Thank you for signing in. ${choosing})` : `(${choosing})`;
// Signed in without a key: ask again (dfos-siwd.js keeps this to once a
// minute); a key found since unlocks the pane through 'dfossignin'.
if (!open && dfosSignedIn() && typeof window.dfosRefreshSession === 'function') window.dfosRefreshSession();
}

// Signing in or out, or a key gained or lost, re-locks or unlocks any
// pane already built.
window.addEventListener('dfossignin', () => {
document.querySelectorAll('.wander-lock').forEach(lock => {
syncWanderLock(lock.wanderGrid, lock.dataset.intent);
});
});

/* ── Overlay pane close (Wander, Season, Weather panes) ───────────
   Each pane lives on its own page now — wander-pane on index.html,
   season-pane on seasons.html, weather-pane on weather.html — and
   whichever one is present gets wired up here.
   Wander-the-Hours' hold duration (how long a picked block stays put
   before the clock resumes) is a timed expiry in hours.js now, not a
   flag this needs to clear — so one close function covers all three
   panes.
────────────────────────────────────────────────────────────────── */
// Shows an overlay pane (Wander the Hours, Seasons or Weather) and fades
// it in; closeOverlayPane() below fades it out again.
function openOverlayPane(paneEl) {
if (!paneEl) return;
paneEl.style.display = 'flex';
requestAnimationFrame(() => paneEl.classList.add('open'));
}

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

/* ── The site maker's own visits ────────────────────────────────────
   Pressing and holding the ornament at the foot of a page for three
   seconds marks this browser's visits as the site maker's own, as ?me
   does (partials/head.html), so Google Analytics can leave them out;
   holding it again unmarks them. For the home-screen app, which has no
   address bar to type ?me into. A short note says which way it went;
   the change applies from the next page.
────────────────────────────────────────────────────────────────── */
(() => {
const ME_KEY = 'earthlyhours-me';
const HOLD_MS = 3000;
document.querySelectorAll('.page-footer .rule-ornament').forEach(ornament => {
ornament.classList.add('quiet-switch');
let timer = null;
const cancel = () => { clearTimeout(timer); timer = null; };
ornament.addEventListener('pointerdown', () => {
cancel();
timer = setTimeout(() => {
timer = null;
let marked = false;
try {
marked = localStorage.getItem(ME_KEY) !== '1';
if (marked) localStorage.setItem(ME_KEY, '1');
else localStorage.removeItem(ME_KEY);
} catch (error) { return; }
const note = document.createElement('p');
note.className = 'quiet-note';
note.textContent = marked ? 'Visits from here won’t be counted.' : 'Visits from here will be counted again.';
document.body.appendChild(note);
setTimeout(() => note.remove(), 3000);
}, HOLD_MS);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach(type => ornament.addEventListener(type, cancel));
ornament.addEventListener('contextmenu', e => e.preventDefault());
// iOS starts its own long press (text selection, the magnifier) from a
// touch; claiming the touch here leaves the hold to the timer above.
ornament.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
});
})();
