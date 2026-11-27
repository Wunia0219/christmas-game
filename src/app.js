import { bindFullscreen } from './fullscreen.js';
import { openEntryIntro } from './intro.js';
import { clearPlayerPhone, hasPlayerPhone, openPhoneDialog } from './lobby.js';
import { fadeBackgroundMusic, prepareEntryChime, setBackgroundMusic } from './music.js';

const root = document.documentElement;
const theme = document.querySelector('meta[name="theme-color"]');
const lobby = document.getElementById('lobby-view');
const gameView = document.getElementById('game-view');
const field = document.getElementById('field');
const enterGame = document.getElementById('enter-game');
const returnToLobby = document.getElementById('return-to-lobby');
const gameAnnouncement = document.getElementById('announcement');
const gamePath = new URL(enterGame.href).pathname;
const lobbyVolume = 0.28;
const gameMusic = './assets/music/8-ringing_of_bells.mp3';

bindFullscreen(document.getElementById('lobby-fullscreen'), {
  announcement: document.getElementById('lobby-announcement'),
});
bindFullscreen(document.getElementById('fullscreen-trigger'), {
  announcement: gameAnnouncement,
  mouseFocusTarget: field,
});

let showingGame;
let gameController;
let gameLoading;
let returningToLobby = false;
let entry;

// A reload starts a new document, even if the URL is a previous game entry.
if (history.state?.enteredGameFromLobby) history.replaceState(null, '');

function loadGame() {
  gameLoading ??= import('./main.js')
    .then(({ initGame }) => initGame())
    .then((controller) => {
      gameController = controller;
      if (showingGame) gameController.setActive(true);
    })
    .catch((error) => {
      console.error(error);
      gameAnnouncement.textContent = '遊戲載入失敗';
      document.getElementById('message').textContent = '遊戲載入失敗';
      document.getElementById('overlay').hidden = false;
      document.getElementById('action-label').textContent = '重新載入';
      const action = document.getElementById('action');
      action.disabled = false;
      action.addEventListener('click', () => location.reload());
    });
}

function showCurrentView({ startingGame = false } = {}) {
  if (location.pathname === gamePath && !showingGame && !startingGame) {
    history.replaceState(null, '', returnToLobby.href);
  }
  const inGame = location.pathname === gamePath;
  if (inGame === showingGame) return;
  const switching = showingGame !== undefined;
  showingGame = inGame;

  if (switching) clearPlayerPhone();
  lobby.hidden = inGame;
  gameView.hidden = !inGame;
  root.classList.toggle('lobby-page', !inGame);
  theme.content = inGame ? '#ecdec7' : '#0d2235';
  document.title = inGame ? 'Giraffe 打磚塊 | 東勢長頸鹿美語' : '聖誕打磚塊大廳 | 東勢長頸鹿美語';
  window.scrollTo(0, 0);

  if (inGame) {
    gameController?.setActive(true);
  } else {
    gameController?.setActive(false);
    setBackgroundMusic('./assets/music/10-winter_tale.mp3', lobbyVolume);
    if (switching) enterGame.focus({ preventScroll: true });
  }
}

function closeEntryIntro() {
  entry.close();
  entry = undefined;
  lobby.inert = false;
  gameView.inert = false;
}

async function startGame() {
  if (entry || showingGame) return;
  if (!hasPlayerPhone()) {
    openPhoneDialog(startGame);
    return;
  }

  const preview = new URLSearchParams(location.search).get('intro') === 'preview';
  const playChime = prepareEntryChime();
  lobby.inert = true;
  gameView.inert = true;
  const current = openEntryIntro({ preview, onGiftOpen: playChime });
  entry = current;
  // Keep the same fullscreen element alive when changing routes.
  history.pushState({ enteredGameFromLobby: true }, '', enterGame.href);
  fadeBackgroundMusic(0.12);
  loadGame();
  await current.held;
  if (entry !== current) return;

  // Reveal the game's loading screen if assets are still arriving so Back stays available.
  showCurrentView({ startingGame: true });
  await current.reveal();
  if (entry !== current) return;

  closeEntryIntro();
  setBackgroundMusic(gameMusic, 0.16);
  field.focus({ preventScroll: true });
}

function navigate(event) {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (event.currentTarget === enterGame) {
    startGame();
    return;
  }
  if (history.state?.enteredGameFromLobby) {
    if (!returningToLobby) {
      returningToLobby = true;
      history.back();
    }
    return;
  }
  history.pushState(null, '', returnToLobby.href);
  showCurrentView();
}

enterGame.addEventListener('click', navigate);
returnToLobby.addEventListener('click', navigate);
window.addEventListener('popstate', () => {
  returningToLobby = false;
  if (entry) {
    closeEntryIntro();
    if (!showingGame) {
      clearPlayerPhone();
      fadeBackgroundMusic(lobbyVolume);
      enterGame.focus({ preventScroll: true });
    }
  }
  showCurrentView();
});
showCurrentView();
