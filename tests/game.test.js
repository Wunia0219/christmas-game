import assert from 'node:assert/strict';
import test from 'node:test';
import { BALL_RADIUS, BARRIER, BUFFS, BUFF_DURATION, CANNON, DROP_RADIUS, Game, GUARD, HEIGHT, LEVELS, LIVES, PADDLE, SHRINK_DURATION, TNT, WIDTH } from '../src/game.js';

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

test('buff and nerf drops can be caught just after passing the paddle top', (context) => {
  context.mock.method(Math, 'random', () => 0);
  const catchY = PADDLE.y - DROP_RADIUS;
  for (const [kind, effect] of [['buff', 'wide'], ['shrink', 'shrink']]) {
    const game = startGame();
    const drop = { x: game.paddleX + PADDLE.width / 2 + DROP_RADIUS + 12, y: catchY - 1, kind };
    game.drops.push(drop);
    game.update(0.012);
    assert(drop.y > catchY);
    assert.equal(game.effectTimeLeft(effect), 0);

    game.update(0.025, { direction: 1 });
    assert.equal(game.drops.length, 0);
    assert(game.effectTimeLeft(effect) > 0);
  }
});

test('buff and nerf drops are missed if the paddle arrives after the grace window', (context) => {
  const random = context.mock.method(Math, 'random', () => 0);
  for (const kind of ['buff', 'shrink']) {
    const game = startGame();
    const drop = { x: game.paddleX + PADDLE.width, y: PADDLE.y - DROP_RADIUS - 1, kind };
    game.drops.push(drop);
    game.update(0.06);
    game.movePaddle(drop.x);
    game.update(0.01);
    assert.deepEqual(game.drops, [drop]);
    assert.equal(game.effectTimeLeft('wide'), 0);
    assert.equal(game.effectTimeLeft('shrink'), 0);
  }
  assert.equal(random.mock.callCount(), 0);
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

test('hard bricks bounce the ball on each hit and score only when the third hit breaks them', () => {
  const game = startGame();
  const brick = game.bricks.find(({ kind }) => kind === 'hard');
  const count = game.remaining;

  for (const hitsLeft of [2, 1, 0]) {
    hitBrick(game, brick);
    assert(game.balls[0].vy > 0);
    assert.equal(brick.hitsLeft, hitsLeft);
    assert.equal(brick.active, hitsLeft > 0);
    assert.equal(game.score, hitsLeft > 0 ? 0 : brick.points);
    assert.equal(game.remaining, hitsLeft > 0 ? count : count - 1);
  }
});

test('a ball passes through a concealed brick before it becomes a solid one-hit brick', () => {
  const game = startGame();
  const brick = game.bricks.findLast(({ kind }) => kind === 'invisible');
  const count = game.remaining;
  const [ball] = game.balls;
  const boundary = brick.y + brick.height + BALL_RADIUS;
  Object.assign(ball, { x: brick.x + brick.width / 2, y: boundary + 3.75, vx: 0, vy: -450 });
  game.update(1 / 120);
  assert.equal(ball.y, boundary);
  assert.equal(brick.kind, 'invisible');

  game.update(0.025);
  assert(ball.y < boundary && ball.vy < 0);
  assert.equal(brick.kind, 'standard');
  assert(brick.active);
  assert.equal(game.score, 0);
  assert.equal(game.remaining, count);

  hitBrick(game, brick);
  assert(ball.vy > 0);
  assert.equal(brick.active, false);
  assert.equal(game.score, brick.points);
});

test('TNT waits for its fuse, hits nearby bricks once, and lights other TNT', () => {
  const events = [];
  const game = new Game((event) => events.push(event));
  game.action();
  const center = game.bricks.find(({ kind }) => kind === 'tnt');
  const { x, y, width, height } = center;
  const standard = { ...center, kind: 'standard', x: x - 73, y: y - 31 };
  const hard = { ...center, kind: 'hard', hitsLeft: 3, x: x + 73 };
  const invisible = { ...center, kind: 'invisible', x: x + 73, y: y + 31 };
  const buff = { ...center, kind: 'buff', y: y + 31 };
  const otherTnt = { ...center, y: y - 31 };
  const distant = { ...center, kind: 'standard', y: y + 62 };
  game.bricks = [center, standard, hard, invisible, buff, otherTnt, distant];
  game.remaining = game.bricks.length;

  const [ball] = game.balls;
  Object.assign(ball, { x: x - BALL_RADIUS - 1, y: y + height / 2, vx: 450, vy: 0 });
  game.update(1 / 120);
  assert(ball.vx < 0);
  assert(center.active);
  assert.equal(game.score, 0);
  const fuse = center.detonatesAt;
  assert.equal(fuse, game.playTime + TNT.delay);
  Object.assign(ball, { x: x + width / 2, y: PADDLE.y - 40, vx: 0, vy: 0 });
  game.update(TNT.delay - 0.02);
  game.hitBrick(center);
  assert.equal(center.detonatesAt, fuse);
  game.togglePause();
  game.update(1);
  assert(center.active && standard.active);

  game.togglePause();
  game.update(0.03);
  assert.equal(center.active, false);
  assert.equal(standard.active, false);
  assert.equal(buff.active, false);
  assert.equal(game.drops.length, 1);
  assert.equal(hard.hitsLeft, 2);
  assert.equal(invisible.kind, 'standard');
  assert(invisible.active && distant.active && otherTnt.active);
  assert(otherTnt.detonatesAt > game.playTime);
  assert.equal(game.score, center.points + standard.points + buff.points);

  game.update(TNT.delay);
  assert.equal(otherTnt.active, false);
  assert.equal(hard.hitsLeft, 1);
  assert(invisible.active && distant.active);
  assert.equal(game.remaining, 3);
  assert.equal(events.filter((event) => event === 'tnt-explode').length, 2);
});

test('the shrink drop can be dodged and temporarily reduces the current paddle width by a quarter', () => {
  const game = startGame();
  const brick = game.bricks.find(({ kind }) => kind === 'shrink');
  hitBrick(game, brick);
  assert.equal(game.score, brick.points);
  assert.equal(game.paddleWidth, PADDLE.width);
  const [drop] = game.drops;
  assert.equal(drop.kind, 'shrink');
  Object.assign(game.balls[0], { vx: 0, vy: 0 });
  const catchY = PADDLE.y - DROP_RADIUS - 1;
  game.movePaddle(0);
  drop.y = catchY;
  game.update(0.4);
  assert.equal(game.drops.length, 0);
  assert.equal(game.effectTimeLeft('shrink'), 0);

  game.activateBuff('wide');
  const wideWidth = game.paddleWidth;
  game.movePaddle(drop.x);
  game.drops.push({ ...drop, y: catchY });
  game.update(1 / 120);
  assert.equal(game.paddleWidth, wideWidth * 0.75);
  assert.equal(game.effectTimeLeft('shrink'), SHRINK_DURATION);
  game.update(SHRINK_DURATION + 0.01);
  assert.equal(game.paddleWidth, wideWidth);
});

test('a shield brick adds up to two permanent one-hit shields with no scoring bonus', () => {
  const game = startGame();
  const brick = game.bricks.find(({ kind }) => kind === 'shield');
  hitBrick(game, brick);
  const targets = game.bricks.filter(({ shielded }) => shielded);
  assert.equal(targets.length, 2);
  assert(targets.every(({ x, y }) => Math.abs(x - brick.x) <= 73 && Math.abs(y - brick.y) <= 31));
  assert.equal(game.score, brick.points);
  const count = game.remaining;

  sendBallOut(game.balls[0]);
  game.update(0.01);
  assert(targets.every(({ shielded }) => shielded));
  game.action();
  Object.assign(game.balls[0], { vx: 0, vy: 0 });
  game.update(BUFF_DURATION + 1);
  assert(targets.every(({ shielded }) => shielded));

  const target = targets.find(({ kind }) => kind === 'standard');
  hitBrick(game, target);
  assert(game.balls[0].vy > 0);
  assert(target.active && !target.shielded);
  assert.equal(game.remaining, count);
  assert.equal(game.score, brick.points);
  hitBrick(game, target);
  assert.equal(target.active, false);
  assert.equal(game.score, brick.points + target.points);
});

test('each raised barrier segment stops one upward attack without scoring or blocking falling balls', () => {
  const game = startGame();
  const brick = game.bricks.find(({ kind }) => kind === 'barrier');
  hitBrick(game, brick);
  assert.equal(game.barriers.length, 3);
  const score = game.score;
  const count = game.remaining;
  const [ball] = game.balls;
  const left = BARRIER.width / 2;
  Object.assign(ball, { x: left, y: BARRIER.y - 9, vx: 0, vy: 450 });
  game.update(0.075);
  assert(ball.y > BARRIER.y + BARRIER.height && ball.vy > 0);
  assert.equal(game.barriers.length, 3);

  const underBarrier = BARRIER.y + BARRIER.height + BALL_RADIUS + 1;
  Object.assign(ball, { x: left, y: underBarrier, vy: -450 });
  game.update(1 / 120);
  assert(ball.vy > 0);
  assert.equal(game.barriers.length, 2);

  Object.assign(ball, { y: underBarrier, vy: -450 });
  game.update(1 / 120);
  assert(ball.vy < 0);
  assert.equal(game.barriers.length, 2);

  Object.assign(ball, { vx: 0, vy: 0 });
  game.shots.push({ x: WIDTH / 2, y: underBarrier, vx: 0, vy: -760 });
  game.update(0.02);
  assert.equal(game.shots.length, 0);
  assert.deepEqual(game.barriers.map(({ x }) => x), [BARRIER.width * 2]);
  assert.equal(game.score, score);
  assert.equal(game.remaining, count);

  const timeLeft = game.effectTimeLeft('barrier');
  game.togglePause();
  game.update(BARRIER.duration);
  assert.equal(game.effectTimeLeft('barrier'), timeLeft);
  game.togglePause();
  game.update(timeLeft + 0.01);
  assert.equal(game.effectTimeLeft('barrier'), 0);
  assert.equal(game.barriers.length, 0);
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
    const expectedScore = game.score + game.bricks.reduce((sum, brick) => sum + brick.points, 0);
    for (const brick of [...game.bricks].reverse()) {
      const hits = (brick.kind === 'invisible' ? 2 : brick.hitsLeft) + Number(Boolean(brick.shielded));
      for (let index = 0; index < hits && brick.active; index += 1) hitBrick(game, brick);
    }
    for (const ball of game.balls) Object.assign(ball, { vx: 0, vy: 0 });
    game.update(TNT.delay + 0.01);
    assert.equal(game.remaining, 0);
    assert.equal(game.score, expectedScore);
    assert.equal(game.phase, level < LEVELS ? 'level-clear' : 'won');
    assert.equal(game.guards.length, 0);
    assert.equal(game.barriers.length, 0);
    assert.equal(game.drops.length, 0);
    assert.equal(game.balls.length, 0);
    if (level < LEVELS) game.action();
  }

  game.reset();
  assert.equal(game.level, 1);
  assert.equal(game.balls.length, 1);
  assert.equal(game.lives, LIVES);
});
