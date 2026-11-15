/* Bandeau final des pages secteurs : reprend la photo du header en filigrane.
   Tous formats. La photo est déjà en cache : aucun
   téléchargement supplémentaire. Léger travelling arrière au défilement, supprimé si
   l'appareil demande des mouvements réduits. L'accueil a son propre plan final. */
(function () {
  'use strict';
  var wide = window.matchMedia('(min-width: 1024px)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var cta = document.querySelector('.v2-cta, main > .conversion-band');
  var heroImg = document.querySelector('.v2-hero .v2-hero-media img, main .home-hero-media img');
  if (!cta || !heroImg || document.body.classList.contains('v2-home-page')) return;

  var plate = null;
  var frame = 0;
  var near = false;

  function build() {
    if (plate) return;
    var holder = document.createElement('span');
    holder.className = 'cta-fond';
    holder.setAttribute('aria-hidden', 'true');
    plate = document.createElement('i');
    // Même cadrage que dans le header de la page.
    plate.style.backgroundPosition = getComputedStyle(heroImg).objectPosition;
    holder.appendChild(plate);
    cta.insertBefore(holder, cta.firstChild);
    cta.classList.add('has-cta-fond');

    if (!('IntersectionObserver' in window)) {
      plate.style.backgroundImage = 'url("' + (heroImg.currentSrc || heroImg.src) + '")';
      return;
    }
    new IntersectionObserver(function (entries) {
      near = entries[0].isIntersecting;
      if (near && !plate.style.backgroundImage) {
        plate.style.backgroundImage = 'url("' + (heroImg.currentSrc || heroImg.src) + '")';
      }
      schedule();
    }, { rootMargin: '30% 0px 30% 0px' }).observe(cta);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
  }

  function schedule() {
    if (!frame && near && !reduced.matches) frame = window.requestAnimationFrame(render);
  }

  function render() {
    frame = 0;
    var rect = cta.getBoundingClientRect();
    var viewport = window.innerHeight;
    var p = (viewport - rect.top) / (viewport + rect.height);
    p = p < 0 ? 0 : p > 1 ? 1 : p;
    p = p * p * (3 - 2 * p);
    plate.style.transform = 'scale(' + (1.1 - 0.1 * p).toFixed(4) + ')';
  }

  build();
  // Le cadrage du header change entre mobile et ordinateur : on le reprend à chaque bascule.
  if (wide.addEventListener) wide.addEventListener('change', function () {
    if (plate) plate.style.backgroundPosition = getComputedStyle(heroImg).objectPosition;
    schedule();
  });
})();
