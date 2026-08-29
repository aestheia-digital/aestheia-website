(function () {
  "use strict";

  const CONSENT_POLICY_VERSION = "2026-08-17";
  const CONSENT_DURATION_DAYS = 183;
  const CONSENT_STORAGE_KEY = "aestheia_consent";
  const GA_MEASUREMENT_ID = "G-66HBEWJ4CB";
  const CONSENT_CATEGORIES = Object.freeze(["analytics", "externalContent"]);
  const COOKIE_POLICY_URL = "/gestion-cookies.html";

  /*
   * Correctif UI global de la branche de prévisualisation.
   * - Les catégories de la page Ressources reprennent exactement le gradient IA des CTA.
   * - Les encarts volontairement clairs en dark mode sont nettement assombris.
   * - Le bandeau de navigation est légèrement éclairci et uniformisé.
   * - Les hero Accueil, Ressources et Contact utilisent le même bleu nuit plus sombre
   *   pour renforcer la présence visuelle du cube.
   * Ces ajustements s'appliquent sur desktop, tablette et mobile sans modifier la structure.
   */
  const uiVisualOverrides = document.createElement("style");
  uiVisualOverrides.id = "aestheia-ui-visual-overrides";
  uiVisualOverrides.textContent = `
    .resource-category {
      color: #fff !important;
      border-color: transparent !important;
      background: var(--gradient-ia, linear-gradient(135deg, #540ce4 0%, #00b0ff 100%)) !important;
      box-shadow: 0 8px 20px rgba(0, 176, 255, 0.12);
    }

    @media (prefers-color-scheme: dark) {
      .medicine-card-benefit,
      .institutes-card-benefit,
      .institutes-reality-conclusion,
      .institutes-editorial-benefit,
      .institutes-method-conclusion,
      .sector-editorial-benefit,
      .sector-reality-conclusion,
      .sector-method-conclusion {
        background: #a9bfdc !important;
        color: #14244a !important;
        border-color: rgba(49, 96, 160, 0.56) !important;
      }

      .medicine-card-benefit strong,
      .institutes-card-benefit strong,
      .institutes-reality-conclusion strong,
      .institutes-editorial-benefit strong,
      .institutes-method-conclusion strong,
      .sector-editorial-benefit strong,
      .sector-reality-conclusion strong,
      .sector-method-conclusion strong {
        color: #14244a !important;
      }

      .site-header {
        background: rgba(16, 24, 57, 0.98) !important;
        border-bottom-color: rgba(92, 111, 174, 0.38) !important;
      }

      .home-hero,
      .resources-hero,
      .contact-cube-hero {
        background:
          radial-gradient(circle at 86% 22%, rgba(84, 12, 228, 0.10), transparent 34%),
          radial-gradient(circle at 12% 88%, rgba(0, 176, 255, 0.08), transparent 38%),
          linear-gradient(135deg, #080d22 0%, #0a1028 58%, #131b40 100%) !important;
      }

      .home-hero::after,
      .resources-hero::after,
      .contact-cube-hero::after {
        background:
          linear-gradient(90deg, rgba(7, 12, 30, 0.94), rgba(10, 16, 40, 0.80), rgba(16, 24, 58, 0.50)),
          linear-gradient(0deg, rgba(6, 10, 25, 0.62), rgba(6, 10, 25, 0.16)) !important;
      }
    }

    html.theme-dark .medicine-card-benefit,
    html.theme-dark .institutes-card-benefit,
    html.theme-dark .institutes-reality-conclusion,
    html.theme-dark .institutes-editorial-benefit,
    html.theme-dark .institutes-method-conclusion,
    html.theme-dark .sector-editorial-benefit,
    html.theme-dark .sector-reality-conclusion,
    html.theme-dark .sector-method-conclusion {
      background: #a9bfdc !important;
      color: #14244a !important;
      border-color: rgba(49, 96, 160, 0.56) !important;
    }

    html.theme-dark .medicine-card-benefit strong,
    html.theme-dark .institutes-card-benefit strong,
    html.theme-dark .institutes-reality-conclusion strong,
    html.theme-dark .institutes-editorial-benefit strong,
    html.theme-dark .institutes-method-conclusion strong,
    html.theme-dark .sector-editorial-benefit strong,
    html.theme-dark .sector-reality-conclusion strong,
    html.theme-dark .sector-method-conclusion strong {
      color: #14244a !important;
    }

    html.theme-dark .site-header {
      background: rgba(16, 24, 57, 0.98) !important;
      border-bottom-color: rgba(92, 111, 174, 0.38) !important;
    }

    html.theme-dark .home-hero,
    html.theme-dark .resources-hero,
    html.theme-dark .contact-cube-hero {
      background:
        radial-gradient(circle at 86% 22%, rgba(84, 12, 228, 0.10), transparent 34%),
        radial-gradient(circle at 12% 88%, rgba(0, 176, 255, 0.08), transparent 38%),
        linear-gradient(135deg, #080d22 0%, #0a1028 58%, #131b40 100%) !important;
    }

    html.theme-dark .home-hero::after,
    html.theme-dark .resources-hero::after,
    html.theme-dark .contact-cube-hero::after {
      background:
        linear-gradient(90deg, rgba(7, 12, 30, 0.94), rgba(10, 16, 40, 0.80), rgba(16, 24, 58, 0.50)),
        linear-gradient(0deg, rgba(6, 10, 25, 0.62), rgba(6, 10, 25, 0.16)) !important;
    }

    @media (min-width: 1051px) {
      @media (prefers-color-scheme: dark) {
        .site-header .main-nav {
          background: transparent !important;
        }
      }

      html.theme-dark .site-header .main-nav {
        background: transparent !important;
      }
    }
  `;
  document.head.appendChild(uiVisualOverrides);

  let preferences = { analytics: false, externalContent: false };
  let lastFocusedElement = null;

  const consentMarkup = `
    <section class="consent-banner" data-consent-banner role="region" aria-label="Choix relatifs aux cookies" hidden>
      <div class="consent-banner__content">
        <div>
          <h2>Vos choix en matière de cookies</h2>
          <p>AesthéIA utilise des cookies de mesure d’audience pour comprendre la fréquentation du site et améliorer ses contenus. Certains contenus externes, comme Google Maps, peuvent également déposer des traceurs. Vous pouvez accepter, refuser ou personnaliser vos choix.</p>
          <a href="${COOKIE_POLICY_URL}">Consulter la gestion des cookies</a>
        </div>
        <div class="consent-actions" aria-label="Actions de consentement">
          <button class="consent-button consent-button--primary" type="button" data-consent-accept>Tout accepter</button>
          <button class="consent-button consent-button--primary" type="button" data-consent-refuse>Tout refuser</button>
          <button class="consent-button" type="button" data-consent-customize>Personnaliser</button>
        </div>
      </div>
    </section>
    <div class="consent-dialog-backdrop" data-consent-dialog-backdrop hidden>
      <section class="consent-dialog" data-consent-dialog role="dialog" aria-modal="true" aria-labelledby="consent-dialog-title" tabindex="-1">
        <div class="consent-dialog__header">
          <h2 id="consent-dialog-title">Personnaliser mes choix</h2>
          <button class="consent-dialog__close" type="button" data-consent-close aria-label="Fermer le panneau de personnalisation">×</button>
        </div>
        <p>Choisissez librement les services facultatifs. Vous pourrez modifier ces choix à tout moment.</p>
        <div class="consent-category">
          <div><strong>Cookies strictement nécessaires</strong><p>Ils mémorisent vos choix et assurent le fonctionnement du site.</p></div>
          <input type="checkbox" checked disabled aria-label="Cookies strictement nécessaires, toujours activés">
        </div>
        <label class="consent-category">
          <span><strong>Mesure d’audience – Google Analytics</strong><span>Permet de comprendre la fréquentation du site.</span></span>
          <input type="checkbox" data-consent-analytics>
        </label>
        <label class="consent-category">
          <span><strong>Contenus externes – Google Maps</strong><span>Autorise l’affichage de la carte intégrée.</span></span>
          <input type="checkbox" data-consent-external>
        </label>
        <div class="consent-actions">
          <button class="consent-button consent-button--primary" type="button" data-consent-save>Enregistrer mes choix</button>
        </div>
      </section>
    </div>`;

  function readStoredConsent() {
    try {
      const value = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY));
      const chosenAt = value && Date.parse(value.chosenAt);
      const expiresAt = chosenAt + CONSENT_DURATION_DAYS * 86400000;
      if (!value || value.version !== CONSENT_POLICY_VERSION || !chosenAt || Date.now() >= expiresAt) return null;
      return {
        analytics: value.analytics === true,
        externalContent: value.externalContent === true,
      };
    } catch (_) {
      return null;
    }
  }

  function storeConsent(nextPreferences) {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      version: CONSENT_POLICY_VERSION,
      chosenAt: new Date().toISOString(),
      analytics: nextPreferences.analytics,
      externalContent: nextPreferences.externalContent,
    }));
  }

  function deleteAnalyticsCookies() {
    document.cookie.split(";").forEach((entry) => {
      const name = entry.split("=")[0].trim();
      if (name === "_ga" || name.startsWith("_ga_") || name === "_gid" || name === "_gat") {
        ["", ".aestheia.fr", "aestheia.fr"].forEach((domain) => {
          document.cookie = `${name}=; Max-Age=0; path=/;${domain ? ` domain=${domain};` : ""} SameSite=Lax`;
        });
      }
    });
  }

  function disableAnalytics() {
    window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
    document.querySelectorAll("script[data-aestheia-ga]").forEach((script) => script.remove());
    deleteAnalyticsCookies();
  }

  function enableAnalytics() {
    window[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    if (!document.querySelector("script[data-aestheia-ga]")) {
      const script = document.createElement("script");
      script.async = true;
      script.dataset.aestheiaGa = "true";
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);
    }
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_location: `${location.origin}${location.pathname}`,
      page_referrer: document.referrer ? new URL(document.referrer).origin + new URL(document.referrer).pathname : "",
    });
  }

  function updateMaps() {
    document.querySelectorAll("[data-consent-map]").forEach((map) => {
      const iframe = map.querySelector("iframe[data-map-src]");
      const placeholder = map.querySelector("[data-map-placeholder]");
      if (preferences.externalContent) {
        if (!iframe) {
          const newIframe = document.createElement("iframe");
          newIframe.title = map.dataset.mapTitle;
          newIframe.dataset.mapSrc = map.dataset.mapSrc;
          newIframe.src = map.dataset.mapSrc;
          newIframe.loading = "lazy";
          newIframe.referrerPolicy = "no-referrer-when-downgrade";
          newIframe.allowFullscreen = true;
          map.prepend(newIframe);
        }
        if (placeholder) placeholder.hidden = true;
      } else {
        if (iframe) iframe.remove();
        if (placeholder) placeholder.hidden = false;
      }
    });
  }

  function applyPreferences() {
    preferences.analytics ? enableAnalytics() : disableAnalytics();
    updateMaps();
    document.dispatchEvent(new CustomEvent("aestheia:consentchange", { detail: { ...preferences } }));
  }

  function closePreferences() {
    document.querySelector("[data-consent-dialog-backdrop]").hidden = true;
    document.body.classList.remove("consent-dialog-open");
    lastFocusedElement?.focus();
  }

  function openPreferences(options) {
    lastFocusedElement = document.activeElement;
    const analytics = document.querySelector("[data-consent-analytics]");
    const external = document.querySelector("[data-consent-external]");
    analytics.checked = preferences.analytics;
    external.checked = options && options.suggestExternal ? true : preferences.externalContent;
    document.querySelector("[data-consent-dialog-backdrop]").hidden = false;
    document.body.classList.add("consent-dialog-open");
    document.querySelector("[data-consent-dialog]").focus();
  }

  function choose(nextPreferences) {
    preferences = nextPreferences;
    storeConsent(preferences);
    document.querySelector("[data-consent-banner]").hidden = true;
    closePreferences();
    applyPreferences();
  }

  function trapDialogFocus(event) {
    const dialog = document.querySelector("[data-consent-dialog]");
    if (event.key === "Escape") return closePreferences();
    if (event.key !== "Tab") return;
    const focusable = [...dialog.querySelectorAll("button, input:not([disabled]), a[href]")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  document.body.insertAdjacentHTML("beforeend", consentMarkup);
  const storedConsent = readStoredConsent();
  if (storedConsent) preferences = storedConsent;
  document.querySelector("[data-consent-banner]").hidden = Boolean(storedConsent);
  applyPreferences();

  document.querySelector("[data-consent-accept]").addEventListener("click", () => choose({ analytics: true, externalContent: true }));
  document.querySelector("[data-consent-refuse]").addEventListener("click", () => choose({ analytics: false, externalContent: false }));
  document.querySelector("[data-consent-customize]").addEventListener("click", () => openPreferences());
  document.querySelector("[data-consent-save]").addEventListener("click", () => choose({
    analytics: document.querySelector("[data-consent-analytics]").checked,
    externalContent: document.querySelector("[data-consent-external]").checked,
  }));
  document.querySelector("[data-consent-close]").addEventListener("click", closePreferences);
  document.querySelector("[data-consent-dialog]").addEventListener("keydown", trapDialogFocus);
  document.querySelector("[data-consent-dialog-backdrop]").addEventListener("click", (event) => {
    if (event.target.matches("[data-consent-dialog-backdrop]")) closePreferences();
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-manage-cookies]")) { event.preventDefault(); openPreferences(); }
    if (event.target.closest("[data-enable-map]")) { event.preventDefault(); openPreferences({ suggestExternal: true }); }
  });

  window.AestheiaConsent = Object.freeze({ openPreferences, categories: CONSENT_CATEGORIES });
})();