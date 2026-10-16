(() => {
  const compact = window.matchMedia("(max-width: 1050px)");

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
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync, { once: true });
  } else {
    sync();
  }

  compact.addEventListener?.("change", sync);

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
