import { initNav } from "./nav.js";
import { initMedia } from "./media.js";
import { initReveal } from "./reveal.js";
import { initQuote } from "./quote.js";

const FEATURES = [
  ["navigation", initNav],
  ["video", initMedia],
  ["reveal", initReveal],
  ["quote form", initQuote],
];

document.documentElement.classList.add("js");

// Each feature starts on its own, so one failing does not take the others down with it.
for (const [name, init] of FEATURES) {
  try {
    init();
  } catch (error) {
    console.error(`The Grid: ${name} failed to start`, error);
  }
}
