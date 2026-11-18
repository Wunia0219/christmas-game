import assert from 'node:assert/strict';
import test from 'node:test';
import { BALL_RADIUS, BUFFS, BUFF_DURATION, CANNON, DROP_RADIUS, Game, GUARD, HEIGHT, LEVELS, LIVES, PADDLE } from '../src/game.js';

function startGame() {
  const game = new Game(() => {});
  game.action();
  return game;
}

function hitBrick(game, brick) {
  Object.assign(game.balls[0], {
    x: brick.x + brick.width / 2,
    y: brick.y + brick.height + BALL_RADIUS + 1,
    vx: 0,
    vy: -450,
  });
  game.update(1 / 120);
}

function sendBallOut(ball) {
  Object.assign(ball, { x: 8, y: HEIGHT + BALL_RADIUS - 1, vx: 0, vy: 400 });
}

function bounceOffPaddle(game) {
  const [ball] = game.balls;
  Object.assign(ball, { x: game.paddleX, y: PADDLE.y - BALL_RADIUS - 1, vx: 0, vy: 420 });
  game.update(1 / 120);
  assert(ball.vy < 0);
}

test('a paddle arriving just after the ball crosses its top saves the ball', () => {
  const game = startGame();
  game.activateBuff('guards');
  const [ball] = game.balls;
  const contactY = PADDLE.y - BALL_RADIUS;
  Object.assign(ball, { x: game.paddleX + PADDLE.width / 2 + BALL_RADIUS + 15, y: contactY - 1, vx: 0, vy: 420 });

  game.update(0.008, { direction: 1 });
  assert(ball.y > contactY);
  assert(ball.vy > 0);
  game.update(0.02, { direction: 1 });

  assert(ball.vy < 0);
  assert(ball.y < contactY);
  assert.equal(game.lives, LIVES);
  assert.equal(game.guards.length, 3);
});

test('a moving paddle can still catch a ball it overlaps at the start of a step', () => {
  const game = startGame();
  const [ball] = game.balls;
  Object.assign(ball, {
    x: game.paddleX + PADDLE.width / 2 + BALL_RADIUS - 1,
    y: PADDLE.y - BALL_RADIUS - 0.2,
    vx: 0,
    vy: 400,
  });

  game.update(1 / 120, { direction: -1 });
  assert(ball.vy < 0);
});

test('paddle grace ends when too much time or distance has passed', () => {
  const cases = [
    { vy: 150, delay: 0.06 }, // Beyond the time limit while still within reach vertically.
    { vy: 570, delay: 0.038 }, // Beyond the depth limit while still within the time window.
  ];
  for (const { vy, delay } of cases) {
    const game = startGame();
    const [ball] = game.balls;
    Object.assign(ball, { x: 600, y: PADDLE.y - BALL_RADIUS - 1, vx: 0, vy });

    game.update(delay);
    game.movePaddle(ball.x);
    game.update(0.45);

    assert.equal(game.lives, LIVES - 1);
    assert.equal(game.phase, 'serve');
  }
});

test('a multiball brick releases three extra balls, and only losing all balls costs a life', () => {
  const game = startGame();
  const brick = game.bricks.find(({ kind }) => kind === 'extra-ball');
  hitBrick(game, brick);

  assert.equal(brick.active, false);
  assert.equal(game.score, brick.points);
  assert.equal(game.remaining, 49);
  assert.equal(game.balls.length, 4);
  const [original, ...extras] = game.balls;
  assert(extras.every((ball) => ball.bonus && ball.vy > 0));
  assert.equal(new Set(extras.map(({ vx }) => vx)).size, 3);
  const initialY = extras[0].y;
  sendBallOut(original);
  game.update(0.01);
  assert.deepEqual(game.balls, extras);
  assert(extras.every((ball) => ball.y > initialY));
  assert.equal(game.lives, LIVES);
  assert.equal(game.phase, 'playing');

  game.movePaddle(650);
  extras.forEach(sendBallOut);
  game.update(0.01);
  assert.equal(game.lives, LIVES - 1);
  assert.equal(game.balls.length, 1);
  assert.equal(game.phase, 'serve');
  assert.equal(game.paddleX, 650);
  assert.equal(game.balls[0].x, game.paddleX);

  game.action();
  assert.equal(game.phase, 'playing');
  assert.equal(game.balls[0].x, game.paddleX);
  assert(game.balls[0].vy < 0);
});

test('buff drops descend vertically and must be caught by the paddle', (context) => {
  const random = context.mock.method(Math, 'random', () => 0);
  const game = startGame();
  const brick = game.bricks.find(({ kind }) => kind === 'buff');
  hitBrick(game, brick);
  assert.equal(game.drops.length, 1);
  const [drop] = game.drops;
  const x = drop.x;
  const y = drop.y;
  game.update(0.1);
  assert.equal(drop.x, x);
  assert(drop.y > y);
  assert.equal(random.mock.callCount(), 0);

  game.movePaddle(x);
  drop.y = PADDLE.y - DROP_RADIUS - 1;
  game.update(0.02);
  assert.equal(game.drops.length, 0);
  assert.equal(random.mock.callCount(), 1);
  assert(game.effectTimeLeft('wide') > BUFF_DURATION - 0.02);
  assert(game.paddleWidth > PADDLE.width);

  game.movePaddle(8);
  game.drops.push({ x: 700, y: PADDLE.y - DROP_RADIUS - 1 });
  game.update(0.45);
  assert.equal(game.drops.length, 0);
  assert.equal(random.mock.callCount(), 1);
});

test('a caught cannon buff fires from both ends only when the paddle bounces a ball', (context) => {
  context.mock.method(Math, 'random', () => (BUFFS.indexOf('cannons') + 0.5) / BUFFS.length);
  const game = startGame();
  const [ball] = game.balls;
  game.drops.push({ x: game.paddleX, y: PADDLE.y - DROP_RADIUS - 1 });
  game.update(0.01);
  assert(game.effectTimeLeft('cannons') > BUFF_DURATION - 0.01);
  assert.equal(game.shots.length, 0);

  game.activateBuff('guards');
  const [guard] = game.guards;
  Object.assign(ball, { x: guard.x, y: GUARD.y - BALL_RADIUS - 1, vx: 0, vy: 400 });
  game.update(1 / 120);
  assert(ball.vy < 0);
  assert.equal(game.shots.length, 0);

  game.activateBuff('wide');
  bounceOffPaddle(game);
  const offset = game.paddleWidth / 2 - CANNON.inset;
  assert.deepEqual(game.shots.map(({ x }) => x), [game.paddleX - offset, game.paddleX + offset]);
  assert(game.shots.every(({ y, vx, vy }) => y < CANNON.muzzleY && vx === 0 && vy < 0));

  const shotPositions = game.shots.map(({ y }) => y);
  game.togglePause();
  game.update(0.2);
  assert.deepEqual(game.shots.map(({ y }) => y), shotPositions);
  game.togglePause();
  sendBallOut(ball);
  game.update(0.01);
  assert.equal(game.effectTimeLeft('cannons'), 0);
  assert.equal(game.shots.length, 0);
});

test('each cannon shot stops at its first brick and triggers that brick’s effect', () => {
  const events = [];
  const game = new Game((event) => events.push(event));
  game.action();
  const [ball] = game.balls;
  const shotX = game.paddleX - game.paddleWidth / 2 + CANNON.inset;
  const target = { x: shotX - 20, width: 40, height: 20, points: 10, active: true };
  const extra = { ...target, kind: 'extra-ball', y: 100 };
  const buff = { ...target, kind: 'buff', y: 180 };
  const standard = { ...target, kind: 'standard', y: 260 };
  const last = { ...target, kind: 'standard', y: 180, x: shotX + 150 };
  game.bricks = [extra, buff, standard, last];
  game.remaining = game.bricks.length;
  game.activateBuff('cannons');

  for (const brick of [standard, buff, extra]) {
    bounceOffPaddle(game);
    Object.assign(ball, { vx: 0, vy: 0 });
    game.update(0.6);
    assert.equal(brick.active, false);
    assert.equal(game.shots.length, 0);
    if (brick === standard) assert(buff.active);
    if (brick === buff) {
      assert(extra.active);
      assert.equal(game.drops.length, 1);
    }
  }
  assert.equal(game.score, 30);
  assert.equal(game.remaining, 1);
  assert.equal(game.balls.filter(({ bonus }) => bonus).length, 3);
  assert.deepEqual(events.filter((event) => event === 'brick' || event === 'extra-ball'), ['brick', 'brick', 'extra-ball']);

  game.movePaddle(game.paddleX + 150);
  bounceOffPaddle(game);
  game.update(0.4);
  assert.equal(game.phase, 'level-clear');
  assert.equal(game.score, 40);
  assert.equal(game.shots.length, 0);
  assert.equal(game.effectTimeLeft('cannons'), 0);
});

test('timed buffs coexist, refresh, freeze on pause, and expire in play', () => {
  const game = startGame();
  game.balls[0].vx = 0;
  game.balls[0].vy = 0;
  const normalSpeed = game.paddleSpeed;
  for (const kind of BUFFS) game.activateBuff(kind);
  assert(game.paddleSpeed > normalSpeed);

  const x = game.paddleX;
  game.update(0.1, { pointerX: x + 400 });
  assert(game.paddleX - x > normalSpeed * 1.6 * 0.1);
  game.togglePause();
  const remaining = game.effectTimeLeft('wide');
  game.update(20);
  assert.equal(game.effectTimeLeft('wide'), remaining);
  game.togglePause();
  game.activateBuff('fast');
  assert(game.effectTimeLeft('fast') > remaining);
  game.update(BUFF_DURATION + 0.01);
  assert(BUFFS.every((kind) => game.effectTimeLeft(kind) === 0));
  assert.equal(game.guards.length, 0);
  assert.equal(game.paddleWidth, PADDLE.width);
  assert.equal(game.paddleSpeed, normalSpeed);
  bounceOffPaddle(game);
  assert.equal(game.shots.length, 0);
});

test('each guard bounces one ball and cannot catch another ball afterward', () => {
  const game = startGame();
  game.activateBuff('guards');
  assert.equal(game.guards.length, 3);
  const ball = game.balls[0];
  for (const guard of [...game.guards]) {
    const remaining = game.guards.length;
    Object.assign(ball, { x: guard.x, y: GUARD.y - BALL_RADIUS - 1, vx: 0, vy: 400 });
    game.update(0.01);
    assert(ball.vy < 0);
    assert.equal(game.guards.length, remaining - 1);
  }
  assert.equal(game.effectTimeLeft('guards'), 0);

  Object.assign(ball, { x: 137, y: GUARD.y - BALL_RADIUS - 1, vx: 0, vy: 400 });
  game.update(0.1);
  assert.equal(game.lives, LIVES - 1);
});

test('losing the last ball, advancing a level, and restarting clear temporary effects', () => {
  const game = startGame();
  game.activateBuff('wide');
  game.drops.push({ x: 700, y: 200 });
  sendBallOut(game.balls[0]);
  game.update(0.01);
  assert.equal(game.effectTimeLeft('wide'), 0);
  assert.equal(game.drops.length, 0);
  game.action();

  for (let level = 1; level <= LEVELS; level += 1) {
    game.activateBuff('guards');
    for (const brick of [...game.bricks].reverse()) hitBrick(game, brick);
    assert.equal(game.remaining, 0);
    assert.equal(game.phase, level < LEVELS ? 'level-clear' : 'won');
    assert.equal(game.guards.length, 0);
    assert.equal(game.drops.length, 0);
    assert.equal(game.balls.length, 0);
    if (level < LEVELS) game.action();
  }

  game.reset();
  assert.equal(game.level, 1);
  assert.equal(game.balls.length, 1);
  assert.equal(game.lives, LIVES);
});
