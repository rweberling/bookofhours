#!/usr/bin/env node
/* The keep card for an hour, drawn by the site's own keep.js, as a PNG.

   Usage: node scripts/hour_card.js <reading id> <image id> <watch> <out.png>

   Opens the Hours page (served from this checkout) at
   /?block=<watch>&r=<reading>&i=<image>, waits for that reading and
   image, and draws the wide card (1200×630, at 2×) exactly as "keep
   this page" would, in that watch's colours. scripts/syndicate.py runs
   it for "the hour" stream. Needs Playwright (NODE_PATH) and Chromium. */

const http = require('http');
const fs = require('fs');
const path = require('path');
const {chromium} = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.ico': 'image/x-icon', '.txt': 'text/plain'};

function serve() {
  const server = http.createServer((req, res) => {
    let file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, {'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream'});
      res.end(body);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function browserPath() {
  for (const p of [process.env.CHROME, '/opt/pw-browsers/chromium']) if (p && fs.existsSync(p)) return p;
  return undefined;   // Playwright's own
}

(async () => {
  const [reading, image, watch, out] = process.argv.slice(2);
  if (!out) { console.error('Usage: node scripts/hour_card.js <reading> <image> <watch> <out.png>'); process.exit(2); }
  const server = await serve();
  const browser = await chromium.launch({executablePath: browserPath()});
  try {
    // Boston's clock, so the page's light is the watch's own (the runner keeps UTC).
    const page = await browser.newPage({viewport: {width: 1280, height: 900}, timezoneId: 'America/New_York'});
    // Nothing leaves this machine: only the checkout is served.
    await page.route(url => !url.href.startsWith('http://127.0.0.1:'), route => route.abort());
    // The page fades between the hours' colours; the card takes the
    // colours as they stand, so it must not catch them mid-fade.
    await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
      document.head.appendChild(style);
    }));
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(`${base}/?block=${watch}&r=${reading}&i=${image}`, {waitUntil: 'load'});
    await page.waitForFunction(([r, i]) =>
      typeof currentQuote !== 'undefined' && currentQuote && currentQuote.id === r &&
      currentImage && currentImage.id === i, [reading, image], {timeout: 30000});
    await page.waitForFunction(watch => document.body.className.includes(`block-${watch}`), watch, {timeout: 10000})
      .catch(() => {});
    await page.waitForTimeout(500);
    const png = await page.evaluate(async () => {
      const data = await keepCardData();
      if (!data.img) throw new Error('the image did not load');
      const canvas = document.createElement('canvas');
      drawKeepCardFor(canvas, data, 'wide', KEEP_SCALE);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    fs.writeFileSync(out, Buffer.from(png, 'base64'));
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => { console.error(err.message || err); process.exit(1); });
