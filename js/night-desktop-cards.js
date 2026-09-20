(() => {
  const desktop = window.matchMedia("(min-width: 1051px)");

  const isDark = () => {
    const root = document.documentElement;
    return root.classList.contains("theme-dark") || root.dataset.theme === "dark";
  };

  const targets = () => [
    ...document.querySelectorAll(
      "body.home-page details.home-section-accordion, " +
      "body.medicine-page details.sector-card-accordion, " +
      "body.spa-page details.sector-card-accordion, " +
      "body.thalasso-page details.sector-card-accordion, " +
      "body.institutes-page details.sector-card-accordion, " +
      "body.pme-page details.sector-card-accordion"
    )
  ];

  const sync = () => {
    const forceOpen = desktop.matches && isDark();

    targets().forEach((details) => {
      if (forceOpen) {
        if (!details.open) {
          details.dataset.nightDesktopForcedOpen = "true";
          details.open = true;
        }
      } else if (details.dataset.nightDesktopForcedOpen === "true") {
        details.open = false;
        delete details.dataset.nightDesktopForcedOpen;
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync, { once: true });
  } else {
    sync();
  }

  desktop.addEventListener?.("change", sync);

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
