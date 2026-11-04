#!/usr/bin/env node
/* Check the pages in a browser: what check_data.py can't see from the
   data alone, because it's the page code that sets it out.

   Usage (from the repo root; Playwright and Chromium are in the cloud
   container):
     LANG=C.UTF-8 node scripts/check_pages.js            # every post, and the main pages
     LANG=C.UTF-8 node scripts/check_pages.js first-frost perseids

   It serves the repo itself on a free port, so no server need be running.
   Each Lectio Terra post page is checked for:
     - script errors (the DFOS sign-in script, which can't load in tests, aside)
     - each reading marked as verse set out as verse (markVerse() in seasons.js)
     - each footnote reference going to its note, and the note back
     - each reading's citation in its own block below it (markReadings())
     - the Latin name under the title, where the subject has one
     - the gap from the end of the post to its "Published" line: the same
       on every post, within a few pixels
     - the same words on the Seasons page, which fetches the post from
       this page, with its footnotes linking within the page
   and the Hours, Weather and Seasons pages for script errors and for the
   "turn the page | keep this page" divider sitting evenly between its words.
   Exits 1 if anything fails, so a session can run it before pushing. */

const http = require('http');
const fs = require('fs');
const path = require('path');
const {chromium} = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml',
  '.mp4': 'video/mp4', '.ico': 'image/x-icon', '.txt': 'text/plain'};
const PUBLISHED_GAP = {min: 24, max: 36};   // px from the post's last text or caption to "Published"

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

const load = name => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', `${name}.json`), 'utf8'));

(async () => {
  const lectio = load('lectio-data');
  const posts = Object.entries(lectio.seasons).flatMap(([season, items]) => items.map(p => ({...p, season}))).filter(p => p.page);
  const subjects = new Map([...load('species'), ...load('phenomena')].map(s => [s.id, s]));
  const verseCount = new Map();
  for (const r of load('readings')) {
    if (r.draft || !(r.lectio && r.display && r.display.verse)) continue;
    verseCount.set(r.lectio.post, (verseCount.get(r.lectio.post) || 0) + 1);
  }
  const wanted = process.argv.slice(2);
  const chosen = wanted.length ? posts.filter(p => wanted.some(w => p.page.includes(`/${w}/`))) : posts;

  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({executablePath: browserPath()});
  const failures = [];
  const fail = (where, what) => failures.push(`${where}: ${what}`);

  async function open(url, width = 1000) {
    const page = await browser.newPage({viewport: {width, height: 900}});
    const errors = [];
    page.on('pageerror', e => { if (!/dfos/i.test(e.message)) errors.push(e.message); });
    await page.goto(base + url, {waitUntil: 'networkidle'});
    // Measure the page at rest: no fades or slides under way.
    await page.addStyleTag({content: '*{animation:none!important;transition:none!important;opacity:1!important}'});
    return {page, errors};
  }

  for (const post of chosen) {
    const where = post.page.replace(/^lectio-terra\/|\/$/g, '');
    const {page, errors} = await open('/' + post.page);
    errors.forEach(e => fail(where, `script error: ${e}`));
    const r = await page.evaluate(() => {
      const body = document.getElementById('season-reading-body');
      const readings = [...body.querySelectorAll('section.reading')];
      const refs = [...body.querySelectorAll('a.footnote-ref')];
      const notes = [...body.querySelectorAll('.footnote')];
      const target = a => document.getElementById((a.getAttribute('href') || '').split('#')[1] || '');
      // The post's visible end: its last text, or its last figure's caption.
      let end = body.lastElementChild;
      while (end && end.lastElementChild && !['P', 'FIGURE', 'UL', 'OL', 'ASIDE'].includes(end.tagName)) end = end.lastElementChild;
      while (end && end.getBoundingClientRect().height === 0) end = end.previousElementSibling;
      if (end && end.tagName === 'FIGURE') end = end.querySelector('figcaption') || end;
      const published = document.getElementById('season-reading-observation');
      return {
        verse: body.querySelectorAll('.reading-verse').length,
        readings: readings.length,
        cited: readings.filter(s => s.querySelector(':scope > .reading-citation')).length,
        refs: refs.length, notes: notes.length,
        brokenRefs: refs.filter(a => !target(a) || !target(a).classList.contains('footnote')).length,
        brokenBacks: notes.filter(n => { const a = n.querySelector('a.footnote-number'); return !a || !target(a); }).length,
        latin: (document.getElementById('season-reading-latin') || {}).textContent || '',
        gap: end && published ? Math.round(published.getBoundingClientRect().top - end.getBoundingClientRect().bottom) : null,
      };
    });
    const expectVerse = verseCount.get(post.id) || 0;
    if (r.verse !== expectVerse) fail(where, `${r.verse} of ${expectVerse} verse reading(s) set out as verse`);
    if (r.cited !== r.readings) fail(where, `${r.readings - r.cited} of ${r.readings} reading(s) without a citation block`);
    if (r.brokenRefs) fail(where, `${r.brokenRefs} footnote reference(s) going nowhere`);
    if (r.brokenBacks) fail(where, `${r.brokenBacks} footnote(s) without a way back`);
    if (r.refs !== r.notes) fail(where, `${r.refs} footnote reference(s) but ${r.notes} note(s)`);
    // As many as the post has in its Substack original (data/substack/<id>.html):
    // its own #footnote-N links; another site's are only links.
    const originalFile = path.join(ROOT, 'data', 'substack', `${post.id}.html`);
    const original = fs.existsSync(originalFile) ? fs.readFileSync(originalFile, 'utf8') : '';
    const expectRefs = [...original.matchAll(/href="([^"]*)#footnote-\d+"/g)]
      .filter(m => !/^[a-z]+:/i.test(m[1])).length;
    if (r.refs !== expectRefs) fail(where, `${r.refs} of ${expectRefs} footnote reference(s) marked`);
    const subject = subjects.get(post.subject);
    const latin = subject && (subject.scientific || subject.latin);
    if (latin && r.latin.trim() !== latin) fail(where, `Latin line reads "${r.latin.trim()}", not "${latin}"`);
    if (r.gap === null || r.gap < PUBLISHED_GAP.min || r.gap > PUBLISHED_GAP.max) {
      fail(where, `${r.gap} px from the post's end to "Published" (expected ${PUBLISHED_GAP.min}–${PUBLISHED_GAP.max})`);
    }
    // The Seasons page shows the post by fetching this page (postBody() in
    // seasons.js): it must read the same there, with its footnotes linking
    // within the page.
    const words = () => page.evaluate(() => document.getElementById('season-reading-body').innerText.replace(/\s+/g, ' ').trim());
    const onPage = await words();
    await page.goto(`${base}/seasons.html?season=${post.season}&entry=${post.id}`, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => document.querySelector('#season-reading-body section.reading, #season-reading-body p'), null, {timeout: 15000}).catch(() => {});
    const onSeasons = await words();
    const outward = await page.evaluate(() => [...document.querySelectorAll('#season-reading-body :is(a.footnote-ref, a.footnote-number)')]
      .filter(a => !a.getAttribute('href').startsWith('#')).length);
    if (outward) fail(where, `${outward} footnote link(s) on the Seasons page leave the page`);
    if (onPage !== onSeasons) {
      let i = 0;
      while (i < onPage.length && onPage[i] === onSeasons[i]) i++;
      fail(where, `its page and the Seasons page differ at character ${i}: «${onPage.slice(i, i + 40)}» / «${onSeasons.slice(i, i + 40)}»`);
    }
    await page.close();
  }

  // The section pages: no script errors, and the divider even in its row.
  if (!wanted.length) {
    for (const url of ['/', '/weather.html', '/seasons.html']) {
      for (const width of [1000, 390]) {
        const {page, errors} = await open(url, width);
        await page.waitForTimeout(800);
        errors.forEach(e => fail(`${url} at ${width}px`, `script error: ${e}`));
        const gaps = await page.evaluate(() => {
          const row = [...document.querySelectorAll('.turn-the-page')].find(e => e.querySelector('.ttp-sep') && e.offsetParent);
          if (!row) return null;
          const sep = row.querySelector('.ttp-sep').getBoundingClientRect();
          const buttons = [...row.querySelectorAll('.page-action')].filter(b => b.offsetParent).map(b => b.getBoundingClientRect());
          const before = buttons.filter(b => b.right <= sep.left + 1).pop();
          const after = buttons.find(b => b.left >= sep.right - 1);
          return before && after ? [Math.round(sep.left - before.right), Math.round(after.left - sep.right)] : null;
        });
        if (gaps && Math.abs(gaps[0] - gaps[1]) > 1) fail(`${url} at ${width}px`, `divider sits ${gaps[0]} px / ${gaps[1]} px from its words`);
        await page.close();
      }
    }
  }

  await browser.close();
  server.close();
  console.log(`${chosen.length} post page(s)${wanted.length ? '' : ' and the Hours, Weather and Seasons pages'} checked.`);
  if (failures.length) {
    console.log(`\n${failures.length} problem(s):`);
    failures.forEach(f => console.log(`  ${f}`));
    process.exit(1);
  }
  console.log('No problems.');
})().catch(e => { console.error(e); process.exit(2); });
