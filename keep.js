/* ══════════════════════════════════════════════════════════════
   KEEP THIS PAGE
   The "keep this page" button opens the keep pane: the page drawn as
   a card (wide 1200×630 for link previews, tall 1080×1350 for phones
   and Instagram), the page's link with "copy", and save image · print
   (share · save · print where the browser can share files). Print is
   the whole page, as before (printKeepsake() in hours.js); the card is
   only for saving and sharing.

   The page tells this file what it shows through keepPageData(),
   defined by the page's own script (hours.js):
     { block, readingId, imageId, imageMaster,
       quoteEl, attrEl, captionEl }
   The card is drawn from those elements and the page's own colours,
   so it follows the hour and the light. drawKeepCard() knows nothing
   of the Hours page and can draw cards for other pages later.
══════════════════════════════════════════════════════════════ */

const KEEP_SHAPES = {
  wide: { w: 1200, h: 630 },
  tall: { w: 1080, h: 1350 }
};
const KEEP_SCALE = 2;   // drawn at twice the size, so a saved card stays sharp

// --- Text as runs ---------------------------------------------------------
// A reading, citation or caption becomes lines of runs ({ text, flip }),
// where flip means "the other style": a title in <em> inside italic text
// is set roman, as in print, and italic inside roman text.
// Lines: { runs, indent } or { gap: true } (a stanza or paragraph break).
function keepTextLines(el) {
  const lines = [];
  let line = null;
  const newLine = (indent = 0) => { line = { runs: [], indent }; lines.push(line); };
  const gap = () => {
    if (lines.length && !lines[lines.length - 1].gap) lines.push({ gap: true });
    line = null;
  };
  function walk(node, flip) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.replace(/\s+/g, ' ');
      if (!text.trim() && (!line || !line.runs.length)) return;
      if (!line) newLine();
      line.runs.push({ text, flip });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();
    const cls = node.classList;
    if (cls.contains('verse-gap')) { gap(); return; }
    if (tag === 'br') {
      // Two breaks in a row (an empty line) part paragraphs.
      if (line && !line.runs.some(r => r.text.trim())) { line.runs = []; gap(); }
      newLine();
      return;
    }
    if (cls.contains('verse-line')) {
      const m = (node.getAttribute('style') || '').match(/--indent:\s*([\d.]+)/);
      newLine(m ? parseFloat(m[1]) * 0.21 : 0);
      node.childNodes.forEach(n => walk(n, flip));
      line = null;
      return;
    }
    if (tag === 'p') {
      if (lines.length) gap();
      node.childNodes.forEach(n => walk(n, flip));
      gap();
      return;
    }
    const f = (tag === 'em' || tag === 'i' || tag === 'cite') ? !flip : flip;
    node.childNodes.forEach(n => walk(n, f));
  }
  el.childNodes.forEach(n => walk(n, false));
  // Tidy: trim each line's ends, drop empty lines and trailing gaps.
  const out = [];
  for (const l of lines) {
    if (l.gap) { if (out.length && !out[out.length - 1].gap) out.push(l); continue; }
    if (!l.runs.length) continue;
    l.runs[0].text = l.runs[0].text.replace(/^\s+/, '');
    const last = l.runs[l.runs.length - 1];
    last.text = last.text.replace(/\s+$/, '');
    if (l.runs.some(r => r.text)) out.push(l);
  }
  while (out.length && out[out.length - 1].gap) out.pop();
  return out;
}

// --- Drawing text on a canvas ---------------------------------------------
// Shared by the card and the printed pages: fonts, letter-spaced capitals,
// and lines of runs laid out to a width (layout) and drawn (drawLine).
function keepTextTools(c) {
  const STAR = '"Earthly Star"';
  const fontOf = (family, size, italic) => `${italic ? 'italic ' : ''}${size}px ${STAR}, ${family}, Georgia, serif`;

  function spaced(text, x, y, size, spacing, color, italic = false) {
    c.font = fontOf('"Cormorant Garamond"', size, italic); c.fillStyle = color; c.textAlign = 'left';
    const chars = [...text];
    const width = chars.reduce((s, ch) => s + c.measureText(ch).width + spacing, -spacing);
    let cx = x - width / 2;
    chars.forEach(ch => { c.fillText(ch, cx, y); cx += c.measureText(ch).width + spacing; });
  }

  // Lays runs out in lines no wider than maxW. Each laid line is a list
  // of pieces { text, flip }, plus its indent; continuation lines of a
  // verse line hang 2em deeper, as on the page.
  function layout(lines, family, size, baseItalic, maxW, hang) {
    const out = [];
    for (const l of lines) {
      if (l.gap) { out.push({ gap: true }); continue; }
      const words = [];
      l.runs.forEach(r => r.text.split(/(\s+)/).forEach(t => {
        if (t === '') return;
        if (/^\s+$/.test(t)) { if (words.length) words[words.length - 1].space = true; return; }
        words.push({ text: t, flip: r.flip, space: false });
      }));
      const indent = (l.indent || 0) * size;
      let cur = { pieces: [], indent, width: 0 };
      const widthOf = wd => { c.font = fontOf(family, size, baseItalic !== wd.flip); return c.measureText(wd.text).width; };
      c.font = fontOf(family, size, baseItalic);
      const space = c.measureText(' ').width;
      words.forEach((wd, i) => {
        const ww = widthOf(wd);
        const prevSpace = i > 0 && words[i - 1].space ? space : 0;
        if (cur.pieces.length && cur.indent + cur.width + prevSpace + ww > maxW) {
          out.push(cur);
          cur = { pieces: [], indent: indent + (hang ? 2 * size : 0), width: 0 };
        } else if (cur.pieces.length && prevSpace) {
          cur.pieces.push({ text: ' ', flip: false }); cur.width += space;
        }
        cur.pieces.push({ text: wd.text, flip: wd.flip }); cur.width += ww;
      });
      if (cur.pieces.length) out.push(cur);
    }
    return out;
  }

  function drawLine(l, x, y, family, size, baseItalic, color, align = 'left', boxW = 0) {
    let cx = x + (l.indent || 0);
    if (align === 'center') cx = x + (boxW - l.width) / 2;
    c.fillStyle = color; c.textAlign = 'left';
    l.pieces.forEach(p => {
      c.font = fontOf(family, size, baseItalic !== p.flip);
      c.fillText(p.text, cx, y);
      cx += c.measureText(p.text).width;
    });
  }
  return { fontOf, spaced, layout, drawLine };
}

// --- The card -------------------------------------------------------------
// data: { block, lines (keepTextLines of the reading), attr, caption
//         (keepTextLines of each), img (a decoded Image, or null),
//         palette: { bg, title, text, faint, accent, gold, mount, rule } }
function drawKeepCard(canvas, data, shape, scale = 1) {
  const { w: W, h: H } = KEEP_SHAPES[shape];
  canvas.width = W * scale; canvas.height = H * scale;
  const c = canvas.getContext('2d');
  c.scale(scale, scale);
  const P = data.palette;
  const wide = shape === 'wide';

  c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
  c.textBaseline = 'alphabetic';

  // The page's frame: one fine rule, inset.
  const m = wide ? 22 : 28;
  c.strokeStyle = P.rule; c.lineWidth = 1;
  c.strokeRect(m + .5, m + .5, W - 2 * m - 1, H - 2 * m - 1);

  const { fontOf, spaced, layout, drawLine } = keepTextTools(c);

  // Ends a cut text: on prose, at the last full sentence if one ends in
  // the last third; then an ellipsis.
  function cutTo(laid, max, prose) {
    let kept = laid.slice(0, max);
    while (kept.length && kept[kept.length - 1].gap) kept.pop();
    if (prose) {
      outer: for (let i = kept.length - 1; i >= Math.floor(kept.length * 2 / 3); i--) {
        if (kept[i].gap) continue;
        const ps = kept[i].pieces;
        for (let j = ps.length - 1; j >= 0; j--) {
          if (/[.!?;]["”’)]*$/.test(ps[j].text)) {
            kept = kept.slice(0, i + 1);
            kept[i] = { ...kept[i], pieces: ps.slice(0, j + 1) };
            break outer;
          }
        }
      }
    }
    const last = kept[kept.length - 1];
    const ps = last.pieces.slice();
    ps[ps.length - 1] = { ...ps[ps.length - 1], text: ps[ps.length - 1].text.replace(/[\s,;:—–-]+$/, '') };
    ps.push({ text: ' …', flip: false });
    kept[kept.length - 1] = { ...last, pieces: ps };
    return kept;
  }

  function image(x, y, w) {
    const h = w * 3 / 4, pad = wide ? 12 : 16;
    c.fillStyle = P.mount; c.fillRect(x - pad, y - pad, w + 2 * pad, h + 2 * pad);
    c.strokeStyle = P.rule; c.strokeRect(x - pad + .5, y - pad + .5, w + 2 * pad - 1, h + 2 * pad - 1);
    const img = data.img;
    if (img) {
      // Cropped to 4:3 from the middle, like the Hours frame.
      const iw = img.naturalWidth, ih = img.naturalHeight;
      let sw = iw, sh = ih, sx = 0, sy = 0;
      if (iw / ih > 4 / 3) { sw = ih * 4 / 3; sx = (iw - sw) / 2; } else { sh = iw * 3 / 4; sy = (ih - sh) / 2; }
      c.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    }
    return y + h + pad;
  }

  // The caption, centred, at most two lines.
  function caption(cx, y, w, size) {
    let laid = layout(data.caption, '"Cormorant Garamond"', size, true, w, false).filter(l => !l.gap);
    if (laid.length > 2) laid = cutTo(laid, 2, false);
    laid.forEach((l, i) => drawLine(l, cx - w / 2, y + i * size * 1.3, '"Cormorant Garamond"', size, true, P.faint, 'center', w));
    return Math.max(0, laid.length - 1) * size * 1.3;
  }

  // The reading, as many lines as fit, opening on the initial: the first
  // letter in the title's blackletter, in the hour's red.
  function reading(x, y, w, maxH, size, lh) {
    const verse = data.verse;
    let laid = layout(data.lines, '"IM Fell English"', size, true, w, verse);
    const heightOf = ls => ls.reduce((s, l, i) => s + (i === 0 || l.gap ? 0 : (ls[i - 1].gap ? lh * 1.5 : lh)), 0);
    let n = laid.length;
    while (n > 1 && heightOf(laid.slice(0, n)) > maxH) n--;
    if (n < laid.length) laid = cutTo(laid, n, !verse);
    let yy = y;
    laid.forEach((l, i) => {
      if (i > 0 && !l.gap) yy += laid[i - 1].gap ? lh * 1.5 : lh;   // a gap is half a line
      if (l.gap) return;
      if (i === 0) {
        const first = l.pieces[0];
        const ch = [...first.text][0] || '';
        if (/\p{L}/u.test(ch)) {
          c.font = fontOf('"GL-Morris"', size * 1.9, false); c.fillStyle = P.accent; c.textAlign = 'left';
          c.fillText(ch, x + (l.indent || 0), y + size * 0.15);
          const iw = c.measureText(ch).width + size * 0.06;
          const rest = { ...l, indent: (l.indent || 0) + iw, pieces: [{ ...first, text: first.text.slice(ch.length) }, ...l.pieces.slice(1)] };
          drawLine(rest, x, yy, '"IM Fell English"', size, true, P.text);
          return;
        }
      }
      drawLine(l, x, yy, '"IM Fell English"', size, true, P.text);
    });
    return yy;
  }

  function attribution(x, y, w, size) {
    const laid = layout(data.attr, '"Cormorant Garamond"', size, false, w, false).filter(l => !l.gap);
    laid.forEach((l, i) => drawLine(l, x, y + i * size * 1.35, '"Cormorant Garamond"', size, false, P.faint));
  }

  if (wide) {
    const iy = image(64, 82, 500);                       // 500×375
    caption(314, iy + 30, 500, 16);
    const x = 640, w = 500;
    spaced('THE EARTHLY BOOK OF HOURS', x + w / 2, 78, 13, 4.2, P.faint);
    c.font = fontOf('"GL-Morris"', 44, false); c.fillStyle = P.title; c.textAlign = 'center';
    c.fillText(data.block, x + w / 2, 132); c.textAlign = 'left';
    const end = reading(x, 196, w, 520 - 196 - 40, 23, 33);
    attribution(x, end + 42, w, 17);
    spaced('EARTHLYHOURS.COM', x + w / 2, 582, 12, 4, P.gold);
  } else {
    spaced('THE EARTHLY BOOK OF HOURS', W / 2, 96, 16, 5.5, P.faint);
    c.font = fontOf('"GL-Morris"', 72, false); c.fillStyle = P.title; c.textAlign = 'center';
    c.fillText(data.block, W / 2, 182); c.textAlign = 'left';
    const iy = image(150, 236, 780);                     // 780×585
    const extra = caption(W / 2, iy + 36, 780, 19);
    const top = iy + 112 + extra;
    const end = reading(150, top, 780, H - 190 - top, 30, 43);
    attribution(150, end + 52, 780, 21);
    spaced('EARTHLYHOURS.COM', W / 2, H - 70, 15, 5, P.gold);
  }
}

// --- The printout, drawn ---------------------------------------------------
// Where the browser can't print (an iPhone's home-screen app), "print"
// shares a PDF instead, drawn here in the manner of the print stylesheet:
// a 4.5in framed column on a letter page in the hour's colours, the
// masthead, the image on its mount with its caption, the whole reading,
// its citation, and the "Kept from" stamp. A long reading runs on to
// further pages. Returns one canvas per page.
const KEEP_DPI = 200;

function drawKeepPrintPages(data, stamp) {
  const IN = KEEP_DPI, CSS = KEEP_DPI / 96, PT = KEEP_DPI / 72;
  const W = 8.5 * IN, H = 11 * IN;
  const P = data.palette;
  const colW = 4.5 * IN, colX = (W - colW) / 2;
  const frameTop = 0.45 * IN, frameBottom = H - 0.45 * IN;
  const pad = 18 * CSS;
  const x = colX + pad, w = colW - 2 * pad;
  const bottom = frameBottom - pad;
  const pages = [];
  let c, tools, y;

  function newPage() {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    c = canvas.getContext('2d');
    c.textBaseline = 'alphabetic';
    tools = keepTextTools(c);
    pages.push(canvas);
    c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
    c.strokeStyle = P.gold; c.lineWidth = 1.5 * CSS;
    c.strokeRect(colX, frameTop, colW, frameBottom - frameTop);
    c.strokeStyle = P.rule; c.lineWidth = 0.75 * CSS;
    c.strokeRect(colX + 5 * CSS, frameTop + 5 * CSS, colW - 10 * CSS, frameBottom - frameTop - 10 * CSS);
    y = frameTop + pad;
  }
  // Room for h more below y, or a new page.
  function room(h) { if (y + h > bottom) newPage(); }

  newPage();
  // The masthead.
  y += 13 * CSS;
  tools.spaced('THE EARTHLY BOOK OF HOURS', W / 2, y, 13 * CSS, 4 * CSS, P.faint);
  y += 26 * CSS;

  // The image on its mount, its caption inside the mount.
  const mountW = 3.2 * IN, mountX = (W - mountW) / 2, mpad = 14 * CSS;
  const imgW = mountW - 2 * mpad, imgH = imgW * 3 / 4;
  const capSize = 12.5 * CSS, capLh = capSize * 1.6;
  const capLaid = tools.layout(data.caption, '"Cormorant Garamond"', capSize, false, imgW, false).filter(l => !l.gap);
  const mountH = mpad + imgH + 12 * CSS + capLaid.length * capLh + mpad * 0.6;
  c.fillStyle = P.mount; c.fillRect(mountX, y, mountW, mountH);
  c.strokeStyle = P.rule; c.lineWidth = CSS; c.strokeRect(mountX, y, mountW, mountH);
  if (data.img) {
    const img = data.img, iw = img.naturalWidth, ih = img.naturalHeight;
    let sw = iw, sh = ih, sx = 0, sy = 0;
    if (iw / ih > 4 / 3) { sw = ih * 4 / 3; sx = (iw - sw) / 2; } else { sh = iw * 3 / 4; sy = (ih - sh) / 2; }
    c.drawImage(img, sx, sy, sw, sh, mountX + mpad, y + mpad, imgW, imgH);
  }
  let cy = y + mpad + imgH + 12 * CSS + capSize;
  capLaid.forEach(l => { tools.drawLine(l, mountX + mpad, cy, '"Cormorant Garamond"', capSize, false, P.faint, 'center', imgW); cy += capLh; });
  y += mountH + 26 * CSS;

  // The whole reading, opening on its initial. Its last two lines stay
  // with the citation and stamp, so a page never holds those alone.
  const size = 12.5 * PT, lh = size * 1.4;
  const attrSize = 14 * CSS, stampSize = 9 * PT;
  const attrLaid = tools.layout(data.attr, '"Cormorant Garamond"', attrSize, false, w, false).filter(l => !l.gap);
  const tailH = 16 * CSS + attrLaid.length * attrSize * 1.5 + 14 * CSS + stampSize * 3.2;
  const laid = tools.layout(data.lines, '"IM Fell English"', size, true, w, data.verse);
  const textLines = laid.filter(l => !l.gap).length;
  let drawn = 0;
  laid.forEach((l, i) => {
    if (l.gap) { y += lh * 0.6; return; }
    if (i === 0) y += size * 0.4;   // room for the initial
    const left = textLines - drawn++;
    room(left <= 2 ? left * lh + tailH : lh);
    y += i === 0 ? size : lh;
    if (i === 0) {
      const first = l.pieces[0], ch = [...first.text][0] || '';
      if (/\p{L}/u.test(ch)) {
        c.font = tools.fontOf('"GL-Morris"', size * 1.9, false); c.fillStyle = P.accent; c.textAlign = 'left';
        c.fillText(ch, x + (l.indent || 0), y + size * 0.12);
        const iw = c.measureText(ch).width + size * 0.06;
        tools.drawLine({ ...l, indent: (l.indent || 0) + iw, pieces: [{ ...first, text: first.text.slice(ch.length) }, ...l.pieces.slice(1)] },
          x, y, '"IM Fell English"', size, true, P.text);
        return;
      }
    }
    tools.drawLine(l, x, y, '"IM Fell English"', size, true, P.text);
  });

  // The citation.
  y += 16 * CSS;
  attrLaid.forEach(l => {
    room(attrSize * 1.5);
    y += attrSize * 1.5;
    tools.drawLine(l, x, y, '"Cormorant Garamond"', attrSize, false, P.faint);
  });

  // The stamp: what was kept, and when.
  y += 14 * CSS;
  room(stampSize * 3.2);
  stamp.forEach(line => {
    y += stampSize * 1.5;
    tools.spaced(line.toUpperCase(), W / 2, y, stampSize, stampSize * 0.15, P.faint, true);
  });
  return pages;
}

// A PDF of page images (JPEG): just enough of the format for a printer,
// a Files app or a share sheet. pages: [{ jpeg: Uint8Array, w, h }] in
// pixels at KEEP_DPI; each fills a letter page.
function keepPdf(pages) {
  const enc = new TextEncoder();
  const parts = [], offsets = [];
  let length = 0;
  const put = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); length += b.length; };
  const obj = (n, body) => { offsets[n] = length; put(`${n} 0 obj\n`); body(); put('\nendobj\n'); };
  const n = pages.length;
  const pageW = 612, pageH = 792;   // letter, in points
  put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, () => put('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => put(`<< /Type /Pages /Count ${n} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`));
  pages.forEach((pg, i) => {
    const pageN = 3 + i * 3, contentN = pageN + 1, imageN = pageN + 2;
    obj(pageN, () => put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
      `/Resources << /XObject << /Im${i} ${imageN} 0 R >> >> /Contents ${contentN} 0 R >>`));
    const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im${i} Do Q`;
    obj(contentN, () => put(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    obj(imageN, () => {
      put(`<< /Type /XObject /Subtype /Image /Width ${pg.w} /Height ${pg.h} /ColorSpace /DeviceRGB ` +
        `/BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpeg.length} >>\nstream\n`);
      put(pg.jpeg); put('\nendstream');
    });
  });
  const xref = length, count = 3 + n * 3;
  put(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let i = 1; i < count; i++) put(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
  put(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}

async function keepPrintPdf(data, stamp) {
  const canvases = drawKeepPrintPages(data, stamp);
  const pages = await Promise.all(canvases.map(cv => new Promise(res =>
    cv.toBlob(async b => res({ jpeg: new Uint8Array(await b.arrayBuffer()), w: cv.width, h: cv.height }), 'image/jpeg', 0.9))));
  return keepPdf(pages);
}

// The browser can't print here: a site saved to an iPhone's home screen.
function keepCantPrint() {
  return navigator.standalone === true ||
    (/iPhone|iPad|iPod/.test(navigator.userAgent) && window.matchMedia('(display-mode: standalone)').matches);
}

// --- The page's data, as the card wants it --------------------------------
async function keepCardData() {
  const src = keepPageData();
  const cs = el => getComputedStyle(el);
  const body = document.body;
  const frame = document.querySelector('.image-frame');
  const bracket = document.querySelector('.ttp-bracket');
  await Promise.all([
    '44px "GL-Morris"', 'italic 20px "IM Fell English"', '20px "IM Fell English"',
    '16px "Cormorant Garamond"', 'italic 16px "Cormorant Garamond"'
  ].map(f => document.fonts.load(f).catch(() => {})));
  let img = null;
  if (src.imageMaster) {
    try {
      img = new Image();
      img.src = webVersion(src.imageMaster, 1600);
      await img.decode();
    } catch (e) {
      try { img = new Image(); img.src = src.imageMaster; await img.decode(); } catch (e2) { img = null; }
    }
  }
  return {
    block: src.block,
    verse: !!src.quoteEl.querySelector('.verse-line'),
    lines: keepTextLines(src.quoteEl),
    attr: keepTextLines(src.attrEl),
    caption: keepTextLines(src.captionEl),
    img,
    palette: {
      bg: cs(body).backgroundColor,
      title: cs(document.getElementById('block-name')).color,
      text: cs(src.quoteEl).color,
      faint: cs(src.attrEl).color,
      accent: cs(body).getPropertyValue('--accent').trim() || '#8b2020',
      gold: bracket ? cs(bracket).color : '#8b6914',
      mount: frame ? cs(frame).backgroundColor : cs(body).backgroundColor,
      rule: frame ? cs(frame).borderTopColor : cs(src.attrEl).color
    }
  };
}

// The page's own address: this reading and this image, by their IDs.
function keepLink() {
  const d = keepPageData();
  const params = new URLSearchParams();
  if (d.readingId) params.set('r', d.readingId);
  if (d.imageId) params.set('i', d.imageId);
  const base = location.hostname.endsWith('earthlyhours.com') || location.protocol === 'file:'
    ? 'https://earthlyhours.com/' : location.origin + location.pathname;
  return base + '?' + params.toString();
}

// --- Names for the saved file ---------------------------------------------
// From the records' own names (a reading's author, an image's creator);
// a record without one leaves its name out. A name as it would be filed: the surname, with its particle ("von
// Bingen"); the whole name when it reads as one ("Pliny the Elder",
// "Hildegard of Bingen", "Limbourg brothers"); single names as they are.
function keepSurname(name) {
  name = (name || '').replace(/\s*\[[^\]]*\]/g, '').replace(/\s*\([^)]*\)/g, '')
    .replace(/,?\s+(Jr|Sr)\.?$/, '').trim();
  if (!name) return '';
  const words = name.split(/\s+/);
  if (words.length === 1) return name;
  if (words.some(w => /^(the|of)$/.test(w)) || /^[a-z]/.test(words[words.length - 1]) ||
      /^(Institution|Society|Museum|Library|Survey|Company|Inc\.?)$/.test(words[words.length - 1])) return name;
  let i = words.length - 1;
  while (i > 1 && /^(von|van|de|der|den|du|da|di|del|la|le|d['’])$/i.test(words[i - 1])) i--;
  if (i > 1 && words[i - 1] === 'y') i -= 2;   // Ramón y Cajal
  return words.slice(i).join(' ');
}

// --- The pane -------------------------------------------------------------
(function () {
  const btn = document.getElementById('keep-page');
  const pane = document.getElementById('keep-pane');
  if (!btn || !pane) return;
  const canvas = document.getElementById('keep-card');
  const linkInput = document.getElementById('keep-link');
  const copyBtn = document.getElementById('keep-copy');
  const shareBtn = document.getElementById('keep-share');
  const saveBtn = document.getElementById('keep-save');
  const printBtn = document.getElementById('keep-print');
  const closeBtn = document.getElementById('keep-close');
  const shapeBtns = pane.querySelectorAll('[data-keep-shape]');

  let shape = window.matchMedia('(max-width: 600px)').matches ? 'tall' : 'wide';
  try { shape = localStorage.getItem('keepShape') || shape; } catch (e) {}
  let cardData = null;
  // Files made ahead, so a tap can hand them to the share sheet at once:
  // Safari opens it only straight from a tap, not after a wait.
  let readyCard = null;    // { shape, blob }
  let readyPdf = null;     // a Blob, on an iPhone's home screen only
  let pdfMaking = null;

  function showShape() {
    shapeBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.keepShape === shape)));
    pane.dataset.shape = shape;
    if (!cardData) return;
    drawKeepCard(canvas, cardData, shape, KEEP_SCALE);
    readyCard = null;
    const drawn = shape;
    cardBlob().then(blob => { if (shape === drawn) readyCard = { shape: drawn, blob }; });
  }

  function stampLines() {
    const now = new Date();
    return [`Kept from The Earthly Book of Hours · ${keepPageData().block}`,
            `${formatDate(now)} · ${formatTime(now)}`];
  }

  // "The Earthly Book of Hours — Hush — Lispector, Lockyer.png"
  function fileName(ext = 'png') {
    const d = keepPageData();
    const names = [keepSurname(d.author), keepSurname(d.creator)].filter(Boolean);
    const unique = names.filter((n, i) => names.indexOf(n) === i);
    return ['The Earthly Book of Hours', d.block, unique.join(', ')]
      .filter(Boolean).join(' — ')
      .replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() + '.' + ext;
  }

  function cardBlob() {
    return new Promise(res => canvas.toBlob(res, 'image/png'));
  }

  async function open() {
    linkInput.value = keepLink();
    copyBtn.textContent = 'copy';
    pane.dataset.loading = 'yes';
    openOverlayPane(pane);
    closeBtn.focus();
    cardData = await keepCardData();
    const d = keepPageData();
    canvas.setAttribute('aria-label',
      `A card of this page: ${d.block}, the reading and the image with their credits.`);
    showShape();
    delete pane.dataset.loading;
    if (keepCantPrint()) {
      readyPdf = null;
      pdfMaking = keepPrintPdf(cardData, stampLines()).then(pdf => (readyPdf = pdf));
    }
    // Share only where the browser can share an image file.
    const probe = new File([new Blob([''], { type: 'image/png' })], 'card.png', { type: 'image/png' });
    shareBtn.hidden = !(navigator.canShare && navigator.canShare({ files: [probe] }));
    pane.querySelector('.keep-share-sep').hidden = shareBtn.hidden;
  }

  function close() {
    closeOverlayPane(pane);
    btn.focus();
  }

  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  pane.addEventListener('click', e => { if (e.target === pane) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && pane.classList.contains('open')) close();
  });

  shapeBtns.forEach(b => b.addEventListener('click', () => {
    shape = b.dataset.keepShape;
    try { localStorage.setItem('keepShape', shape); } catch (e) {}
    showShape();
  }));

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(linkInput.value);
    } catch (e) {
      linkInput.select();
      try { document.execCommand('copy'); } catch (e2) {}
    }
    copyBtn.textContent = 'copied';
    setTimeout(() => { copyBtn.textContent = 'copy'; }, 2000);
  });
  linkInput.addEventListener('focus', () => linkInput.select());

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }

  // The card as it stands, ready made if it can be.
  async function currentCard() {
    if (readyCard && readyCard.shape === shape) return readyCard.blob;
    return cardBlob();
  }

  saveBtn.addEventListener('click', async () => {
    const blob = await currentCard();
    if (blob) download(blob, fileName());
  });

  shareBtn.addEventListener('click', async () => {
    const blob = await currentCard();
    if (!blob) return;
    const file = new File([blob], fileName(), { type: 'image/png' });
    try {
      await navigator.share({ files: [file], title: 'The Earthly Book of Hours', text: linkInput.value });
    } catch (e) { /* the reader closed the share sheet */ }
  });

  // Print. Where the browser can print, at once, inside the tap: phone
  // browsers refuse a print dialog opened after a delay; the print
  // styles hide the pane. On an iPhone's home screen, which can't print,
  // the printout goes to the share sheet as a PDF, whose Print prints it.
  printBtn.addEventListener('click', async () => {
    if (!keepCantPrint()) {
      closeOverlayPane(pane);
      printKeepsake();
      return;
    }
    if (!readyPdf) {
      // Still being made: say so, and let the next tap share it.
      printBtn.textContent = 'print …';
      if (pdfMaking) await pdfMaking;
      printBtn.textContent = 'print';
      return;
    }
    const file = new File([readyPdf], fileName('pdf'), { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'The Earthly Book of Hours' }); }
      catch (e) { /* the reader closed the share sheet */ }
    } else {
      download(readyPdf, file.name);
    }
  });
})();
