(() => {
  const compact = window.matchMedia("(max-width: 1050px)");

  const isDark = () => {
    const root = document.documentElement;
    return root.classList.contains("theme-dark") || root.dataset.theme === "dark";
  };

  const setupOffers = () => {
    const active = compact.matches && isDark();
    document.querySelectorAll("body.home-page .home-offers .offer-card").forEach((card) => {
      const heading = card.querySelector(":scope > h3");
      if (!heading) return;

      if (active) {
        card.classList.add("home-offer-collapsible");
        if (!heading.dataset.homeOfferBound) {
          heading.dataset.homeOfferBound = "true";
          heading.setAttribute("role", "button");
          heading.setAttribute("tabindex", "0");
          heading.setAttribute("aria-expanded", "false");

          const toggle = () => {
            const expanded = card.classList.toggle("home-offer-expanded");
            heading.setAttribute("aria-expanded", expanded ? "true" : "false");
          };

          heading.addEventListener("click", toggle);
          heading.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggle();
            }
          });
        }
      } else {
        card.classList.remove("home-offer-collapsible", "home-offer-expanded");
        heading.removeAttribute("role");
        heading.removeAttribute("tabindex");
        heading.removeAttribute("aria-expanded");
      }
    });
  };

  const setupMethod = () => {
    const details = document.querySelector("body.home-page .home-method details.home-section-accordion");
    if (!details) return;

    const active = compact.matches && isDark();

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
