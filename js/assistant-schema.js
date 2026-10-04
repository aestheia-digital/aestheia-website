/* Même animation que le schéma de la home, adaptée aux cartes HTML. */
(function () {
  var figures = Array.from(document.querySelectorAll(".assistant-schema"));
  if (!figures.length || !("IntersectionObserver" in window)) return;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var states = new Map();
  var arrow = '<span class="assistant-schema-connector" aria-hidden="true"><svg viewBox="0 0 20 14" focusable="false"><path class="assistant-schema-line" d="M0 7H17"/><path class="assistant-schema-head" d="M12 2L17 7L12 12"/></svg></span>';
  var frame = '<svg class="assistant-schema-frame" aria-hidden="true" focusable="false"><rect x="0" y="0" width="100%" height="100%" rx="10"/></svg>';
  function sync() {
    figures.forEach(function (fig) {
      fig.classList.toggle("is-running", states.get(fig) && !document.hidden && !reduced.matches);
    });
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) { states.set(entry.target, entry.isIntersecting); });
    sync();
  }, { threshold: 0.25 });
  figures.forEach(function (fig) {
    var steps = fig.querySelectorAll(".flow > .step");
    steps.forEach(function (step, index) {
      if (index < steps.length - 1) step.insertAdjacentHTML("beforeend", arrow);
    });
    fig.querySelector(".tasks").insertAdjacentHTML("afterbegin", frame);
    fig.classList.add("has-motion-decor");
    observer.observe(fig);
    fig.addEventListener("touchstart", function () {}, { passive: true });
  });
  document.addEventListener("visibilitychange", sync);
  if (reduced.addEventListener) reduced.addEventListener("change", sync);
})();
