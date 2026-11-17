import { Application, Container, Graphics } from 'pixi.js';
import { BALL_RADIUS, BUFFS, DROP_RADIUS, Game, GUARD, HEIGHT, LEVELS, PADDLE, WIDTH } from './game.js';

const byId = (id) => document.getElementById(id);
const field = byId('field');
const frame = field.closest('.game-frame');
const overlay = byId('overlay');
const actionButton = byId('action');
const pauseButton = byId('pause');
const restartButton = byId('restart');
const soundButton = byId('sound');
const score = byId('score');
const best = byId('best');
const lives = byId('lives');
const progress = byId('progress');
const ballCount = byId('ball-count');
const buffList = byId('buff-list');
const buffIdle = byId('buff-idle');
const guardCount = byId('guard-count');
const announcement = byId('announcement');
const hearts = [...lives.children];
const buffRows = BUFFS.map((kind) => {
  const row = byId(`buff-${kind}`);
  return { kind, row, timer: row.querySelector('.buff-time') };
});

const scoreKey = 'arkanoid.best';
const hues = [0xfd798f, 0xffa069, 0xffd86b, 0x70dfcd, 0xa895ff];
const shadows = [0xb04369, 0xb85840, 0xb88947, 0x358b86, 0x6d52b5];
const powerColors = { 'extra-ball': 0x8ef0ed, buff: 0xffa6d1 };
const powerShadows = { 'extra-ball': 0x398985, buff: 0xaa397b };
const buffNames = { wide: '球拍加長', fast: '球拍加速', guards: '底線保護' };
const dark = 0x252142;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const number = (value, digits) => String(value).padStart(digits, '0');

const screens = {
  ready: { status: '準備就緒', title: '準備開打？', button: '開始遊戲' },
  playing: { status: '遊戲進行中' },
  serve: { status: '等待發球', title: '再發一球', button: '發球' },
  paused: { status: '已暫停', title: '遊戲暫停', button: '繼續遊戲' },
  'level-clear': { status: '關卡完成', title: '關卡完成！', button: '下一關' },
  lost: { status: '遊戲結束', title: '遊戲結束', button: '再玩一次' },
  won: { status: '全數通關', title: '全數通關！', button: '再玩一次' },
};

const tones = {
  launch: [440, 600, 0.09],
  wall: [190, 160, 0.045],
  paddle: [300, 400, 0.07],
  brick: [600, 900, 0.075],
  'extra-ball': [580, 1030, 0.15],
  buff: [750, 1250, 0.18],
  guard: [380, 690, 0.12],
  clear: [430, 1050, 0.28],
  miss: [270, 100, 0.23],
};

function readBest() {
  try {
    const saved = Number(localStorage.getItem(scoreKey));
    return Number.isSafeInteger(saved) && saved > 0 ? saved : 0;
  } catch {
    return 0;
  }
}

let bestScore = readBest();
let audio;
let soundEnabled = false;

function playSound(event) {
  if (!soundEnabled || audio?.state !== 'running') return;
  const [start, end, duration] = tones[event];
  const now = audio.currentTime;
  const tone = audio.createOscillator();
  const gain = audio.createGain();
  tone.type = 'triangle';
  tone.frequency.setValueAtTime(start, now);
  tone.frequency.exponentialRampToValueAtTime(end, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  tone.connect(gain).connect(audio.destination);
  tone.start(now);
  tone.stop(now + duration);
}

function drawPowerMark(graphic, kind, x, y) {
  if (kind === 'extra-ball') {
    graphic.circle(x - 5, y, 3).fill(dark).circle(x + 5, y, 3).fill(dark);
    return;
  }
  graphic.moveTo(x - 3, y - 3).lineTo(x - 2, y - 5).lineTo(x + 2, y - 5)
    .lineTo(x + 4, y - 3).lineTo(x + 4, y - 1).lineTo(x, y + 1).lineTo(x, y + 2)
    .stroke({ color: dark, width: 2, cap: 'round', join: 'round' })
    .circle(x, y + 5, 1.15).fill(dark);
}

function drawBrick(brick) {
  const { width, height, row, kind } = brick;
  const graphic = new Graphics()
    .roundRect(0, 3, width, height, 3).fill(0x0b0a1b)
    .roundRect(0, 0, width, height, 3).fill(powerShadows[kind] ?? shadows[row])
    .roundRect(0, 0, width, height - 4, 3).fill(powerColors[kind] ?? hues[row])
    .rect(4, 3, width - 8, 2).fill({ color: 0xffffff, alpha: 0.38 })
    .rect(4, 7, 2, 2).fill({ color: 0xffffff, alpha: 0.45 });
  if (kind !== 'standard') drawPowerMark(graphic, kind, width / 2, (height - 4) / 2);
  graphic.position.set(brick.x, brick.y);
  return graphic;
}

async function init() {
  const app = new Application();
  await app.init({
    width: WIDTH,
    height: HEIGHT,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(devicePixelRatio, 2),
    preference: ['webgl', 'canvas'],
  });
  byId('canvas-layer').appendChild(app.canvas);

  const bricks = new Container();
  const trail = new Graphics();
  const particles = new Graphics();
  const paddle = new Graphics()
    .roundRect(-PADDLE.width / 2, 3, PADDLE.width, PADDLE.height + 1, 4).fill(0x0c091b)
    .roundRect(-PADDLE.width / 2, 0, PADDLE.width, PADDLE.height, 4).fill(0x9179ec)
    .roundRect(-PADDLE.width / 2, 0, PADDLE.width, PADDLE.height - 4, 4).fill(0xdaceff)
    .rect(-PADDLE.width / 2 + 9, 2, PADDLE.width - 18, 2).fill(0xf4eeff);
  const balls = new Graphics();
  const powerUps = new Graphics();
  app.stage.addChild(bricks, trail, particles, powerUps, paddle, balls);

  let brickViews = new Map();
  let sparks = [];
  const game = new Game((event, payload) => {
    playSound(event);
    if (event === 'buff') {
      announcement.textContent = `獲得${buffNames[payload]}。`;
      return;
    }
    if (event === 'extra-ball') announcement.textContent = '額外球已釋放。';
    const brick = payload;
    if (brick) {
      brickViews.get(brick).visible = false;
      if (!reducedMotion.matches) {
        for (let index = 0; index < 7; index += 1) {
          sparks.push({
            x: brick.x + brick.width * (index + 1) / 8,
            y: brick.y + brick.height / 2,
            vx: (Math.random() - 0.5) * 180,
            vy: (Math.random() - 0.5) * 150,
            life: 0.28,
            color: powerColors[brick.kind] ?? hues[brick.row],
          });
        }
      }
    }
  });

  let displayedBricks;
  let displayedPhase;
  let displayedScore;
  let displayedLives;
  let displayedRemaining;
  let displayedBallCount;
  let displayedGuardCount;
  let pointerX;

  function syncPowerHud() {
    if (displayedBallCount !== game.balls.length) {
      displayedBallCount = game.balls.length;
      ballCount.hidden = displayedBallCount <= 1;
      ballCount.textContent = ballCount.hidden ? '' : `場上 ${displayedBallCount} 球`;
    }
    if (displayedGuardCount !== game.guards.length) {
      displayedGuardCount = game.guards.length;
      guardCount.textContent = `${displayedGuardCount} 個`;
    }
    let active = false;
    for (const { kind, row, timer } of buffRows) {
      const seconds = Math.ceil(game.effectTimeLeft(kind));
      row.hidden = seconds === 0;
      if (row.hidden) continue;
      active = true;
      const label = `${seconds} 秒`;
      if (timer.textContent !== label) timer.textContent = label;
    }
    buffIdle.hidden = active;
    buffList.hidden = !active;
  }

  function syncHud() {
    syncPowerHud();
    let levelChanged = false;
    if (displayedBricks !== game.bricks) {
      for (const old of bricks.removeChildren()) old.destroy();
      brickViews = new Map(game.bricks.map((brick) => [brick, bricks.addChild(drawBrick(brick))]));
      sparks = [];
      displayedBricks = game.bricks;
      byId('level').textContent = number(game.level, 2);
      progress.max = game.bricks.length;
      levelChanged = true;
    }

    if (displayedScore !== game.score) {
      score.textContent = number(game.score, 5);
      displayedScore = game.score;
      if (game.score > bestScore) {
        bestScore = game.score;
        best.textContent = number(bestScore, 5);
        try { localStorage.setItem(scoreKey, String(bestScore)); } catch { /* Keep the record for this session. */ }
      }
    }

    if (displayedLives !== game.lives) {
      lives.setAttribute('aria-label', `剩下 ${game.lives} 條命`);
      hearts.forEach((heart, index) => heart.classList.toggle('depleted', index >= game.lives));
      displayedLives = game.lives;
    }

    if (levelChanged || displayedRemaining !== game.remaining) {
      byId('remaining').textContent = game.remaining;
      progress.value = game.remaining;
      displayedRemaining = game.remaining;
    }

    if (displayedPhase === game.phase) return;
    const screen = screens[game.phase];
    const wasPlaying = displayedPhase === 'playing';
    displayedPhase = game.phase;
    frame.dataset.phase = game.phase;
    byId('status').textContent = screen.status;
    announcement.textContent = game.phase === 'serve' ? `剩下 ${game.lives} 條命。${screen.title}。` : screen.status;
    overlay.hidden = game.phase === 'playing';
    pauseButton.disabled = game.phase !== 'playing' && game.phase !== 'paused';
    byId('pause-label').textContent = game.phase === 'paused' ? '繼續' : '暫停';
    if (overlay.hidden) return;
    pointerX = undefined;
    byId('message').textContent = screen.title;
    byId('action-label').textContent = screen.button;
    const detail = byId('detail');
    detail.hidden = game.phase !== 'won' && game.phase !== 'lost';
    detail.textContent = detail.hidden ? '' : `最終分數 ${game.score.toLocaleString('zh-TW')}`;
    if (wasPlaying && document.activeElement === field && document.hasFocus()) {
      actionButton.focus({ preventScroll: true });
    }
  }

  function primaryAction() {
    game.action();
    syncHud();
    field.focus({ preventScroll: true });
  }

  const keys = new Set();
  const leftKeys = ['ArrowLeft', 'KeyA'];
  const rightKeys = ['ArrowRight', 'KeyD'];

  function renderPlayfield() {
    paddle.position.set(game.paddleX, PADDLE.y);
    paddle.scale.x = game.paddleWidth / PADDLE.width;
    balls.clear();
    trail.clear();
    for (const { x, y, vx, vy, bonus } of game.balls) {
      const color = bonus ? powerColors['extra-ball'] : 0xffe27a;
      balls.circle(x, y, BALL_RADIUS + 5).fill({ color, alpha: 0.2 })
        .circle(x, y, BALL_RADIUS).fill(color)
        .circle(x - 2, y - 2, 2.2).fill(0xfffcf0);
      if (reducedMotion.matches || game.phase !== 'playing') continue;
      for (let index = 3; index >= 1; index -= 1) {
        trail.circle(x - vx * index * 0.013, y - vy * index * 0.013, 6 - index)
          .fill({ color, alpha: 0.36 / index });
      }
    }

    powerUps.clear();
    for (const { x, y } of game.drops) {
      const radius = DROP_RADIUS;
      powerUps.poly([x, y - radius, x + radius, y, x, y + radius, x - radius, y])
        .fill(powerColors.buff).stroke({ color: 0xffdcf5, width: 1.5 });
      drawPowerMark(powerUps, 'buff', x, y);
    }
    for (const { x } of game.guards) {
      const left = x - GUARD.width / 2;
      powerUps.roundRect(left, GUARD.y, GUARD.width, GUARD.height, 3).fill(powerShadows['extra-ball'])
        .roundRect(left, GUARD.y, GUARD.width, GUARD.height - 3, 3).fill(powerColors['extra-ball']);
    }
  }

  app.ticker.add((ticker) => {
    const seconds = Math.min(ticker.deltaMS / 1000, 0.04);
    const direction = Number(rightKeys.some((key) => keys.has(key))) - Number(leftKeys.some((key) => keys.has(key)));
    game.update(seconds, { direction, pointerX });
    syncHud();
    renderPlayfield();

    particles.clear();
    if (game.phase === 'paused' || reducedMotion.matches) return;
    for (const spark of sparks) {
      spark.life -= seconds;
      spark.x += spark.vx * seconds;
      spark.y += spark.vy * seconds;
      if (spark.life > 0) {
        particles.rect(spark.x, spark.y, 4, 4).fill({ color: spark.color, alpha: spark.life / 0.28 });
      }
    }
    sparks = sparks.filter((spark) => spark.life > 0);
  });

  function togglePause() {
    game.togglePause();
    syncHud();
    if (game.phase === 'playing') field.focus({ preventScroll: true });
    if (game.phase === 'paused') actionButton.focus({ preventScroll: true });
  }

  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (leftKeys.includes(event.code) || rightKeys.includes(event.code)) {
      event.preventDefault();
      pointerX = undefined;
      keys.add(event.code);
    }
    if (event.code === 'Space' && !event.target.closest('button')) {
      event.preventDefault();
      if (!event.repeat && game.phase !== 'playing') primaryAction();
    }
    if (event.code === 'Escape' && !event.repeat) togglePause();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));

  function pauseOnLeave() {
    keys.clear();
    if (game.phase === 'playing') {
      game.togglePause();
      syncHud();
    }
  }
  window.addEventListener('blur', pauseOnLeave);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseOnLeave();
  });

  let gesture;
  function moveToPointer(event) {
    const bounds = field.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width * WIDTH;
    if (game.phase === 'playing') pointerX = x;
    else game.movePaddle(x);
  }

  field.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button') || !event.isPrimary || event.button !== 0) return;
    field.focus({ preventScroll: true });
    moveToPointer(event);
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dragged: false };
    field.setPointerCapture(event.pointerId);
  });
  field.addEventListener('pointermove', (event) => {
    if (event.target.closest('button')) return;
    if (gesture?.id === event.pointerId) {
      gesture.dragged ||= Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 9;
      moveToPointer(event);
    } else if (event.pointerType === 'mouse') {
      moveToPointer(event);
    }
  });
  field.addEventListener('pointerup', (event) => {
    if (gesture?.id !== event.pointerId) return;
    if (!gesture.dragged && (game.phase === 'ready' || game.phase === 'serve')) primaryAction();
    gesture = undefined;
  });
  field.addEventListener('lostpointercapture', () => { gesture = undefined; });

  actionButton.addEventListener('click', primaryAction);
  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', () => {
    pointerX = undefined;
    game.reset();
    syncHud();
    actionButton.focus({ preventScroll: true });
  });
  soundButton.addEventListener('click', async () => {
    soundEnabled = !soundEnabled;
    const enabling = soundEnabled;
    if (enabling) {
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        audio ??= new Audio();
        await audio.resume();
      } catch {
        soundEnabled = false;
      }
    }
    soundButton.setAttribute('aria-pressed', String(soundEnabled));
    byId('sound-label').textContent = soundEnabled ? '音效開' : '音效關';
    if (enabling && soundEnabled) playSound('launch');
  });

  byId('level-total').textContent = ` / ${number(LEVELS, 2)}`;
  best.textContent = number(bestScore, 5);
  actionButton.disabled = false;
  restartButton.disabled = false;
  soundButton.disabled = !(window.AudioContext || window.webkitAudioContext);
  syncHud();
}

init().catch((error) => {
  console.error(error);
  byId('status').textContent = '無法載入';
  byId('message').textContent = '遊戲載入失敗';
  byId('action-label').textContent = '重新載入';
  actionButton.disabled = false;
  actionButton.addEventListener('click', () => location.reload());
});
