/* ═══════════════════════════════════════════════════════════════
   nav.js — Shared navigation for Horae Terrenae
   Include on every page after the nav HTML.
════════════════════════════════════════════════════════════════ */

/* ── Drop-up menu utility ────────────────────────────────────────
   Call registerDropup(triggerId, menuId) for each drop-up group.
   Adding a new drop-up in the future is just one line.
────────────────────────────────────────────────────────────────── */
function registerDropup(triggerId, menuId) {
  const trigger = document.getElementById(triggerId);
  const menu    = document.getElementById(menuId);
  if (!trigger || !menu) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.contains('open');
    menu.classList.toggle('open', !isOpen);
    trigger.classList.toggle('open', !isOpen);
  });

  // Close when clicking anywhere else — registered once per call,
  // but the check is cheap so duplicates are harmless.
  document.addEventListener('click', () => {
    menu.classList.remove('open');
    trigger.classList.remove('open');
  });
}

// Register the Hours drop-up
registerDropup('nav-hours-trigger', 'nav-hours-menu');


/* ── Wander pane — open/close ────────────────────────────────────
   Only runs if the wander pane exists on this page (index.html).
   On other pages, the wander-open button links to index.html#wander
   and this block is skipped entirely.
────────────────────────────────────────────────────────────────── */
const wanderPane  = document.getElementById('wander-pane');
const wanderOpen  = document.getElementById('wander-open');
const wanderClose = document.getElementById('wander-close');

if (wanderPane && wanderOpen) {
  wanderOpen.addEventListener('click', () => {
    wanderPane.style.display = 'flex';
    requestAnimationFrame(() => wanderPane.classList.add('open'));
    if (typeof updateDialNowDot === 'function') updateDialNowDot();
    if (!document.querySelector('.wander-tile') && typeof buildWander === 'function' && typeof blocks !== 'undefined' && blocks) {
      buildWander(blocks);
    }
  });

  if (wanderClose) {
    wanderClose.addEventListener('click', closeWander);
  }

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


/* ── Escape key ──────────────────────────────────────────────────
   Closes lightbox and/or wander pane if open.
   closeLightbox() is defined in index.html; guard against its
   absence on other pages.
────────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (typeof closeLightbox === 'function') closeLightbox();
    closeWander();
  }
});


/* ── Hash-based wander open ──────────────────────────────────────
   On index.html: if the page loaded with #wander in the URL
   (e.g. linked from another page), open the wander pane once
   data is ready. The index.html init() calls openWanderIfHashed()
   after render completes.
   On other pages: not called, so nothing happens.
────────────────────────────────────────────────────────────────── */
function openWanderIfHashed() {
  if (window.location.hash === '#wander' && wanderPane && wanderOpen) {
    wanderPane.style.display = 'flex';
    requestAnimationFrame(() => wanderPane.classList.add('open'));
    if (typeof updateDialNowDot === 'function') updateDialNowDot();
    if (!document.querySelector('.wander-tile') && typeof buildWander === 'function' && typeof blocks !== 'undefined' && blocks) {
      buildWander(blocks);
    }
    // Clean up the hash without adding a history entry
    history.replaceState(null, '', window.location.pathname);
  }
}
