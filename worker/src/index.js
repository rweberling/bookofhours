/* ═══════════════════════════════════════════════════════════════
   earthlyhours-auth — the server half of Sign In With DFOS for
   earthlyhours.com: are you a key holder (a member of the paid
   subgroup in the DFOS space)?

   The site (dfos-siwd.js) does the redirects; this Worker holds what a
   static site can't:
   - the site's DFOS app identity (APP_PRIVATE_KEY, a secret), which
     read:memberships credentials are issued to and which signs every
     DFOS API call made with them
   - the sign-in codes (SIWD nonces), each spendable once (D1), as
     INTEGRATIONS.md requires for any credential-returning sign-in
   - each visitor's standing grant (D1), so key-holder status can be
     re-checked without another sign-in — someone who leaves the group,
     or revokes the grant in DFOS, stops getting through.

   POST /login/start   → { url }   where to send the browser
   POST /login/finish  { jws, credential } → { did, keyHolder, token }
   POST /session       { token } → { did, keyHolder, token } | { signedIn: false }

   It also takes sign-ups for the Otherwise / Earthly Hours letters, kept
   here until they're imported into the DFOS space's subscribers (DFOS
   has no way for a site to add one directly):
   POST /subscribe     { email, turnstile, source } → { ok: true }
   GET  /subscribers.csv?key=…[&since=YYYY-MM-DD]   the list, for DFOS's
                       import (Studio → Reach → Audience); the key is the
                       EXPORT_KEY secret. See subscribe() below.

   The token is this Worker's own: an HMAC-signed note of who signed in
   and when they were last checked. The site keeps it in localStorage
   and trades it in at /session when the check is stale.

   It also keeps a daily tally of what it's asked (D1's tally table):
   counts only, never who. See tally() below and README.md.
════════════════════════════════════════════════════════════════ */

import { createClient } from '@metalabel/dfos-client';
import { createSiwdLoginRequest, restoreSiwdClientIdentity, verifySiwd } from '@metalabel/dfos-client/siwd';
import { createApiAuthFetch } from '@metalabel/dfos-client/api-auth';
import { decodeDFOSCredentialUnsafe } from '@metalabel/dfos-protocol/credentials';
import { EmailMessage } from 'cloudflare:email';

const NONCE_TTL_MS = 10 * 60 * 1000;            // a sign-in must finish within 10 minutes
// How often to re-ask DFOS about the group: rarely for key holders, but
// soon for everyone else, so someone who has just joined comes back to
// find the choosers open.
const RECHECK_MS = 6 * 60 * 60 * 1000;
const RECHECK_OUTSIDER_MS = 2 * 60 * 1000;
const TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;  // after 60 days unseen, sign in again

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    // What each request comes to, counted once the answer has gone.
    const events = [];
    const response = await answer(request, env, cors, events, ctx);
    ctx.waitUntil(tally(env, events));
    return response;
  }
};

async function answer(request, env, cors, events, ctx) {
  const fromSite = 'Access-Control-Allow-Origin' in cors;
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/subscribers.csv') return exportSubscribers(env, url);
  if (request.method !== 'POST') { events.push('noise'); return json({ error: 'not found' }, 404, cors); }

  const { pathname } = url;
  try {
    const body = await request.json().catch(() => ({}));
    if (pathname === '/subscribe') return json(await subscribe(env, request, body, fromSite, events, ctx), 200, cors);
    if (pathname === '/login/start') { events.push(fromSite ? 'start' : 'noise'); return json(await loginStart(env), 200, cors); }
    if (pathname === '/login/finish') return json(await loginFinish(env, body, events), 200, cors);
    if (pathname === '/session') return json(await session(env, body, events), 200, cors);
    events.push('noise');
    return json({ error: 'not found' }, 404, cors);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status === 500) console.error(error);
    if (pathname !== '/subscribe' || status === 500) events.push(pathname === '/login/finish' ? 'signin-failed' : status === 500 ? 'error' : 'noise');
    return json({ error: status === 500 ? 'internal error' : error.message }, status, cors);
  }
}

/* ── Sign-in ──────────────────────────────────────────────────── */

async function loginStart(env) {
  const now = Date.now();
  const { url, expect } = createSiwdLoginRequest({
    authorizeUrl: env.AUTHORIZE_URL,
    domain: env.SITE_DOMAIN,
    redirectUri: env.REDIRECT_URI,
    scope: 'read:memberships',
    clientDid: JSON.parse(env.APP_IDENTITY).did,
    statement: 'Sign in to wander the Earthly Book of Hours. It checks whether you hold a key.'
  });
  await env.DB.batch([
    env.DB.prepare('DELETE FROM nonces WHERE expires_at < ?').bind(now),
    env.DB.prepare('INSERT INTO nonces (nonce, expires_at) VALUES (?, ?)').bind(expect.nonce, now + NONCE_TTL_MS)
  ]);
  return { url };
}

async function loginFinish(env, { jws, credential }, events) {
  if (typeof jws !== 'string' || typeof credential !== 'string') throw new HttpError(400, 'jws and credential are required');

  // Spends the nonce: the atomic DELETE … RETURNING is the check, and
  // verifySiwd calls it last, after every other check has passed.
  const consumeNonce = async nonce => {
    const row = await env.DB.prepare('DELETE FROM nonces WHERE nonce = ? AND expires_at >= ? RETURNING nonce')
      .bind(nonce, Date.now()).first();
    return row !== null;
  };
  const verified = await verifySiwd(dfosClient(env), jws, { domain: env.SITE_DOMAIN, consumeNonce });
  if (!verified.ok) throw new HttpError(401, 'sign-in did not verify');
  const did = verified.value.did;

  // The credential must be this visitor's grant to this site — otherwise
  // a membership answer would be about someone else.
  const decoded = decodeDFOSCredentialUnsafe(credential);
  const appDid = JSON.parse(env.APP_IDENTITY).did;
  if (!decoded || decoded.payload.iss !== did || decoded.payload.aud !== appDid) {
    throw new HttpError(401, 'credential does not match the sign-in');
  }

  if (!env.KEY_HOLDER_GROUP) await recordGroupsForSetup(env, did, credential);
  const keyHolder = await checkKeyHolder(env, credential);
  if (keyHolder === null) throw new HttpError(401, 'DFOS did not accept the grant');
  const before = await env.DB.prepare('SELECT key_holder FROM grants WHERE did = ?').bind(did).first();
  events.push(keyHolder ? 'signin-wanderer' : 'signin-other');
  if (keyHolder && !(before && before.key_holder === 1)) events.push('new-wanderer');
  const checkedAt = Date.now();
  await env.DB.prepare(
    'INSERT INTO grants (did, credential, key_holder, checked_at) VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT(did) DO UPDATE SET credential = excluded.credential, key_holder = excluded.key_holder, checked_at = excluded.checked_at'
  ).bind(did, credential, keyHolder ? 1 : 0, checkedAt).run();

  return { did, keyHolder, token: await signToken(env, { did, kh: keyHolder, chk: checkedAt, exp: checkedAt + TOKEN_TTL_MS }) };
}

async function session(env, { token }, events) {
  events.push('recheck');
  const claims = await readToken(env, token);
  if (!claims) return { signedIn: false };
  const grant = await env.DB.prepare('SELECT credential, key_holder, checked_at FROM grants WHERE did = ?').bind(claims.did).first();
  if (!grant) return { signedIn: false };

  let keyHolder = grant.key_holder === 1;
  let checkedAt = grant.checked_at;
  if (Date.now() - checkedAt > (keyHolder ? RECHECK_MS : RECHECK_OUTSIDER_MS)) {
    let answer;
    try {
      answer = await checkKeyHolder(env, grant.credential);
    } catch (error) {
      // DFOS unreachable or erroring: keep the last answer, ask again next time.
      console.error('re-check failed; keeping the last answer', error);
      return { did: claims.did, keyHolder, token };
    }
    if (answer === null) {
      // Revoked or expired in DFOS: forget the grant; they can sign in again.
      await env.DB.prepare('DELETE FROM grants WHERE did = ?').bind(claims.did).run();
      return { signedIn: false };
    }
    if (answer && !keyHolder) events.push('new-wanderer');
    keyHolder = answer;
    checkedAt = Date.now();
    await env.DB.prepare('UPDATE grants SET key_holder = ?, checked_at = ? WHERE did = ?')
      .bind(keyHolder ? 1 : 0, checkedAt, claims.did).run();
  }
  return { did: claims.did, keyHolder, token: await signToken(env, { did: claims.did, kh: keyHolder, chk: checkedAt, exp: Date.now() + TOKEN_TTL_MS }) };
}

/* ── DFOS API ─────────────────────────────────────────────────── */

// A fresh client for every verification, never one shared across
// requests: the client caches each identity it resolves, and a second
// resolution answered from that cache counts as possibly stale, which
// verifySiwd rightly refuses — so a shared client would turn away
// everyone signing in for the second time in the same isolate.
function dfosClient(env) {
  return createClient({ relays: [env.RELAY_URL] });
}

let cachedApp = null;
async function appIdentity(env) {
  if (!cachedApp) {
    const { chain } = JSON.parse(env.APP_IDENTITY);
    const privateKey = base64urlToBytes(env.APP_PRIVATE_KEY);
    cachedApp = await restoreSiwdClientIdentity({ privateKey, chain });
  }
  return cachedApp;
}

async function apiFetch(env, credential) {
  const app = await appIdentity(env);
  return createApiAuthFetch({ credential, kid: app.kid, sign: app.signer, jti: 'never' });
}

// true / false for in or out of the key holders' group; null when DFOS
// refuses the grant itself (revoked, expired) — anything else is an error.
async function checkKeyHolder(env, credential) {
  if (!env.KEY_HOLDER_GROUP) return false;
  const signedFetch = await apiFetch(env, credential);
  const response = await signedFetch(`${env.API_BASE}/group-membership/${encodeURIComponent(env.KEY_HOLDER_GROUP)}`);
  if (response.status === 200) return true;
  if (response.status === 404) return false;
  if (response.status === 401 || response.status === 403) return null;
  throw new Error(`DFOS API answered ${response.status}: ${await response.text()}`);
}

// Setup aid, only while KEY_HOLDER_GROUP is unset: keeps the names and
// ids of the groups whoever signs in belongs to, so the right id can be
// read out of D1 (SELECT * FROM setup_groups) and put in wrangler.jsonc.
async function recordGroupsForSetup(env, did, credential) {
  try {
    const signedFetch = await apiFetch(env, credential);
    const response = await signedFetch(`${env.API_BASE}/group-memberships`);
    const body = await response.text();
    await env.DB.batch([
      env.DB.prepare('CREATE TABLE IF NOT EXISTS setup_groups (did TEXT PRIMARY KEY, status INTEGER, body TEXT, at INTEGER)'),
      env.DB.prepare('INSERT OR REPLACE INTO setup_groups (did, status, body, at) VALUES (?, ?, ?, ?)').bind(did, response.status, body, Date.now())
    ]);
  } catch (error) {
    console.error('recording groups for setup failed', error);
  }
}

/* ── Sign-ups ─────────────────────────────────────────────────── */

// An address from the form on the site, checked by Cloudflare Turnstile
// (TURNSTILE_SECRET), kept in D1's subscribers table. The answer is the
// same whether the address is new or already there, so the form can't be
// used to find out who has signed up. Someone who asks to be taken off:
// DELETE FROM subscribers WHERE email = '…' (and unsubscribe them in DFOS).
const EMAIL = /^[^\s@<>(),;:"\[\]]+@[^\s@<>(),;:"\[\]]+\.[^\s@<>(),;:"\[\]]{2,}$/;
let subscribersReady = false;

async function subscribersTable(env) {
  if (subscribersReady) return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS subscribers (email TEXT PRIMARY KEY, added_at INTEGER NOT NULL, source TEXT)').run();
  subscribersReady = true;
}

async function subscribe(env, request, { email, turnstile, source, website }, fromSite, events, ctx) {
  if (!fromSite) { events.push('noise'); throw new HttpError(403, 'not allowed'); }
  // A field people never see; only a bot fills it in. Thanked, not kept.
  if (website) { events.push('subscribe-refused'); return { ok: true }; }
  email = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (email.length > 254 || !EMAIL.test(email)) { events.push('subscribe-refused'); throw new HttpError(400, 'invalid email'); }
  if (!(await turnstileOk(env, request, turnstile))) { events.push('subscribe-refused'); throw new HttpError(400, 'verification failed'); }
  await subscribersTable(env);
  const page = typeof source === 'string' ? source.slice(0, 120) : null;
  const result = await env.DB.prepare('INSERT INTO subscribers (email, added_at, source) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING')
    .bind(email, Date.now(), page).run();
  events.push(result.meta.changes ? 'subscribe' : 'subscribe-again');
  if (result.meta.changes) ctx.waitUntil(notifySignup(env, email, page, new URL(request.url).origin));
  return { ok: true };
}

// A note to Ryan for each new address, through Cloudflare Email Routing
// (the NOTIFY binding in wrangler.jsonc). The address it goes to is the
// NOTIFY_TO secret, kept out of this public repository; it must be a
// verified destination in Email Routing. Without it, nothing is sent.
// The note carries the export links (with EXPORT_KEY), so it stays
// private: it goes only to that one address.
async function notifySignup(env, email, page, origin) {
  if (!env.NOTIFY || !env.NOTIFY_TO) return;
  try {
    const { total } = await env.DB.prepare('SELECT COUNT(*) AS total FROM subscribers').first();
    const from = `signups@${env.SITE_DOMAIN}`;
    const when = new Date().toUTCString();
    const today = new Date().toISOString().slice(0, 10);
    const list = `${origin}/subscribers.csv?key=${encodeURIComponent(env.EXPORT_KEY || '')}`;
    const body = [
      `${email} signed up for Letters from Otherwise.`,
      '',
      `Page: https://${env.SITE_DOMAIN}${page || '/'}`,
      `When: ${when}`,
      `On the list: ${total}`,
      '',
      'The list for DFOS (Studio → Reach → Audience → import):',
      `Everyone: ${list}`,
      `Added today: ${list}&since=${today}`,
      '',
      'Keep these links private: anyone with them can download the list.'
    ].join('\r\n');
    const raw = [
      `From: Earthly Hours sign-ups <${from}>`,
      `To: ${env.NOTIFY_TO}`,
      `Subject: New subscriber: ${email}`,
      `Date: ${when}`,
      `Message-ID: <${crypto.randomUUID()}@${env.SITE_DOMAIN}>`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      body
    ].join('\r\n');
    await env.NOTIFY.send(new EmailMessage(from, env.NOTIFY_TO, raw));
  } catch (error) {
    console.error('sign-up note failed', error);
  }
}

async function turnstileOk(env, request, token) {
  if (typeof token !== 'string' || !token || !env.TURNSTILE_SECRET) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.append('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const outcome = await response.json().catch(() => ({}));
  return outcome.success === true;
}

// The list as CSV, newest last: email, the day it was added (UTC) and the
// page it came from. ?since=YYYY-MM-DD gives only those added that day or
// later. Importing the whole list again is harmless: DFOS keeps one entry
// per address and doesn't re-subscribe anyone who unsubscribed.
async function exportSubscribers(env, url) {
  const key = url.searchParams.get('key') || '';
  if (!env.EXPORT_KEY || !(await sameText(key, env.EXPORT_KEY))) return new Response('not found', { status: 404 });
  await subscribersTable(env);
  const since = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('since') || '') ? Date.parse(url.searchParams.get('since') + 'T00:00:00Z') : 0;
  const { results } = await env.DB.prepare('SELECT email, added_at, source FROM subscribers WHERE added_at >= ? ORDER BY added_at').bind(since).all();
  const cell = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = ['email,added,source', ...results.map(r => [r.email, new Date(r.added_at).toISOString().slice(0, 10), r.source || ''].map(cell).join(','))];
  const day = new Date().toISOString().slice(0, 10);
  return new Response(lines.join('\n') + '\n', { headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="earthlyhours-subscribers-${day}.csv"`,
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex'
  } });
}

async function sameText(a, b) {
  const [x, y] = await Promise.all([a, b].map(t => crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))));
  return crypto.subtle.timingSafeEqual(x, y);
}

/* ── The tally ────────────────────────────────────────────────── */

// How many of each thing happened each day (UTC), and nothing about who:
//   start            a sign-in begun from the site
//   signin-wanderer  a sign-in finished by a key holder (a Wanderer)
//   signin-other     a sign-in finished by anyone else
//   signin-failed    a sign-in that didn't verify
//   new-wanderer     someone counted as a key holder for the first time
//                    (at sign-in, or a re-check after they joined)
//   recheck          a signed-in browser trading in its token (/session)
//   subscribe        a new address signed up for the letters
//   subscribe-again  an address that was already on the list
//   subscribe-refused  a sign-up turned away: a bad address, a failed
//                    Turnstile check, or the hidden field filled in
//   noise            anything else: other paths and methods, or a sign-in
//                    begun from outside the site; mostly bots
//   error            this Worker failing
// The table makes itself, so a deploy needs no step in D1. Counting never
// gets in the way of an answer.
let tallyReady = false;
async function tally(env, events) {
  if (!events.length) return;
  try {
    if (!tallyReady) {
      await env.DB.prepare('CREATE TABLE IF NOT EXISTS tally (day TEXT NOT NULL, event TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY (day, event))').run();
      tallyReady = true;
    }
    const day = new Date().toISOString().slice(0, 10);
    await env.DB.batch(events.map(event => env.DB.prepare(
      'INSERT INTO tally (day, event, count) VALUES (?, ?, 1) ON CONFLICT(day, event) DO UPDATE SET count = count + 1'
    ).bind(day, event)));
  } catch (error) {
    console.error('tally failed', error);
  }
}

/* ── Tokens ───────────────────────────────────────────────────── */

async function hmacKey(env) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signToken(env, claims) {
  const body = bytesToBase64url(new TextEncoder().encode(JSON.stringify(claims)));
  const mac = await crypto.subtle.sign('HMAC', await hmacKey(env), new TextEncoder().encode(body));
  return `${body}.${bytesToBase64url(new Uint8Array(mac))}`;
}

async function readToken(env, token) {
  if (typeof token !== 'string') return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  let ok = false;
  try {
    ok = await crypto.subtle.verify('HMAC', await hmacKey(env), base64urlToBytes(mac), new TextEncoder().encode(body));
  } catch (error) {
    return null;
  }
  if (!ok) return null;
  const claims = JSON.parse(new TextDecoder().decode(base64urlToBytes(body)));
  return typeof claims.did === 'string' && claims.exp > Date.now() ? claims : null;
}

/* ── Plumbing ─────────────────────────────────────────────────── */

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim());
  const headers = { 'Vary': 'Origin' };
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

function bytesToBase64url(bytes) {
  let s = '';
  bytes.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBytes(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
