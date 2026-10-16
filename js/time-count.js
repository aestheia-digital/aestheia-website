/* Présentation animée uniquement : les calculs et les valeurs finales restent inchangés. */
function interpolateTimeCount(from, to, progress, step) {
  const t = Math.min(1, Math.max(0, progress));
  if (t === 1) return [...to];
  const eased = 1 - (1 - t) ** 3;
  return to.map((value, index) => Math.round((from[index] + (value - from[index]) * eased) / step) * step);
}

if (typeof module !== 'undefined' && module.exports) module.exports = { interpolateTimeCount };

(() => {
  if (typeof document === 'undefined') return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const states = new WeakMap();
  const active = new Set();

  function stateFor(element, values) {
    let state = states.get(element);
    if (!state) {
      const final = document.createElement('span');
      final.dataset.timeFinal = '';
      const visual = document.createElement('span');
      visual.dataset.timeVisual = '';
      visual.setAttribute('aria-hidden', 'true');
      element.classList.add('time-count');
      element.replaceChildren(final, visual);
      state = { final, visual, values: [...values], frame: 0 };
      states.set(element, state);
    }
    return state;
  }

  function animate(element, to, { duration = 400, step = .5, format, from } = {}) {
    const state = stateFor(element, from || to.map(() => 0));
    const text = format(to);
    if (state.text === text) return;
    cancelAnimationFrame(state.frame);
    active.delete(state);
    state.text = text;
    if (state.final.textContent !== text) state.final.textContent = text;
    state.finish = () => {
      cancelAnimationFrame(state.frame);
      state.values = [...to];
      state.visual.textContent = text;
      active.delete(state);
    };
    if (motion.matches) { state.finish(); return; }
    const start = [...(from || state.values)];
    const began = performance.now();
    function frame(now) {
      const progress = Math.min(1, (now - began) / duration);
      state.values = interpolateTimeCount(start, to, progress, step);
      state.visual.textContent = progress === 1 ? text : format(state.values);
      if (progress < 1) state.frame = requestAnimationFrame(frame);
      else state.finish();
    }
    state.visual.textContent = format(start);
    active.add(state);
    state.frame = requestAnimationFrame(frame);
  }

  function reset(element) {
    const state = states.get(element);
    if (!state) return;
    cancelAnimationFrame(state.frame);
    active.delete(state);
    state.values = state.values.map(() => 0);
    state.text = null;
  }
  motion.addEventListener('change', () => {
    if (motion.matches) [...active].forEach(state => state.finish());
  });
  window.TimeCount = { animate, reset };

  const banner = document.querySelector('body.home-page .time-banner');
  if (!banner || !('IntersectionObserver' in window)) return;
  const number = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  const counters = [...banner.querySelectorAll('.time-banner-weekly, .time-banner-annual')].map(element => {
    const text = element.textContent;
    const pattern = /\d+(?:[ \u202f]\d{3})*(?:,\d+)?/g;
    const to = [...text.matchAll(pattern)].map(match => Number(match[0].replace(/[ \u202f]/g, '').replace(',', '.')));
    const format = values => {
      let index = 0;
      return text.replace(pattern, () => number.format(values[index++]));
    };
    const zero = to.map(() => 0);
    const state = stateFor(element, zero);
    state.final.textContent = text;
    state.visual.textContent = motion.matches ? text : format(zero);
    return { element, to, zero, format, state, step: element.matches('.time-banner-weekly') ? .5 : 5 };
  });
  let entered = false;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.intersectionRatio === 0) {
        entered = false;
        counters.forEach(({ element, state, zero, format }) => {
          reset(element);
          state.visual.textContent = motion.matches ? state.final.textContent : format(zero);
        });
      } else if (entry.intersectionRatio >= .2 && !entered) {
        entered = true;
        counters.forEach(({ element, to, zero, format, step }) => {
          reset(element);
          animate(element, to, { duration: 1800, step, format, from: zero });
        });
      }
    }
  }, { threshold: [0, .2] });
  observer.observe(banner);
  motion.addEventListener('change', () => {
    if (motion.matches) counters.forEach(({ state }) => { state.visual.textContent = state.final.textContent; });
  });
})();
