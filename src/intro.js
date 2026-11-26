const intro = document.getElementById('entry-intro');
const scene = document.getElementById('intro-scene');
const header = document.getElementById('intro-header');
const actor = document.getElementById('intro-actor');
const giftLight = document.getElementById('intro-gift-light');
const wash = document.getElementById('intro-warm-wash');
const personal = document.getElementById('intro-personal');
const demo = document.getElementById('intro-demo');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const frameDuration = 1000 / 7;
const lastFrame = 24;
const halfOpenFrame = 21;
const openFrame = 22;
const halfOpenHold = 240;
const recipientHold = 2100;

export function openEntryIntro({ preview, onGiftOpen }) {
  const reduced = reducedMotion.matches;
  const animations = [];
  const startedAt = performance.now();
  let frame;
  let nextFrame;
  let holdTimer;
  let endHold;
  const held = new Promise((resolve) => {
    endHold = resolve;
  });

  function showFrame(index) {
    if (frame === index) return;
    frame = index;
    // Five columns and five rows. Each 25% step moves exactly one cell.
    actor.style.backgroundPosition = [(index % 5) * 25, Math.floor(index / 5) * 25]
      .map((position) => position + '%').join(' ');
    if (index >= openFrame && header.hidden) {
      header.hidden = false;
      scene.classList.add('is-open');
      holdTimer = setTimeout(endHold, recipientHold);
      if (!reduced) onGiftOpen();
    }
  }

  function step(now) {
    const elapsed = Math.max(0, now - startedAt);
    const pause = Math.min(halfOpenHold, Math.max(0, elapsed - halfOpenFrame * frameDuration));
    showFrame(Math.min(lastFrame, Math.floor((elapsed - pause) / frameDuration)));
    if (frame < lastFrame) nextFrame = requestAnimationFrame(step);
  }

  personal.hidden = preview;
  demo.hidden = !preview;
  showFrame(reduced ? lastFrame : 0);
  intro.hidden = false;
  intro.focus({ preventScroll: true });
  if (!reduced) nextFrame = requestAnimationFrame(step);

  return {
    held,
    async reveal() {
      showFrame(lastFrame);
      const duration = reduced ? 180 : 460;
      const timing = { duration, fill: 'forwards' };
      animations.push(scene.animate(reduced ? [
        { opacity: 1 },
        { opacity: 0 },
      ] : [
        { opacity: 1, offset: 0 },
        { opacity: .96, offset: .25 },
        { opacity: 0, offset: 1 },
      ], timing));
      if (!reduced) {
        const { left, top } = giftLight.getBoundingClientRect();
        wash.style.setProperty('--wash-center', left + 'px ' + top + 'px');
        animations.push(wash.animate([
          { opacity: 0, transform: 'scale(.55)', offset: 0 },
          { opacity: .88, transform: 'scale(1.35)', offset: .4 },
          { opacity: 0, transform: 'scale(2.1)', offset: 1 },
        ], { ...timing, easing: 'ease-in-out' }));
      }
      await Promise.allSettled(animations.map((animation) => animation.finished));
    },
    close() {
      cancelAnimationFrame(nextFrame);
      clearTimeout(holdTimer);
      endHold();
      intro.hidden = true;
      header.hidden = true;
      scene.classList.remove('is-open');
      for (const animation of animations) animation.cancel();
    },
  };
}
