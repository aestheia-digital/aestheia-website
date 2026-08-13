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
