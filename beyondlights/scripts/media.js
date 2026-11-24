/**
 * Video: the hero loop, the clips in the work section, and the pause controls.
 * Nothing is downloaded for visitors who ask for reduced motion or Save-Data until they press play.
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const HD_MIN_DEVICE_WIDTH = 1400;
const SLOW_CONNECTIONS = ["slow-2g", "2g", "3g"];
const CLIP_VISIBLE_RATIO = 0.5;
const HERO_VISIBLE_RATIO = 0.01;
const PLAYING_CLASS = "is-playing";
const AUTOPLAY_REFUSED = "NotAllowedError";

/** @returns {void} */
export function initMedia() {
  /** @type {HTMLVideoElement | null} */
  const hero = document.querySelector("[data-hero-video]");
  /** @type {HTMLVideoElement[]} */
  const clips = [...document.querySelectorAll("[data-clip]")];
  const videos = hero ? [hero, ...clips] : clips;
  if (videos.length === 0) return;

  const pageToggle = document.querySelector("[data-video-toggle]");
  const clipToggles = new Map(clips.map((clip) => [clip, clip.parentElement.querySelector("[data-clip-toggle]")]));
  const inView = new Set();
  const stoppedByVisitor = new Set();
  let pagePaused = wantsLessMotion();

  const mayPlay = (video) => !pagePaused && !stoppedByVisitor.has(video) && inView.has(video);

  const render = () => {
    if (pageToggle) renderPageToggle(pageToggle, pagePaused);
    for (const [clip, toggle] of clipToggles) {
      if (toggle) renderClipToggle(toggle, pagePaused || stoppedByVisitor.has(clip));
    }
  };

  const sync = (video) => {
    if (!mayPlay(video)) {
      video.pause();
      return;
    }
    // If the browser refuses autoplay, the whole page falls back to paused and the visitor can press play.
    play(video, () => {
      pagePaused = true;
      syncAll();
    });
  };

  function syncAll() {
    videos.forEach(sync);
    render();
  }

  for (const video of videos) {
    video.muted = true;
    video.addEventListener("playing", () => video.classList.add(PLAYING_CLASS));
  }

  if (pageToggle) {
    pageToggle.hidden = false;
    pageToggle.addEventListener("click", () => {
      pagePaused = !pagePaused;
      syncAll();
    });
  }

  for (const [clip, toggle] of clipToggles) {
    if (!toggle) continue;
    toggle.hidden = false;
    toggle.addEventListener("click", () => {
      if (pagePaused) {
        // Pressing play on one clip while the page is paused starts the page again.
        pagePaused = false;
        stoppedByVisitor.delete(clip);
      } else if (stoppedByVisitor.has(clip)) {
        stoppedByVisitor.delete(clip);
      } else {
        stoppedByVisitor.add(clip);
      }
      syncAll();
    });
  }

  render();
  watchVisibility(videos, inView, sync);
}

/** @returns {boolean} */
function wantsLessMotion() {
  const reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  return reduced || saveData;
}

/**
 * @param {HTMLVideoElement[]} videos
 * @param {Set<HTMLVideoElement>} inView
 * @param {(video: HTMLVideoElement) => void} sync
 */
function watchVisibility(videos, inView, sync) {
  if (!("IntersectionObserver" in window)) {
    for (const video of videos) {
      inView.add(video);
      sync(video);
    }
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const visible = entry.isIntersecting && entry.intersectionRatio >= visibleRatioFor(entry.target);
        if (visible) {
          inView.add(entry.target);
        } else {
          inView.delete(entry.target);
        }
        sync(entry.target);
      }
    },
    { threshold: [0, HERO_VISIBLE_RATIO, CLIP_VISIBLE_RATIO] },
  );
  for (const video of videos) observer.observe(video);
}

/**
 * Clips wait until half of the tile is on screen; the hero plays whenever any of it is.
 * @param {Element} video
 * @returns {number}
 */
function visibleRatioFor(video) {
  return video.hasAttribute("data-clip") ? CLIP_VISIBLE_RATIO : HERO_VISIBLE_RATIO;
}

/**
 * @param {HTMLVideoElement} video
 * @param {() => void} onRefused called when the browser will not autoplay
 */
function play(video, onRefused) {
  if (!video.getAttribute("src")) {
    video.src = sourceFor(video);
  }
  const started = video.play();
  if (!started) return;
  started.catch((error) => {
    // AbortError only means a pause arrived before playback began.
    if (error.name === AUTOPLAY_REFUSED) onRefused();
  });
}

/**
 * A video names its file in data-src. One with a larger file as well (data-src-hd) gets it on big, fast screens.
 * @param {HTMLVideoElement} video
 * @returns {string}
 */
function sourceFor(video) {
  const { src, srcHd } = video.dataset;
  if (!srcHd) return src;
  const deviceWidth = window.innerWidth * (window.devicePixelRatio || 1);
  const connection = navigator.connection;
  const slow = Boolean(connection && SLOW_CONNECTIONS.includes(connection.effectiveType));
  return deviceWidth >= HD_MIN_DEVICE_WIDTH && !slow ? srcHd : src;
}

/**
 * The button's words say what it will do; data-paused only drives the icon.
 * @param {HTMLElement} toggle
 * @param {boolean} paused
 */
function renderPageToggle(toggle, paused) {
  toggle.dataset.paused = String(paused);
  const text = toggle.querySelector("[data-video-toggle-text]");
  if (text) text.textContent = paused ? "Play video" : "Pause video";
}

/**
 * @param {HTMLElement} toggle
 * @param {boolean} stopped
 */
function renderClipToggle(toggle, stopped) {
  toggle.dataset.paused = String(stopped);
  toggle.setAttribute("aria-label", stopped ? "Play this video" : "Pause this video");
}
