/* Contrôle automatisé de l'accueil « film de marque ».
   Usage : servir le dépôt (python3 -m http.server 8765) puis
           node tests/accueil-film-check.cjs [url] [dossier-captures]
   Chromium via Playwright. Ce sont des émulations de navigateur : elles ne remplacent
   pas un essai sur un véritable iPhone / Android / iPad. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const url = process.argv[2] || 'http://127.0.0.1:8765/';
const shotsDir = process.argv[3] || '';
const formats = [
  ['mobile-360', 360, 740, true], ['mobile-390', 390, 844, true], ['mobile-430', 430, 932, true],
  ['intermediaire-600', 600, 960, true], ['tablette-768', 768, 1024, true], ['intermediaire-900', 900, 700, true],
  ['tablette-1024', 1024, 768, true], ['intermediaire-1180', 1180, 820, true],
  ['portable-1366', 1366, 768, false], ['grand-1920', 1920, 1080, false]
];

async function settle(page, ms) { await page.waitForTimeout(ms); }

(async () => {
  const browser = await chromium.launch();
  let failures = 0;
  const fail = (name, message) => { failures++; console.log(`  ✗ ${name} — ${message}`); };

  for (const [name, width, height, touch] of formats) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url, { waitUntil: 'load' });
    const refuse = page.getByRole('button', { name: 'Tout refuser' });
    if (await refuse.isVisible().catch(() => false)) await refuse.click(); // bandeau cookies : refus, aucune mesure d'audience
    await settle(page, 2800); // plan d'ouverture

    const state = await page.evaluate(() => ({
      film: document.documentElement.classList.contains('film'),
      live: document.documentElement.classList.contains('film-live'),
      tagged: document.querySelectorAll('[data-film]').length,
      h1: document.querySelectorAll('h1').length,
      h2: document.querySelectorAll('h2').length
    }));
    if (!state.film || !state.live) fail(name, 'expérience non activée');
    if (state.h1 !== 1) fail(name, `H1 attendu 1, trouvé ${state.h1}`);

    // Descente complète par pas d'un demi-écran, puis remontée : le scroll ne doit jamais être retenu.
    const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    let overflow = 0, stuck = 0, frame = 0;
    const marks = shotsDir ? new Set([0, 0.04, 0.1, 0.25, 0.4, 0.48, 0.52, 0.56, 0.62, 0.7, 0.8, 0.9, 1].map(f => Math.round(f * total / (height / 2)))) : new Set();
    for (let y = 0, i = 0; y <= total + height / 2; y += height / 2, i++) {
      const wanted = Math.min(y, total);
      await page.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), wanted);
      await settle(page, 260);
      const got = await page.evaluate(() => ({ y: Math.round(scrollY), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      if (Math.abs(got.y - wanted) > 2) { stuck++; console.log('    retenu', wanted, got.y, total); }
      if (got.sw > got.cw + 1) overflow = Math.max(overflow, got.sw - got.cw);
      if (marks.has(i)) {
        await settle(page, 900);
        await page.screenshot({ path: path.join(shotsDir, `${name}-${String(frame++).padStart(2, '0')}.png`) });
      }
    }
    if (stuck) fail(name, `défilement retenu sur ${stuck} positions`);
    if (overflow) fail(name, `débordement horizontal de ${overflow}px`);

    // En bas de page, tout le contenu doit être révélé et lisible.
    await settle(page, 1800);
    const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-film]')].filter(e => {
      const s = getComputedStyle(e);
      const img = e.matches('[data-film="unveil"]') && e.querySelector('img');
      return +s.opacity < 0.99 || (img && !/inset\(0(px)?( 0(px)?)*\)/.test(getComputedStyle(img).clipPath));
    }).map(e => e.className || e.tagName));
    if (hidden.length) fail(name, `${hidden.length} contenus non révélés en fin de page : ${hidden.slice(0, 4).join(', ')}`);

    // Les photos ne doivent jamais être déformées : échelle identique en X et en Y.
    const skew = await page.evaluate(() => [...document.querySelectorAll('.v2-hero-media img, .sector-card img')].filter(img => {
      const m = new DOMMatrixReadOnly(getComputedStyle(img).transform);
      return Math.abs(m.a - m.d) > 0.0001 || Math.abs(m.b) > 0.0001 || Math.abs(m.c) > 0.0001 || m.a < 0.9999;
    }).length);
    if (skew) fail(name, `${skew} photo(s) déformée(s) ou rétrécie(s)`);

    // Remontée : retour à l'état d'ouverture (synchronisation dans les deux sens).
    for (let y = total; y >= 0; y -= height) {
      await page.evaluate(v => window.scrollTo({ top: Math.max(0, v), behavior: 'instant' }), y);
      await settle(page, 120);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await settle(page, 1500);
    const back = await page.evaluate(() => {
      const text = document.querySelector('.v2-hero-text');
      const m = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.v2-hero-media img')).transform);
      return { opacity: +getComputedStyle(text).opacity, scale: m.a, veil: +getComputedStyle(document.querySelector('.film-veil')).opacity };
    });
    if (back.opacity < 0.99 || back.veil > 0.01 || Math.abs(back.scale - 1.03) > 0.005) fail(name, `état d'ouverture non retrouvé ${JSON.stringify(back)}`);

    // CTA du header photo cliquables (non recouverts par un plan décoratif).
    const blocked = await page.evaluate(() => [...document.querySelectorAll('.v2-hero-actions a')].filter(a => {
      const r = a.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !(top && (top === a || a.contains(top)));
    }).length);
    if (blocked) fail(name, `${blocked} CTA recouvert(s)`);

    // Menu mobile.
    if (await page.locator('.v2-burger').isVisible()) {
      await page.locator('.v2-burger').click();
      await settle(page, 250);
      if (!(await page.locator('#navigation a[href="/contact"]').isVisible())) fail(name, 'menu mobile non ouvert');
      await page.locator('.v2-burger').click();
    }
    if (errors.length) fail(name, `erreurs console : ${errors.slice(0, 2).join(' | ')}`);
    console.log(`${name} (${width}×${height}) — ${state.tagged} éléments mis en scène, hauteur ${total + height}px`);
    await context.close();
  }

  // Mouvements réduits : la page doit rester strictement celle d'origine.
  const calm = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const calmPage = await calm.newPage();
  await calmPage.goto(url, { waitUntil: 'load' });
  await settle(calmPage, 600);
  const calmState = await calmPage.evaluate(() => ({
    film: document.documentElement.classList.contains('film'),
    layers: document.querySelectorAll('.film-light, .film-veil, .film-glow, .film-outro, .film-progress, [data-film]').length
  }));
  if (calmState.film || calmState.layers) fail('mouvements-réduits', JSON.stringify(calmState));
  console.log('mouvements réduits — page d\'origine, aucun plan ajouté');
  await calm.close();

  // Sans JavaScript : tout le contenu reste visible.
  const nojs = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const nojsPage = await nojs.newPage();
  await nojsPage.goto(url, { waitUntil: 'load' });
  const nojsHidden = await nojsPage.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main p, main li')].filter(e => +getComputedStyle(e).opacity < 1).length).catch(() => -1);
  if (nojsHidden > 0) fail('sans-javascript', `${nojsHidden} contenus masqués`);
  console.log('sans JavaScript — contenu intégralement visible');
  await nojs.close();

  await browser.close();
  console.log(failures ? `\n${failures} échec(s)` : '\nTous les contrôles passent');
  process.exit(failures ? 1 : 0);
})();
