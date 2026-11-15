/* AesthéIA — accueil « film de marque » : caméras 2.5D pilotées par le défilement.
   Aucune bibliothèque. Le défilement reste entièrement natif : aucun écouteur wheel/touch,
   aucun preventDefault, aucune section épinglée. Le script ne fait que lire la position
   de la page et déplacer des plans (photo, lumière, texte) à des vitesses différentes. */
(function () {
  'use strict';
  var root = document.documentElement;
  var body = document.body;
  if (!root.classList.contains('film') || !body || !body.classList.contains('v2-home-page')) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Version douce : fondus seuls, aucune caméra. Posée en tête de page selon le réglage de l'appareil.
  var calm = root.classList.contains('film-calm');
  window.__aestheiaFilm = calm ? 'calm' : 'full';

  var phone = window.matchMedia('(max-width: 600px)');
  var tablet = window.matchMedia('(max-width: 1120px)');
  // Appareils modestes : on garde les caméras, on retire flou et brume.
  if ((navigator.deviceMemory && navigator.deviceMemory <= 2) ||
      (navigator.connection && navigator.connection.saveData)) {
    root.classList.add('film-lite');
  }

  function $(selector, scope) { return (scope || document).querySelector(selector); }
  function $$(selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); }
  function clamp(value) { return value < 0 ? 0 : value > 1 ? 1 : value; }
  function ease(value) { return value * value * (3 - 2 * value); }
  function layer(className, parent, before) {
    var element = document.createElement('span');
    element.className = className;
    element.setAttribute('aria-hidden', 'true');
    if (parent) parent.insertBefore(element, before || null);
    return element;
  }

  /* ---------- Plans ajoutés (décoratifs, masqués aux lecteurs d'écran) ---------- */
  var header = $('.v2-header');
  var progress = header && !calm ? layer('film-progress', header) : null;

  var hero = $('.v2-hero');
  var heroMedia = hero && $('.v2-hero-media', hero);
  var heroImg = heroMedia && $('img', heroMedia);
  var heroText = hero && $('.v2-hero-text', hero);
  var heroIn = hero && $('.v2-hero-in', hero);
  var veil = null;
  if (hero && heroIn && !calm) {
    layer('film-light', hero, heroIn);
    veil = layer('film-veil', hero, heroIn);
  }

  $$(calm ? '.film-none' : '.v2-home-controls, .v2-home-founder').forEach(function (section) {
    layer('film-glow', section, section.firstChild);
  });

  var cta = $('.v2-cta');
  var outroPlate = null;
  if (cta && heroImg && !calm) {
    var outro = layer('film-outro', cta, cta.firstChild);
    outroPlate = document.createElement('i');
    outro.appendChild(outroPlate);
  }

  /* ---------- Caméras : un mouvement par photographie ---------- */
  var shots = [];
  function shot(element, kind, target) {
    if (element && !calm) shots.push({ element: element, target: target || element, kind: kind, current: null, near: false });
  }
  var kinds = ['precision', 'spa', 'water', 'care'];
  $$('.v2-home-sectors .sector-card').forEach(function (card, index) {
    var img = $('img', card);
    if (!img || !kinds[index]) return;
    card.setAttribute('data-film-shot', kinds[index]);
    shot(card, kinds[index], img);
  });
  shot($('.v2-about-photo'), 'portrait');
  $$('.film-glow').forEach(function (glow) { shot(glow.parentNode, 'glow', glow); });
  if (outroPlate) shot(cta, 'outro', outroPlate);

  function frameShot(kind, p, amp) {
    var c = p - 0.5;
    switch (kind) {
      case 'precision': // poussée lente et précise vers le regard du praticien
        return 'translate3d(' + (-c * 2 * amp).toFixed(3) + '%,0,0) scale(' + (1.05 + 0.15 * amp * p).toFixed(4) + ')';
      case 'spa':       // travelling avant vers l'arche, depuis le point de fuite du bassin
        return 'scale(' + (1 + 0.3 * amp * ease(p)).toFixed(4) + ')';
      case 'water':     // dérive latérale et léger tangage, comme porté par l'eau
        return 'translate3d(' + (-c * 5 * amp).toFixed(3) + '%,' + (Math.sin(p * 6.2832) * 1.2 * amp).toFixed(3) + '%,0) scale(' + (1.12 + 0.05 * amp * p).toFixed(4) + ')';
      case 'care':      // rapprochement délicat vers le geste
        return 'translate3d(0,' + (-c * 2 * amp).toFixed(3) + '%,0) scale(' + (1.03 + 0.2 * amp * p).toFixed(4) + ')';
      case 'portrait':  // le cadre flotte par rapport au texte, sans toucher au visage
        return 'translate3d(0,' + (-c * 36 * amp).toFixed(2) + 'px,0)';
      case 'glow':      // halo d'arrière-plan plus lent que le contenu
        return 'translate3d(0,' + (c * 180 * amp).toFixed(2) + 'px,0)';
      case 'outro':     // travelling arrière : on quitte le lieu
        return 'scale(' + (1.2 - 0.2 * ease(p)).toFixed(4) + ')';
    }
    return '';
  }

  /* ---------- Montage : apparitions à l'entrée dans le champ ---------- */
  function tag(selector, type) {
    $$(selector).forEach(function (element) {
      if (!element.hasAttribute('data-film')) element.setAttribute('data-film', type || 'rise');
    });
  }
  tag('.v2-benefits li');
  tag('.v2-section > .v2-wrap > .v2-eyebrow, .v2-section > .v2-wrap > .v2-h2, .v2-section > .v2-wrap > .v2-intro');
  tag('.v2-family-head');
  tag('.v2-solution, .v2-home-control, .v2-offers > .v2-lever, .v2-sim', 'deep');
  tag('.v2-home-sectors .sector-card', 'deep');
  tag('.v2-about-photo', 'unveil');
  tag('.v2-about-text > *');
  tag('.v2-faq > details', 'soft');
  tag('.v2-cta > .v2-wrap > p, .v2-cta-actions');
  tag('.v2-footer-top > div, .v2-footer-bottom', 'fade');
  var reveals = $$('[data-film]');

  // Pictogrammes au trait : ils se dessinent avec leur carte.
  reveals.forEach(function (element) {
    $$('svg', element).forEach(function (svg) {
      if (calm || svg.closest('a, button') || getComputedStyle(svg).fill !== 'none') return;
      svg.setAttribute('data-film-draw', '');
      $$('path, circle, rect, polyline, line', svg).forEach(function (shape) { shape.setAttribute('pathLength', '1'); });
    });
  });

  var revealObserver = new IntersectionObserver(function (entries) {
    var entering = [];
    entries.forEach(function (entry) {
      var element = entry.target;
      if (entry.isIntersecting) {
        if (!element.classList.contains('is-in')) entering.push(entry);
      } else if (entry.boundingClientRect.top > (entry.rootBounds ? entry.rootBounds.bottom : window.innerHeight)) {
        // Repassé sous l'écran en remontant : la scène se rejouera à la prochaine descente.
        element.style.removeProperty('--film-d');
        element.classList.remove('is-in');
      }
    });
    // Ceux qui entrent ensemble se suivent de gauche à droite, de haut en bas.
    entering.sort(function (a, b) {
      return (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left);
    });
    entering.forEach(function (entry, index) {
      entry.target.style.setProperty('--film-d', (Math.min(index, 5) * 0.09).toFixed(2) + 's');
      entry.target.classList.add('is-in');
    });
  }, { rootMargin: '0px 0px -7% 0px', threshold: 0.01 });
  reveals.forEach(function (element) { revealObserver.observe(element); });
  // Clavier : un élément qui reçoit le focus est toujours visible.
  document.addEventListener('focusin', function (event) {
    var holder = event.target.closest && event.target.closest('[data-film]');
    if (holder) holder.classList.add('is-in');
  });
  root.classList.add('film-live');

  /* ---------- Sections proches de l'écran : seules elles sont animées ---------- */
  var nearObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      entry.target.classList.toggle('film-near', entry.isIntersecting);
      if (entry.target === cta && entry.isIntersecting && outroPlate && !outroPlate.style.backgroundImage) {
        // Le plan final réutilise la photo d'ouverture, déjà en cache.
        outroPlate.style.backgroundImage = 'url("' + (heroImg.currentSrc || heroImg.src) + '")';
      }
      shots.forEach(function (item) {
        if (item.element === entry.target || entry.target.contains(item.element)) item.near = entry.isIntersecting;
      });
    });
    schedule();
  }, { rootMargin: '25% 0px 25% 0px' });
  $$('main > section').forEach(function (section) { nearObserver.observe(section); });

  /* ---------- Boucle de rendu : ne tourne que pendant le mouvement ---------- */
  var frame = 0;
  var last = 0;
  var heroCurrent = null;
  var introStart = 0;
  var INTRO = 2400;

  function schedule() {
    if (!frame && !document.hidden) frame = window.requestAnimationFrame(render);
  }

  function render(now) {
    frame = 0;
    var dt = last ? Math.min(64, now - last) : 16;
    last = now;
    var k = 1 - Math.exp(-dt / 110); // inertie douce, indépendante de la fréquence d'écran
    var viewport = window.innerHeight;
    var amp = phone.matches ? 0.8 : tablet.matches ? 0.9 : 1;
    var moving = false;
    var writes = [];
    var scrollY = window.pageYOffset;

    // Lectures de géométrie d'abord, écritures ensuite.
    if (progress) {
      var max = Math.max(1, root.scrollHeight - viewport);
      var done = clamp(scrollY / max);
      writes.push(function () { progress.style.transform = 'scaleX(' + done.toFixed(4) + ')'; });
      // Fin de page : les derniers éléments, trop bas pour franchir le seuil, sont révélés.
      if (done > 0.995) writes.push(function () {
        reveals.forEach(function (element) { if (element.getBoundingClientRect().top < viewport) element.classList.add('is-in'); });
      });
    }

    if (hero && heroImg && !calm) {
      var heroEnd = hero.offsetTop + hero.offsetHeight;
      var target = clamp(scrollY / Math.max(1, heroEnd));
      if (heroCurrent === null) heroCurrent = target;
      heroCurrent += (target - heroCurrent) * k;
      if (Math.abs(target - heroCurrent) > 0.0004) moving = true; else heroCurrent = target;
      if (!introStart) introStart = now;
      var introLeft = 1 - clamp((now - introStart) / INTRO);
      introLeft = introLeft * introLeft * introLeft; // plan d'ouverture : la caméra se pose
      if (introLeft > 0.0005) moving = true;
      if (scrollY < heroEnd + 200 || moving) {
        var hp = heroCurrent;
        writes.push(function () {
          heroImg.style.transform = 'translate3d(0,' + (6 * amp * hp).toFixed(3) + '%,0) scale(' + (1.03 + 0.15 * amp * hp + 0.07 * introLeft).toFixed(4) + ')';
          if (veil) veil.style.opacity = (0.62 * hp).toFixed(3);
          if (heroText) {
            heroText.style.setProperty('--film-text-y', (-44 * amp * hp).toFixed(2) + 'px');
            heroText.style.setProperty('--film-text-o', (1 - clamp((hp - 0.4) * 2.2)).toFixed(3));
          }
        });
      }
    }

    shots.forEach(function (item) {
      if (!item.near) return;
      var rect = item.element.getBoundingClientRect();
      var target = clamp((viewport - rect.top) / (viewport + rect.height));
      if (item.current === null) item.current = target;
      item.current += (target - item.current) * k;
      if (Math.abs(target - item.current) > 0.0004) moving = true; else item.current = target;
      var value = frameShot(item.kind, item.current, amp);
      writes.push(function () { item.target.style.transform = value; });
    });

    for (var i = 0; i < writes.length; i++) writes[i]();
    if (moving) schedule(); else last = 0;
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule);
  window.addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', function () { last = 0; schedule(); });
  document.addEventListener('toggle', schedule, true); // ouverture d'une FAQ : la page change de hauteur
  if (heroImg && !heroImg.complete) heroImg.addEventListener('load', schedule);

  // Réglage « réduire les animations » modifié en cours de visite : la page repart dans le bon mode.
  if (reduced.addEventListener) reduced.addEventListener('change', function () { window.location.reload(); });

  // Diagnostic à la demande : ajouter ?film=diag à l'adresse.
  if (/[?&]film=diag/.test(window.location.search)) {
    var forced = false;
    try { forced = window.sessionStorage.getItem('aestheia-film') === 'on'; } catch (error) { /* navigation privée */ }
    var diag = document.createElement('div');
    diag.className = 'film-diag';
    diag.innerHTML = calm
      ? '<strong>Film : version douce.</strong> Cet appareil demande des mouvements réduits (réglage d’accessibilité ou économie d’énergie) : seuls les fondus sont joués. <a href="?film=on">Voir la version complète quand même</a>'
      : '<strong>Film : version complète active.</strong> ' + (forced ? 'Forcée pour ce test. <a href="?film=auto">Revenir au réglage de l’appareil</a>' : 'Aucun réglage de mouvements réduits détecté sur cet appareil.');
    body.appendChild(diag);
  }

  schedule();
})();
