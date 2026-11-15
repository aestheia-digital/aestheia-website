/* Pictogrammes des pages secteurs : apparition au fil du défilement (voir css/picto-trait.css).
   L'accueil a son propre montage ; ce script ne s'y applique pas. */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('picto')) return;
  if (!('IntersectionObserver' in window) || document.body.classList.contains('v2-home-page')) {
    root.classList.remove('picto');
    return;
  }
  window.__aestheiaPicto = true;

  var shapes = 'path, circle, rect, polyline, line, ellipse, polygon';
  var items = [];

  // Pictogrammes au trait : hors boutons, liens, menus, chevrons d'accordéon et header photo.
  Array.prototype.forEach.call(document.querySelectorAll('main svg'), function (svg) {
    if (svg.closest('a, button, summary, nav, figure, .v2-hero, [class*="chevron"], [class*="schema"], [class*="multi-agent"], [class*="diagram"], [class*="flow"]')) return;
    if (/chevron|schema|diagram|flow/.test(svg.getAttribute('class') || '')) return;
    // Uniquement de petits pictogrammes : jamais un schéma, une illustration ou un tracé animé.
    var box = svg.getBoundingClientRect();
    if (!box.width || box.width > 130 || box.height > 64) return;
    if (svg.querySelector('marker, defs, animate, animateTransform, animateMotion, text, g, use')) return;
    var list = svg.querySelectorAll(shapes);
    if (!list.length) return;
    var plain = Array.prototype.every.call(list, function (shape) {
      var s = getComputedStyle(shape);
      // Un trait déjà pointillé ou animé (flèches, liaisons) n'est pas touché.
      return s.fill === 'none' && s.stroke !== 'none' && s.strokeDasharray === 'none' && s.animationName === 'none';
    });
    if (!plain) return;
    Array.prototype.forEach.call(svg.querySelectorAll(shapes), function (shape) { shape.setAttribute('pathLength', '1'); });
    svg.setAttribute('data-picto', 'trait');
    items.push(svg);
  });

  // Pictogrammes en fichier image.
  Array.prototype.forEach.call(document.querySelectorAll('main img[src*="/assets/icons/"]'), function (img) {
    if (img.closest('a, button, summary, nav, figure, .v2-hero, [class*="schema"], [class*="multi-agent"], [class*="diagram"], [class*="flow"]')) return; // jamais dans un schéma
    img.setAttribute('data-picto', 'image');
    items.push(img);
  });

  var observer = new IntersectionObserver(function (entries) {
    var entering = [];
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        if (!entry.target.classList.contains('is-drawn')) entering.push(entry);
      } else if (entry.boundingClientRect.top > (entry.rootBounds ? entry.rootBounds.bottom : window.innerHeight)) {
        // Repassé sous l'écran en remontant : il se redessinera à la prochaine descente.
        entry.target.style.removeProperty('--picto-d');
        entry.target.classList.remove('is-drawn');
      }
    });
    entering.sort(function (a, b) {
      return (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left);
    });
    entering.forEach(function (entry, index) {
      entry.target.style.setProperty('--picto-d', (Math.min(index, 6) * 0.1).toFixed(2) + 's');
      entry.target.classList.add('is-drawn');
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
  items.forEach(function (item) { observer.observe(item); });
  root.classList.add('picto-live');

  // Fin de page : les derniers pictogrammes, trop bas pour franchir le seuil, sont affichés.
  window.addEventListener('scroll', function () {
    if (window.pageYOffset + window.innerHeight < root.scrollHeight - 4) return;
    items.forEach(function (item) { if (item.getBoundingClientRect().top < window.innerHeight) item.classList.add('is-drawn'); });
  }, { passive: true });
})();
