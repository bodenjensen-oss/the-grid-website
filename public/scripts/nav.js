/** Header: solid after the top of the page, phone menu, and the current-section marker. */

const SOLID_CLASS = "is-solid";
const OPEN_CLASS = "is-open";
const DESKTOP_QUERY = "(min-width: 900px)";
const CURRENT_BAND = "-45% 0px -50% 0px";

/** @returns {void} */
export function initNav() {
  const header = document.querySelector("[data-header]");
  if (!header) return;
  watchTop(header);
  initMenu(header);
  markCurrentSection(header);
}

/** The header is clear over the first few pixels of the hero (the height of .top-sentinel) and solid everywhere else. */
function watchTop(header) {
  if (!("IntersectionObserver" in window)) {
    header.classList.add(SOLID_CLASS);
    return;
  }
  const sentinel = document.createElement("div");
  sentinel.className = "top-sentinel";
  sentinel.setAttribute("aria-hidden", "true");
  document.body.prepend(sentinel);
  const observer = new IntersectionObserver(([entry]) => {
    header.classList.toggle(SOLID_CLASS, !entry.isIntersecting);
  });
  observer.observe(sentinel);
}

function initMenu(header) {
  const toggle = header.querySelector("[data-menu-toggle]");
  const nav = header.querySelector("#site-nav");
  if (!toggle || !nav) return;

  const isOpen = () => toggle.getAttribute("aria-expanded") === "true";
  const setOpen = (open) => {
    header.classList.toggle(OPEN_CLASS, open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Close" : "Menu";
  };

  toggle.addEventListener("click", () => setOpen(!isOpen()));
  // Any link in the header closes the menu: the nav links, the logo, and the quote button beside the toggle.
  header.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isOpen()) return;
    setOpen(false);
    toggle.focus();
  });
  window.matchMedia(DESKTOP_QUERY).addEventListener("change", (event) => {
    if (event.matches) setOpen(false);
  });
}

/** Marks the nav link of whichever section sits in the middle band of the screen. */
function markCurrentSection(header) {
  if (!("IntersectionObserver" in window)) return;
  const links = [...header.querySelectorAll(".site-nav__link")].filter((link) => {
    const url = new URL(link.href);
    return url.pathname === window.location.pathname && url.hash.length > 1;
  });
  if (links.length === 0) return;
  const linkById = new Map(links.map((link) => [new URL(link.href).hash.slice(1), link]));
  const sections = [...document.querySelectorAll("main > section[id]")];

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of links) link.removeAttribute("aria-current");
        linkById.get(entry.target.id)?.setAttribute("aria-current", "true");
      }
    },
    { rootMargin: CURRENT_BAND },
  );
  for (const section of sections) observer.observe(section);
}
