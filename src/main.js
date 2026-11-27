import { Application, Container, Graphics } from 'pixi.js';
import { BALL_RADIUS, BARRIER, CANNON, Game, GUARD, HEIGHT, LEVEL_NAMES, LEVELS, PADDLE, TIME_BONUS_RATE, TNT, WIDTH } from './game.js';
import { assist, bonusBallColor, brickColor, drawBall, drawBrick, drawDrop, drawGiftSparkles, drawHardCrack, drawPaddleImpact, drawRail, drawShot, drawSpark, loadGameTextures, makeCannon, makePaddle } from './art.js';
import { drawScore } from './score-art.js';

const byId = (id) => document.getElementById(id);
const gameView = byId('game-view');
const field = byId('field');
const frame = field.closest('.game-frame');
const overlay = byId('overlay');
const actionButton = byId('action');
const levelReadout = byId('level-readout');
const score = byId('score');
const scoreValue = byId('score-value');
const scorePixels = byId('score-pixels');
const clockValue = byId('time-value');
const clockPixels = byId('time-pixels');
const launchCountdown = byId('launch-countdown');
const countdownLevel = byId('countdown-level');
const countdownPixels = byId('countdown-pixels');
const levelBonus = byId('level-bonus');
const timeBonus = byId('time-bonus');
const scorePopups = byId('score-popups');
const lives = byId('lives');
const lifeLossFlash = byId('life-loss-flash');
const announcement = byId('announcement');
const hearts = [...lives.children];

const blastDuration = 0.28;
const shakeDuration = 0.18;
const brickSparkDuration = 0.18;
const shieldSparkDuration = 0.28;
const hardFlashDuration = 0.14;
const ballFlashDuration = 0.26;
const paddleImpactDuration = 0.11;
const multiballScoreLift = 34;
const buffNames = { wide: '球拍加長', fast: '球拍加速', guards: '底線保護', cannons: '雙側砲台' };
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
  ready: { status: '準備就緒' },
  playing: { status: '遊戲進行中' },
  'life-loss': { status: '漏接' },
  serve: { title: '再發一球', button: '發球' },
  'level-clear': { status: '關卡完成', title: '關卡完成！', button: '下一關' },
  lost: { status: '遊戲結束', title: '遊戲結束', button: '再玩一次' },
  'time-up': { status: '時間到', title: '時間到！', button: '再玩一次' },
  won: { status: '全數通關', title: '全數通關！', button: '再玩一次' },
};

const tones = {
  launch: [440, 600, 0.09],
  wall: [190, 160, 0.045],
  paddle: [460, 350, 0.048],
  brick: [680, 930, 0.065],
  'brick-damage': [310, 180, 0.085],
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

let audio;
let explosionNoise;
let lastExplosionAt = -Infinity;

async function playLaunchSound() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  try {
    // A countdown can launch after the original user gesture.
    audio ??= new Audio();
    if (audio.state !== 'running') await audio.resume();
    playSound('launch');
  } catch { /* Gameplay can continue if audio is unavailable. */ }
}

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
  if (!effect || audio?.state !== 'running') return;
  const [start, end, duration] = effect;
  const now = audio.currentTime;
  const explosion = event === 'tnt-explode';
  const hardHit = event === 'brick-damage';
  // Keep a cluster of simultaneous brick hits from drowning out the blast.
  if ((explosion || event === 'brick') && now - lastExplosionAt < 0.055) return;
  if (explosion) {
    lastExplosionAt = now;
    playExplosionNoise(now);
  }
  const tone = audio.createOscillator();
  const gain = audio.createGain();
  tone.type = hardHit ? 'square' : 'triangle';
  tone.frequency.setValueAtTime(start, now);
  tone.frequency.exponentialRampToValueAtTime(end, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(explosion ? 0.25 : hardHit ? 0.065 : 0.12, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  tone.connect(gain).connect(audio.destination);
  tone.start(now);
  tone.stop(now + duration);
}

function showScorePopup({ width, height }, points, x, y) {
  const popup = document.createElement('canvas');
  popup.className = 'brick-score';
  popup.textContent = `+${points}`;
  drawScore(popup, popup.textContent, { color: '#fff2cf', outline: '#21190f' });
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
      life: shieldSparkDuration,
      color: index % 2 === 0 ? assist.ice : 0x5599d7,
      shardX: dx * (4 + index % 3),
      shardY: dy * (4 + index % 3),
    });
  }
}

export async function initGame() {
  const app = new Application();
  await app.init({
    width: WIDTH,
    height: HEIGHT,
    backgroundAlpha: 0,
    antialias: false,
    autoStart: false,
    resolution: Math.min(devicePixelRatio, 2),
    preference: ['webgl', 'canvas'],
  });
  byId('canvas-layer').appendChild(app.canvas);
  const textures = await loadGameTextures();

  const bricks = new Container();
  const trail = new Graphics();
  const particles = new Graphics();
  const dropSparkles = new Graphics();
  const { paddle, body: paddleBody } = makePaddle();
  const leftCannon = makeCannon();
  const rightCannon = leftCannon.clone();
  const balls = new Graphics();
  const powerUps = new Graphics();
  const paddleStars = new Graphics();
  app.stage.addChild(bricks, trail, particles, dropSparkles, powerUps, paddle, leftCannon, rightCannon, paddleStars, balls);

  let brickViews = new Map();
  let sparks = [];
  let blasts = [];
  let durabilityFlashes = [];
  const ballFlashes = new Map();
  const giftDropStartedAt = new WeakMap();
  let blastOffset = '';
  let scoringBlast = false;
  let paddleImpacts = [];
  let lifeLoss;
  let heartPulse;
  let phaseStartedAt = -Infinity;
  const game = new Game((event, payload, spawnedBalls) => {
    if (event === 'launch') {
      phaseStartedAt = performance.now();
      void playLaunchSound();
      return;
    }
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
      announcement.textContent = `已釋放 ${spawnedBalls.length} 顆額外球。`;
      for (const ball of spawnedBalls) ballFlashes.set(ball, ballFlashDuration);
    }
    const brick = payload;
    if (brick) {
      const view = brickViews.get(brick);
      if (brick.active) {
        drawBrick(brick, textures, view);
        if (event === 'brick-damage') {
          durabilityFlashes.push({ brick, life: hardFlashDuration });
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
        for (let index = 0; index < 4; index += 1) {
          sparks.push({
            x: brick.x + brick.width * (index + 1) / 5,
            y: brick.y + brick.height / 2,
            vx: (Math.random() - 0.5) * 120,
            vy: (Math.random() - 0.5) * 100,
            life: brickSparkDuration,
            color: brickColor(brick),
          });
        }
      }
    }
  });

  let displayedBricks;
  let displayedPhase;
  let displayedScore;
  let displayedTime;
  let displayedLaunchNumber;
  let scorePulse;
  let displayedLives;
  let pointerX;
  let gesture;

  function startLifeLoss(x) {
    const reduced = reducedMotion.matches;
    const duration = reduced ? 0.17 : 0.28;
    lifeLoss = { duration, remaining: duration };
    lifeLossFlash.style.left = `${x / game.width * 100}%`;
    lifeLossFlash.style.opacity = '1';
    lifeLossFlash.hidden = false;

    heartPulse?.cancel();
    const frames = reduced
      ? [{ backgroundColor: 'var(--heart-hit)' }, { backgroundColor: 'var(--empty-heart)' }]
      : [
          { transform: 'scale(1)', backgroundColor: 'var(--heart-full)' },
          { transform: 'scale(.58)', backgroundColor: 'var(--heart-hit)', offset: 0.47 },
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
      const display = `${Math.floor(secondsLeft / 60)}:${number(secondsLeft % 60, 2)}`;
      clockValue.textContent = display;
      drawScore(clockPixels, display, { color: secondsLeft <= 10 ? '#9b3146' : '#28574e' });
    }
    let levelChanged = false;
    if (displayedBricks !== game.bricks) {
      for (const old of bricks.removeChildren()) old.destroy();
      brickViews = new Map(game.bricks.map((brick) => [brick, bricks.addChild(drawBrick(brick, textures))]));
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
      field.style.setProperty('--layout-bottom', `${game.layoutBottom / game.height * 100}%`);
      levelChanged = true;
    }

    if (displayedScore !== game.score) {
      const display = number(game.score, 5);
      scoreValue.textContent = display;
      drawScore(scorePixels, display);
      scorePulse?.cancel();
      if (game.score > displayedScore && !reducedMotion.matches) {
        scorePulse = score.animate([
          { transform: 'scale(1)' },
          { transform: 'scale(1.08)', offset: 0.3 },
          { transform: 'scale(1)' },
        ], { duration: 240, easing: 'ease-out' });
      }
      displayedScore = game.score;
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
    const launchNumber = phase === 'countdown' ? Math.ceil(game.launchIn) : 0;
    if (displayedLaunchNumber !== launchNumber) {
      displayedLaunchNumber = launchNumber;
      if (launchNumber) {
        countdownLevel.textContent = LEVEL_NAMES[game.level - 1];
        drawScore(countdownPixels, String(launchNumber), { color: '#ffdf9a', outline: '#352223' });
        announcement.textContent = `${countdownLevel.textContent}，${launchNumber} 秒後發球。`;
      }
    }
    if (displayedPhase === phase && !levelChanged) return;
    const screen = screens[phase];
    const wasPlaying = displayedPhase === 'playing' || displayedPhase === 'life-loss';
    displayedPhase = phase;
    frame.dataset.phase = phase;
    if (phase === 'serve') announcement.textContent = `剩下 ${game.lives} 條命。等待發球，計時暫停。`;
    else if (screen) announcement.textContent = screen.status;
    launchCountdown.hidden = phase !== 'countdown';
    overlay.hidden = !screen?.button;
    levelReadout.hidden = phase === 'ready';
    if (overlay.hidden) return;
    pointerX = undefined;
    byId('message').textContent = screen.title;
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
    if (lifeLoss || game.phase === 'countdown') return;
    game.action();
    if (game.phase === 'countdown') phaseStartedAt = performance.now();
    syncHud();
    field.focus({ preventScroll: true });
  }

  const keys = new Set();
  const leftKeys = ['ArrowLeft', 'KeyA'];
  const rightKeys = ['ArrowRight', 'KeyD'];

  function renderPaddle() {
    const reduced = reducedMotion.matches;
    const latest = paddleImpacts.at(-1);
    const compression = latest && !reduced ? 0.16 * (1 - latest.age / paddleImpactDuration) ** 2 : 0;
    paddle.position.set(game.paddleX, game.paddleY);
    paddle.scale.y = 1 - compression;
    paddleBody.scale.x = game.paddleWidth / PADDLE.width;

    leftCannon.visible = rightCannon.visible = game.effectTimeLeft('cannons') > 0;
    if (leftCannon.visible) {
      const offset = game.paddleWidth / 2 - CANNON.inset;
      leftCannon.position.set(game.paddleX - offset, game.cannonY);
      rightCannon.position.set(game.paddleX + offset, game.cannonY);
    }

    paddleStars.clear();
    for (const { x, y, age } of paddleImpacts) {
      drawPaddleImpact(paddleStars, x, y, age / paddleImpactDuration, reduced);
    }
  }

  function renderPlayfield() {
    for (const [brick, view] of brickViews) {
      if (!brick.active || brick.detonatesAt === undefined) continue;
      const progress = 1 - (brick.detonatesAt - game.playTime) / TNT.delay;
      view.alpha = reducedMotion.matches ? 0.72 : 1 - 0.45 * pulseStrength(progress);
    }

    renderPaddle();
    balls.clear();
    trail.clear();
    for (const ball of lifeLoss ? [] : game.balls) {
      const { x, y, vx, vy, bonus } = ball;
      const color = bonus ? bonusBallColor : 0xfff2cf;
      const flashLife = ballFlashes.get(ball);
      if (flashLife) {
        const fade = flashLife / ballFlashDuration;
        const alpha = Math.min(1, (1 - fade) * 6 + 0.55) * fade;
        const radius = BALL_RADIUS + (reducedMotion.matches ? 5 : 3 + (1 - fade) * 9);
        drawSpark(balls, x, y, radius, 0xffd48a, alpha);
      }
      drawBall(balls, x, y, bonus, textures);
      if (reducedMotion.matches || game.phase !== 'playing') continue;
      for (let index = 3; index >= 1; index -= 1) {
        const size = 5 - index;
        trail.rect(x - vx * index * 0.018 - size / 2, y - vy * index * 0.018 - size / 2, size, size)
          .fill({ color, alpha: 0.32 / index });
      }
    }

    dropSparkles.clear();
    powerUps.clear();
    for (const { x, y } of game.shots) drawShot(powerUps, x, y);
    for (const drop of game.drops) {
      const { x, y, kind = 'buff' } = drop;
      if (kind === 'buff') {
        const startedAt = giftDropStartedAt.get(drop) ?? game.playTime;
        giftDropStartedAt.set(drop, startedAt);
        drawGiftSparkles(dropSparkles, x, y, game.playTime - startedAt, reducedMotion.matches);
      }
      drawDrop(powerUps, x, y, kind);
    }
    const guardWarning = expiryWarning(game.effectTimeLeft('guards'));
    for (const { x } of game.guards) {
      drawRail(powerUps, x - GUARD.width / 2, game.guardY, GUARD.width, GUARD.height, 'guard', guardWarning);
    }
    const barrierWarning = expiryWarning(game.effectTimeLeft('barrier'));
    for (const { x } of game.barriers) {
      drawRail(powerUps, x + 2, game.barrierY, game.barrierWidth - 4, BARRIER.height, 'barrier', barrierWarning);
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
      const { brick, life } = flash;
      if (!brick.active || life <= 0) continue;
      drawHardCrack(particles, brick, brick.x, brick.y, life / hardFlashDuration * 0.65);
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
      const alpha = spark.life / (shardX === undefined ? brickSparkDuration : shieldSparkDuration);
      if (shardX !== undefined) {
        particles.poly([
          x + shardX, y + shardY,
          x - shardY * 0.45, y + shardX * 0.45,
          x - shardX, y - shardY,
          x + shardY * 0.45, y - shardX * 0.45,
        ]).fill({ color, alpha }).stroke({ color: 0xeaffff, width: 0.75, alpha });
      } else if (!reduced) {
        particles.rect(x, y, 3, 3).fill({ color, alpha });
      }
    }
    sparks = sparks.filter((spark) => spark.life > 0);
  }

  app.ticker.add((ticker) => {
    if (game.phase === 'ready' && !gameView.inert && !document.hidden) primaryAction();
    const elapsedSeconds = Math.min(ticker.elapsedMS, performance.now() - phaseStartedAt) / 1000;
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
    const countdownElapsed = document.hidden ? 0 : Math.min(ticker.deltaMS / 1000, elapsedSeconds);
    game.update(seconds, { direction, pointerX, elapsedSeconds: game.phase === 'countdown' ? countdownElapsed : elapsedSeconds });
    syncHud();
    renderPlayfield();
    renderBrickEffects(seconds);
  });

  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || gameView.hidden || gameView.inert || event.ctrlKey || event.metaKey || event.altKey) return;
    if (leftKeys.includes(event.code) || rightKeys.includes(event.code)) {
      event.preventDefault();
      pointerX = undefined;
      keys.add(event.code);
    }
    if (event.code === 'Space' && !event.target.closest?.('button, a')) {
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
  document.addEventListener('fullscreenchange', clearMovement);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearMovement();
  });

  function moveToPointer(event) {
    const bounds = field.getBoundingClientRect();
    if (!bounds.width) return;
    const scale = game.width / bounds.width;
    pointerX = gesture?.paddleX === undefined
      ? (event.clientX - bounds.left) * scale
      : gesture.paddleX + (event.clientX - gesture.x) * scale;
  }

  field.addEventListener('pointerdown', (event) => {
    if (gesture || event.target.closest('button') || !event.isPrimary || event.button !== 0) return;
    field.focus({ preventScroll: true });
    const mouse = event.pointerType === 'mouse';
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, paddleX: mouse ? undefined : game.paddleX, dragged: false };
    if (mouse) moveToPointer(event);
    else pointerX = undefined;
    field.setPointerCapture(event.pointerId);
  });
  field.addEventListener('pointermove', (event) => {
    if (event.target.closest('button')) return;
    if (gesture?.id === event.pointerId) {
      gesture.dragged ||= Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 9;
      moveToPointer(event);
    } else if (!gesture && event.pointerType === 'mouse') {
      moveToPointer(event);
    }
  });
  field.addEventListener('pointerup', (event) => {
    if (gesture?.id !== event.pointerId) return;
    gesture.dragged ||= Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 9;
    if (gesture.dragged) moveToPointer(event);
    if (!gesture.dragged && game.phase === 'serve') primaryAction();
    gesture = undefined;
  });
  function cancelGesture(event) {
    if (gesture?.id !== event.pointerId) return;
    gesture = undefined;
    pointerX = undefined;
  }
  field.addEventListener('pointercancel', cancelGesture);
  field.addEventListener('lostpointercapture', cancelGesture);

  actionButton.addEventListener('click', primaryAction);
  byId('level-total').textContent = ` / ${number(LEVELS, 2)}`;
  actionButton.disabled = false;
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
        for (const [brick, view] of brickViews) drawBrick(brick, textures, view);
      }
      field.style.setProperty('--layout-bottom', `${game.layoutBottom / game.height * 100}%`);
      sparks = [];
      blasts = [];
      paddleImpacts.length = 0;
      scorePopups.replaceChildren();
      pointerX = undefined;
      gesture = undefined;
    }
    app.renderer.resize(courtWidth, courtHeight, Math.min(devicePixelRatio, 2) * scale);
    renderPlayfield();
    renderBrickEffects(0);
    app.render();
  }).observe(field);

  return {
    setActive(active) {
      clearMovement();
      if (!active) {
        app.stop();
        return;
      }
      game.reset();
      phaseStartedAt = -Infinity;
      scoringBlast = false;
      syncHud();
      app.start();
    },
  };
}
