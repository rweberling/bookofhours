/* Sign In With DFOS — are you a key holder?

   Key holders are members of the paid subgroup in this site's DFOS
   space. Finding that out takes the read:memberships scope, whose
   credential is issued to this site's own DFOS app identity
   (/.well-known/dfos-app.json) and only works signed by that identity's
   private key — so the checking happens in a small Cloudflare Worker
   (worker/ in this repository) that holds the key and spends each
   sign-in code once. This file does the browser's part: the redirects.

   1. dfosBeginSignIn() asks the Worker for an authorize URL and goes there.
   2. DFOS asks the visitor to sign in and to let this site read their
      memberships, then sends them back to the site root with a signed
      challenge (query) and the credential (fragment).
   3. handleCallback() hands both to the Worker, which verifies them,
      asks DFOS whether the visitor is in the group, and answers with
      { did, keyHolder, token }. The token is kept in localStorage and
      traded in at the Worker's /session now and then, so leaving the
      group (or revoking the grant in DFOS) is noticed within hours.

   Still a gate in the browser, so cosmetic: it decides who gets the
   choosers, not who can technically reach this public site's files. */

// The Worker (worker/wrangler.jsonc), as deployed.
const AUTH_URL = 'https://earthlyhours-auth.REPLACE-ME.workers.dev';

// Pinned to an exact version, not a loose "latest" resolve — an
// unpinned CDN import means a bad or compromised release on the
// other end changes what runs on this site the moment it publishes,
// with nothing here to notice. Bump this deliberately, not silently.
// (Only readSiwdCallback is used here, a pure parse; verifying happens
// in the Worker.)
const DFOS_CLIENT_VERSION = '0.54.0';
const SIWD_MODULE_URL = `https://cdn.jsdelivr.net/npm/@metalabel/dfos-client@${DFOS_CLIENT_VERSION}/siwd/+esm`;

const SESSION_KEY = 'earthly-hours-dfos-session';  // localStorage: { did, keyHolder, token, checkedAt }
const FLIGHT_KEY = 'earthly-hours-dfos-flight';    // sessionStorage, one round trip: { intent, returnTo }
const RECHECK_MS = 6 * 60 * 60 * 1000;             // matches the Worker's

// Sign-ins from before key holders (identity only) carry nothing to
// check; drop them.
try { localStorage.removeItem('earthly-hours-dfos'); } catch (error) {}

function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    return session && session.did && session.token ? session : null;
  } catch (error) {
    return null;
  }
}

function writeSession(session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, checkedAt: Date.now() }));
    else localStorage.removeItem(SESSION_KEY);
  } catch (error) {}
}

function announce(detail) {
  window.dispatchEvent(new CustomEvent('dfossignin', { detail }));
}

async function callWorker(path, body) {
  const response = await fetch(`${AUTH_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `sign-in service answered ${response.status}`);
  return data;
}

window.dfosIsSignedIn = function () {
  return readSession() !== null;
};

window.dfosIsKeyHolder = function () {
  const session = readSession();
  return Boolean(session && session.keyHolder);
};

window.dfosSignOut = function () {
  writeSession(null);
  announce({ signedIn: false, keyHolder: false });
};

// intent is an arbitrary string the caller wants handed back once signed
// in (e.g. which pane to open) — best-effort only, since sessionStorage
// can be unavailable (private browsing, storage quota).
window.dfosBeginSignIn = async function (intent) {
  const { url } = await callWorker('/login/start');
  try {
    sessionStorage.setItem(FLIGHT_KEY, JSON.stringify({
      intent: intent || null,
      returnTo: location.pathname + location.search
    }));
  } catch (error) {
    // Sign-in still completes without the intent surviving the round trip
    // — the visitor just lands back on the page instead of the pane they
    // clicked from.
  }
  location.href = url;
};

// DFOS always returns to the site root (the one redirect_uri in
// dfos-app.json); the page and pane the visitor started from ride along
// in the flight record, and the root forwards them back there.
async function handleCallback() {
  const { readSiwdCallback } = await import(SIWD_MODULE_URL);
  // The whole URL: the credential comes back in the fragment.
  const result = readSiwdCallback(location.href);
  if (result.kind === 'none') return false;

  // Callback params are single-use either way — drop them (query and
  // fragment) so a refresh doesn't resubmit a spent sign-in.
  history.replaceState(null, '', location.pathname);

  let flight = null;
  try {
    flight = JSON.parse(sessionStorage.getItem(FLIGHT_KEY));
    sessionStorage.removeItem(FLIGHT_KEY);
  } catch (error) {}

  if (result.kind === 'denied') {
    console.warn('DFOS sign-in was not completed:', result.error);
    return true;
  }

  let session;
  try {
    session = await callWorker('/login/finish', { jws: result.jws, credential: result.credential });
  } catch (error) {
    console.warn('DFOS sign-in could not be finished:', error.message);
    return true;
  }
  writeSession(session);

  const returnTo = (flight && flight.returnTo) || '/';
  if (returnTo !== location.pathname + location.search) {
    location.replace(returnTo + (flight && flight.intent ? '#wander' : ''));
    return true;
  }
  announce({ signedIn: true, keyHolder: session.keyHolder, did: session.did, intent: flight && flight.intent });
  return true;
}

// Now and then, ask the Worker whether this is still a key holder.
async function refreshSession() {
  const session = readSession();
  if (!session || Date.now() - (session.checkedAt || 0) < RECHECK_MS) return;
  try {
    const answer = await callWorker('/session', { token: session.token });
    if (answer.signedIn === false) {
      writeSession(null);
      announce({ signedIn: false, keyHolder: false });
    } else {
      writeSession(answer);
      if (answer.keyHolder !== session.keyHolder) announce({ signedIn: true, keyHolder: answer.keyHolder, did: answer.did });
    }
  } catch (error) {
    // Offline or the Worker is down: keep what we had, try again next visit.
  }
}

handleCallback().then(handled => { if (!handled) refreshSession(); });
