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
