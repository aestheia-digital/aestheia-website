/* Adapter réellement la phrase à la largeur du simulateur, sans retour ligne.
   Calcul fondé sur la largeur mesurée du texte (et non sur vw). */
(() => {
  const slogan = document.querySelector('.home-slogan-band .home-slogan');
  const simulator = document.querySelector('#simulateur');
  if (!slogan || !simulator) return;
  const fit = () => {
    if (window.innerWidth < 721) {
      slogan.style.removeProperty('font-size');
      slogan.style.removeProperty('width');
      slogan.style.removeProperty('white-space');
      return;
    }
    const target = Math.min(simulator.getBoundingClientRect().width, window.innerWidth - 32);
    slogan.style.setProperty('width', target + 'px', 'important');
    slogan.style.setProperty('max-width', '100%', 'important');
    slogan.style.setProperty('white-space', 'nowrap', 'important');
    slogan.style.setProperty('font-weight', '400', 'important');
    slogan.style.setProperty('font-size', '24px', 'important');
    const range = document.createRange();
    range.selectNodeContents(slogan);
    const measured = range.getBoundingClientRect().width;
    if (measured > 0) {
      const px = Math.min(40, Math.max(12, 24 * (target * 0.975 / measured)));
      slogan.style.setProperty('font-size', px.toFixed(2) + 'px', 'important');
    }
  };
  fit();
  window.addEventListener('resize', fit, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(simulator);
})();
