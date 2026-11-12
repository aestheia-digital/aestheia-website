(function () {
  "use strict";

  const root = document.documentElement;
  const storageKey = "aestheia-theme";
  let requestedTheme = new URLSearchParams(window.location.search).get("theme");
  let forcedTheme = null;
  let toggle = null;
  let clockTimer = null;

  try {
    const savedTheme = sessionStorage.getItem(storageKey);
    if (savedTheme === "light" || savedTheme === "dark") forcedTheme = savedTheme;
  } catch (_) {
    // Le paramètre reste utilisable lorsque le stockage est indisponible.
  }

  if (requestedTheme === "light" || requestedTheme === "dark" || requestedTheme === "auto") {
    if (!forcedTheme && requestedTheme !== "auto") forcedTheme = requestedTheme;
  }

  function lastSunday(year, monthIndex) {
    const date = new Date(Date.UTC(year, monthIndex + 1, 0));
    return date.getUTCDate() - date.getUTCDay();
  }

  function parisClock() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris", year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date());
    const v = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return { year: +v.year, month: +v.month, day: +v.day, hour: +v.hour };
  }

  function applyTheme() {
    const now = parisClock();
    const summer = (now.month > 3 && now.month < 10) ||
      (now.month === 3 && now.day >= lastSunday(now.year, 2)) ||
      (now.month === 10 && now.day < lastSunday(now.year, 9));
    const nightStarts = summer ? 19 : 17;
    const theme = forcedTheme || (now.hour >= 7 && now.hour < nightStarts ? "light" : "dark");
    root.classList.toggle("theme-light", theme === "light");
    root.classList.toggle("theme-dark", theme === "dark");
    root.dataset.theme = theme;
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(theme === "dark"));
      toggle.setAttribute("aria-label", theme === "light" ? "Passer en mode nuit" : "Passer en mode jour");
    }
    clearTimeout(clockTimer);
    if (!forcedTheme) clockTimer = setTimeout(applyTheme, 60 * 1000);
  }

  applyTheme();
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) applyTheme();
  });

  document.addEventListener("DOMContentLoaded", function () {
    const shell = document.querySelector(".nav-shell");
    const nav = shell && shell.querySelector(".main-nav");
    if (!nav) return;

    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "theme-toggle";
    // Lucide 0.468.0, licence ISC : moon et sun.
    toggle.innerHTML = '<svg class="theme-toggle-moon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6.25 6.25 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg><svg class="theme-toggle-sun" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>';
    nav.after(toggle);
    toggle.addEventListener("click", function () {
      forcedTheme = root.dataset.theme === "light" ? "dark" : "light";
      try { sessionStorage.setItem(storageKey, forcedTheme); } catch (_) {}
      if (["light", "dark", "auto"].includes(requestedTheme)) {
        const url = new URL(window.location.href);
        url.searchParams.set("theme", forcedTheme);
        history.replaceState(null, "", url);
        requestedTheme = forcedTheme;
      }
      applyTheme();
    });
    applyTheme();
  });
})();
