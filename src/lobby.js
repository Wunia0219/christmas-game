import { drawScore } from './score-art.js';

const phone = document.getElementById('player-phone');
const phoneDialog = document.getElementById('phone-dialog');
const phonePreview = document.getElementById('phone-preview');
const phoneHint = document.getElementById('phone-hint');
const phoneViewport = window.visualViewport;
const defaultPhoneHint = phoneHint.textContent;
const phoneDigits = (value) => value.normalize('NFKC').replace(/\D/g, '');
const formatPhoneDigits = (digits) => [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 8)].filter(Boolean).join('-');
let confirmedPhone = '';
let onPhoneConfirmed;

export function hasPlayerPhone() {
  return Boolean(confirmedPhone);
}

function renderPhonePreview() {
  phonePreview.textContent = confirmedPhone ? formatPhoneDigits(confirmedPhone.slice(2)) : phone.placeholder;
  phonePreview.classList.toggle('phone-placeholder', !confirmedPhone);
}

function clearPhoneDraft() {
  onPhoneConfirmed = undefined;
  phone.value = '';
  phone.required = false;
  phoneHint.textContent = defaultPhoneHint;
}

export function clearPlayerPhone() {
  confirmedPhone = '';
  clearPhoneDraft();
  renderPhonePreview();
  if (phoneDialog.open) phoneDialog.close();
}

function placePhoneDialog() {
  if (!phoneDialog.open || !phoneViewport) return;
  phoneDialog.style.setProperty('--phone-view-top', `${phoneViewport.offsetTop}px`);
  phoneDialog.style.setProperty('--phone-view-height', `${phoneViewport.height}px`);
}

export function openPhoneDialog(onConfirmed) {
  if (phoneDialog.open) return;
  onPhoneConfirmed = onConfirmed;
  phone.value = formatPhoneDigits(confirmedPhone.slice(2));
  phone.required = Boolean(onConfirmed);
  phoneHint.textContent = onConfirmed ? '請先填寫手機號碼，再開始遊戲。' : defaultPhoneHint;
  phoneDialog.showModal();
  placePhoneDialog();
  // Keep focus in the tap handler so mobile browsers can open the keyboard.
  phone.focus({ preventScroll: true });
}

document.getElementById('edit-phone').addEventListener('click', () => openPhoneDialog());
phoneViewport?.addEventListener('resize', placePhoneDialog);
phoneViewport?.addEventListener('scroll', placePhoneDialog);
window.addEventListener('pagehide', clearPlayerPhone);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) clearPlayerPhone();
});
document.getElementById('cancel-phone').addEventListener('click', () => phoneDialog.close());
phoneDialog.addEventListener('close', () => {
  if (!phoneDialog.open) clearPhoneDraft();
});
phone.form.addEventListener('submit', (event) => {
  const suffix = phoneDigits(phone.value);
  confirmedPhone = suffix.length === 8 ? `09${suffix}` : '';
  renderPhonePreview();

  if (onPhoneConfirmed && confirmedPhone) {
    event.preventDefault();
    const startGame = onPhoneConfirmed;
    onPhoneConfirmed = undefined;
    phoneDialog.close();
    startGame();
  }
});

function formatPhoneSuffix() {
  const { value, selectionStart } = phone;
  const digits = phoneDigits(value).slice(0, 8);
  const formatted = formatPhoneDigits(digits);
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
