const music = document.getElementById('background-music');

export function setBackgroundMusic(source, volume) {
  music.pause();
  music.volume = volume;
  music.src = source;
  void playMusic();
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
