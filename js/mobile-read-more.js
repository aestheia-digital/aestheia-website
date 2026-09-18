const mobileReadMoreMedia = window.matchMedia("(max-width: 720px)");
const mobileReadMoreBlocks = Array.from(document.querySelectorAll(".editorial-mobile-readmore"));

const configureMobileReadMore = () => {
  mobileReadMoreBlocks.forEach((block) => {
    const summary = block.querySelector(":scope > summary");
    let button = block.querySelector(":scope > .mobile-readmore-toggle");

    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "mobile-readmore-toggle";
      button.textContent = "Lire la suite";
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", () => {
        const expanded = block.classList.toggle("is-expanded");
        button.textContent = expanded ? "Réduire" : "Lire la suite";
        button.setAttribute("aria-expanded", String(expanded));
      });
      block.appendChild(button);
    }

    if (summary && !summary.dataset.mobileReadMoreBound) {
      summary.dataset.mobileReadMoreBound = "true";
      summary.addEventListener("click", (event) => {
        if (block.classList.contains("mobile-readmore-active")) {
          event.preventDefault();
        }
      });
    }

    if (mobileReadMoreMedia.matches) {
      block.open = true;
      block.classList.add("mobile-readmore-active");
      block.classList.remove("is-expanded");
      button.textContent = "Lire la suite";
      button.setAttribute("aria-expanded", "false");
    } else {
      block.classList.remove("mobile-readmore-active", "is-expanded");
      block.open = false;
      button.textContent = "Lire la suite";
      button.setAttribute("aria-expanded", "false");
    }
  });
};

configureMobileReadMore();
mobileReadMoreMedia.addEventListener?.("change", configureMobileReadMore);
