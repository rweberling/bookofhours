/* ═══════════════════════════════════════════════════════════════
postcards.js — the solstice line on the postcard pages (c/)

The cards carry no year, so they can be sold again in later winters.
Their pages name the winter solstice that matters to whoever is
reading: the coming one, or, while that winter lasts (until the March
equinox), the one just past. The line is written without tense, so it
reads the same before and after the day:

  December 21, 2026, at 20:50 UT (3:50 p.m. Eastern)

Times come from published tables (timeanddate.com, the U.S. Naval
Observatory's figures) for 2024–2035, and beyond that from Meeus's
method with its periodic terms (Astronomical Algorithms, ch. 27), good
to about a minute. December is always standard time in the eastern US,
so Eastern is UT − 5 hours.

scripts/build_postcards.py writes the same line into each page when it
is built, for readers without JavaScript; keep its table in step.
════════════════════════════════════════════════════════════════ */

(() => {
  // Published December solstices, UT: [month (0-based), day, hour, minute].
  const PUBLISHED = {
    2024: [11, 21,  9, 20], 2025: [11, 21, 15,  3], 2026: [11, 21, 20, 50],
    2027: [11, 22,  2, 42], 2028: [11, 21,  8, 19], 2029: [11, 21, 14, 14],
    2030: [11, 21, 20,  9], 2031: [11, 22,  1, 55], 2032: [11, 21,  7, 55],
    2033: [11, 21, 13, 45], 2034: [11, 21, 19, 33], 2035: [11, 22,  1, 30]
  };

  const TERMS = [
    [485, 324.96, 1934.136], [203, 337.23, 32964.467], [199, 342.08, 20.186],
    [182, 27.85, 445267.112], [156, 73.14, 45036.886], [136, 171.52, 22518.443],
    [77, 222.54, 65928.934], [74, 296.72, 3034.906], [70, 243.58, 9037.513],
    [58, 119.81, 33718.147], [52, 297.17, 150.678], [50, 21.02, 2281.226],
    [45, 247.54, 29929.562], [44, 325.15, 31555.956], [29, 60.93, 4443.417],
    [18, 155.12, 67555.328], [17, 288.79, 4562.452], [16, 198.04, 62894.029],
    [14, 199.76, 31436.921], [12, 95.39, 14577.848], [12, 287.11, 31931.756],
    [12, 320.81, 34777.259], [9, 227.73, 1222.114], [8, 15.45, 16859.074]
  ];
  const rad = d => d * Math.PI / 180;

  function decemberSolstice(year) {
    const p = PUBLISHED[year];
    if (p) return new Date(Date.UTC(year, p[0], p[1], p[2], p[3]));
    const Y = (year - 2000) / 1000;
    const jde0 = 2451900.05952 + 365242.74049 * Y - 0.06223 * Y ** 2
               - 0.00823 * Y ** 3 + 0.00032 * Y ** 4;
    const T = (jde0 - 2451545) / 36525;
    const W = rad(35999.373 * T - 2.47);
    const dl = 1 + 0.0334 * Math.cos(W) + 0.0007 * Math.cos(2 * W);
    const S = TERMS.reduce((s, [A, B, C]) => s + A * Math.cos(rad(B + C * T)), 0);
    const jde = jde0 + 0.00001 * S / dl;
    const deltaT = 70; // seconds, Terrestrial Time ahead of UT; slowly growing
    return new Date((jde - 2440587.5) * 86400000 - deltaT * 1000);
  }

  // The solstice that matters now: this year's from the March equinox
  // (about March 20) onward, last year's before it.
  function relevantSolstice(now) {
    const y = now.getUTCFullYear();
    const thisOne = decemberSolstice(y);
    if (now >= thisOne) return thisOne;
    const equinox = Date.UTC(y, 2, 20);
    return now < equinox ? decemberSolstice(y - 1) : thisOne;
  }

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                  'August', 'September', 'October', 'November', 'December'];
  const pad = n => String(n).padStart(2, '0');

  function dateline(when) {
    // Shown to the minute; seconds dropped, as the tables give it.
    const ut = new Date(Math.floor(when.getTime() / 60000) * 60000);
    const day = d => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
    const east = new Date(ut.getTime() - 5 * 3600000);
    const h = east.getUTCHours(), m = east.getUTCMinutes();
    const clock = `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'a.m.' : 'p.m.'}`;
    const eastDay = east.getUTCDate() !== ut.getUTCDate() ? `, ${day(east)}` : '';
    return `${day(ut)}, ${ut.getUTCFullYear()}, at ${pad(ut.getUTCHours())}:${pad(ut.getUTCMinutes())} UT`
         + ` (${clock} Eastern${eastDay})`;
  }

  document.querySelectorAll('.postcard-dateline[data-solstice="december"]').forEach(el => {
    el.textContent = dateline(relevantSolstice(new Date()));
  });

  // For checking from the console: postcardSolstice(new Date('2027-06-01'))
  window.postcardSolstice = d => dateline(relevantSolstice(d));
})();
