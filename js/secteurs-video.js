/* AesthéIA — accueil : cartes secteurs animées.
   Chaque photo joue une courte vidéo une seule fois, à vitesse normale, puis reste sur sa dernière image.
   Écran large : les cartes se jouent l'une après l'autre, de gauche à droite, et tout reprend
   depuis la première carte tant que la personne reste sur la page sans défiler.
   Smartphone : chaque carte se joue quand elle entre à l'écran, jusqu'au bout même si l'on arrête de défiler.
   Une carte qui sort de l'écran puis y revient se rejoue.
   La vidéo est lue hors champ et dessinée sur un canvas : cela évite les éclairs blancs
   que certains navigateurs affichent au démarrage d'une vidéo.
   Sans JavaScript, avec « réduire les animations » ou « économiser les données », la photo d'origine reste affichée. */
(function () {
  'use strict';

  var cards = Array.prototype.slice.call(document.querySelectorAll('.v2-home-sectors .sector-card[data-video]'));
  if (!cards.length || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var connection = navigator.connection;
  if (connection && (connection.saveData || /2g$/.test(connection.effectiveType || ''))) return;

  var wide = window.matchMedia('(min-width: 601px)');
  var items = [];
  var queue = [];
  var playing = null;

  function parsePos(value) {
    var parts = (value || '50% 50%').split(/\s+/).map(function (part) { return parseFloat(part) / 100; });
    return [isNaN(parts[0]) ? 0.5 : parts[0], isNaN(parts[1]) ? 0.5 : parts[1]];
  }

  /* Le canvas prend exactement la place de la photo, quel que soit son format. */
  function layout(c) {
    var w = c.img.offsetWidth;
    var h = c.img.offsetHeight;
    if (!w || !h) return;
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var cw = Math.round(w * ratio);
    var ch = Math.round(h * ratio);
    c.cv.style.height = h + 'px';
    if (c.cv.width !== cw || c.cv.height !== ch) {
      c.cv.width = cw;
      c.cv.height = ch;
    }
    c.W = cw;
    c.H = ch;
    draw(c);
  }

  /* Recadrage « cover » : même logique que object-fit, avec un point d'ancrage par carte. */
  function draw(c) {
    var v = c.v;
    if (!c.W || !v.videoWidth || v.readyState < 2) return;
    var pos = (!wide.matches && c.posM) ? c.posM : c.pos;
    var vw = v.videoWidth;
    var vh = v.videoHeight;
    var ar = c.W / c.H;
    var sw;
    var sh;
    if (vw / vh > ar) { sh = vh; sw = vh * ar; } else { sw = vw; sh = vw / ar; }
    c.g.drawImage(v, (vw - sw) * pos[0], (vh - sh) * pos[1], sw, sh, 0, 0, c.W, c.H);
    if (!c.shown) {
      c.shown = true;
      c.card.classList.add('sc-live');
    }
  }

  function loop(c) {
    if (c.state !== 'playing') return;
    draw(c);
    if (c.v.requestVideoFrameCallback) {
      c.v.requestVideoFrameCallback(function () { loop(c); });
    } else {
      window.requestAnimationFrame(function () { loop(c); });
    }
  }

  function rewind(c) {
    try { c.v.pause(); c.v.currentTime = 0; } catch (error) { /* vidéo pas encore prête */ }
  }

  function release(c) {
    if (playing === c) playing = null;
    run();
    scheduleLoop();
  }

  /* Écran large : quand toutes les cartes visibles ont fini et que la personne reste sur la page sans défiler,
     on laisse la dernière image un instant, puis tout reprend depuis la première carte, de gauche à droite. */
  var LOOP_DELAY = 3000;
  var loopTimer = 0;
  function restState() {
    if (!wide.matches || playing || queue.length || document.hidden) return null;
    var shown = items.filter(function (c) { return c.vis; });
    if (!shown.length) return null;
    return shown.every(function (c) { return c.state === 'done'; }) ? shown : null;
  }
  function scheduleLoop() {
    window.clearTimeout(loopTimer);
    loopTimer = 0;
    if (!restState()) return;
    loopTimer = window.setTimeout(function () {
      loopTimer = 0;
      var shown = restState();
      if (!shown) return;
      shown.forEach(function (c) { rewind(c); c.state = 'idle'; });
      shown.forEach(enter);
    }, LOOP_DELAY);
  }

  function run() {
    if (!queue.length) return;
    if (!wide.matches) {
      queue.splice(0).forEach(play);
      return;
    }
    if (playing) return;
    queue.sort(function (a, b) { return a.i - b.i; });
    play(queue.shift());
  }

  function play(c) {
    c.state = 'playing';
    playing = c;
    try { c.v.currentTime = 0; } catch (error) { /* vidéo pas encore prête */ }
    var started = c.v.play();
    if (started && started.then) {
      started.then(function () { loop(c); }, function () {
        c.state = 'idle';
        release(c);
      });
    } else {
      loop(c);
    }
  }

  function enter(c) {
    if (c.state !== 'idle') return;
    c.state = 'queued';
    queue.push(c);
    run();
  }

  function leave(c) {
    var index = queue.indexOf(c);
    if (index > -1) queue.splice(index, 1);
    var wasPlaying = playing === c;
    if (c.state !== 'idle') rewind(c);
    c.state = 'idle';
    if (wasPlaying) {
      playing = null;
      run();
    }
    scheduleLoop();
  }

  var watcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var c = entry.target._sc;
      if (!c) return;
      if (entry.intersectionRatio >= 0.55) {
        c.vis = true;
        enter(c);
      } else if (entry.intersectionRatio < 0.1) {
        c.vis = false;
        leave(c);
      }
    });
  }, { threshold: [0, 0.1, 0.55] });

  cards.forEach(function (card, index) {
    var img = card.querySelector('img');
    if (!img) return;

    var cv = document.createElement('canvas');
    cv.className = 'sc-vid';
    cv.setAttribute('aria-hidden', 'true');

    var v = document.createElement('video');
    v.className = 'sc-src';
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('aria-hidden', 'true');
    v.setAttribute('tabindex', '-1');
    v.playsInline = true;
    v.preload = 'none';

    var g = cv.getContext('2d');
    if (!g) return;
    g.imageSmoothingQuality = 'high';

    var c = {
      i: index,
      card: card,
      img: img,
      cv: cv,
      v: v,
      g: g,
      W: 0,
      H: 0,
      pos: parsePos(card.getAttribute('data-pos')),
      posM: card.hasAttribute('data-pos-m') ? parsePos(card.getAttribute('data-pos-m')) : null,
      state: 'idle',
      vis: false,
      shown: false
    };

    v.addEventListener('loadeddata', function () { draw(c); });
    v.addEventListener('seeked', function () { draw(c); });
    v.addEventListener('ended', function () {
      draw(c);
      if (c.state === 'playing') c.state = 'done';
      release(c);
    });
    v.addEventListener('error', function () {
      if (c.state === 'playing' || c.state === 'queued') c.state = 'idle';
      var k = queue.indexOf(c);
      if (k > -1) queue.splice(k, 1);
      release(c);
    });
    // Le navigateur a mis la lecture en pause (onglet masqué, économie d'énergie) : on la reprend.
    v.addEventListener('pause', function () {
      if (c.state !== 'playing' || v.ended || document.hidden) return;
      var again = v.play();
      if (again && again.catch) again.catch(function () { c.state = 'idle'; release(c); });
    });

    img.insertAdjacentElement('afterend', cv);
    cv.insertAdjacentElement('afterend', v);
    cv._sc = c;
    items.push(c);
    layout(c);
    watcher.observe(cv);
  });

  if (!items.length) return;

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    scheduleLoop();
    items.forEach(function (c) {
      if (c.state === 'playing' && c.v.paused && !c.v.ended) {
        var again = c.v.play();
        if (again && again.catch) again.catch(function () { c.state = 'idle'; release(c); });
      }
    });
  });

  /* Le canvas suit la photo quand la mise en page change (rotation, redimensionnement, changement de colonnes). */
  if (window.ResizeObserver) {
    var sizer = new ResizeObserver(function () { items.forEach(layout); });
    items.forEach(function (c) { sizer.observe(c.img); });
  } else {
    window.addEventListener('resize', function () { items.forEach(layout); }, { passive: true });
  }

  /* Les vidéos ne sont téléchargées qu'à l'approche de la section : rien ne ralentit le haut de page. */
  var section = document.querySelector('.v2-home-sectors');
  var started = false;
  function load() {
    if (started) return;
    started = true;
    items.forEach(function (c) {
      c.v.preload = 'auto';
      c.v.src = c.card.getAttribute('data-video');
      c.v.load();
    });
  }
  if (section) {
    var near = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) {
        near.disconnect();
        load();
      }
    }, { rootMargin: '700px 0px' });
    near.observe(section);
  } else {
    load();
  }
})();
