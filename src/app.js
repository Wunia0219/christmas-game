import { bindFullscreen } from './fullscreen.js';
import { setBackgroundMusic } from './music.js';

const root = document.documentElement;
const theme = document.querySelector('meta[name="theme-color"]');
const lobby = document.getElementById('lobby-view');
const gameView = document.getElementById('game-view');
const field = document.getElementById('field');
const enterGame = document.getElementById('enter-game');
const returnToLobby = document.getElementById('return-to-lobby');
const gameAnnouncement = document.getElementById('announcement');
const gamePath = new URL(enterGame.href).pathname;

bindFullscreen(document.getElementById('lobby-fullscreen'), {
  announcement: document.getElementById('lobby-announcement'),
});
bindFullscreen(document.getElementById('fullscreen-trigger'), {
  announcement: gameAnnouncement,
  focusAfterToggle: field,
});

let showingGame;
let gameController;
let gameLoading;
let returningToLobby = false;

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
      document.getElementById('action-label').textContent = '重新載入';
      const action = document.getElementById('action');
      action.disabled = false;
      action.addEventListener('click', () => location.reload());
    });
}

function showCurrentView() {
  const inGame = location.pathname === gamePath;
  if (inGame === showingGame) return;
  const switching = showingGame !== undefined;
  showingGame = inGame;

  lobby.hidden = inGame;
  gameView.hidden = !inGame;
  root.classList.toggle('lobby-page', !inGame);
  theme.content = inGame ? '#ecdec7' : '#0d2235';
  document.title = inGame ? 'Giraffe 打磚塊 | 東勢長頸鹿美語' : '聖誕打磚塊大廳 | 東勢長頸鹿美語';
  window.scrollTo(0, 0);

  if (inGame) {
    setBackgroundMusic('./assets/music/8-ringing_of_bells.mp3', 0.16);
    if (gameController) gameController.setActive(true);
    else loadGame();
    field.focus({ preventScroll: true });
  } else {
    gameController?.setActive(false);
    setBackgroundMusic('./assets/music/10-winter_tale.mp3', 0.28);
    if (switching) enterGame.focus({ preventScroll: true });
  }
}

function navigate(event) {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const openingGame = event.currentTarget === enterGame;
  if (!openingGame && history.state?.enteredGameFromLobby) {
    if (!returningToLobby) {
      returningToLobby = true;
      history.back();
    }
    return;
  }
  // Keep the same fullscreen element alive when changing routes.
  history.pushState({ enteredGameFromLobby: openingGame }, '', event.currentTarget.href);
  showCurrentView();
}

enterGame.addEventListener('click', navigate);
returnToLobby.addEventListener('click', navigate);
window.addEventListener('popstate', () => {
  returningToLobby = false;
  showCurrentView();
});
showCurrentView();
