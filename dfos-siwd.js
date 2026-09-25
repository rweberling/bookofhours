/* Cosmetic "Sign in with DFOS" gate for the Wander buttons.
   scope=identity only: proves the visitor holds *a* DFOS identity, nothing
   about this project specifically — no space membership, no purchase check.
   That's a deliberate choice, not a shortcut: anything stronger (verifying
   membership in this site's own DFOS space) needs a credential scope, which
   needs a server holding an app private key and a real one-time-use nonce
   store. This site has neither, on purpose, so this only ever proves "some
   DFOS identity signed in just now."

   No backend either way: verification runs entirely in the browser using
   DFOS's own client packages, loaded from jsDelivr's ESM CDN so no build
   step is needed to import them. sessionStorage stands in for the httpOnly
   cookie the official flow seals the expected nonce into — a page script
   could in principle read it, which the real flow is hardened against and
   this isn't. Fine for a cosmetic gate; would not be fine for anything that
   actually needed to hold up under attack. */

const AUTHORIZE_URL = 'https://app.dfos.com/authorize';
const RELAY_URL = 'https://relay.dfos.com';
const SIWD_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@metalabel/dfos-client/siwd/+esm';
const CLIENT_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@metalabel/dfos-client/+esm';

const SESSION_KEY = 'earthly-hours-dfos';        // localStorage, persists: { did, signedInAt }
const FLIGHT_KEY = 'earthly-hours-dfos-flight';  // sessionStorage, one round trip: { nonce, domain, intent }

function callbackUrl() {
  return `${location.origin}${location.pathname}`;
}

window.dfosIsSignedIn = function () {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return !!(raw && JSON.parse(raw).did);
  } catch (error) {
    return false;
  }
};

window.dfosSignOut = function () {
  try { localStorage.removeItem(SESSION_KEY); } catch (error) {}
  window.dispatchEvent(new CustomEvent('dfossignin', { detail: { signedIn: false } }));
};

// intent is an arbitrary string the caller wants handed back once signed
// in (e.g. which pane to open) — best-effort only, since sessionStorage
// can be unavailable (private browsing, storage quota).
window.dfosBeginSignIn = async function (intent) {
  const { createSiwdLoginRequest } = await import(SIWD_MODULE_URL);
  const domain = location.hostname;
  const { url, expect } = createSiwdLoginRequest({
    authorizeUrl: AUTHORIZE_URL,
    domain,
    redirectUri: callbackUrl(),
    scope: 'identity'
  });
  try {
    sessionStorage.setItem(FLIGHT_KEY, JSON.stringify({ nonce: expect.nonce, domain, intent: intent || null }));
  } catch (error) {
    // Sign-in still completes without the intent surviving the round trip
    // — the visitor just lands back on the page instead of the pane they
    // clicked from.
  }
  location.href = url;
};

async function handleCallback() {
  const { readSiwdCallback } = await import(SIWD_MODULE_URL);
  const result = readSiwdCallback(location.href);
  if (result.kind === 'none') return;

  // Callback params are single-use either way — drop them so a refresh
  // doesn't reprocess a spent (or denied) sign-in.
  history.replaceState(null, '', location.pathname);

  let flight = null;
  try {
    const raw = sessionStorage.getItem(FLIGHT_KEY);
    if (raw) flight = JSON.parse(raw);
    sessionStorage.removeItem(FLIGHT_KEY);
  } catch (error) {}

  if (result.kind === 'denied') {
    console.warn('DFOS sign-in was not completed:', result.error);
    return;
  }
  if (!flight) {
    console.warn('DFOS sign-in callback arrived with no matching in-flight request (expired tab, or storage was cleared mid-flow).');
    return;
  }

  const [{ verifySiwd }, { createClient }] = await Promise.all([
    import(SIWD_MODULE_URL),
    import(CLIENT_MODULE_URL)
  ]);
  const client = createClient({ relays: [RELAY_URL] });
  const verified = await verifySiwd(client, result.jws, { domain: flight.domain, nonce: flight.nonce });

  if (!verified.ok) {
    console.warn('DFOS sign-in failed verification:', verified.error);
    return;
  }

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ did: verified.value.did, signedInAt: Date.now() }));
  } catch (error) {}

  window.dispatchEvent(new CustomEvent('dfossignin', {
    detail: { signedIn: true, did: verified.value.did, intent: flight.intent }
  }));
}

handleCallback();
