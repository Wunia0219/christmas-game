export const WIDTH = 800;
export const HEIGHT = 480;
export const LIVES = 3;
export const BALL_RADIUS = 7;
export const PADDLE = { width: 112, height: 13, y: 447 };
export const DROP_RADIUS = 11;
export const GUARD = { y: 470, width: 210, height: 8 };
export const BUFF_DURATION = 12;
export const BUFFS = ['wide', 'fast', 'guards'];

const layouts = [
  [
    '##########',
    '##?#######',
    '#######B##',
    '#B########',
    '###?##B#?#',
  ],
  [
    '....##....',
    '...##?#...',
    '..###B##..',
    '.#?######.',
    '##B##?##B#',
  ],
  [
    '###.##.###',
    '#.##B###.#',
    '#B.###?.##',
    '#.?#B###.#',
    '#?#.#?.#B#',
  ],
];

export const LEVELS = layouts.length;

const BRICK = { width: 65, height: 23, gap: 8, top: 36 };
const INITIAL_SPEED = 365;
const MAX_SPEED = 585;
const PADDLE_SPEED = 700;
const PADDLE_CONTACT_Y = PADDLE.y - BALL_RADIUS;
const PADDLE_GRACE_TIME = 0.045;
const PADDLE_GRACE_DEPTH = 18;
const DROP_SPEED = 145;
const MAX_STEP = 1 / 120;
const SEPARATION = 0.01;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function makeBricks(level) {
  return layouts[level - 1].flatMap((row, y) => {
    const left = (WIDTH - (row.length * (BRICK.width + BRICK.gap) - BRICK.gap)) / 2;
    return [...row].flatMap((cell, x) => cell !== '.' ? [{
      x: left + x * (BRICK.width + BRICK.gap),
      y: BRICK.top + y * (BRICK.height + BRICK.gap),
      width: BRICK.width,
      height: BRICK.height,
      row: y,
      kind: cell === 'B' ? 'extra-ball' : cell === '?' ? 'buff' : 'standard',
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

function paddleContactTime(ball, paddleX, paddleVelocity, reach) {
  const crossing = (PADDLE_CONTACT_Y - ball.y) / ball.vy;
  const start = Math.max(0, crossing);
  // Downward speed stays constant in this band, so depth also gives the time since crossing.
  const end = crossing + Math.min(PADDLE_GRACE_TIME, PADDLE_GRACE_DEPTH / ball.vy);
  if (start > end) return null;

  const relativeVelocity = ball.vx - paddleVelocity;
  const separation = ball.x - paddleX + relativeVelocity * start;
  if (Math.abs(separation) <= reach) return start;
  if (separation * relativeVelocity >= 0) return null;

  const time = start + (Math.abs(separation) - reach) / Math.abs(relativeVelocity);
  return time <= end ? time : null;
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
    this.playTime = 0;
    this.clearPowerUps();
    this.stageBall();
    this.phase = phase;
  }

  clearPowerUps() {
    this.effects = {};
    this.drops = [];
    this.guards = [];
  }

  stageBall() {
    this.paddleX = WIDTH / 2;
    this.balls = [{ x: this.paddleX, y: PADDLE.y - BALL_RADIUS - 4, vx: 0, vy: 0 }];
  }

  effectTimeLeft(kind) {
    return Math.max(0, (this.effects[kind] ?? 0) - this.playTime);
  }

  get paddleWidth() {
    return PADDLE.width + (this.effectTimeLeft('wide') > 0 ? 64 : 0);
  }

  get paddleSpeed() {
    return PADDLE_SPEED * (this.effectTimeLeft('fast') > 0 ? 1.6 : 1);
  }

  movePaddle(x) {
    if (this.phase !== 'ready' && this.phase !== 'serve' && this.phase !== 'playing') return;
    const half = this.paddleWidth / 2;
    this.paddleX = clamp(x, half + 8, WIDTH - half - 8);
    if (this.phase !== 'playing') this.balls[0].x = this.paddleX;
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
    const [ball] = this.balls;
    ball.vx = speed * 0.36 * direction;
    ball.vy = -Math.sqrt(speed ** 2 - ball.vx ** 2);
    this.phase = 'playing';
    this.onEvent('launch');
  }

  togglePause() {
    if (this.phase === 'playing') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'playing';
  }

  findContact(ball, duration, paddleX, paddleVelocity) {
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
      const time = paddleContactTime(ball, paddleX, paddleVelocity, this.paddleWidth / 2 + BALL_RADIUS);
      if (time !== null) {
        consider({ time, axis: 'y', kind: 'paddle' });
      }
      const guardTime = (GUARD.y - BALL_RADIUS - ball.y) / ball.vy;
      const guardX = ball.x + ball.vx * guardTime;
      for (const guard of this.guards) {
        if (Math.abs(guardX - guard.x) <= GUARD.width / 2 + BALL_RADIUS) {
          consider({ time: guardTime, axis: 'y', kind: 'guard', guard });
        }
      }
      consider({ time: (HEIGHT + BALL_RADIUS - ball.y) / ball.vy, kind: 'miss' });
    }
    for (const brick of this.bricks) {
      if (brick.active) consider(brickContact(ball, brick));
    }
    return closest;
  }

  update(seconds, { direction = 0, pointerX } = {}) {
    if (this.phase !== 'playing') {
      if (direction) this.movePaddle(this.paddleX + direction * this.paddleSpeed * seconds);
      return;
    }

    while (seconds > 0 && this.phase === 'playing') {
      const step = Math.min(seconds, MAX_STEP);
      this.updatePlay(step, direction, pointerX);
      seconds -= step;
    }
  }

  updatePlay(seconds, direction, pointerX) {
    this.playTime += seconds;
    if (this.effectTimeLeft('guards') === 0) this.guards.length = 0;

    const keyboardStep = this.paddleSpeed * seconds;
    const pointerStep = keyboardStep * 1.6;
    const offset = direction || pointerX === undefined
      ? direction * keyboardStep
      : clamp(pointerX - this.paddleX, -pointerStep, pointerStep);
    const paddleStartX = this.paddleX;
    this.movePaddle(this.paddleX + offset);
    const paddleVelocity = (this.paddleX - paddleStartX) / seconds;

    // A ball released during this step starts moving on the next step.
    for (let index = this.balls.length - 1; index >= 0; index -= 1) {
      if (!this.updateBall(this.balls[index], seconds, paddleStartX, paddleVelocity)) this.balls.splice(index, 1);
      if (this.phase !== 'playing') return;
    }

    if (this.balls.length === 0) {
      this.lives -= 1;
      this.phase = this.lives > 0 ? 'serve' : 'lost';
      this.clearPowerUps();
      if (this.lives > 0) this.stageBall();
      this.onEvent('miss');
      return;
    }

    this.updateDrops(seconds);
  }

  updateDrops(seconds) {
    const catchY = PADDLE.y - DROP_RADIUS;
    for (let index = this.drops.length - 1; index >= 0; index -= 1) {
      const drop = this.drops[index];
      const previousY = drop.y;
      drop.y += DROP_SPEED * seconds;
      if (previousY <= catchY && drop.y >= catchY && Math.abs(drop.x - this.paddleX) <= this.paddleWidth / 2 + DROP_RADIUS) {
        this.drops.splice(index, 1);
        this.activateBuff(BUFFS[Math.floor(Math.random() * BUFFS.length)]);
      } else if (drop.y > HEIGHT + DROP_RADIUS) {
        this.drops.splice(index, 1);
      }
    }
  }

  activateBuff(kind) {
    this.effects[kind] = this.playTime + BUFF_DURATION;
    if (kind === 'wide') this.movePaddle(this.paddleX);
    if (kind === 'guards') {
      this.guards = [137, WIDTH / 2, WIDTH - 137].map((x) => ({ x }));
    }
    this.onEvent('buff', kind);
  }

  updateBall(ball, seconds, paddleX, paddleVelocity) {
    let timeLeft = seconds;
    for (let bounce = 0; bounce < 8 && timeLeft > 0 && this.phase === 'playing'; bounce += 1) {
      const contact = this.findContact(ball, timeLeft, paddleX, paddleVelocity);
      const elapsed = contact?.time ?? timeLeft;
      ball.x += ball.vx * elapsed;
      ball.y += ball.vy * elapsed;
      paddleX += paddleVelocity * elapsed;
      timeLeft -= elapsed;
      if (contact?.kind === 'miss') return false;
      if (contact) this.handleContact(ball, contact, paddleX);
    }
    return true;
  }

  handleContact(ball, contact, paddleX) {
    if (contact.kind === 'paddle') {
      const aim = clamp((ball.x - paddleX) / (this.paddleWidth / 2), -1, 1);
      const direction = Math.sign(aim || ball.vx || 1);
      const angle = Math.max(0.13, Math.abs(aim) * 1.06) * direction;
      const speed = Math.min(MAX_SPEED, Math.hypot(ball.vx, ball.vy) + 4);
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.cos(angle) * speed;
      ball.y = PADDLE_CONTACT_Y;
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
      if (this.remaining === 0) {
        this.phase = this.level < LEVELS ? 'level-clear' : 'won';
        this.balls = [];
        this.clearPowerUps();
        this.onEvent('clear', brick);
        return;
      }

      const x = brick.x + brick.width / 2;
      const y = brick.y + brick.height / 2;
      if (brick.kind === 'extra-ball') {
        const vx = (x < WIDTH / 2 ? 1 : -1) * 105;
        this.balls.push({ x, y, vx, vy: 310, bonus: true });
        this.onEvent('extra-ball', brick);
      } else {
        if (brick.kind === 'buff') this.drops.push({ x, y });
        this.onEvent('brick', brick);
      }
      return;
    }

    if (contact.kind === 'guard') {
      this.guards.splice(this.guards.indexOf(contact.guard), 1);
      if (this.guards.length === 0) delete this.effects.guards;
    }
    this.onEvent(contact.kind);
  }
}
