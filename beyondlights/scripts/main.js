/**
 * Storefront entry: the hero loop and the clips. The page works without it; the videos then stay on their posters.
 */

import { initMedia } from "./media.js";

document.documentElement.classList.add("js");

try {
  initMedia();
} catch (error) {
  console.error(error);
}
