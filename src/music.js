const music = document.getElementById('background-music');
let fadeFrame;
let chimeAudio;
const entryNotes = [[523, 0, 0.025], [784, 0.055, 0.02], [1047, 0.11, 0.014]];

export function setBackgroundMusic(source, volume) {
  cancelAnimationFrame(fadeFrame);
  music.pause();
  music.volume = volume;
  music.src = source;
  void playMusic();
}

export function fadeBackgroundMusic(volume) {
  cancelAnimationFrame(fadeFrame);
  const from = music.volume;
  const startedAt = performance.now();
  function step(now) {
    const fraction = Math.min(1, (now - startedAt) / 320);
    music.volume = from + (volume - from) * fraction;
    if (fraction < 1) fadeFrame = requestAnimationFrame(step);
  }
  fadeFrame = requestAnimationFrame(step);
}

export function prepareEntryChime() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (Audio && !music.muted) {
    try {
      // Unlock the context while the lobby button or phone form still has user activation.
      chimeAudio ??= new Audio();
      if (chimeAudio.state !== 'running') void chimeAudio.resume().catch(() => {});
    } catch { /* The transition works without audio. */ }
  }
  return () => {
    if (document.hidden || music.muted || chimeAudio?.state !== 'running') return;
    const now = chimeAudio.currentTime;
    for (const [frequency, offset, volume] of entryNotes) {
      const start = now + offset;
      const tone = chimeAudio.createOscillator();
      const envelope = chimeAudio.createGain();
      tone.frequency.value = frequency;
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      tone.connect(envelope).connect(chimeAudio.destination);
      tone.start(start);
      tone.stop(start + 0.36);
    }
  };
}

async function playMusic() {
  if (document.hidden || !music.paused || !music.hasAttribute('src')) return;
  try {
    await music.play();
  } catch (error) {
    if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
      console.warn('Could not play background music.', error);
    }
  }
}

window.addEventListener('pageshow', playMusic);
window.addEventListener('pagehide', () => music.pause());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) music.pause();
  else playMusic();
});

for (const event of ['pointerdown', 'pointerup', 'keydown', 'click']) {
  document.addEventListener(event, playMusic, { capture: true });
}
