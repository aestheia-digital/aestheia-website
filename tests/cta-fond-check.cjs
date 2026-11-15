/* Contrôle du fond photo du bandeau final sur les pages secteurs.
   Usage : python3 -m http.server 8765 puis node tests/cta-fond-check.cjs [url-de-base] */
const { chromium } = require('playwright');
const base = (process.argv[2] || 'http://127.0.0.1:8765').replace(/\/$/, '');
const pages = ['medecine-esthetique', 'spa-hotelier', 'thalasso', 'instituts-independantes'];
const formats = [[390, 844, false], [768, 1024, false], [1024, 768, true], [1366, 768, true], [1920, 1080, true]];

(async () => {
  const browser = await chromium.launch();
  let failures = 0;
  for (const reduced of [false, true]) {
    for (const [width, height, expected] of formats) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      for (const name of pages) {
        await page.goto(`${base}/${name}/`, { waitUntil: 'load' });
        await page.getByRole('button', { name: 'Tout refuser' }).click({ timeout: 1200 }).catch(() => {}); // bandeau cookies
        await page.evaluate(() => document.querySelector('.v2-cta').scrollIntoView({ block: 'center', behavior: 'instant' }));
        await page.waitForTimeout(500);
        const s = await page.evaluate(() => {
          const cta = document.querySelector('.v2-cta');
          const fond = cta.querySelector('.cta-fond');
          const plate = fond && fond.querySelector('i');
          const hero = document.querySelector('.v2-hero-media img');
          const blocked = [...cta.querySelectorAll('.v2-cta-actions a')].filter(a => {
            const r = a.getBoundingClientRect();
            const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return !(top && (top === a || a.contains(top)));
          }).length;
          return {
            shown: !!fond && getComputedStyle(fond).display !== 'none',
            sameImage: !!plate && plate.style.backgroundImage.includes(new URL(hero.currentSrc || hero.src).pathname),
            moved: !!plate && getComputedStyle(plate).transform !== 'none',
            blocked,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            height: Math.round(cta.getBoundingClientRect().height)
          };
        });
        const problems = [];
        if (s.shown !== expected) problems.push(expected ? 'fond absent' : 'fond affiché sous 1024 px');
        if (expected && !s.sameImage) problems.push('photo différente du header');
        if (reduced && s.moved) problems.push('mouvement malgré mouvements réduits');
        if (s.blocked) problems.push('bouton recouvert');
        if (s.overflow > 1) problems.push(`débordement ${s.overflow}px`);
        if (problems.length) { failures++; console.log(`✗ ${name} ${width}px${reduced ? ' (réduit)' : ''} — ${problems.join(', ')}`); }
      }
      if (errors.length) { failures++; console.log(`✗ ${width}px — ${errors[0]}`); }
      console.log(`${width}×${height}${reduced ? ' mouvements réduits' : ''} — fond ${expected ? 'affiché' : 'masqué'} sur les ${pages.length} pages`);
      await context.close();
    }
  }
  await browser.close();
  console.log(failures ? `\n${failures} échec(s)` : '\nTous les contrôles passent');
  process.exit(failures ? 1 : 0);
})();
