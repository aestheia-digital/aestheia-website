/* Contrôle de l'apparition des pictogrammes sur les pages secteurs.
   Usage : python3 -m http.server 8765 puis node tests/picto-trait-check.cjs [url-de-base] [dossier-captures] */
const { chromium } = require('playwright');
const path = require('path');
const base = (process.argv[2] || 'http://127.0.0.1:8765').replace(/\/$/, '');
const shots = process.argv[3] || '';
const pages = ['medecine-esthetique', 'spa-hotelier', 'thalasso', 'instituts-independantes', 'automatisation-pme'];

(async () => {
  const browser = await chromium.launch();
  let failures = 0;
  const fail = (where, what) => { failures++; console.log(`✗ ${where} — ${what}`); };

  for (const [width, height] of [[390, 844], [768, 1024], [1366, 768]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    for (const name of pages) {
      const where = `${name} ${width}px`;
      await page.goto(`${base}/${name}/`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Tout refuser' }).click({ timeout: 1200 }).catch(() => {});
      await page.waitForTimeout(900);
      const start = await page.evaluate(() => ({
        on: document.documentElement.classList.contains('picto-live'),
        trait: document.querySelectorAll('[data-picto="trait"]').length,
        image: document.querySelectorAll('[data-picto="image"]').length,
        // Rien d'interactif ne doit être concerné.
        wrong: document.querySelectorAll('a [data-picto], button [data-picto], summary [data-picto], header [data-picto], footer [data-picto]').length,
        pending: [...document.querySelectorAll('[data-picto]')].filter(e => !e.classList.contains('is-drawn')).length,
        height: document.documentElement.scrollHeight
      }));
      if (!start.on) fail(where, 'module inactif');
      if (!(start.trait + start.image)) fail(where, 'aucun pictogramme pris en charge');
      if (start.wrong) fail(where, `${start.wrong} pictogramme(s) de bouton ou de menu animé(s)`);
      if (!start.pending) fail(where, 'tout est déjà affiché avant le défilement');

      const total = start.height - height;
      let overflow = 0, shot = false;
      for (let y = 0; y <= total + height / 2; y += height / 2) {
        await page.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), Math.min(y, total));
        await page.waitForTimeout(140);
        overflow = Math.max(overflow, await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
        if (shots && !shot && y > height) { shot = true; await page.screenshot({ path: path.join(shots, `${name}-${width}.png`) }); }
      }
      await page.waitForTimeout(2300);
      const end = await page.evaluate(() => ({
        hidden: [...document.querySelectorAll('[data-picto]')].filter(e => +getComputedStyle(e).opacity < 0.99 || (e.matches('svg') && [...e.querySelectorAll('path,circle,rect,polyline,line,ellipse,polygon')].some(s => parseFloat(getComputedStyle(s).strokeDashoffset) > 0.01))).length,
        height: document.documentElement.scrollHeight
      }));
      if (end.hidden) fail(where, `${end.hidden} pictogramme(s) incomplet(s) en fin de page`);
      if (end.height !== start.height) fail(where, `hauteur de page modifiée (${start.height} → ${end.height})`);
      if (overflow > 1) fail(where, `débordement horizontal ${overflow}px`);
      console.log(`${where} — ${start.trait} au trait, ${start.image} en image`);
    }
    if (errors.length) fail(`${width}px`, errors[0]);
    await context.close();
  }

  // Mouvements réduits : rien n'est touché.
  const calm = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const calmPage = await calm.newPage();
  for (const name of pages) {
    await calmPage.goto(`${base}/${name}/`, { waitUntil: 'domcontentloaded' });
    await calmPage.waitForTimeout(400);
    const touched = await calmPage.evaluate(() => document.querySelectorAll('[data-picto]').length + (document.documentElement.classList.contains('picto') ? 1 : 0));
    if (touched) fail(`${name} mouvements réduits`, 'pictogrammes modifiés');
  }
  console.log('mouvements réduits — pictogrammes affichés tels quels sur les 5 pages');
  await calm.close();

  // Thalasso : bandeau final centré.
  const t = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const tp = await t.newPage();
  await tp.goto(`${base}/thalasso/`, { waitUntil: 'domcontentloaded' });
  const centred = await tp.evaluate(() => {
    const cta = document.querySelector('.v2-cta');
    const mid = r => r.left + r.width / 2;
    const c = mid(cta.getBoundingClientRect());
    return [cta.querySelector('h2'), cta.querySelector('.v2-cta-actions')].map(e => Math.abs(mid(e.getBoundingClientRect()) - c) < 3 && getComputedStyle(cta).textAlign === 'center');
  });
  if (centred.includes(false)) fail('thalasso', 'bandeau final non centré');
  console.log('thalasso — bandeau final centré');
  await t.close();

  await browser.close();
  console.log(failures ? `\n${failures} échec(s)` : '\nTous les contrôles passent');
  process.exit(failures ? 1 : 0);
})();
