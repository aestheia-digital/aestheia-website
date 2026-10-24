(function () {
  var range = document.getElementById('sim-heures');
  var el = function (id) { return document.getElementById(id); };
  var SEMAINES = 46;
  var LO = 0.4, HI = 0.5;
  var SEM_PAR_MOIS = SEMAINES / 12;
  function q(x) { return Math.round(x * 4) * 15; }
  function hm(min) {
    var hh = Math.floor(min / 60), mm = min % 60;
    if (hh === 0) return mm + ' min';
    return mm === 0 ? hh + ' h' : hh + ' h ' + (mm < 10 ? '0' + mm : mm);
  }
  function plage(a, b) { return a === b ? 'environ ' + hm(a) : hm(a) + ' à ' + hm(b); }
  function plageMois(a, b) {
    var x = Math.round(a), y = Math.round(b);
    return x === y ? 'environ ' + x : x + ' à ' + y;
  }
  function update() {
    var h = Number(range.value);
    var min = Number(range.min), max = Number(range.max);
    range.style.setProperty('--pct', ((h - min) / (max - min)) * 100 + '%');
    el('sim-valeur').textContent = h;
    el('sim-gain').textContent = plage(q(h * LO), q(h * HI));
    el('sim-mois').textContent = plageMois(h * LO * SEM_PAR_MOIS, h * HI * SEM_PAR_MOIS);
  }
  range.addEventListener('input', update);
  update();
})();

/* Situations par métier : accordéon sur mobile, cartes ouvertes ailleurs. */
(function () {
  var cases = document.querySelectorAll('.cases .case');
  if (!cases.length || !window.matchMedia) return;
  var mq = window.matchMedia('(max-width: 640px)');
  function sync() {
    for (var i = 0; i < cases.length; i++) {
      if (mq.matches) cases[i].removeAttribute('open'); else cases[i].setAttribute('open', '');
    }
  }
  for (var i = 0; i < cases.length; i++) {
    cases[i].querySelector('.case-head').addEventListener('click', function (e) { if (!mq.matches) e.preventDefault(); });
  }
  if (mq.addEventListener) mq.addEventListener('change', sync); else mq.addListener(sync);
  sync();
})();
