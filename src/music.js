const music = document.getElementById('background-music');
const startMusic = document.getElementById('start-music');
music.volume = Number(music.dataset.volume);

async function playMusic() {
  if (document.hidden || !music.paused) return;
  try {
    await music.play();
    if (startMusic) startMusic.hidden = true;
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      if (startMusic && music.paused && !document.hidden) startMusic.hidden = false;
    } else if (error.name !== 'AbortError') {
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

for (const event of ['pointerup', 'keydown', 'click']) {
  document.addEventListener(event, playMusic, { capture: true });
}
