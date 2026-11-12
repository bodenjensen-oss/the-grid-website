/** Reveal: blocks marked .reveal rise into place the first time they come on screen (styles in base.css). */

const IN_CLASS = "is-in";
const ROOT_MARGIN = "0px 0px -8% 0px";
const VISIBLE_RATIO = 0.08;

/** @returns {void} */
export function initReveal() {
  const blocks = [...document.querySelectorAll(".reveal")];
  if (blocks.length === 0) return;
  if (!("IntersectionObserver" in window)) {
    for (const block of blocks) block.classList.add(IN_CLASS);
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      // Blocks that arrive together step in one after another.
      let order = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.style.setProperty("--i", String(order));
        entry.target.classList.add(IN_CLASS);
        observer.unobserve(entry.target);
        order += 1;
      }
    },
    { rootMargin: ROOT_MARGIN, threshold: VISIBLE_RATIO },
  );
  for (const block of blocks) observer.observe(block);
}
