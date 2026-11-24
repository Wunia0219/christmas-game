import { Application, Container, Graphics } from 'pixi.js';
import { BALL_RADIUS, BARRIER, CANNON, DROP_RADIUS, Game, GUARD, HEIGHT, LEVEL_NAMES, LEVELS, PADDLE, TIME_BONUS_RATE, TNT, WIDTH } from './game.js';

const byId = (id) => document.getElementById(id);
const field = byId('field');
const frame = field.closest('.game-frame');
const overlay = byId('overlay');
const actionButton = byId('action');
const levelPicker = byId('level-picker');
const levelSelect = byId('level-select');
const levelReadout = byId('level-readout');
const soundButton = byId('sound');
const helpButton = byId('help');
const helpDialog = byId('help-dialog');
const fullscreenButton = byId('fullscreen');
const score = byId('score');
const clock = byId('time-left');
const levelBonus = byId('level-bonus');
const timeBonus = byId('time-bonus');
const scorePopups = byId('score-popups');
const best = byId('best');
const lives = byId('lives');
const lifeLossFlash = byId('life-loss-flash');
const announcement = byId('announcement');
const hearts = [...lives.children];

const scoreKey = 'arkanoid.best';
const hues = [0xfd798f, 0xffa069, 0xffd86b, 0x70dfcd, 0xa895ff];
const shadows = [0xb04369, 0xb85840, 0xb88947, 0x358b86, 0x6d52b5];
const powerColors = {
  'extra-ball': 0x8ef0ed, buff: 0xffa6d1, hard: 0xd5def5, tnt: 0xff786d,
  shrink: 0xffaa82, shield: 0x8eafff, barrier: 0xd0a6fc,
};
const powerShadows = {
  'extra-ball': 0x398985, buff: 0xaa397b, hard: 0x637492, tnt: 0xa2344d,
  shrink: 0xa6504e, shield: 0x5266b5, barrier: 0x8052a3,
};
const shieldColor = 0xc1f0ff;
const hardColors = [0xa5afc7, 0xbdcce9, powerColors.hard];
const blastDuration = 0.28;
const shakeDuration = 0.18;
const sparkDuration = 0.28;
const hardFlashDuration = 0.19;
const ballFlashDuration = 0.26;
const paddleImpactDuration = 0.18;
const multiballScoreLift = 34;
const buffNames = { wide: '球拍加長', fast: '球拍加速', guards: '底線保護', cannons: '雙側砲台' };
const dark = 0x252142;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const number = (value, digits) => String(value).padStart(digits, '0');

function pulseStrength(progress) {
  // The quadratic phase shortens each successive pulse.
  const cycles = progress * (1.2 + 1.8 * progress);
  return (1 - Math.cos(cycles * 2 * Math.PI)) / 2;
}

function expiryWarning(timeLeft) {
  if (timeLeft <= 0 || timeLeft >= 1) return 0;
  return reducedMotion.matches ? 0.65 : 0.75 * pulseStrength(1 - timeLeft);
}

const screens = {
  ready: { status: '準備就緒', button: '開始遊戲' },
  playing: { status: '遊戲進行中' },
  'life-loss': { status: '漏接' },
  serve: { status: '等待發球', title: '再發一球', button: '發球' },
  'level-clear': { status: '關卡完成', title: '關卡完成！', button: '下一關' },
  lost: { status: '遊戲結束', title: '遊戲結束', button: '再玩一次' },
  'time-up': { status: '時間到', title: '時間到！', button: '再玩一次' },
  won: { status: '全數通關', title: '全數通關！', button: '再玩一次' },
};

const tones = {
  launch: [440, 600, 0.09],
  wall: [190, 160, 0.045],
  paddle: [300, 400, 0.07],
  brick: [600, 900, 0.075],
  'brick-damage': [250, 205, 0.075],
  'brick-reveal': [520, 780, 0.085],
  'tnt-armed': [390, 620, 0.13],
  'tnt-explode': [118, 43, 0.32],
  'shield-break': [450, 275, 0.085],
  'barrier-raise': [235, 345, 0.15],
  'barrier-hit': [300, 200, 0.09],
  shrink: [420, 240, 0.15],
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
let explosionNoise;
let lastExplosionAt = -Infinity;

function playExplosionNoise(now) {
  const duration = 0.26;
  if (!explosionNoise) {
    explosionNoise = audio.createBuffer(1, Math.ceil(audio.sampleRate * duration), audio.sampleRate);
    const samples = explosionNoise.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = Math.random() * 2 - 1;
    }
  }
  const noise = audio.createBufferSource();
  noise.buffer = explosionNoise;
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(540, now);
  filter.frequency.exponentialRampToValueAtTime(110, now + duration);
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.65, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  noise.connect(filter).connect(gain).connect(audio.destination);
  noise.start(now);
}

function playSound(event) {
  const effect = tones[event];
  if (!effect || !soundEnabled || audio?.state !== 'running') return;
  const [start, end, duration] = effect;
  const now = audio.currentTime;
  const explosion = event === 'tnt-explode';
  // Keep a cluster of simultaneous brick hits from drowning out the blast.
  if ((explosion || event === 'brick') && now - lastExplosionAt < 0.055) return;
  if (explosion) {
    lastExplosionAt = now;
    playExplosionNoise(now);
  }
  const tone = audio.createOscillator();
  const gain = audio.createGain();
  tone.type = 'triangle';
  tone.frequency.setValueAtTime(start, now);
  tone.frequency.exponentialRampToValueAtTime(end, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(explosion ? 0.25 : 0.12, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  tone.connect(gain).connect(audio.destination);
  tone.start(now);
  tone.stop(now + duration);
}

function drawPowerMark(graphic, kind, x, y) {
  if (kind === 'extra-ball') {
    graphic.circle(x - 8, y, 2.5).circle(x, y, 2.5).circle(x + 8, y, 2.5).fill(dark);
    return;
  }
  if (kind === 'shrink') {
    graphic.moveTo(x - 8, y - 4).lineTo(x - 3, y).lineTo(x - 8, y + 4)
      .moveTo(x + 8, y - 4).lineTo(x + 3, y).lineTo(x + 8, y + 4)
      .stroke({ color: dark, width: 2, cap: 'round', join: 'round' });
    return;
  }
  if (kind === 'shield') {
    graphic.poly([x - 5, y - 4, x, y - 5, x + 5, y - 4, x + 4, y + 2, x, y + 6, x - 4, y + 2]).fill(dark);
    return;
  }
  if (kind === 'barrier') {
    for (const offset of [-7, 0, 7]) graphic.roundRect(x + offset - 2.5, y - 2, 5, 4, 1);
    graphic.fill(dark);
    return;
  }
  graphic.moveTo(x - 3, y - 3).lineTo(x - 2, y - 5).lineTo(x + 2, y - 5)
    .lineTo(x + 4, y - 3).lineTo(x + 4, y - 1).lineTo(x, y + 1).lineTo(x, y + 2)
    .stroke({ color: dark, width: 2, cap: 'round', join: 'round' })
    .circle(x, y + 5, 1.15).fill(dark);
}

function drawBrick(brick, graphic = new Graphics()) {
  const { width, height, kind, paint } = brick;
  graphic.clear();
  graphic.position.set(brick.x, brick.y);
  graphic.visible = brick.active;
  if (!graphic.visible) return graphic;

  if (kind === 'invisible' && paint) {
    graphic.roundRect(0.8, 0.8, width - 1.6, height - 1.6, 2)
      .fill({ color: paint[0], alpha: 0.22 }).stroke({ color: paint[0], alpha: 0.72, width: 1.3 });
  } else if (kind === 'invisible') {
    for (let x = 5; x + 7 <= width - 5; x += 12) {
      graphic.moveTo(x, 1.5).lineTo(x + 7, 1.5)
        .moveTo(x, height - 1.5).lineTo(x + 7, height - 1.5);
    }
    for (const x of [1.5, width - 1.5]) {
      graphic.moveTo(x, 5).lineTo(x, 9).moveTo(x, height - 9).lineTo(x, height - 5);
    }
    graphic.stroke({ color: 0xe3d5ff, alpha: 0.85, width: 2.4, cap: 'round' });
  } else {
    drawSolidBrick(graphic, brick);
  }

  if (brick.shielded) {
    graphic.roundRect(0.5, 0.5, width - 1, height - 1, 4)
      .stroke({ color: shieldColor, width: 2.5 })
      .roundRect(width - 8, 6, 5, 10, 2).fill(shieldColor);
  }
  return graphic;
}

function brickMarkScale({ width, height }) {
  return Math.min(1, (width - 2) / 30, (height - 2) / 13);
}

function drawDurabilityPip(graphic, x, y, index, color, alpha, scale) {
  graphic.roundRect(x + (-13 + index * 9) * scale, y - scale, 7 * scale, 5 * scale, 1.5 * scale)
    .fill({ color, alpha });
}

function drawSolidBrick(graphic, brick) {
  const { width, height, row, kind, paint } = brick;
  let color = paint?.[0] ?? powerColors[kind] ?? hues[row];
  if (kind === 'hard' && !paint) color = hardColors[brick.hitsLeft - 1];
  const armed = kind === 'tnt' && brick.detonatesAt !== undefined;
  if (armed) color = 0xffcf73;
  const depth = Math.min(4, height / 4);
  const corner = Math.min(3, height / 4);
  const inset = Math.min(4, height / 3);
  const gloss = Math.min(2, height / 6);
  const faceHeight = height - depth;
  graphic
    .roundRect(0, depth * 0.75, width, height, corner).fill(0x0b0a1b)
    .roundRect(0, 0, width, height, corner).fill(paint?.[1] ?? powerShadows[kind] ?? shadows[row])
    .roundRect(0, 0, width, faceHeight, corner).fill(color)
    .rect(inset, depth * 0.75, width - inset * 2, gloss).fill({ color: 0xffffff, alpha: 0.38 })
    .rect(inset, depth * 0.75 + gloss * 2, gloss, gloss).fill({ color: 0xffffff, alpha: 0.45 });

  const x = width / 2;
  const y = faceHeight / 2;
  const scale = brickMarkScale(brick);
  if (paint && kind !== 'standard' && kind !== 'tnt') {
    const badgeColor = kind === 'hard' ? hardColors[brick.hitsLeft - 1] : powerColors[kind];
    graphic.roundRect(x - 14 * scale, y - 6 * scale, 28 * scale, 13 * scale, 3 * scale)
      .fill({ color: badgeColor, alpha: 0.9 });
  }
  if (kind === 'hard') {
    for (let index = 0; index < 3; index += 1) {
      drawDurabilityPip(graphic, x, y, index, dark, index < brick.hitsLeft ? 1 : 0.22, scale);
    }
  } else if (kind === 'tnt') {
    graphic.save().setTransform(scale, 0, 0, scale, x, y);
    graphic.roundRect(-15, -4, 30, 12, 3).fill(dark);
    for (const letterX of [-8, 8]) {
      graphic.moveTo(letterX - 2, -1).lineTo(letterX + 2, -1)
        .moveTo(letterX, -1).lineTo(letterX, 5);
    }
    graphic.moveTo(-2, 5).lineTo(-2, -1).lineTo(2, 5).lineTo(2, -1)
      .stroke({ color: 0xfff4dd, width: 1.4, cap: 'round', join: 'round' });
    graphic.restore();
    if (armed) graphic.star(Math.min(x + 22, width - 4), y + 2 * scale, 4, 5 * scale, 1.6 * scale).fill(0xfff4dd);
  } else if (kind !== 'standard') {
    graphic.save().setTransform(scale, 0, 0, scale, x, y);
    drawPowerMark(graphic, kind, 0, 0);
    graphic.restore();
  }
}

function showScorePopup({ width, height }, points, x, y) {
  const popup = document.createElement('span');
  popup.className = 'brick-score';
  popup.textContent = `+${points}`;
  popup.style.left = `${x / width * 100}%`;
  popup.style.top = `${y / height * 100}%`;
  popup.addEventListener('animationend', () => popup.remove(), { once: true });
  scorePopups.append(popup);
}

function burstShield(sparks, brick) {
  const centerX = brick.x + brick.width / 2;
  const centerY = brick.y + brick.height / 2;
  for (let index = 0; index < 9; index += 1) {
    const angle = (index + 0.3) * 2 * Math.PI / 9;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    sparks.push({
      x: centerX + dx * brick.width * 0.42,
      y: centerY + dy * brick.height * 0.46,
      vx: dx * (62 + index % 3 * 34),
      vy: dy * (55 + index % 3 * 34),
      life: sparkDuration,
      color: index % 2 === 0 ? shieldColor : 0x7ab7ff,
      shardX: dx * (4 + index % 3),
      shardY: dy * (4 + index % 3),
    });
  }
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
  const leftCannon = new Graphics()
    .roundRect(-5, 0, 10, 16, 2).fill(0x0c091b)
    .roundRect(-3, 1, 6, 12, 1).fill(0xffa6d1)
    .rect(-2, 1, 4, 3).fill(0xffecf7)
    .roundRect(-8, 9, 16, 8, 2).fill(0xaa397b)
    .roundRect(-8, 9, 16, 5, 2).fill(0xffa6d1);
  const rightCannon = leftCannon.clone();
  const balls = new Graphics();
  const powerUps = new Graphics();
  const paddleStars = new Graphics();
  app.stage.addChild(bricks, trail, particles, powerUps, paddle, leftCannon, rightCannon, paddleStars, balls);

  let brickViews = new Map();
  let sparks = [];
  let blasts = [];
  let durabilityFlashes = [];
  const ballFlashes = new Map();
  let blastOffset = '';
  let scoringBlast = false;
  let paddleImpacts = [];
  let lifeLoss;
  let heartPulse;
  const game = new Game((event, payload, spawnedBalls) => {
    playSound(event);
    if (event === 'paddle') {
      paddleImpacts.push({ ...payload, age: 0 });
      return;
    }
    if (event === 'miss') {
      paddleImpacts.length = 0;
      startLifeLoss(payload.x);
      return;
    }
    if (event === 'buff') {
      announcement.textContent = `獲得${buffNames[payload]}。`;
      return;
    }
    if (event === 'shrink') announcement.textContent = '球拍縮短。';
    if (event === 'barrier-raise') announcement.textContent = '磚陣下方出現攔截平台。';
    if (event === 'tnt-explode') {
      scoringBlast = true;
      blasts.push({ ...payload, life: blastDuration });
      return;
    }
    if (event === 'tnt-score') {
      scoringBlast = false;
      showScorePopup(game, payload.points, payload.x, payload.y);
      return;
    }
    if (event === 'extra-ball') {
      announcement.textContent = '已釋放 3 顆額外球。';
      for (const ball of spawnedBalls) ballFlashes.set(ball, ballFlashDuration);
    }
    const brick = payload;
    if (brick) {
      const view = brickViews.get(brick);
      if (brick.active) {
        drawBrick(brick, view);
        if (event === 'brick-damage') {
          durabilityFlashes.push({ brick, index: brick.hitsLeft, life: hardFlashDuration });
        }
        if (event === 'shield-break') burstShield(sparks, brick);
        return;
      }
      view.visible = false;
      if (!scoringBlast) {
        const lift = event === 'extra-ball' ? multiballScoreLift : 0;
        showScorePopup(game, brick.points, brick.x + brick.width / 2, brick.y + brick.height / 2 - lift);
      }
      if (!reducedMotion.matches) {
        for (let index = 0; index < 7; index += 1) {
          sparks.push({
            x: brick.x + brick.width * (index + 1) / 8,
            y: brick.y + brick.height / 2,
            vx: (Math.random() - 0.5) * 180,
            vy: (Math.random() - 0.5) * 150,
            life: sparkDuration,
            color: brick.paint?.[0] ?? powerColors[brick.kind] ?? hues[brick.row],
          });
        }
      }
    }
  });

  let displayedBricks;
  let displayedPhase;
  let displayedScore;
  let displayedTime;
  let scorePulse;
  let displayedLives;
  let pointerX;
  let gesture;
  let clockStartedAt = -Infinity;

  function startLifeLoss(x) {
    const reduced = reducedMotion.matches;
    const duration = reduced ? 0.17 : 0.28;
    lifeLoss = { duration, remaining: duration };
    lifeLossFlash.style.left = `${x / game.width * 100}%`;
    lifeLossFlash.style.opacity = '1';
    lifeLossFlash.hidden = false;

    heartPulse?.cancel();
    const frames = reduced
      ? [{ backgroundColor: '#a73450' }, { backgroundColor: 'var(--empty-heart)' }]
      : [
          { transform: 'scale(1)', backgroundColor: '#f8647f' },
          { transform: 'scale(.58)', backgroundColor: '#a73450', offset: 0.47 },
          { transform: 'scale(1)', backgroundColor: 'var(--empty-heart)' },
        ];
    heartPulse = hearts[game.lives].animate(frames, { duration: duration * 1000, easing: 'ease-out' });
  }

  function updateLifeLoss(seconds) {
    if (!lifeLoss) return;
    lifeLoss.remaining -= seconds;
    if (lifeLoss.remaining <= 0) {
      lifeLoss = undefined;
      lifeLossFlash.hidden = true;
      return;
    }
    lifeLossFlash.style.opacity = Math.min(1, lifeLoss.remaining / (lifeLoss.duration * 0.72));
  }

  function syncHud() {
    const showTimeBonus = game.phase === 'won' && game.startLevel === 1;
    const bonusSeconds = game.timeBonus / TIME_BONUS_RATE;
    const secondsLeft = showTimeBonus ? bonusSeconds : Math.ceil(game.timeLeft);
    if (displayedTime !== secondsLeft) {
      displayedTime = secondsLeft;
      clock.textContent = `${Math.floor(secondsLeft / 60)}:${number(secondsLeft % 60, 2)}`;
      clock.classList.toggle('time-low', secondsLeft <= 10);
    }
    let levelChanged = false;
    if (displayedBricks !== game.bricks) {
      for (const old of bricks.removeChildren()) old.destroy();
      brickViews = new Map(game.bricks.map((brick) => [brick, bricks.addChild(drawBrick(brick))]));
      sparks = [];
      blasts = [];
      durabilityFlashes = [];
      ballFlashes.clear();
      paddleImpacts.length = 0;
      lifeLoss = undefined;
      lifeLossFlash.hidden = true;
      heartPulse?.cancel();
      scorePopups.replaceChildren();
      displayedBricks = game.bricks;
      byId('level').textContent = number(game.level, 2);
      levelSelect.value = String(game.startLevel);
      field.style.setProperty('--layout-bottom', `${game.layoutBottom / game.height * 100}%`);
      levelChanged = true;
    }

    if (displayedScore !== game.score) {
      score.textContent = number(game.score, 5);
      scorePulse?.cancel();
      if (game.score > displayedScore && !reducedMotion.matches) {
        scorePulse = score.animate([
          { transform: 'scale(1)' },
          { transform: 'scale(1.08)', offset: 0.3 },
          { transform: 'scale(1)' },
        ], { duration: 240, easing: 'ease-out' });
      }
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

    if (lifeLoss && game.phase === 'time-up') {
      lifeLoss = undefined;
      lifeLossFlash.hidden = true;
    }
    const phase = lifeLoss ? 'life-loss' : game.phase;
    if (displayedPhase === phase && !levelChanged) return;
    const screen = screens[phase];
    const wasPlaying = displayedPhase === 'playing' || displayedPhase === 'life-loss';
    displayedPhase = phase;
    frame.dataset.phase = phase;
    announcement.textContent = phase === 'serve' ? `剩下 ${game.lives} 條命。${screen.title}。` : screen.status;
    overlay.hidden = phase === 'playing' || phase === 'life-loss';
    levelPicker.hidden = phase !== 'ready';
    levelReadout.hidden = phase === 'ready';
    if (overlay.hidden) return;
    pointerX = undefined;
    byId('message').textContent = phase === 'ready' ? LEVEL_NAMES[game.level - 1] : screen.title;
    byId('action-label').textContent = screen.button;
    const detail = byId('detail');
    detail.hidden = phase !== 'won' && phase !== 'lost' && phase !== 'time-up';
    detail.textContent = detail.hidden ? '' : `最終分數 ${game.score.toLocaleString('zh-TW')}`;
    levelBonus.hidden = phase !== 'level-clear' && phase !== 'won';
    levelBonus.textContent = levelBonus.hidden ? '' : `通關獎分 +${game.levelBonus.toLocaleString('zh-TW')} 分`;
    timeBonus.hidden = !showTimeBonus;
    timeBonus.textContent = showTimeBonus ? `時間獎分 +${game.timeBonus.toLocaleString('zh-TW')} 分（剩餘 ${bonusSeconds} 秒）` : '';
    if (wasPlaying && document.activeElement === field && document.hasFocus()) {
      actionButton.focus({ preventScroll: true });
    }
  }

  function primaryAction() {
    if (lifeLoss) return;
    if (!game.countdownRunning) clockStartedAt = performance.now();
    game.action();
    syncHud();
    field.focus({ preventScroll: true });
  }

  const keys = new Set();
  const leftKeys = ['ArrowLeft', 'KeyA'];
  const rightKeys = ['ArrowRight', 'KeyD'];

  function renderPaddle() {
    const reduced = reducedMotion.matches;
    const latest = paddleImpacts.at(-1);
    let stretch = 0;
    if (latest && !reduced) {
      const progress = latest.age / paddleImpactDuration;
      // Recover from compression, then briefly stretch before returning to rest.
      stretch = progress < 0.4
        ? -0.34 * (1 - progress / 0.4) ** 2
        : 0.13 * Math.sin((progress - 0.4) / 0.6 * Math.PI);
    }
    paddle.position.set(game.paddleX, game.paddleY - PADDLE.height * stretch);
    paddle.scale.set(game.paddleWidth / PADDLE.width * (1 - stretch * 0.16), 1 + stretch);

    leftCannon.visible = rightCannon.visible = game.effectTimeLeft('cannons') > 0;
    if (leftCannon.visible) {
      const offset = game.paddleWidth / 2 - CANNON.inset;
      leftCannon.position.set(game.paddleX - offset, game.cannonY);
      rightCannon.position.set(game.paddleX + offset, game.cannonY);
    }

    paddleStars.clear();
    for (const { x, y, age } of paddleImpacts) {
      const progress = age / paddleImpactDuration;
      const alpha = 1 - progress ** 2;
      const radius = reduced ? 8 : 9 + 3 * Math.sin(progress * Math.PI);
      paddleStars.circle(x, y, radius + 3).fill({ color: 0xffcf58, alpha: alpha * 0.2 })
        .star(x, y, 4, radius, radius * 0.36)
        .fill({ color: 0xffdf6b, alpha })
        .stroke({ color: 0xfff6d8, width: 1, alpha });
    }
  }

  function renderPlayfield() {
    for (const [brick, view] of brickViews) {
      if (!brick.active || brick.detonatesAt === undefined) continue;
      if (reducedMotion.matches) {
        view.tint = 0xffffff;
        continue;
      }

      const progress = 1 - (brick.detonatesAt - game.playTime) / TNT.delay;
      const dim = pulseStrength(progress);
      const green = Math.round(255 - 110 * dim);
      const blue = Math.round(255 - 145 * dim);
      view.tint = 0xff0000 | (green << 8) | blue;
    }

    renderPaddle();
    balls.clear();
    trail.clear();
    for (const ball of lifeLoss ? [] : game.balls) {
      const { x, y, vx, vy, bonus } = ball;
      const color = bonus ? powerColors['extra-ball'] : 0xffe27a;
      const flashLife = ballFlashes.get(ball);
      if (flashLife) {
        const fade = flashLife / ballFlashDuration;
        const alpha = Math.min(1, (1 - fade) * 6 + 0.55) * fade;
        const radius = BALL_RADIUS + (reducedMotion.matches ? 5 : 3 + (1 - fade) * 9);
        balls.circle(x, y, radius).fill({ color: 0x8ffcff, alpha: alpha * 0.28 })
          .stroke({ color: 0xe5ffff, width: 1.8, alpha });
      }
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
    for (const { x, y } of game.shots) {
      const radius = CANNON.shotRadius;
      powerUps.roundRect(x - radius, y - radius, radius * 2, 13, radius).fill(0xffa6d1)
        .roundRect(x - 1, y - 2, 2, 7, 1).fill(0xffecf7);
    }
    for (const { x, y, kind = 'buff' } of game.drops) {
      const radius = DROP_RADIUS;
      powerUps.poly([x, y - radius, x + radius, y, x, y + radius, x - radius, y])
        .fill(powerColors[kind]).stroke({ color: kind === 'shrink' ? 0xfff2e5 : 0xffdcf5, width: 1.5 });
      drawPowerMark(powerUps, kind, x, y);
    }
    const guardWarning = expiryWarning(game.effectTimeLeft('guards'));
    for (const { x } of game.guards) {
      const left = x - GUARD.width / 2;
      powerUps.roundRect(left, game.guardY, GUARD.width, GUARD.height, 3).fill(powerShadows['extra-ball'])
        .roundRect(left, game.guardY, GUARD.width, GUARD.height - 3, 3).fill(powerColors['extra-ball']);
      if (guardWarning > 0) {
        powerUps.roundRect(left, game.guardY, GUARD.width, GUARD.height - 3, 3)
          .fill({ color: 0xfff6dc, alpha: guardWarning });
      }
    }
    const barrierWarning = expiryWarning(game.effectTimeLeft('barrier'));
    const barrierY = game.barrierY;
    for (const { x } of game.barriers) {
      const width = game.barrierWidth - 4;
      powerUps.roundRect(x + 2, barrierY, width, BARRIER.height, 3).fill(powerShadows.barrier)
        .roundRect(x + 2, barrierY + 3, width, BARRIER.height - 3, 3).fill(powerColors.barrier);
      if (barrierWarning > 0) {
        powerUps.roundRect(x + 2, barrierY + 3, width, BARRIER.height - 3, 3)
          .fill({ color: 0xfff6dc, alpha: barrierWarning });
      }
    }
  }

  function renderBrickEffects(seconds) {
    const reduced = reducedMotion.matches;
    particles.clear();
    for (const blast of blasts) {
      blast.life -= seconds;
      if (blast.life <= 0) continue;
      const fade = blast.life / blastDuration;
      const radius = reduced ? TNT.radius : TNT.radius * (1 - 0.55 * fade);
      particles.circle(blast.x, blast.y, radius)
        .fill({ color: 0xff985a, alpha: 0.22 * fade })
        .stroke({ color: 0xffdf95, width: 3, alpha: fade });
    }
    blasts = blasts.filter(({ life }) => life > 0);

    let offset = '';
    const latestBlast = blasts.at(-1);
    if (latestBlast && !reduced) {
      const progress = (blastDuration - latestBlast.life) / shakeDuration;
      if (progress < 1) {
        const decay = (1 - progress) ** 2;
        const x = Math.cos(progress * Math.PI * 5) * decay * 0.55;
        const y = Math.sin(progress * Math.PI * 5) * decay * 0.5;
        offset = `${x.toFixed(3)}% ${y.toFixed(3)}%`;
      }
    }
    if (offset !== blastOffset) {
      if (offset) field.style.setProperty('--blast-offset', offset);
      else field.style.removeProperty('--blast-offset');
      blastOffset = offset;
    }

    for (const flash of durabilityFlashes) {
      flash.life -= seconds;
      const { brick, life, index } = flash;
      if (!brick.active || life <= 0) continue;
      const faceHeight = brick.height - Math.min(4, brick.height / 4);
      drawDurabilityPip(particles, brick.x + brick.width / 2, brick.y + faceHeight / 2,
        index, 0xf9fbff, Math.min(1, life / hardFlashDuration * 1.65), brickMarkScale(brick));
    }
    durabilityFlashes = durabilityFlashes.filter(({ brick, life }) => brick.active && life > 0);

    for (const spark of sparks) {
      spark.life -= seconds;
      if (spark.life <= 0) continue;
      if (!reduced) {
        spark.x += spark.vx * seconds;
        spark.y += spark.vy * seconds;
      }
      const { x, y, color, shardX, shardY } = spark;
      const alpha = spark.life / sparkDuration;
      if (shardX !== undefined) {
        particles.poly([
          x + shardX, y + shardY,
          x - shardY * 0.45, y + shardX * 0.45,
          x - shardX, y - shardY,
          x + shardY * 0.45, y - shardX * 0.45,
        ]).fill({ color, alpha }).stroke({ color: 0xeaffff, width: 0.75, alpha });
      } else if (!reduced) {
        particles.rect(x, y, 4, 4).fill({ color, alpha });
      }
    }
    sparks = sparks.filter((spark) => spark.life > 0);
  }

  app.ticker.add((ticker) => {
    const elapsedSeconds = Math.min(ticker.elapsedMS, performance.now() - clockStartedAt) / 1000;
    const seconds = Math.min(ticker.deltaMS / 1000, elapsedSeconds, 0.04);
    const direction = Number(rightKeys.some((key) => keys.has(key))) - Number(leftKeys.some((key) => keys.has(key)));
    updateLifeLoss(seconds);
    if (paddleImpacts.length > 0) {
      for (const impact of paddleImpacts) impact.age += seconds;
      paddleImpacts = paddleImpacts.filter(({ age }) => age < paddleImpactDuration);
    }
    for (const [ball, life] of ballFlashes) {
      if (life <= seconds) ballFlashes.delete(ball);
      else ballFlashes.set(ball, life - seconds);
    }
    game.update(seconds, { direction, pointerX, elapsedSeconds });
    syncHud();
    renderPlayfield();
    renderBrickEffects(seconds);
  });

  window.addEventListener('keydown', (event) => {
    if (helpDialog.open || event.ctrlKey || event.metaKey || event.altKey || event.target === levelSelect) return;
    if (leftKeys.includes(event.code) || rightKeys.includes(event.code)) {
      event.preventDefault();
      pointerX = undefined;
      keys.add(event.code);
    }
    if (event.code === 'Space' && !event.target.closest('button')) {
      event.preventDefault();
      if (!event.repeat && game.phase !== 'playing') primaryAction();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));

  function clearMovement() {
    keys.clear();
    pointerX = undefined;
    gesture = undefined;
  }
  window.addEventListener('blur', clearMovement);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearMovement();
  });

  function moveToPointer(event) {
    const bounds = field.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width * game.width;
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
  helpButton.addEventListener('click', () => {
    clearMovement();
    helpDialog.showModal();
  });
  levelSelect.addEventListener('change', () => {
    if (game.phase !== 'ready') return;
    clearMovement();
    game.reset(Number(levelSelect.value));
    syncHud();
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
  if (document.fullscreenEnabled) {
    fullscreenButton.hidden = false;
    fullscreenButton.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        announcement.textContent = '目前無法切換全螢幕。';
      }
    });
    document.addEventListener('fullscreenchange', () => {
      const active = Boolean(document.fullscreenElement);
      fullscreenButton.setAttribute('aria-pressed', String(active));
      byId('fullscreen-label').textContent = active ? '退出全螢幕' : '全螢幕';
    });
  }

  byId('level-total').textContent = ` / ${number(LEVELS, 2)}`;
  levelSelect.replaceChildren(...LEVEL_NAMES.map((name, index) => new Option(`${number(index + 1, 2)} · ${name}`, index + 1)));
  best.textContent = number(bestScore, 5);
  actionButton.disabled = false;
  helpButton.disabled = false;
  soundButton.disabled = !(window.AudioContext || window.webkitAudioContext);
  syncHud();

  new ResizeObserver(([{ contentRect: { width, height } }]) => {
    if (!width || !height) return;
    // Keep one scale for both axes while extending the court to fit the viewport.
    const scale = Math.min(width / WIDTH, height / HEIGHT);
    const courtWidth = Math.round(width / scale);
    const courtHeight = Math.round(height / scale);
    const bricksChangedWidth = courtWidth !== game.width;
    if (game.resize(courtWidth, courtHeight)) {
      if (bricksChangedWidth) {
        for (const [brick, view] of brickViews) drawBrick(brick, view);
      }
      field.style.setProperty('--layout-bottom', `${game.layoutBottom / game.height * 100}%`);
      sparks = [];
      blasts = [];
      paddleImpacts.length = 0;
      scorePopups.replaceChildren();
      pointerX = undefined;
    }
    app.renderer.resize(courtWidth, courtHeight, Math.min(devicePixelRatio, 2) * scale);
    renderPlayfield();
    renderBrickEffects(0);
    app.render();
  }).observe(field);
}

init().catch((error) => {
  console.error(error);
  announcement.textContent = '遊戲載入失敗';
  byId('message').textContent = '遊戲載入失敗';
  byId('action-label').textContent = '重新載入';
  actionButton.disabled = false;
  actionButton.addEventListener('click', () => location.reload());
});
