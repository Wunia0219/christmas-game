const intro = document.getElementById('entry-intro');
const scene = document.getElementById('intro-scene');
const header = document.getElementById('intro-header');
const title = document.getElementById('intro-title');
const recipients = header.querySelectorAll('.intro-organizations li');
const actor = document.getElementById('intro-actor');
const giftLight = document.getElementById('intro-gift-light');
const wash = document.getElementById('intro-warm-wash');
const playCount = document.getElementById('intro-play-count');
const increment = document.getElementById('intro-increment');
const participation = playCount.parentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const frameDuration = 1000 / 7;
const lastFrame = 24;
const halfOpenFrame = 21;
const openFrame = 22;
const halfOpenHold = 240;
const recipientHold = 2100;
const flightDuration = 850;
const flightDelay = 145;
const flightStagger = 190;
const countDelay = 440;

function flyFromGift(recipient, source, index) {
  const target = recipient.getBoundingClientRect();
  const x = source.left - (target.left + target.width / 2);
  const y = source.top - (target.top + target.height / 2);
  const side = index === 0 ? -1 : 1;
  const lift = Math.min(76, Math.abs(y) * .25);
  // The left-hand route rises past the giraffe before sweeping across.
  const clearance = side < 0 ? Math.min(56, target.width * .29) : 20;
  const sweepX = side < 0 ? x + clearance * .75 : x * .42 + 15;
  const sweepY = y * (side < 0 ? .21 : .31) - lift * .22;
  const pose = (dx, dy, angle, scale) => `translate(${dx}px, ${dy}px) rotate(${side * angle}deg) scale(${scale})`;
  return recipient.animate([
    { transform: pose(x, y, 12, .32), opacity: 0, offset: 0, easing: 'ease-out' },
    { transform: pose(x + clearance, y - lift * .72, 14, .63), opacity: 1, offset: .18 },
    { transform: pose(sweepX, sweepY, 8, .93), opacity: 1, offset: .51 },
    { transform: pose(side * 15, -lift * .34, -4, 1.05), opacity: 1, offset: .81, easing: 'ease-in-out' },
    { transform: 'none', opacity: 1, offset: 1 },
  ], {
    duration: flightDuration,
    delay: flightDelay + index * flightStagger,
    fill: 'backwards',
  });
}

export function openEntryIntro({ totalPlays, onGiftOpen }) {
  const reduced = reducedMotion.matches;
  const animations = [];
  const startedAt = performance.now();
  let frame;
  let nextFrame;
  let holdTimer;
  let countTimer;
  let endHold;
  const held = new Promise((resolve) => {
    endHold = resolve;
  });

  function showIncrement() {
    playCount.textContent = totalPlays.toLocaleString('zh-TW');
    if (!reduced) {
      animations.push(playCount.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.22)', offset: .28 },
        { transform: 'scale(.97)', offset: .72 },
        { transform: 'scale(1)' },
      ], { duration: 420, easing: 'ease-out' }));
    }
    animations.push(increment.animate(reduced ? [
      { opacity: 1 },
      { opacity: 1, offset: .75 },
      { opacity: 0 },
    ] : [
      { opacity: 0, transform: 'translateY(.35em) scale(.65)' },
      { opacity: 1, transform: 'translateY(-.12em) scale(1.16)', offset: .18 },
      { opacity: 1, transform: 'translateY(-.35em) scale(1)', offset: .7 },
      { opacity: 0, transform: 'translateY(-.85em) scale(.94)' },
    ], { duration: 1150 }));
  }

  function showFrame(index) {
    if (frame === index) return;
    frame = index;
    // Five columns and five rows. Each 25% step moves exactly one cell.
    actor.style.backgroundPosition = [(index % 5) * 25, Math.floor(index / 5) * 25]
      .map((position) => position + '%').join(' ');
    if (index >= openFrame && header.hidden) {
      header.hidden = false;
      scene.classList.add('is-open');
      let landingTime = 0;
      if (!reduced) {
        const source = giftLight.getBoundingClientRect();
        recipients.forEach((recipient, index) => {
          animations.push(flyFromGift(recipient, source, index));
        });
        landingTime = flightDelay + (recipients.length - 1) * flightStagger + flightDuration;
        for (const caption of [title, participation]) {
          animations.push(caption.animate([{ opacity: 0 }, { opacity: 1 }], {
            delay: landingTime - 120,
            duration: 220,
            fill: 'backwards',
          }));
        }
      }
      countTimer = setTimeout(showIncrement, landingTime + countDelay);
      holdTimer = setTimeout(endHold, landingTime + recipientHold);
      if (!reduced) onGiftOpen();
    }
  }

  function step(now) {
    const elapsed = Math.max(0, now - startedAt);
    const pause = Math.min(halfOpenHold, Math.max(0, elapsed - halfOpenFrame * frameDuration));
    showFrame(Math.min(lastFrame, Math.floor((elapsed - pause) / frameDuration)));
    if (frame < lastFrame) nextFrame = requestAnimationFrame(step);
  }

  playCount.textContent = (totalPlays - 1).toLocaleString('zh-TW');
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
      clearTimeout(countTimer);
      endHold();
      intro.hidden = true;
      header.hidden = true;
      scene.classList.remove('is-open');
      for (const animation of animations) animation.cancel();
    },
  };
}
