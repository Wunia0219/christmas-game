import assert from 'node:assert/strict';
import test from 'node:test';
import { BALL_RADIUS, BARRIER, BRICK, BUFFS, BUFF_DURATION, CANNON, DROP_RADIUS, Game, GUARD, HEIGHT, LEVEL_NAMES, LEVELS, LIVES, PADDLE, ROUND_SECONDS, SHRINK_DURATION, TIME_BONUS_RATE, TNT, WIDTH } from '../src/game.js';

const levelBrickCounts = [54, 63, 71];
const levelClearBonuses = [1000, 1500, 2000];

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

test('each level shuffles brick types and snow while keeping slots, colors, counts, and points', (context) => {
  let draw = 0;
  context.mock.method(Math, 'random', () => draw);
  const game = new Game(() => {});
  assert.deepEqual(LEVEL_NAMES, ['Xmas', 'Giraffe', '十方　五甲']);
  const expectedCounts = [
    { standard: 35, 'extra-ball': 3, buff: 3, hard: 6, invisible: 2, tnt: 2, shrink: 1, shield: 1, barrier: 1 },
    { standard: 44, 'extra-ball': 3, buff: 3, hard: 6, invisible: 2, tnt: 2, shrink: 1, shield: 1, barrier: 1 },
    { standard: 50, 'extra-ball': 4, buff: 4, hard: 6, invisible: 2, tnt: 2, shrink: 1, shield: 1, barrier: 1 },
  ];

  for (const [index, counts] of expectedCounts.entries()) {
    game.level = index + 1;
    const [first, second] = [0, 0.999].map((sample) => {
      draw = sample;
      game.loadLevel('ready');
      assert.equal(game.remaining, levelBrickCounts[index]);
      const actualCounts = {};
      const snowCounts = { bare: 0, double: 0, left: 0, right: 0 };
      for (const { kind, hitsLeft, points, snow } of game.bricks) {
        actualCounts[kind] = (actualCounts[kind] ?? 0) + 1;
        snowCounts[snow] += 1;
        assert.equal(points, 30);
        assert.equal(hitsLeft, kind === 'hard' ? 2 : 1);
      }
      assert.deepEqual(actualCounts, counts);
      assert.deepEqual(Object.values(snowCounts), [0, 1, 2, 3]
        .map((index) => Math.floor((game.bricks.length + 3 - index) / 4)));
      return game.bricks;
    });
    assert.deepEqual(first.map(({ x, y, paint }) => [x, y, paint]), second.map(({ x, y, paint }) => [x, y, paint]));
    assert.notDeepEqual(first.map(({ kind }) => kind), second.map(({ kind }) => kind));
    assert.notDeepEqual(first.map(({ snow }) => snow), second.map(({ snow }) => snow));
  }
});

test('the Xmas layout keeps its barrier below the bricks', () => {
  const game = new Game(() => {});
  assert(game.barrierY >= game.layoutBottom + 10);

  game.action();
  game.hitBrick(game.bricks.find(({ kind }) => kind === 'barrier'));
  const [ball] = game.balls;
  const contactY = game.barrierY + BARRIER.height + BALL_RADIUS;
  Object.assign(ball, { x: BALL_RADIUS + 1, y: contactY + 1, vx: 0, vy: -400 });
  game.update(1 / 120);
  assert(ball.vy > 0);
  assert.equal(game.barriers.length, 2);
});

test('Giraffe keeps the dot and f caps ordinary, and a normal serve can clear the last dot', (context) => {
  context.mock.method(Math, 'random', () => 0);
  const game = new Game(() => {});
  game.reset(2);
  const [top, , dotRow] = [...new Set(game.bricks.map(({ y }) => y))];
  const [dot] = game.bricks.filter(({ y }) => y === dotRow);
  const caps = game.bricks.filter(({ x, y }) => y === top && x > WIDTH / 2);
  assert.equal(dot.kind, 'standard');
  assert.deepEqual(caps.map(({ kind }) => kind), ['standard', 'standard']);

  game.bricks = [dot];
  game.remaining = 1;
  game.movePaddle(dot.x + dot.width / 2 - 125);
  game.action();
  game.update(1.2);
  assert.equal(game.phase, 'level-clear');
  assert.equal(game.score, 1530);
});

test('all layouts use equal rectangular collision areas and the last brick can be hit', () => {
  const game = new Game(() => {});
  const wallGap = WIDTH * 0.02;
  assert(BRICK.width >= 2 * BRICK.height);
  for (let level = 1; level <= LEVELS; level += 1) {
    game.reset(level);
    for (const [index, brick] of game.bricks.entries()) {
      const { x, y, width, height } = brick;
      assert.deepEqual({ width, height }, BRICK);
      assert(x >= wallGap && x + width <= WIDTH - wallGap);
      assert(y >= 0 && y + height < PADDLE.y);
      assert(!game.bricks.slice(index + 1).some((other) =>
        x < other.x + other.width && other.x < x + width
        && y < other.y + other.height && other.y < y + height));
    }
  }

  game.reset(1);
  const lastBrick = game.bricks.findLast(({ kind }) => kind === 'standard');
  game.bricks = [lastBrick];
  game.remaining = 1;
  game.action();
  hitBrick(game, lastBrick);
  assert.equal(game.phase, 'level-clear');
  assert.equal(game.score, 1030);
});

test('a run can start at any level and replay from the selected level', () => {
  const game = new Game(() => {});
  game.reset(LEVELS);
  assert.equal(game.phase, 'ready');
  assert.equal(game.level, LEVELS);
  assert.equal(game.remaining, 71);
  assert.equal(game.score, 0);
  assert.equal(game.lives, LIVES);

  game.action();
  game.lives = 1;
  sendBallOut(game.balls[0]);
  game.update(0.01);
  assert.equal(game.phase, 'lost');
  game.action();
  assert.equal(game.phase, 'playing');
  assert.equal(game.level, LEVELS);
  assert.equal(game.lives, LIVES);
});

test('widening the court preserves the run and moves the side walls', () => {
  const game = startGame();
  const brick = game.bricks.find(({ kind }) => kind === 'standard');
  const originalX = brick.x;
  game.hitBrick(brick);
  game.activateBuff('guards');
  game.update(0.01);
  const timeBeforeResize = game.timeLeft;

  game.resize(1100, HEIGHT);
  assert.equal(game.phase, 'playing');
  assert.equal(game.score, 30);
  assert.equal(game.timeLeft, timeBeforeResize);
  assert.equal(brick.active, false);
  assert.equal(brick.x, originalX * (1100 / WIDTH));
  assert.equal(brick.width, BRICK.width * (1100 / WIDTH));
  assert.equal(game.guards[1].x, 550);

  const [ball] = game.balls;
  Object.assign(ball, { x: 1100 - BALL_RADIUS - 1, y: 350, vx: 400, vy: 0 });
  game.update(0.01);
  assert(ball.x > WIDTH);
  assert(ball.vx < 0);

  game.resize(WIDTH, HEIGHT);
  assert(Math.abs(brick.x - originalX) < 1e-9);
  assert.equal(brick.width, BRICK.width);
  assert(ball.x <= WIDTH - BALL_RADIUS);
});

test('bricks in a newly selected wide layout collide at their extended edge', () => {
  const game = new Game(() => {});
  game.resize(1200, HEIGHT);
  game.reset(2);
  game.action();
  const brick = game.bricks.find(({ kind }) => kind === 'standard');
  game.bricks = [brick];
  game.remaining = 1;
  assert.equal(brick.width, BRICK.width * 1.5);

  Object.assign(game.balls[0], {
    x: brick.x + brick.width - 1,
    y: brick.y + brick.height + BALL_RADIUS + 1,
    vx: 0,
    vy: -450,
  });
  game.update(1 / 120);
  assert.equal(brick.active, false);
  assert.equal(game.phase, 'level-clear');
});

test('changing court height keeps the paddle and its collisions aligned', () => {
  const game = new Game(() => {});
  game.resize(WIDTH, HEIGHT + 100);
  assert.equal(game.balls[0].y, game.paddleY - BALL_RADIUS - 4);
  game.action();
  game.activateBuff('cannons');
  const [ball] = game.balls;
  Object.assign(ball, { x: game.paddleX, y: game.paddleY - BALL_RADIUS - 1, vx: 0, vy: 400 });

  game.update(0.01);
  assert(ball.vy < 0);
  assert.equal(game.shots.length, 2);
  assert(game.shots.every(({ y }) => y > CANNON.muzzleY));
});

test('the round counts uncapped elapsed time after launch and resets on replay', () => {
  const game = new Game(() => {});
  game.update(20);
  assert.equal(game.timeLeft, 120);

  game.action();
  game.hitBrick(game.bricks.find(({ kind }) => kind === 'standard'));
  game.update(0.02, { elapsedSeconds: 12.5 });
  const remaining = ROUND_SECONDS - 12.5;
  assert(Math.abs(game.timeLeft - remaining) < 1e-9);
  game.action();
  assert.equal(game.phase, 'playing');
  game.activateBuff('guards');
  game.update(0.02, { elapsedSeconds: remaining });
  assert.equal(game.phase, 'time-up');
  assert.equal(game.timeLeft, 0);
  assert.equal(game.lives, LIVES);
  assert.equal(game.score, 30);
  assert.equal(game.levelBonus, 0);
  assert.equal(game.timeBonus, 0);
  assert.equal(game.balls.length, 0);
  assert.equal(game.guards.length, 0);

  game.action();
  assert.equal(game.phase, 'playing');
  assert.equal(game.timeLeft, ROUND_SECONDS);
  assert.equal(game.lives, LIVES);
  assert.equal(game.score, 0);
});

test('the same countdown and lives carry through a missed ball and a level change', () => {
  const game = startGame();
  sendBallOut(game.balls[0]);
  game.update(0.01);
  assert.equal(game.phase, 'serve');
  assert.equal(game.lives, LIVES - 1);
  const timeBeforeServe = game.timeLeft;
  game.update(3);
  assert.equal(game.timeLeft, timeBeforeServe - 3);

  game.update(30);
  assert.equal(game.timeLeft, timeBeforeServe - 33);
  assert.equal(game.phase, 'serve');
  game.action();

  const lastBrick = game.bricks.find(({ kind }) => kind === 'standard');
  game.bricks = [lastBrick];
  game.remaining = 1;
  game.hitBrick(lastBrick);
  assert.equal(game.phase, 'level-clear');
  const timeAtClear = game.timeLeft;
  game.update(4);
  game.action();
  assert.equal(game.phase, 'playing');
  assert.equal(game.level, 2);
  assert.equal(game.lives, LIVES - 1);
  assert.equal(game.timeLeft, timeAtClear - 4);
});

test('a paddle arriving just after the ball crosses its top saves the ball', () => {
  const impacts = [];
  const game = new Game((event, payload) => {
    if (event === 'paddle') impacts.push(payload);
  });
  game.action();
  game.activateBuff('guards');
  const [ball] = game.balls;
  const contactY = PADDLE.y - BALL_RADIUS;
  const paddleEdgeAtImpact = game.paddleX + PADDLE.width / 2 + 15;
  Object.assign(ball, { x: paddleEdgeAtImpact + BALL_RADIUS, y: contactY - 1, vx: 0, vy: 420 });

  game.update(0.008, { direction: 1 });
  assert(ball.y > contactY);
  assert(ball.vy > 0);
  game.update(0.02, { direction: 1 });

  assert(ball.vy < 0);
  assert(ball.y < contactY);
  assert.equal(game.lives, LIVES);
  assert.equal(game.guards.length, 3);
  assert.deepEqual(impacts, [{ x: paddleEdgeAtImpact, y: PADDLE.y }]);
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

test('a multiball brick releases four extra balls, and only losing all balls costs a life', () => {
  const releases = [];
  const misses = [];
  const game = new Game((event, brick, spawnedBalls) => {
    if (event === 'extra-ball') releases.push({ brick, spawnedBalls });
    if (event === 'miss') misses.push(brick);
  });
  game.action();
  const brick = game.bricks.find(({ kind }) => kind === 'extra-ball');
  const distantBrick = { ...brick, kind: 'standard', x: brick.x < WIDTH / 2 ? WIDTH - BRICK.width : 0 };
  game.bricks = [brick, distantBrick];
  game.remaining = game.bricks.length;
  const before = game.remaining;
  hitBrick(game, brick);

  assert.equal(brick.active, false);
  assert.equal(game.score, brick.points);
  assert.equal(game.remaining, before - 1);
  assert.equal(game.balls.length, 5);
  const [original, ...extras] = game.balls;
  assert.equal(releases.length, 1);
  assert.equal(releases[0].brick, brick);
  assert.equal(releases[0].spawnedBalls.length, extras.length);
  extras.forEach((ball, index) => assert.equal(releases[0].spawnedBalls[index], ball));
  assert(extras.every((ball) => ball.bonus && ball.vy > 0));
  assert.equal(new Set(extras.map(({ vx }) => vx)).size, 4);
  const initialY = extras[0].y;
  sendBallOut(original);
  game.update(0.01);
  assert.deepEqual(game.balls, extras);
  assert(extras.every((ball) => ball.y > initialY));
  assert.equal(game.lives, LIVES);
  assert.equal(game.phase, 'playing');
  assert.deepEqual(misses, []);

  game.movePaddle(650);
  extras.forEach(sendBallOut);
  game.update(0.01);
  assert.equal(game.lives, LIVES - 1);
  assert.equal(game.balls.length, 1);
  assert.equal(game.phase, 'serve');
  assert.equal(game.paddleX, 650);
  assert.equal(game.balls[0].x, game.paddleX);
  assert.deepEqual(misses, [{ x: 8 }]);

  game.action();
  assert.equal(game.phase, 'playing');
  assert.equal(game.balls[0].x, game.paddleX);
  assert(game.balls[0].vy < 0);
});

test('a life loss reports the last exit location when multiple balls leave in the same step', () => {
  const misses = [];
  const game = new Game((event, payload) => {
    if (event === 'miss') misses.push(payload);
  });
  game.action();
  game.balls = [
    { x: 120, y: HEIGHT + BALL_RADIUS - 1, vx: 0, vy: 400 },
    { x: 680, y: HEIGHT + BALL_RADIUS - 3, vx: 0, vy: 400 },
  ];

  game.update(1 / 120);

  assert.equal(game.lives, LIVES - 1);
  assert.deepEqual(misses, [{ x: 680 }]);
});

test('buff drops descend vertically and must be caught by the paddle', (context) => {
  const game = startGame();
  const random = context.mock.method(Math, 'random', () => 0);
  const brick = game.bricks.find(({ kind }) => kind === 'buff');
  hitBrick(game, brick);
  assert.equal(game.drops.length, 1);
  const [drop] = game.drops;
  const x = drop.x;
  const y = drop.y;
  Object.assign(game.balls[0], { vx: 0, vy: 0 });
  game.movePaddle(x < WIDTH / 2 ? WIDTH : 0);
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
    const callsBeforeDrop = random.mock.callCount();
    const drop = { x: game.paddleX + PADDLE.width, y: PADDLE.y - DROP_RADIUS - 1, kind };
    game.drops.push(drop);
    game.update(0.06);
    game.movePaddle(drop.x);
    game.update(0.01);
    assert.deepEqual(game.drops, [drop]);
    assert.equal(game.effectTimeLeft('wide'), 0);
    assert.equal(game.effectTimeLeft('shrink'), 0);
    assert.equal(random.mock.callCount(), callsBeforeDrop);
  }
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
  game.update(0.02);
  assert(game.shots.every(({ y }, index) => y < shotPositions[index]));
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
  const target = { x: shotX - 20, width: 40, height: 20, points: 30, active: true };
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
  assert.equal(game.score, 90);
  assert.equal(game.remaining, 1);
  assert.equal(game.balls.filter(({ bonus }) => bonus).length, 4);
  assert.deepEqual(events.filter((event) => event === 'brick' || event === 'extra-ball'), ['brick', 'brick', 'extra-ball']);

  game.movePaddle(game.paddleX + 150);
  bounceOffPaddle(game);
  game.update(0.4);
  assert.equal(game.phase, 'level-clear');
  assert.equal(game.score, 1120);
  assert.equal(game.shots.length, 0);
  assert.equal(game.effectTimeLeft('cannons'), 0);
});

test('hard bricks bounce the ball on both hits and score only when the second hit breaks them', () => {
  const game = startGame();
  const brick = game.bricks.find(({ kind }) => kind === 'hard');
  const count = game.remaining;

  for (const hitsLeft of [1, 0]) {
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
  const blastScores = [];
  const game = new Game((event, payload) => {
    if (event === 'tnt-score') blastScores.push(payload);
  });
  game.action();
  const center = { ...game.bricks.find(({ kind }) => kind === 'tnt'), x: 260, y: 100, width: 65, height: 23 };
  const { x, y, width, height } = center;
  const standard = { ...center, kind: 'standard', x: x - 73, y: y - 31 };
  const hard = { ...center, kind: 'hard', hitsLeft: 2, x: x + 73 };
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
  assert(center.active && standard.active);

  game.update(0.03);
  assert.equal(center.active, false);
  assert.equal(standard.active, false);
  assert.equal(buff.active, false);
  assert.equal(game.drops.length, 1);
  assert.equal(hard.hitsLeft, 1);
  assert(hard.active);
  assert.equal(invisible.kind, 'standard');
  assert(invisible.active && distant.active && otherTnt.active);
  assert(otherTnt.detonatesAt > game.playTime);
  assert.equal(game.score, 90);
  assert.deepEqual(blastScores, [{ x: x + width / 2, y: y + height / 2, points: 90 }]);

  game.update(TNT.delay);
  assert.equal(otherTnt.active, false);
  assert.equal(hard.hitsLeft, 0);
  assert.equal(hard.active, false);
  assert(invisible.active && distant.active);
  assert.equal(game.remaining, 2);
  assert.deepEqual(blastScores.slice(1), [{
    x: otherTnt.x + width / 2, y: otherTnt.y + height / 2, points: 60,
  }]);
});

test('a final TNT blast keeps both clear bonuses out of the brick popup', () => {
  for (const startLevel of [1, LEVELS]) {
    const blastScores = [];
    const game = new Game((event, payload) => {
      if (event === 'tnt-score') blastScores.push(payload);
    });
    game.reset(startLevel);
    game.action();
    while (game.level < LEVELS) {
      const brick = game.bricks.find(({ kind }) => kind === 'standard');
      game.bricks = [brick];
      game.remaining = 1;
      game.hitBrick(brick);
      game.action();
    }
    game.update(0, { elapsedSeconds: ROUND_SECONDS - 12.9 });
    const tnt = game.bricks.find(({ kind }) => kind === 'tnt');
    const neighbor = { ...tnt, kind: 'standard', y: tnt.y + 31 };
    game.bricks = [tnt, neighbor];
    game.remaining = 2;
    tnt.detonatesAt = 0;

    const scoreBeforeBlast = game.score;
    assert.equal(scoreBeforeBlast, startLevel === 1 ? 2560 : 0);
    game.update(1 / 120);

    assert.equal(game.phase, 'won');
    assert.equal(game.levelBonus, 2000);
    assert.equal(game.timeBonus, startLevel === 1 ? 12 * TIME_BONUS_RATE : 0);
    const finalScore = scoreBeforeBlast + 60 + 2000 + game.timeBonus;
    assert.equal(game.score, finalScore);
    assert.deepEqual(blastScores, [{
      x: tnt.x + tnt.width / 2,
      y: tnt.y + tnt.height / 2,
      points: 60,
    }]);
    const timeAtWin = game.timeLeft;
    game.update(20);
    assert.equal(game.timeLeft, timeAtWin);
    assert.equal(game.score, finalScore);
  }
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
  game.movePaddle(drop.x < WIDTH / 2 ? WIDTH : 0);
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
  const center = { ...game.bricks[0], x: WIDTH / 2, y: 150, kind: 'standard', hitsLeft: 1 };
  const left = { ...center, x: center.x - center.width - 3 };
  const right = { ...center, x: center.x + center.width + 3 };
  const brick = { ...center, kind: 'shield' };
  game.bricks = [left, brick, right, { ...left, y: left.y - center.height - 3 }];
  game.remaining = game.bricks.length;
  hitBrick(game, brick);
  const targets = game.bricks.filter(({ shielded }) => shielded);
  assert.deepEqual(targets, [left, right]);
  assert.equal(game.score, brick.points);
  const count = game.remaining;

  sendBallOut(game.balls[0]);
  game.update(0.01);
  assert(targets.every(({ shielded }) => shielded));
  game.action();
  Object.assign(game.balls[0], { vx: 0, vy: 0 });
  game.update(BUFF_DURATION + 1);
  assert(targets.every(({ shielded }) => shielded));

  const [target] = targets;
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
  Object.assign(ball, { x: left, y: game.barrierY - 9, vx: 0, vy: 450 });
  game.update(0.075);
  assert(ball.y > game.barrierY + BARRIER.height && ball.vy > 0);
  assert.equal(game.barriers.length, 3);

  const underBarrier = game.barrierY + BARRIER.height + BALL_RADIUS + 1;
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
  game.update(timeLeft + 0.01);
  assert.equal(game.effectTimeLeft('barrier'), 0);
  assert.equal(game.barriers.length, 0);
});

test('timed buffs coexist, refresh, and expire in play', () => {
  const game = startGame();
  game.balls[0].vx = 0;
  game.balls[0].vy = 0;
  const normalSpeed = game.paddleSpeed;
  for (const kind of BUFFS) game.activateBuff(kind);
  assert(game.paddleSpeed > normalSpeed);

  const x = game.paddleX;
  game.update(0.1, { pointerX: x + 400 });
  assert(game.paddleX - x > normalSpeed * 1.6 * 0.1);
  const remaining = game.effectTimeLeft('wide');
  assert(remaining < BUFF_DURATION);
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
    assert.equal(game.level, level);
    assert.equal(game.remaining, levelBrickCounts[level - 1]);
    assert.equal(game.levelBonus, 0);
    game.activateBuff('guards');
    const expectedScore = game.score + game.bricks.reduce((sum, brick) => sum + brick.points, 0);
    for (const brick of [...game.bricks].reverse()) {
      const hits = (brick.kind === 'invisible' ? 2 : brick.hitsLeft) + Number(Boolean(brick.shielded));
      for (let index = 0; index < hits && brick.active; index += 1) game.hitBrick(brick);
    }
    for (const ball of game.balls) Object.assign(ball, { vx: 0, vy: 0 });
    game.update(TNT.delay + 0.01);
    assert.equal(game.remaining, 0);
    const bonus = level === LEVELS ? Math.floor(game.timeLeft) * TIME_BONUS_RATE : 0;
    assert.equal(game.levelBonus, levelClearBonuses[level - 1]);
    assert.equal(game.timeBonus, bonus);
    assert.equal(game.score, expectedScore + levelClearBonuses[level - 1] + bonus);
    assert.equal(game.phase, level < LEVELS ? 'level-clear' : 'won');
    assert.equal(game.guards.length, 0);
    assert.equal(game.barriers.length, 0);
    assert.equal(game.drops.length, 0);
    assert.equal(game.balls.length, 0);
    if (level < LEVELS) game.action();
  }

  game.reset();
  assert.equal(game.level, 1);
  assert.equal(game.levelBonus, 0);
  assert.equal(game.balls.length, 1);
  assert.equal(game.lives, LIVES);
});
