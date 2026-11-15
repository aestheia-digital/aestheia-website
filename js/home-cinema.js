/* AesthéIA — scroll-directed 2.5D, without a rendering library or scroll capture. */
(() => {
  'use strict';
  const body = document.body;
  if (!body.classList.contains('v2-home-page')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 600px)');
  const tablet = matchMedia('(max-width: 1120px)');
  const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
  const smooth = value => value * value * (3 - 2 * value);
  const scenes = [...document.querySelectorAll('main > section, .v2-footer')];
  const cameras = [];
  const reveals = [];
  const active = new Set();
  let frame = 0;
  let enabled = false;
  let paused = false;
  try { paused = localStorage.getItem('aestheia-cinema-paused') === '1'; } catch (_) { /* Private browsing. */ }

  function camera(element, scene, kind) {
    if (element) cameras.push({ element, scene, kind });
  }
  const hero = document.querySelector('.v2-hero');
  camera(hero?.querySelector('.v2-hero-media'), hero, 'opening');
  const kinds = ['precision', 'spa', 'water', 'care'];
  document.querySelectorAll('.v2-home-sectors .sector-card').forEach((card, index) => {
    const img = card.querySelector('img');
    if (!img) return;
    // A clipping window, with exactly the image's existing aspect ratio.
    const frameElement = document.createElement('span');
    frameElement.className = 'cinema-frame';
    card.insertBefore(frameElement, img);
    frameElement.append(img);
    frameElement.dataset.camera = kinds[index];
    camera(frameElement, card.closest('section'), kinds[index]);
  });
  const portrait = document.querySelector('.v2-about-photo');
  if (portrait) {
    portrait.classList.add('cinema-portrait');
    camera(portrait, portrait.closest('section'), 'portrait');
  }

  // Text settles before entering the main reading area. FAQ answers never animate.
  const revealSelector = [
    '.v2-benefits li', '.v2-section > .v2-wrap > .v2-eyebrow',
    '.v2-section > .v2-wrap > .v2-h2', '.v2-section > .v2-wrap > .v2-intro',
    '.v2-family-head', '.v2-solution', '.v2-sim-grid > div',
    '.sector-card-content', '.v2-home-control', '.v2-offers > .v2-lever',
    '.v2-about-text > :not(.v2-about-foot)', '.v2-about-foot',
    '.v2-faq > details', '.v2-cta .v2-hero-actions', '.v2-footer-top > div',
    '.v2-footer-bottom'
  ].join(',');
  document.querySelectorAll(revealSelector).forEach(element => {
    element.setAttribute('data-cinema-reveal', '');
    reveals.push({ element, scene: element.closest('section, footer') });
  });

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cinema-motion-control';
  button.setAttribute('aria-pressed', 'false');
  document.querySelector('.v2-footer > .v2-wrap')?.append(button);

  function schedule() {
    if (!enabled || document.hidden || frame) return;
    frame = requestAnimationFrame(render);
  }
  function render() {
    frame = 0;
    if (!enabled || document.hidden) return;
    const height = innerHeight;
    const amplitude = compact.matches ? .55 : tablet.matches ? .75 : 1;
    const writes = [];
    // Batch all geometry reads before style writes; only nearby scenes are processed.
    cameras.forEach(({ element, scene, kind }) => {
      if (!active.has(scene)) return;
      const rect = element.getBoundingClientRect();
      const p = clamp((height - rect.top) / (height + rect.height));
      let x = 0, y = 0, z = 0, scale = 1;
      if (kind === 'opening') {
        const progress = clamp(-scene.getBoundingClientRect().top / Math.max(1, scene.offsetHeight));
        x = -progress * 9 * amplitude;
        y = progress * 18 * amplitude;
        z = progress * 25 * amplitude;
        scale = 1.045 + progress * .025 * amplitude;
      } else if (kind === 'spa') {
        z = p * 65 * amplitude;
        y = (p - .5) * 7 * amplitude;
        scale = 1.035;
      } else if (kind === 'water') {
        x = (p - .5) * 12 * amplitude;
        y = (p - .5) * 16 * amplitude;
        z = p * 24 * amplitude;
        scale = 1.055;
      } else if (kind === 'care') {
        scale = 1.025 + p * .07 * amplitude;
        y = (p - .5) * 5 * amplitude;
      } else if (kind === 'portrait') {
        scale = 1.015 + p * .02 * amplitude;
        y = (p - .5) * 5 * amplitude;
      } else {
        scale = 1.035 + p * .025 * amplitude;
        y = (p - .5) * 10 * amplitude;
      }
      writes.push(() => {
        element.style.setProperty('--camera-x', `${x.toFixed(2)}px`);
        element.style.setProperty('--camera-y', `${y.toFixed(2)}px`);
        element.style.setProperty('--camera-z', `${z.toFixed(2)}px`);
        element.style.setProperty('--camera-scale', scale.toFixed(4));
        element.style.setProperty('--light', (.2 + .6 * p).toFixed(3));
        element.style.setProperty('--light-x', `${((p - .5) * 16).toFixed(2)}px`);
      });
    });
    reveals.forEach(({ element, scene }) => {
      if (!active.has(scene)) return;
      const top = element.getBoundingClientRect().top;
      // Subtract the previous visual translation to keep geometry independent of animation.
      const previous = parseFloat(element.style.getPropertyValue('--entry-y')) || 0;
      const p = smooth(clamp((height - (top - previous)) / Math.min(150, height * .21)));
      writes.push(() => {
        element.style.setProperty('--entry-y', `${((1 - p) * 14 * amplitude).toFixed(2)}px`);
        element.style.setProperty('--entry-opacity', (.58 + .42 * p).toFixed(3));
      });
    });
    active.forEach(scene => {
      const top = scene.getBoundingClientRect().top;
      const chapter = smooth(clamp((height - top) / (height * .55)));
      writes.push(() => scene.style.setProperty('--chapter', chapter.toFixed(3)));
    });
    writes.forEach(write => write());
  }

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) active.add(target); else active.delete(target);
      target.classList.toggle('cinema-active', isIntersecting && enabled);
    });
    schedule();
  }, { rootMargin: '180px 0px' }) : null;
  scenes.forEach(scene => { if (observer) observer.observe(scene); else active.add(scene); });

  function sync() {
    enabled = !paused && !reduced.matches;
    body.dataset.cinema = enabled ? 'on' : 'off';
    button.textContent = reduced.matches ? 'Animations réduites selon votre appareil' : paused ? 'Activer les animations' : 'Réduire les animations';
    button.setAttribute('aria-pressed', String(!enabled));
    button.disabled = reduced.matches;
    scenes.forEach(scene => scene.classList.toggle('cinema-active', enabled && active.has(scene)));
    if (!enabled && frame) { cancelAnimationFrame(frame); frame = 0; }
    schedule();
  }
  button.addEventListener('click', () => {
    paused = !paused;
    try { localStorage.setItem('aestheia-cinema-paused', paused ? '1' : '0'); } catch (_) { /* Optional persistence. */ }
    sync();
  });
  reduced.addEventListener('change', sync);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', schedule);
  document.addEventListener('toggle', schedule, true);
  document.addEventListener('load', schedule, true);
  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(schedule);
    scenes.forEach(scene => resizeObserver.observe(scene));
  }
  document.fonts?.ready.then(schedule);
  sync();
})();
