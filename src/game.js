export const WIDTH = 800;
export const HEIGHT = 480;
export const LIVES = 3;
export const BALL_RADIUS = 7;
export const PADDLE = { width: 112, height: 13, y: 447 };

const layouts = [
  [
    '##########',
    '##########',
    '##########',
    '##########',
    '##########',
  ],
  [
    '....##....',
    '...####...',
    '..######..',
    '.########.',
    '##########',
  ],
  [
    '###.##.###',
    '#.######.#',
    '##.####.##',
    '#.######.#',
    '###.##.###',
  ],
];

export const LEVELS = layouts.length;

const BRICK = { width: 65, height: 23, gap: 8, top: 36 };
const INITIAL_SPEED = 365;
const MAX_SPEED = 585;
const SEPARATION = 0.01;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function makeBricks(level) {
  return layouts[level - 1].flatMap((row, y) => {
    const left = (WIDTH - (row.length * (BRICK.width + BRICK.gap) - BRICK.gap)) / 2;
    return [...row].flatMap((cell, x) => cell === '#' ? [{
      x: left + x * (BRICK.width + BRICK.gap),
      y: BRICK.top + y * (BRICK.height + BRICK.gap),
      width: BRICK.width,
      height: BRICK.height,
      row: y,
      points: (5 - y) * 10,
      active: true,
    }] : []);
  });
}

function brickContact(ball, brick) {
  // Expand the rectangle so the ball can be swept through it as a point.
  const left = brick.x - BALL_RADIUS;
  const right = brick.x + brick.width + BALL_RADIUS;
  const top = brick.y - BALL_RADIUS;
  const bottom = brick.y + brick.height + BALL_RADIUS;
  if (ball.vx === 0 && (ball.x < left || ball.x > right)) return null;
  if (ball.vy === 0 && (ball.y < top || ball.y > bottom)) return null;

  const enterX = ball.vx === 0 ? -Infinity : ((ball.vx > 0 ? left : right) - ball.x) / ball.vx;
  const leaveX = ball.vx === 0 ? Infinity : ((ball.vx > 0 ? right : left) - ball.x) / ball.vx;
  const enterY = ball.vy === 0 ? -Infinity : ((ball.vy > 0 ? top : bottom) - ball.y) / ball.vy;
  const leaveY = ball.vy === 0 ? Infinity : ((ball.vy > 0 ? bottom : top) - ball.y) / ball.vy;
  const time = Math.max(enterX, enterY);

  if (time < 0 || time > Math.min(leaveX, leaveY)) return null;
  return { time, axis: enterX > enterY ? 'x' : 'y', brick, kind: 'brick' };
}

export class Game {
  constructor(onEvent) {
    this.onEvent = onEvent;
    this.reset();
  }

  reset() {
    this.level = 1;
    this.lives = LIVES;
    this.score = 0;
    this.loadLevel('ready');
  }

  loadLevel(phase) {
    this.bricks = makeBricks(this.level);
    this.remaining = this.bricks.length;
    this.resetBall();
    this.phase = phase;
  }

  resetBall() {
    this.paddleX = WIDTH / 2;
    this.ball = { x: this.paddleX, y: PADDLE.y - BALL_RADIUS - 4, vx: 0, vy: 0 };
  }

  movePaddle(x) {
    if (this.phase !== 'ready' && this.phase !== 'serve' && this.phase !== 'playing') return;
    const half = PADDLE.width / 2;
    this.paddleX = clamp(x, half + 8, WIDTH - half - 8);
    if (this.phase !== 'playing') this.ball.x = this.paddleX;
  }

  action() {
    if (this.phase === 'playing') return;
    if (this.phase === 'paused') {
      this.phase = 'playing';
      return;
    }
    if (this.phase === 'lost' || this.phase === 'won') this.reset();
    if (this.phase === 'level-clear') {
      this.level += 1;
      this.loadLevel('serve');
    }

    const speed = INITIAL_SPEED + (this.level - 1) * 32;
    const direction = this.paddleX > WIDTH / 2 ? -1 : 1;
    this.ball.vx = speed * 0.36 * direction;
    this.ball.vy = -Math.sqrt(speed ** 2 - this.ball.vx ** 2);
    this.phase = 'playing';
    this.onEvent('launch');
  }

  togglePause() {
    if (this.phase === 'playing') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'playing';
  }

  findContact(duration) {
    const ball = this.ball;
    let closest = null;
    const consider = (contact) => {
      if (contact && contact.time >= 0 && contact.time <= duration && (!closest || contact.time < closest.time)) {
        closest = contact;
      }
    };

    if (ball.vx !== 0) {
      const wall = ball.vx < 0 ? BALL_RADIUS : WIDTH - BALL_RADIUS;
      consider({ time: (wall - ball.x) / ball.vx, axis: 'x', kind: 'wall' });
    }
    if (ball.vy < 0) {
      consider({ time: (BALL_RADIUS - ball.y) / ball.vy, axis: 'y', kind: 'wall' });
    }
    if (ball.vy > 0) {
      const time = (PADDLE.y - BALL_RADIUS - ball.y) / ball.vy;
      const hitX = ball.x + ball.vx * time;
      if (Math.abs(hitX - this.paddleX) <= PADDLE.width / 2 + BALL_RADIUS) {
        consider({ time, axis: 'y', kind: 'paddle' });
      }
      consider({ time: (HEIGHT + BALL_RADIUS - ball.y) / ball.vy, kind: 'miss' });
    }
    for (const brick of this.bricks) {
      if (brick.active) consider(brickContact(ball, brick));
    }
    return closest;
  }

  update(seconds) {
    const ball = this.ball;
    let timeLeft = seconds;
    for (let bounce = 0; bounce < 8 && timeLeft > 0 && this.phase === 'playing'; bounce += 1) {
      const contact = this.findContact(timeLeft);
      const elapsed = contact?.time ?? timeLeft;
      ball.x += ball.vx * elapsed;
      ball.y += ball.vy * elapsed;
      timeLeft -= elapsed;
      if (contact) this.handleContact(contact);
    }
  }

  handleContact(contact) {
    const ball = this.ball;
    if (contact.kind === 'miss') {
      this.lives -= 1;
      this.phase = this.lives > 0 ? 'serve' : 'lost';
      this.resetBall();
      this.onEvent('miss');
      return;
    }

    if (contact.kind === 'paddle') {
      const aim = clamp((ball.x - this.paddleX) / (PADDLE.width / 2), -1, 1);
      const direction = Math.sign(aim || ball.vx || 1);
      const angle = Math.max(0.13, Math.abs(aim) * 1.06) * direction;
      const speed = Math.min(MAX_SPEED, Math.hypot(ball.vx, ball.vy) + 4);
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.cos(angle) * speed;
    } else if (contact.axis === 'x') {
      ball.vx *= -1;
    } else {
      ball.vy *= -1;
    }

    // Keep the new position just outside the surface that was hit.
    if (contact.axis === 'x') ball.x += Math.sign(ball.vx) * SEPARATION;
    else ball.y += Math.sign(ball.vy) * SEPARATION;

    if (contact.kind === 'brick') {
      const { brick } = contact;
      brick.active = false;
      this.score += brick.points;
      this.remaining -= 1;
      if (this.remaining === 0) this.phase = this.level < LEVELS ? 'level-clear' : 'won';
      this.onEvent(this.remaining === 0 ? 'clear' : 'brick', brick);
    } else {
      this.onEvent(contact.kind);
    }
  }
}
