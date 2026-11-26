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

const scrollWindow = document.getElementById('leaderboard-scroll');
const table = scrollWindow.firstElementChild;
const rows = table.tBodies[0];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const scrollSpeed = 22; // Pixels per second.
const topPauseMs = 500;
const bottomPauseMs = 2000;

let animation;
let animatedDistance;

function syncLeaderboardScroll() {
  const viewport = scrollWindow.clientHeight;
  const distance = table.tHead.offsetHeight + rows.offsetHeight - viewport;

  if (!viewport || distance <= 0 || reducedMotion.matches) {
    animation?.cancel();
    animation = undefined;
    animatedDistance = undefined;
    return;
  }

  if (distance !== animatedDistance) {
    animation?.cancel();
    animatedDistance = distance;
    const travelMs = distance * 1000 / scrollSpeed;
    const bottomStart = topPauseMs + travelMs;
    const duration = bottomStart + bottomPauseMs;
    const top = 'translateY(0px)';
    const bottom = `translateY(${-distance}px)`;
    // Move the rows under the fixed labels without creating a user-scrollable area.
    animation = rows.animate([
      { transform: top, offset: 0 },
      { transform: top, offset: topPauseMs / duration },
      { transform: bottom, offset: bottomStart / duration },
      { transform: bottom, offset: 1 },
    ], { duration, iterations: Infinity });
  }

  if (document.hidden) {
    animation.pause();
  } else if (animation.playState === 'paused') {
    animation.play();
  }
}

document.addEventListener('visibilitychange', syncLeaderboardScroll);
reducedMotion.addEventListener('change', syncLeaderboardScroll);

const leaderboardResize = new ResizeObserver(syncLeaderboardScroll);
leaderboardResize.observe(scrollWindow);
leaderboardResize.observe(table.tHead);
leaderboardResize.observe(rows);
syncLeaderboardScroll();
