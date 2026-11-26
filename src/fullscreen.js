const tapWindowMs = 400;
const tapSlop = 10;

export function bindFullscreen(trigger, { announcement, focusAfterToggle } = {}) {
  if (!document.fullscreenEnabled) return;

  trigger.disabled = false;
  let press;
  let lastTap = -Infinity;

  async function toggleFullscreen() {
    lastTap = -Infinity;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      if (announcement) announcement.textContent = '目前無法切換全螢幕。';
    }
  }

  const movedDuringPress = (event) => Math.hypot(event.clientX - press.x, event.clientY - press.y) > tapSlop;
  function cancelPress(event) {
    if (press?.id !== event.pointerId) return;
    press = undefined;
    lastTap = -Infinity;
  }

  trigger.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    press = { id: event.pointerId, x: event.clientX, y: event.clientY, startedAt: event.timeStamp };
    trigger.setPointerCapture(event.pointerId);
  });
  trigger.addEventListener('pointermove', (event) => {
    if (press?.id === event.pointerId && movedDuringPress(event)) cancelPress(event);
  });
  trigger.addEventListener('pointerup', (event) => {
    if (press?.id !== event.pointerId) return;
    if (event.timeStamp - press.startedAt > tapWindowMs || movedDuringPress(event)) {
      cancelPress(event);
      return;
    }
    press = undefined;
    // Release supplies the activation needed by touch browsers.
    if (event.timeStamp - lastTap <= tapWindowMs) void toggleFullscreen();
    else lastTap = event.timeStamp;
  });
  trigger.addEventListener('pointercancel', cancelPress);
  trigger.addEventListener('lostpointercapture', cancelPress);
  trigger.addEventListener('contextmenu', (event) => event.preventDefault());
  trigger.addEventListener('click', (event) => {
    // Native keyboard and assistive-technology activation uses a click without a pointer.
    if (event.detail === 0 && !event.pointerType) void toggleFullscreen();
  });
  document.addEventListener('fullscreenchange', () => {
    trigger.setAttribute('aria-pressed', String(Boolean(document.fullscreenElement)));
    if (document.activeElement === trigger) focusAfterToggle?.focus({ preventScroll: true });
  });
}
