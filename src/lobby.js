import { drawScore } from './score-art.js';

const phone = document.getElementById('player-phone');
const phoneDialog = document.getElementById('phone-dialog');
const phonePreview = document.getElementById('phone-preview');
const phoneViewport = window.visualViewport;
let savedPhone = '';

function placePhoneDialog() {
  if (!phoneDialog.open || !phoneViewport) return;
  phoneDialog.style.setProperty('--phone-view-top', `${phoneViewport.offsetTop}px`);
  phoneDialog.style.setProperty('--phone-view-height', `${phoneViewport.height}px`);
}

document.getElementById('edit-phone').addEventListener('click', () => {
  phone.value = savedPhone;
  phoneDialog.showModal();
  placePhoneDialog();
  // Keep focus in the tap handler so mobile browsers can open the keyboard.
  phone.focus({ preventScroll: true });
});
phoneViewport?.addEventListener('resize', placePhoneDialog);
phoneViewport?.addEventListener('scroll', placePhoneDialog);
document.getElementById('cancel-phone').addEventListener('click', () => phoneDialog.close());
phone.form.addEventListener('submit', () => {
  savedPhone = phone.value;
  phonePreview.textContent = savedPhone || phone.placeholder;
  phonePreview.classList.toggle('phone-placeholder', !savedPhone);
});

const phoneDigits = (value) => value.normalize('NFKC').replace(/\D/g, '');

function formatPhoneSuffix() {
  const { value, selectionStart } = phone;
  const digits = phoneDigits(value).slice(0, 8);
  const formatted = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5)].filter(Boolean).join('-');
  if (value === formatted) return;

  const digitsBeforeCaret = Math.min(phoneDigits(value.slice(0, selectionStart)).length, digits.length);
  const caret = digitsBeforeCaret + Number(digitsBeforeCaret > 2) + Number(digitsBeforeCaret > 5);
  phone.value = formatted;
  phone.setSelectionRange(caret, caret);
}

phone.addEventListener('input', (event) => {
  if (!event.isComposing) formatPhoneSuffix();
});
phone.addEventListener('compositionend', formatPhoneSuffix);

phone.addEventListener('beforeinput', (event) => {
  const { value, selectionStart, selectionEnd } = phone;
  if (!event.cancelable || event.isComposing || selectionStart !== selectionEnd) return;

  // Treat generated dashes as part of the adjacent digit when deleting.
  if (event.inputType === 'deleteContentBackward' && value[selectionStart - 1] === '-') {
    phone.setSelectionRange(selectionStart - 2, selectionStart);
  } else if (event.inputType === 'deleteContentForward' && value[selectionStart] === '-') {
    phone.setSelectionRange(selectionStart, selectionStart + 2);
  }
});

phone.addEventListener('paste', (event) => {
  if (!event.clipboardData) return;
  event.preventDefault();
  const digits = phoneDigits(event.clipboardData.getData('text/plain'));
  if (/^09\d{8}$/.test(digits)) {
    phone.setRangeText(digits.slice(2), 0, phone.value.length, 'end');
  } else if (digits) {
    phone.setRangeText(digits, phone.selectionStart, phone.selectionEnd, 'end');
  }
  formatPhoneSuffix();
});

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
