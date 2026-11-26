import { drawScore } from './score-art.js';

const value = document.getElementById('leader-score-value');
const canvas = document.getElementById('leader-score-pixels');

if (drawScore(canvas, value.textContent, { color: '#ffdc96' })) {
  value.classList.add('sr-only');
  canvas.hidden = false;
}

const scrollRegion = document.getElementById('leaderboard-scroll');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const scrollSpeed = 0.017; // Pixels per millisecond.
const dwellMs = 2500;

let frame;
let previousTime;
let previousTop = scrollRegion.scrollTop;
let remainingDelay = dwellMs;
let pixels = 0;

function advanceLeaderboard(time) {
  const elapsed = Math.min(time - (previousTime ?? time), 50);
  const top = scrollRegion.scrollTop;
  // The height metrics are rounded, while scrollTop can be fractional.
  const bottom = scrollRegion.scrollHeight - scrollRegion.clientHeight - 1;
  previousTime = time;

  if (top !== previousTop) {
    // Give manual scrolling priority before resuming from the player's position.
    remainingDelay = dwellMs;
    pixels = 0;
  }
  if (remainingDelay > 0) {
    remainingDelay -= elapsed;
  } else if (top >= bottom) {
    scrollRegion.scrollTop = 0;
    remainingDelay = dwellMs;
    pixels = 0;
  } else {
    pixels += elapsed * scrollSpeed;
    const step = Math.floor(pixels);
    if (step > 0) {
      scrollRegion.scrollTop = top + step;
      pixels -= step;
      if (scrollRegion.scrollTop >= bottom) {
        scrollRegion.scrollTop = scrollRegion.scrollHeight;
        remainingDelay = dwellMs;
      }
    }
  }

  previousTop = scrollRegion.scrollTop;
  frame = requestAnimationFrame(advanceLeaderboard);
}

function syncLeaderboardScroll() {
  const height = scrollRegion.clientHeight;
  if (!height || scrollRegion.scrollHeight <= height || reducedMotion.matches || scrollRegion.matches(':focus-visible') || document.hidden) {
    cancelAnimationFrame(frame);
    frame = undefined;
  } else if (frame === undefined) {
    previousTime = undefined;
    previousTop = scrollRegion.scrollTop;
    remainingDelay = dwellMs;
    pixels = 0;
    frame = requestAnimationFrame(advanceLeaderboard);
  }
}

scrollRegion.addEventListener('focus', syncLeaderboardScroll);
scrollRegion.addEventListener('blur', syncLeaderboardScroll);
document.addEventListener('visibilitychange', syncLeaderboardScroll);
reducedMotion.addEventListener('change', syncLeaderboardScroll);

const leaderboardResize = new ResizeObserver(syncLeaderboardScroll);
leaderboardResize.observe(scrollRegion);
leaderboardResize.observe(scrollRegion.firstElementChild);
syncLeaderboardScroll();
