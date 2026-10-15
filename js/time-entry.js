(() => {
  if (/^\/(simulateur-gain-de-temps|contact)(\/|\.html)?$/.test(location.pathname)) return;
  const link = document.createElement('a');
  link.className = 'btn btn-primary time-floating';
  const homeSimulator = document.querySelector('body.home-page #simulateur');
  link.href = homeSimulator ? '#simulateur' : '/simulateur-gain-de-temps/';
  if (homeSimulator) {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      event.preventDefault();
      if (location.hash !== '#simulateur') history.pushState(null, '', '#simulateur');
      homeSimulator.focus({ preventScroll: true });
      homeSimulator.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
  }
  link.textContent = 'Estimer mon gain de temps';
  link.hidden = true;
  // Reserve an empty strip, including on mobile, instead of covering useful content.
  const space = document.createElement('div');
  space.className = 'time-floating-space';
  space.setAttribute('aria-hidden', 'true');
  document.body.append(space, link);
  const sections = Array.from(document.querySelectorAll('section')).filter(section =>
    Array.from(section.querySelectorAll('.eyebrow')).some(label => label.textContent.trim() === 'Premier pas')
  );
  if (homeSimulator) sections.push(homeSimulator);
  const visibleSections = new Set();
  let requested = false;
  function refresh() {
    requested = false;
    const blocked = document.querySelector('[data-consent-banner]:not([hidden]), [data-consent-dialog-backdrop]:not([hidden])');
    const viewport = window.visualViewport;
    const keyboard = viewport && viewport.height < window.innerHeight * 0.75;
    if (blocked || keyboard || visibleSections.size) { link.hidden = true; return; }
    link.hidden = false;
    const box = link.getBoundingClientRect();
    const overlaps = rect => rect.bottom > box.top - 8 && rect.top < box.bottom + 8 && rect.right > box.left - 8 && rect.left < box.right + 8;
    // Hide whenever the control would cover useful text or an interactive element.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim() || link.contains(node) || node.parentElement.closest('script, style, [hidden]')) continue;
      if (!overlaps(node.parentElement.getBoundingClientRect())) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      if (Array.from(range.getClientRects()).some(overlaps)) { link.hidden = true; return; }
    }
    if (Array.from(document.querySelectorAll('main :is(a, button, input, select, img), footer :is(a, button)'))
      .some(element => Array.from(element.getClientRects()).some(overlaps))) link.hidden = true;
  }
  function schedule() {
    if (!requested) { requested = true; requestAnimationFrame(refresh); }
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visibleSections.add(entry.target);
        else visibleSections.delete(entry.target);
      }
      schedule();
    });
    sections.forEach(section => observer.observe(section));
  }
  new MutationObserver(records => { if (records.some(record => record.target !== link)) schedule(); }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  refresh();
})();
