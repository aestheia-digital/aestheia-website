const siteThemeMedia = window.matchMedia("(prefers-color-scheme: dark)");
const siteThemeRoot = document.documentElement;

const applyAutomaticSiteTheme = () => {
  const currentHour = new Date().getHours();
  const isNightTime = currentHour >= 19 || currentHour < 7;
  const shouldUseDarkTheme = siteThemeMedia.matches || isNightTime;

  siteThemeRoot.classList.toggle("theme-dark", shouldUseDarkTheme);
  siteThemeRoot.dataset.theme = shouldUseDarkTheme ? "dark" : "light";
};

applyAutomaticSiteTheme();
siteThemeMedia.addEventListener?.("change", applyAutomaticSiteTheme);
window.setInterval(applyAutomaticSiteTheme, 60000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    applyAutomaticSiteTheme();
  }
});

const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".main-nav");
const navDropdown = document.querySelector(".nav-dropdown");
const navDropdownToggle = document.querySelector(".nav-dropdown-toggle");

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  if (navDropdown && navDropdownToggle) {
    navDropdownToggle.addEventListener("click", () => {
      const isOpen = navDropdown.classList.toggle("is-open");
      navDropdownToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  nav.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;

    if (link) {
      const href = link.getAttribute("href");
      const isDropdownLink = Boolean(link.closest(".nav-dropdown-menu"));

      document.body.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
      navDropdown?.classList.remove("is-open");
      navDropdownToggle?.setAttribute("aria-expanded", "false");

      if (isDropdownLink && href) {
        event.preventDefault();
        window.location.href = href;
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.body.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
      navDropdown?.classList.remove("is-open");
      navDropdownToggle?.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("click", (event) => {
    if (navDropdown && !navDropdown.contains(event.target)) {
      navDropdown.classList.remove("is-open");
      navDropdownToggle?.setAttribute("aria-expanded", "false");
    }
  });
}

const heroCubeBackdropMarkup = `
  <div class="hero-tech-backdrop" aria-hidden="true">
    <span class="hero-tech-plane hero-tech-plane-far"></span>
    <span class="hero-tech-plane hero-tech-plane-mid"></span>
    <span class="hero-tech-plane hero-tech-plane-near"></span>
  </div>
`;

const heroCubeStageMarkup = `
  <div class="hero-cube-stage" aria-hidden="true">
    <div class="hero-cube-effects">
      <span class="hero-cube-beam hero-cube-beam-one"></span>
      <span class="hero-cube-beam hero-cube-beam-two"></span>
      <span class="hero-cube-beam hero-cube-beam-three"></span>
    </div>
    <div class="hero-cube-tilt">
      <div class="hero-cube">
        <div class="hero-cube-face hero-cube-face-front">
          <span class="hero-cube-brand">Aesthé<span>IA</span></span>
        </div>
        <div class="hero-cube-face hero-cube-face-back">
          <span class="hero-cube-brand">Aesthé<span>IA</span></span>
        </div>
        <div class="hero-cube-face hero-cube-face-right">
          <span class="hero-cube-brand">Aesthé<span>IA</span></span>
        </div>
        <div class="hero-cube-face hero-cube-face-left">
          <span class="hero-cube-monogram">IA</span>
        </div>
        <div class="hero-cube-face hero-cube-face-top">
          <span class="hero-cube-monogram">IA</span>
        </div>
        <div class="hero-cube-face hero-cube-face-bottom">
          <span class="hero-cube-monogram">IA</span>
        </div>
      </div>
    </div>
  </div>
`;

const cubeHeroes = document.querySelectorAll(".hero-cube-hero");

cubeHeroes.forEach((cubeHero) => {
  const heroInner = cubeHero.querySelector(".hero-inner");

  if (!cubeHero.querySelector(".hero-tech-backdrop")) {
    cubeHero.insertAdjacentHTML("afterbegin", heroCubeBackdropMarkup);
  }

  if (heroInner && !heroInner.querySelector(".hero-cube-stage")) {
    heroInner.insertAdjacentHTML("beforeend", heroCubeStageMarkup);
  }
});

cubeHeroes.forEach((cubeHero) => {
  const cubeStage = cubeHero.querySelector(".hero-cube-stage");
  const cubeTilt = cubeHero.querySelector(".hero-cube-tilt");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  if (cubeStage && cubeTilt) {
    const interactionController = new AbortController();
    let animationFrame = 0;

    const resetCubeTilt = () => {
      window.cancelAnimationFrame(animationFrame);
      cubeStage.style.removeProperty("--cube-tilt-x");
      cubeStage.style.removeProperty("--cube-tilt-y");
    };

    const handleCubePointerMove = (event) => {
      if (reducedMotion.matches || !finePointer.matches || cubeStage.offsetWidth === 0) {
        resetCubeTilt();
        return;
      }

      const cubeBounds = cubeStage.getBoundingClientRect();
      const interactionPadding = 36;
      const isNearCube =
        event.clientX >= cubeBounds.left - interactionPadding &&
        event.clientX <= cubeBounds.right + interactionPadding &&
        event.clientY >= cubeBounds.top - interactionPadding &&
        event.clientY <= cubeBounds.bottom + interactionPadding;

      if (!isNearCube) {
        resetCubeTilt();
        return;
      }

      const horizontalPosition = (event.clientX - cubeBounds.left) / cubeBounds.width - 0.5;
      const verticalPosition = (event.clientY - cubeBounds.top) / cubeBounds.height - 0.5;
      const tiltX = Math.max(-5, Math.min(5, verticalPosition * -10));
      const tiltY = Math.max(-6, Math.min(6, horizontalPosition * 12));

      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        cubeStage.style.setProperty("--cube-tilt-x", `${tiltX.toFixed(2)}deg`);
        cubeStage.style.setProperty("--cube-tilt-y", `${tiltY.toFixed(2)}deg`);
      });
    };

    cubeHero.addEventListener("pointermove", handleCubePointerMove, {
      passive: true,
      signal: interactionController.signal,
    });
    cubeHero.addEventListener("pointerleave", resetCubeTilt, {
      signal: interactionController.signal,
    });
    window.addEventListener(
      "pagehide",
      () => {
        resetCubeTilt();
        interactionController.abort();
      },
      {
        once: true,
        signal: interactionController.signal,
      }
    );
  }
});

const homeHero = document.querySelector(".home-hero");

if (homeHero) {
  const heroLead = homeHero.querySelector(".hero-content > p");
  if (heroLead) {
    heroLead.textContent = "AesthéIA conçoit des automatisations, des assistants IA et des systèmes digitaux sur mesure pour simplifier votre organisation, mieux suivre vos prospects et renforcer votre visibilité digitale sur Google et les moteurs de réponse utilisant l’IA.";
  }
}

if (
  homeHero &&
  "IntersectionObserver" in window &&
  window.matchMedia("(prefers-reduced-motion: no-preference)").matches
) {
  const revealItems = document.querySelectorAll(".home-hero .hero-content, main > .section > .container");
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealItems.forEach((item) => {
    item.classList.add("reveal-on-scroll");
    revealObserver.observe(item);
  });
}

// Clarification commerciale validée — modifications ciblées uniquement.
const commercialPages = [
  "/",
  "/index.html",
  "/medecine-esthetique/",
  "/medecine-esthetique/index.html",
  "/spa-hotelier/",
  "/spa-hotelier/index.html",
  "/thalasso-thermal/",
  "/thalasso-thermal/index.html",
  "/instituts-independantes/",
  "/instituts-independantes/index.html",
  "/automatisation-pme/",
  "/automatisation-pme/index.html",
];

const currentPath = window.location.pathname;
const isCommercialPage = commercialPages.some((path) => currentPath === path || currentPath.endsWith(path));

if (isCommercialPage) {
  document.querySelectorAll(".hero .hero-actions .btn").forEach((button) => {
    const label = button.textContent.trim();
    if (label.startsWith("Discutons") || label.startsWith("Parlons")) {
      button.classList.remove("btn-ghost", "btn-secondary");
      button.classList.add("btn-primary");
    }
  });

  const brandLink = document.querySelector(".site-header .brand-link");
  if (brandLink && !document.querySelector(".site-header .header-phone-direct")) {
    const headerPhone = document.createElement("a");
    headerPhone.className = "header-phone-direct";
    headerPhone.href = "tel:+33642789057";
    headerPhone.setAttribute("aria-label", "Appeler AesthéIA au 06 42 78 90 57");
    headerPhone.textContent = "06 42 78 90 57";
    brandLink.insertAdjacentElement("afterend", headerPhone);
  }
}

if (!document.getElementById("commercial-alignment-rules")) {
  const commercialStyles = document.createElement("style");
  commercialStyles.id = "commercial-alignment-rules";
  commercialStyles.textContent = `
    .site-header .header-phone-direct {
      margin-right: auto;
      color: var(--color-primary);
      font-family: var(--font-display);
      font-size: 1.02rem;
      font-weight: 400;
      line-height: 1;
      white-space: nowrap;
    }

    .site-header .header-phone-direct:hover {
      color: var(--color-accent);
    }

    .site-header .brand-ia {
      color: #1fa4dd;
      background: linear-gradient(135deg, #3923b8 0%, #435bd8 50%, #1fa4dd 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .home-offers .commercial-offer-proposal {
      margin-bottom: 0.65rem !important;
    }

    @media (min-width: 960px) {
      .home-offers .offer-grid {
        align-items: stretch;
      }

      .home-offers .offer-card {
        display: flex;
        height: 100%;
        flex-direction: column;
      }

      .home-offers .offer-result {
        margin-top: auto;
      }
    }

    @media (max-width: 520px) {
      .site-header .header-phone-direct {
        display: inline-flex;
        align-items: center;
        gap: 0.38rem;
        padding: 0.4rem 0.56rem;
        border: 1px solid rgba(94, 23, 235, 0.16);
        border-radius: 999px;
        color: #5e17eb;
        background: rgba(94, 23, 235, 0.055);
        box-shadow: 0 5px 14px rgba(41, 31, 94, 0.08);
        font-family: var(--font-structure);
        font-size: 0.84rem;
        font-weight: 600;
        letter-spacing: 0.01em;
        transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      }

      .site-header .header-phone-direct::before {
        content: "";
        width: 0.76rem;
        height: 0.76rem;
        flex: 0 0 0.76rem;
        background: currentColor;
        -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.7 21 3 13.3 3 3.7c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1l-2.2 2.2z'/%3E%3C/svg%3E") center / contain no-repeat;
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.7 21 3 13.3 3 3.7c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1l-2.2 2.2z'/%3E%3C/svg%3E") center / contain no-repeat;
      }

      .site-header .header-phone-direct:hover,
      .site-header .header-phone-direct:focus-visible {
        color: #5e17eb;
        background: rgba(94, 23, 235, 0.09);
        box-shadow: 0 0 0 4px rgba(94, 23, 235, 0.08), 0 7px 18px rgba(41, 31, 94, 0.1);
        transform: translateY(-1px);
      }
    }

    @media (max-width: 380px) {
      .site-header .header-phone-direct {
        gap: 0.28rem;
        padding-inline: 0.42rem;
        font-size: 0.78rem;
      }
    }
  `;
  document.head.appendChild(commercialStyles);
}

const homeProblems = document.querySelector(".home-problems");

if (homeProblems) {
  const heading = homeProblems.querySelector("h2");
  const intro = homeProblems.querySelector(".section-intro");
  const problemCards = Array.from(homeProblems.querySelectorAll(".problem-card"));
  const problemIcons = [
    "assets/icons/acquisition-target.svg",
    "assets/icons/content-spark.svg",
    "assets/icons/systems-cog.svg",
    "assets/icons/seo-search.svg",
  ];

  if (heading) {
    heading.textContent = "Votre organisation vous fait-elle perdre du temps et rend-elle votre visibilité digitale difficile à maintenir ?";
  }

  if (intro) {
    intro.textContent = "De nombreuses entreprises cumulent tâches répétitives, informations dispersées, suivis irréguliers et présence digitale difficile à maintenir. Les demandes se perdent, les contenus sont préparés dans l’urgence et le site, Google ou les moteurs de réponse utilisant l’IA ne reflètent pas toujours clairement l’activité.";
  }

  problemCards.forEach((card, index) => {
    const title = card.querySelector("h3");
    const text = card.querySelector("p");

    if (index === 3) {
      if (title) {
        title.textContent = "Visibilité digitale";
      }
      if (text) {
        text.textContent = "Mettre à jour le site, la fiche Google et les contenus sans toujours savoir si l’entreprise est réellement visible et comprise par les prospects, Google et les moteurs de réponse utilisant l’IA.";
      }
    }

    if (title && problemIcons[index] && !title.querySelector("img")) {
      const label = title.textContent.trim();
      title.classList.add("title-with-icon", "card-title-with-icon");
      title.innerHTML = `<img class="title-pictogram card-title-pictogram" src="${problemIcons[index]}" alt="" aria-hidden="true"><span>${label}</span>`;
    }
  });
}

const homeOffers = document.querySelector(".home-offers");

if (homeOffers) {
  const sectionTitle = homeOffers.querySelector("h2");
  if (sectionTitle && !homeOffers.querySelector(".commercial-domain-intro")) {
    const intro = document.createElement("p");
    intro.className = "section-intro commercial-domain-intro";
    intro.textContent = "Ces quatre domaines d’intervention ne sont pas des offres fermées. Selon votre situation, AesthéIA peut intervenir par un audit, la mise en place d’une première solution ciblée ou une mission plus complète.";
    sectionTitle.insertAdjacentElement("afterend", intro);
  }

  const proposalTexts = [
    "Audit Automatisation & IA, mise en place d’une première solution ou mise en œuvre plus complète selon les processus à améliorer.",
    "Audit Visibilité & Acquisition, optimisation du parcours de demande ou mise en œuvre plus complète selon les points de friction identifiés.",
    "Audit Visibilité & Acquisition, structuration des contenus ou mission éditoriale assistée par IA selon les besoins.",
    "Audit Visibilité & Acquisition, optimisation de la présence locale et digitale ou mission SEO/GEO selon les priorités identifiées.",
  ];

  homeOffers.querySelectorAll(".offer-card").forEach((card, index) => {
    if (!card.querySelector(".commercial-offer-proposal") && proposalTexts[index]) {
      const result = card.querySelector(".offer-result");
      const proposal = document.createElement("p");
      proposal.className = "commercial-offer-proposal";
      proposal.innerHTML = `<strong>Ce que nous vous proposons :</strong> ${proposalTexts[index]}`;
      result?.insertAdjacentElement("beforebegin", proposal);
    }

    const benefitLabel = card.querySelector(".offer-result strong");
    if (benefitLabel) {
      benefitLabel.textContent = "Bénéfice :";
    }
  });

  const alignHomeOfferRows = () => {
    const cards = Array.from(homeOffers.querySelectorAll(".offer-card"));
    const titles = cards.map((card) => card.querySelector("h3")).filter(Boolean);
    const descriptions = cards
      .map((card) => Array.from(card.children).find((child) => child.tagName === "P" && !child.classList.contains("commercial-offer-proposal") && !child.classList.contains("offer-result")))
      .filter(Boolean);

    [...titles, ...descriptions].forEach((element) => {
      element.style.removeProperty("min-height");
    });

    if (!window.matchMedia("(min-width: 960px)").matches) {
      return;
    }

    const setSharedMinHeight = (elements) => {
      const maxHeight = Math.max(...elements.map((element) => element.getBoundingClientRect().height));
      elements.forEach((element) => {
        element.style.minHeight = `${Math.ceil(maxHeight)}px`;
      });
    };

    if (titles.length) {
      setSharedMinHeight(titles);
    }
    if (descriptions.length) {
      setSharedMinHeight(descriptions);
    }
  };

  window.requestAnimationFrame(alignHomeOfferRows);
  window.addEventListener("resize", alignHomeOfferRows, { passive: true });
}

const homeEngagements = document.querySelector(".home-engagements");

if (homeEngagements) {
  const eyebrow = homeEngagements.querySelector(".eyebrow");
  if (eyebrow) {
    eyebrow.textContent = "Les formats de mission";
  }

  const headingText = homeEngagements.querySelector("h2 span");
  if (headingText) {
    headingText.textContent = "Choisir le bon format selon vos priorités.";
  }

  const cards = homeEngagements.querySelectorAll(".engagement-card");
  const firstCard = cards[0];
  if (firstCard) {
    const title = firstCard.querySelector("h3 span");
    const body = firstCard.querySelector("p:not(.deliverable)");
    const deliverable = firstCard.querySelector(".deliverable");
    if (title) {
      title.textContent = "Audits stratégiques";
    }
    if (body) {
      body.innerHTML = "<strong>Audit Visibilité &amp; Acquisition :</strong> site, Google, contenus, visibilité locale et parcours de contact.<br><strong>Audit Automatisation &amp; IA :</strong> tâches répétitives, demandes, suivi et processus à simplifier.";
    }
    if (deliverable) {
      deliverable.innerHTML = "<strong>Livrable :</strong> priorités et plan d’action.";
    }
  }

  const completeCard = cards[2];
  if (completeCard) {
    const title = completeCard.querySelector("h3 span");
    const deliverable = completeCard.querySelector(".deliverable");
    if (title) {
      title.textContent = "Mise en œuvre complète";
    }
    if (deliverable) {
      deliverable.innerHTML = "<strong>Livrable :</strong> stratégie, mise en place, automatisations, coordination et documentation.";
    }
  }
}

const firstHomeStep = document.querySelector(".home-method .process-step:first-child");
if (firstHomeStep) {
  const title = firstHomeStep.querySelector("h3");
  const text = firstHomeStep.querySelector("p");
  if (title) {
    title.textContent = "Commencer par l’audit adapté";
  }
  if (text) {
    text.innerHTML = "Selon le besoin, démarrer par un <strong>Audit Visibilité & Acquisition</strong> ou un <strong>Audit Automatisation & IA</strong> afin d’identifier les freins, les priorités et les premières actions utiles.";
  }
}

const homeFaq = document.querySelector(".home-safety ~ .section-warm + .faq-section") || document.querySelector("body > main .faq-section");
if (homeOffers && homeFaq) {
  homeFaq.querySelectorAll("details").forEach((item) => {
    const summary = item.querySelector("summary h3, summary");
    const answer = item.querySelector(".faq-answer p");
    if (!summary || !answer) {
      return;
    }

    if (summary.textContent.includes("Combien coûte un accompagnement")) {
      summary.textContent = "Combien coûte une mission avec AesthéIA ?";
      answer.textContent = answer.textContent
        .replace("Un diagnostic ciblé", "Un audit ciblé")
        .replace("les accompagnements plus complets", "les missions plus complètes");
    }

    if (summary.textContent.includes("Combien de temps faut-il pour voir des résultats")) {
      answer.textContent = answer.textContent
        .replace("Un diagnostic initial", "Un audit initial")
        .replace("Les accompagnements plus complets", "Les missions plus complètes");
    }
  });

  homeFaq.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    script.textContent = script.textContent
      .replace("Combien coûte un accompagnement avec AesthéIA ?", "Combien coûte une mission avec AesthéIA ?")
      .replace(/Un diagnostic ciblé/g, "Un audit ciblé")
      .replace(/les accompagnements plus complets/g, "les missions plus complètes")
      .replace(/Un diagnostic initial/g, "Un audit initial")
      .replace(/Les accompagnements plus complets/g, "Les missions plus complètes");
  });
}

const sectorAuditCopy = {
  "/medecine-esthetique/": "La mission peut démarrer par un Audit Visibilité & Acquisition pour examiner la présence digitale et le parcours de prise de contact, ou par un Audit Automatisation & IA pour identifier les tâches non médicales et les processus à simplifier.",
  "/spa-hotelier/": "La mission peut démarrer par un Audit Visibilité & Acquisition pour examiner la visibilité, les contenus et le parcours de réservation, ou par un Audit Automatisation & IA pour identifier les demandes, le suivi client et la coordination à simplifier.",
  "/thalasso-thermal/": "La mission peut démarrer par un Audit Visibilité & Acquisition pour examiner la visibilité, les contenus et les demandes de séjour, ou par un Audit Automatisation & IA pour identifier les devis, le suivi, la coordination et la planification à simplifier.",
  "/instituts-independantes/": "La mission peut démarrer par un Audit Visibilité & Acquisition pour examiner la visibilité locale, le site, les contenus et le parcours de réservation, ou par un Audit Automatisation & IA pour identifier les tâches administratives, les relances, les rappels et le suivi à simplifier.",
  "/automatisation-pme/": "La mission peut démarrer par un Audit Automatisation & IA pour identifier les tâches, les demandes, les relances et les processus à simplifier, ou par un Audit Visibilité & Acquisition lorsque le principal frein concerne la présence en ligne, les contenus et la conversion.",
};

const sectorPath = Object.keys(sectorAuditCopy).find((path) => currentPath === path || currentPath === `${path}index.html`);
if (sectorPath) {
  const methodContainer = document.querySelector(".sector-method-section .container, .institutes-method-section .container");
  const methodHeading = methodContainer?.querySelector("h2");

  if (methodContainer && methodHeading && !methodContainer.querySelector(".sector-audit-intro")) {
    const auditIntro = document.createElement("p");
    auditIntro.className = "sector-audit-intro";
    auditIntro.innerHTML = sectorAuditCopy[sectorPath]
      .replace("Audit Visibilité & Acquisition", "<strong>Audit Visibilité &amp; Acquisition</strong>")
      .replace("Audit Automatisation & IA", "<strong>Audit Automatisation &amp; IA</strong>");
    methodHeading.insertAdjacentElement("afterend", auditIntro);
  }
}
