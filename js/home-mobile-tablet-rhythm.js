(() => {
  const compact = window.matchMedia("(max-width: 1050px)");

  const alignOfferFallback = () => {
    const grid = document.querySelector("body.home-page .home-offers .offer-grid");
    if (!grid) return;
    const rows = [
      ["--offer-title-row", ":scope > h3"],
      ["--offer-description-row", ":scope > p[data-offer-content]:not(.commercial-offer-proposal):not(.offer-result)"],
      ["--offer-proposal-row", ":scope > .commercial-offer-proposal"],
      ["--offer-benefit-row", ":scope > .offer-result"]
    ];
    rows.forEach(([name]) => grid.style.removeProperty(name));
    if (compact.matches || CSS.supports("grid-template-rows", "subgrid")) return;
    const cards = [...grid.querySelectorAll(".offer-card")];
    const heights = rows.map(([, selector]) => Math.max(0, ...cards.map(card => {
      const item = card.querySelector(selector);
      if (!item || item.hidden) return 0;
      const style = getComputedStyle(item);
      return item.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    })));
    rows.forEach(([name], index) => grid.style.setProperty(name, `${Math.ceil(heights[index])}px`));
  };
  const scheduleOfferFallback = () => requestAnimationFrame(alignOfferFallback);

  const setupOffers = () => {
    document.querySelectorAll("body.home-page .home-offers .offer-card").forEach((card) => {
      const button = card.querySelector(".offer-disclosure");
      if (!button || button.dataset.homeOfferBound) return;
      button.dataset.homeOfferBound = "true";
      button.addEventListener("click", () => {
        const expanded = card.classList.toggle("home-offer-expanded");
        button.setAttribute("aria-expanded", String(expanded));
        card.querySelectorAll("[data-offer-content]").forEach((paragraph) => {
          paragraph.hidden = !expanded;
        });
        scheduleOfferFallback();
      });
    });
  };

  const setupMethod = () => {
    const details = document.querySelector("body.home-page .home-method details.home-section-accordion");
    if (!details) return;

    const active = compact.matches;

    if (active) {
      details.classList.add("home-method-direct");
      if (!details.open) {
        details.dataset.homeMethodForcedOpen = "true";
        details.open = true;
      }
    } else {
      details.classList.remove("home-method-direct");
      if (details.dataset.homeMethodForcedOpen === "true") {
        details.open = false;
        delete details.dataset.homeMethodForcedOpen;
      }
    }
  };

  const sync = () => {
    setupOffers();
    setupMethod();
    scheduleOfferFallback();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync, { once: true });
  } else {
    sync();
  }

  compact.addEventListener?.("change", sync);
  window.addEventListener("resize", scheduleOfferFallback, { passive: true });
  document.fonts.ready.then(scheduleOfferFallback);

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) =>
      mutation.type === "attributes" &&
      mutation.target === document.documentElement &&
      (mutation.attributeName === "class" || mutation.attributeName === "data-theme")
    )) {
      sync();
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"]
  });
})();
