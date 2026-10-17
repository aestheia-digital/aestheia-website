(() => {
  if (/^\/(simulateur-gain-de-temps|contact)(\/|\.html)?$/.test(location.pathname)) return;
  const mobile = window.matchMedia('(max-width: 820px)');
  const link = document.createElement('a');
  link.className = 'btn btn-primary time-floating';
  const homeBanner = document.querySelector('body.home-page .time-banner');
  const sector = location.pathname.match(/^\/(medecine-esthetique|spa-hotelier|thalasso-thermal|instituts-independantes)(?:\/(?:index\.html)?)?$/)?.[1];
  link.href = '/simulateur-gain-de-temps/' + (sector ? `?profil=${sector}` : '');
  link.textContent = 'Estimer mon gain de temps';
  link.hidden = true;
  // Reserve an empty strip on desktop instead of covering useful content.
  const space = document.createElement('div');
  space.className = 'time-floating-space';
  space.setAttribute('aria-hidden', 'true');
  const sections = Array.from(document.querySelectorAll('section')).filter(section =>
    Array.from(section.querySelectorAll('.eyebrow')).some(label => label.textContent.trim() === 'Premier pas')
  );
  if (homeBanner) sections.push(homeBanner);
  const visibleSections = new Set();
  let requested = false;
  function refresh() {
    requested = false;
    // Remove both nodes on phones, including after rotation or a queued refresh.
    if (mobile.matches) {
      link.hidden = true;
      link.remove();
      space.remove();
      return;
    }
    if (!link.isConnected) document.body.append(space, link);
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
  if (mobile.addEventListener) mobile.addEventListener('change', refresh);
  else mobile.addListener(refresh);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  refresh();
})();
