export const WIDTH = 800;
export const HEIGHT = 480;
export const BRICK = { width: 48.4, height: 19 };
export const LIVES = 3;
export const ROUND_SECONDS = 120;
export const LAUNCH_COUNTDOWN_SECONDS = 3;
export const TIME_BONUS_RATE = 20;
export const BALL_RADIUS = 7;
export const PADDLE = { width: 112, height: 16, y: 447 };
export const DROP_RADIUS = 11;
export const GUARD = { y: 470, width: 210, height: 8 };
export const BARRIER = { y: 230, width: WIDTH / 3, height: 9, duration: 6 };
export const CANNON = { inset: 9, muzzleY: PADDLE.y - 12, shotRadius: 3 };
export const TNT = { delay: 0.75, radius: 47 };
export const BUFF_DURATION = 12;
export const SHRINK_DURATION = 5;
export const BUFFS = ['wide', 'guards', 'cannons'];

// The letter coordinates were laid out with 42 × 16 bricks.
const BRICK_SCALE_X = BRICK.width / 42;
const BRICK_SCALE_Y = BRICK.height / 16;

// Each position is [x, y, standardOnly].
const giraffeLetters = [
  [ // G
    [21, 0], [65, 0], [7, 19], [83, 19], [0, 38], [0, 57], [0, 76],
    [43, 76], [86, 76], [0, 95], [86, 95], [7, 114], [81, 114],
    [21, 133], [65, 133],
  ],
  [ // i
    [0, 21, true], [0, 57], [0, 76], [0, 95], [0, 114], [0, 133],
  ],
  [ // r
    [1, 57], [44, 61, true], [0, 76], [0, 95], [0, 114], [0, 133],
  ],
  [ // a
    [14, 57], [58, 57], [60, 76, true], [11, 95], [55, 95],
    [0, 114], [60, 114], [8, 133], [60, 133],
  ],
  [ // f
    [29, 0, true], [16, 19], [11, 38], [0, 57], [43, 57, true],
    [11, 76], [11, 95], [11, 114], [11, 133],
  ],
  [ // f
    [29, 0, true], [16, 19], [11, 38], [0, 57], [43, 57, true],
    [11, 76], [11, 95], [11, 114], [11, 133],
  ],
  [ // e
    [12, 57, true], [56, 57, true], [0, 76], [58, 76], [0, 95], [44, 95],
    [0, 114], [12, 133], [56, 133],
  ],
];

const xmasLetters = [
  [ // X
    [0, 0, true], [106, 0, true], [10, 18], [96, 18],
    [20, 36], [86, 36], [30, 54], [76, 54], [53, 72, true],
    [30, 90], [76, 90], [20, 108], [86, 108], [10, 126], [96, 126],
    [0, 144, true], [106, 144, true],
  ],
  [ // m
    [23, 47, true], [92, 47, true],
    [5, 66, true], [57, 66, true], [111, 66, true],
    [0, 86], [57, 86], [116, 86], [0, 106], [57, 106], [116, 106],
    [0, 125], [57, 125], [116, 125], [0, 144], [57, 144], [116, 144],
  ],
  [ // a
    [13, 54], [57, 54, true], [65, 72, true], [10, 90], [54, 90],
    [0, 108], [65, 108], [0, 126], [65, 126], [10, 144], [65, 144],
  ],
  [ // s
    [15, 54, true], [59, 54, true], [3, 72], [13, 90], [57, 90],
    [64, 108], [61, 126], [10, 144, true], [54, 144, true],
  ],
];

const charityCharacters = [
  [ // 十
    [66, 0, true], [66, 18], [66, 36],
    [0, 54, true], [44, 54, true], [88, 54, true], [132, 54, true],
    [66, 72], [66, 90], [66, 108], [66, 126], [66, 144, true],
  ],
  [ // 方
    [55, 0, true], [0, 36, true], [44, 36], [88, 36, true],
    [43, 54], [43, 72], [87, 72, true], [31, 90], [90, 90],
    [20, 108], [88, 108], [10, 126], [81, 126], [0, 144], [61, 144, true],
  ],
  [ // 五
    [3, 0, true], [46, 0, true], [89, 0, true], [49, 18], [46, 36], [43, 54],
    [0, 72, true], [43, 72, true], [90, 72, true], [43, 90], [90, 90, true],
    [32, 108], [85, 108], [22, 126], [81, 126],
    [0, 144, true], [45, 144, true], [90, 144, true],
  ],
  [ // 甲
    [0, 0, true], [44, 0, true], [88, 0, true], [132, 0, true],
    [0, 19], [66, 19], [132, 19], [0, 38], [66, 38], [132, 38],
    [0, 57, true], [44, 57, true], [88, 57, true], [132, 57, true],
    [0, 76], [66, 76], [132, 76], [0, 95], [66, 95], [132, 95],
    [0, 114, true], [44, 114, true], [88, 114, true], [132, 114, true],
    [66, 132, true], [66, 150, true],
  ],
];

function centerSlots(slots) {
  const left = Math.min(...slots.map(({ x }) => x));
  const right = Math.max(...slots.map(({ x, width }) => x + width));
  const offset = (WIDTH - left - right) / 2;
  return slots.map((slot) => ({ ...slot, x: slot.x + offset }));
}

function wordSlots(letters, spacing, top) {
  let left = 0;
  const slots = letters.flatMap((positions, index) => {
    const glyph = positions.map(([x, y, standardOnly]) => ({
      x: left + x * BRICK_SCALE_X, y: top + y * BRICK_SCALE_Y, ...BRICK, cell: index, standardOnly,
    }));
    const right = Math.max(...glyph.map(({ x, width }) => x + width));
    left = right + (spacing[index] ?? 0) * BRICK_SCALE_X;
    return glyph;
  });
  return centerSlots(slots).sort((a, b) => a.y - b.y || a.x - b.x);
}

const draftSpecials = 'BBB???HHHHHHIITTSPW';
export const BRICK_PALETTES = {
  cranberry: { face: 0xad5664, shadow: 0x521e28 },
  gold: { face: 0xbe8c52, shadow: 0x5b3d20 },
  almond: { face: 0xb59178, shadow: 0x49321d },
  terracotta: { face: 0xce7950, shadow: 0x5b2617 },
  plum: { face: 0xa5738d, shadow: 0x5b3145 },
  pistachio: { face: 0xafbd78, shadow: 0x424a28 },
};
const snowStyles = ['bare', 'double', 'left', 'right'];
export const BRICK_TEXTURES = {
  cranberry: 'assets/bricks/cranberry-bare.webp',
  gold: 'assets/bricks/gold-bare.webp',
  almond: 'assets/bricks/almond-bare.webp',
  terracotta: 'assets/bricks/terracotta-bare.webp',
  plum: 'assets/bricks/plum-bare.webp',
};
export const SPRITE_TEXTURES = {
  buffMark: 'assets/sprites/buff-mark.webp',
  mainBall: 'assets/sprites/main-ball.webp',
};
const layouts = [
  {
    name: 'Xmas',
    slots: wordSlots(xmasLetters, [37, 37, 37], 53),
    clearBonus: 1000,
    specials: draftSpecials,
    palette: ['cranberry', 'pistachio', 'gold', 'cranberry'],
  },
  {
    name: 'Giraffe',
    // The a fits closer to the r because their widest rows sit at different heights.
    slots: wordSlots(giraffeLetters, [7, 7, -7, 7, 7, 7], 60),
    clearBonus: 1500,
    specials: draftSpecials,
    palette: ['cranberry', 'gold', 'pistachio', 'almond', 'terracotta', 'plum', 'pistachio'],
  },
  {
    name: '十方　五甲',
    slots: wordSlots(charityCharacters, [9, 24, 9], 53),
    clearBonus: 2000,
    specials: 'BBBB????HHHHHHIITTSPW',
    palette: ['gold', 'gold', 'pistachio', 'pistachio'],
  },
];

export const LEVELS = layouts.length;
export const LEVEL_NAMES = layouts.map(({ name }) => name);

const BRICK_KINDS = {
  B: 'extra-ball', '?': 'buff', H: 'hard', I: 'invisible', T: 'tnt',
  S: 'shrink', P: 'shield', W: 'barrier',
};
const INITIAL_SPEED = 365;
const MAX_SPEED = 585;
const MIN_PADDLE_SPEED = 700;
const PADDLE_CROSSING_SECONDS = 1.05;
const KEYBOARD_START_SPEED_RATIO = 0.25;
const KEYBOARD_ACCELERATION_SECONDS = 0.10;
const KEYBOARD_RELEASE_SECONDS = 0.10;
const KEYBOARD_TURN_BRAKE_SECONDS = 0.055;
const POINTER_SPEED_MULTIPLIER = 1.25;
const POINTER_BRAKE_SECONDS = 0.10;
const PADDLE_EDGE_INSET = 8;
const PADDLE_GRACE_TIME = 0.045;
const PADDLE_GRACE_DEPTH = 18;
const DROP_SPEED = 145;
const SHOT_SPEED = 760;
const SHIELD_NEIGHBOR_GAP = 8;
const MAX_STEP = 1 / 120;
const SEPARATION = 0.01;
const CLOCK_EPSILON = 1e-9;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

function placeSpecialBricks(slots, specials) {
  const candidates = shuffle(slots.filter(({ standardOnly }) => !standardOnly));
  const selected = new Set();
  const paired = new Set();

  // Prefer isolated slots, then allow a pair without joining any existing pair.
  for (const maxNeighbors of [0, 1]) {
    for (const slot of candidates) {
      if (selected.size === specials.length) break;
      if (selected.has(slot)) continue;
      const neighbors = [...selected].filter((other) => areBrickNeighbors(slot, other, 1));
      if (neighbors.length > maxNeighbors || neighbors.some((other) => paired.has(other))) continue;
      selected.add(slot);
      if (neighbors.length === 1) paired.add(slot).add(neighbors[0]);
    }
  }

  // Keep the requested counts even if a future layout is too dense for pairs.
  const placements = [...selected, ...candidates.filter((slot) => !selected.has(slot))];
  return new Map(shuffle([...specials]).map((code, index) => [placements[index], BRICK_KINDS[code]]));
}

function makeBricks(level, widthScale) {
  const { slots, palette, specials } = layouts[level - 1];
  const kinds = placeSpecialBricks(slots, specials);
  const snowBySlot = shuffle(slots.map((_, index) => snowStyles[index % snowStyles.length]));

  return slots.map((slot, index) => {
    const { cell, standardOnly, ...bounds } = slot;
    const kind = kinds.get(slot) ?? 'standard';
    return {
      ...bounds,
      x: bounds.x * widthScale,
      width: bounds.width * widthScale,
      kind,
      paint: palette?.[cell],
      snow: snowBySlot[index],
      hitsLeft: kind === 'hard' ? 2 : 1,
      points: 30,
      active: true,
    };
  });
}

function areBrickNeighbors(a, b, widthScale) {
  const gapX = Math.max(a.x - b.x - b.width, b.x - a.x - a.width);
  const gapY = Math.max(a.y - b.y - b.height, b.y - a.y - a.height);
  return gapX <= SHIELD_NEIGHBOR_GAP * BRICK_SCALE_X * widthScale
    && gapY <= SHIELD_NEIGHBOR_GAP * BRICK_SCALE_Y;
}

function brickContact(projectile, brick, radius = BALL_RADIUS) {
  // Expand the rectangle so the projectile can be swept through it as a point.
  const left = brick.x - radius;
  const right = brick.x + brick.width + radius;
  const top = brick.y - radius;
  const bottom = brick.y + brick.height + radius;
  const { x, y, vx, vy } = projectile;
  if (vx === 0 && (x < left || x > right)) return null;
  if (vy === 0 && (y < top || y > bottom)) return null;

  const enterX = vx === 0 ? -Infinity : ((vx > 0 ? left : right) - x) / vx;
  const leaveX = vx === 0 ? Infinity : ((vx > 0 ? right : left) - x) / vx;
  const enterY = vy === 0 ? -Infinity : ((vy > 0 ? top : bottom) - y) / vy;
  const leaveY = vy === 0 ? Infinity : ((vy > 0 ? bottom : top) - y) / vy;
  const time = Math.max(enterX, enterY);

  if (time < 0 || time > Math.min(leaveX, leaveY)) return null;
  return { time, axis: enterX > enterY ? 'x' : 'y', brick, kind: 'brick' };
}

function paddleContactTime({ x, y, vx, vy }, paddleX, paddleY, paddleVelocity, paddleWidth, radius) {
  const crossing = (paddleY - radius - y) / vy;
  const start = Math.max(0, crossing);
  // Downward speed stays constant in this band, so depth also gives the time since crossing.
  const end = crossing + Math.min(PADDLE_GRACE_TIME, PADDLE_GRACE_DEPTH / vy);
  if (start > end) return null;

  const reach = paddleWidth / 2 + radius;
  const relativeVelocity = vx - paddleVelocity;
  const separation = x - paddleX + relativeVelocity * start;
  if (Math.abs(separation) <= reach) return start;
  if (separation * relativeVelocity >= 0) return null;

  const time = start + (Math.abs(separation) - reach) / Math.abs(relativeVelocity);
  return time <= end ? time : null;
}

export class Game {
  constructor(onEvent) {
    this.onEvent = onEvent;
    this.width = WIDTH;
    this.height = HEIGHT;
    this.reset();
  }

  resize(width, height) {
    if (width === this.width && height === this.height) return false;
    const widthRatio = width / this.width;
    const shiftY = height - this.height;

    // Fit the letter layout to the court width and keep the paddle near the bottom.
    const upper = this.barrierY + BARRIER.height + BALL_RADIUS;
    const lower = this.paddleY - BALL_RADIUS;
    const moveY = (y) => y + shiftY * clamp((y - upper) / (lower - upper), 0, 1);
    for (const brick of this.bricks) {
      brick.x *= widthRatio;
      brick.width *= widthRatio;
    }
    for (const ball of this.balls) {
      ball.x = clamp(ball.x * widthRatio, BALL_RADIUS, width - BALL_RADIUS);
      ball.y = moveY(ball.y);
    }
    for (const drop of this.drops) {
      drop.x *= widthRatio;
      drop.y = moveY(drop.y);
    }
    for (const shot of this.shots) {
      shot.x = clamp(shot.x * widthRatio, CANNON.shotRadius, width - CANNON.shotRadius);
      shot.y = moveY(shot.y);
    }
    for (const guard of this.guards) guard.x *= widthRatio;
    for (const barrier of this.barriers) barrier.x *= widthRatio;

    this.width = width;
    this.height = height;
    this.paddleX = this.clampPaddleX(this.paddleX * widthRatio);
    this.stopPaddle();
    if (this.phase === 'ready' || this.phase === 'countdown' || this.phase === 'serve') this.stageBall();
    return true;
  }

  reset(level = 1) {
    if (!Number.isInteger(level) || level < 1 || level > LEVELS) throw new RangeError('Unknown level');
    this.startLevel = level;
    this.level = level;
    this.lives = LIVES;
    this.score = 0;
    this.timeLeft = ROUND_SECONDS;
    this.timeBonus = 0;
    this.hasLaunchedRun = false;
    this.loadLevel('ready');
  }

  loadLevel(phase) {
    this.bricks = makeBricks(this.level, this.width / WIDTH);
    this.layoutBottom = Math.max(...this.bricks.map(({ y, height }) => y + height));
    this.barrierY = Math.max(BARRIER.y, this.layoutBottom + 10);
    this.remaining = this.bricks.length;
    this.levelBonus = 0;
    this.playTime = 0;
    this.clearPowerUps();
    this.paddleX = this.width / 2;
    this.stopPaddle();
    this.stageBall();
    this.launchIn = 0;
    this.phase = phase;
  }

  clearPowerUps() {
    this.effects = {};
    this.drops = [];
    this.guards = [];
    this.barriers = [];
    this.shots = [];
  }

  stageBall() {
    this.balls = [{ x: this.paddleX, y: this.paddleY - BALL_RADIUS, vx: 0, vy: 0 }];
  }

  effectTimeLeft(kind) {
    return Math.max(0, (this.effects[kind] ?? 0) - this.playTime);
  }

  get paddleY() { return this.height - (HEIGHT - PADDLE.y); }

  get cannonY() { return this.paddleY - (PADDLE.y - CANNON.muzzleY); }

  get guardY() { return this.height - (HEIGHT - GUARD.y); }

  get barrierWidth() { return this.width / 3; }

  get paddleWidth() {
    const width = PADDLE.width + (this.effectTimeLeft('wide') > 0 ? 64 : 0);
    return this.effectTimeLeft('shrink') > 0 ? width * 0.75 : width;
  }

  get paddleSpeed() {
    const travel = this.width - PADDLE.width - PADDLE_EDGE_INSET * 2;
    return Math.max(MIN_PADDLE_SPEED, travel / PADDLE_CROSSING_SECONDS);
  }

  get countdownRunning() {
    return this.phase === 'playing';
  }

  clampPaddleX(x) {
    const edge = this.paddleWidth / 2 + PADDLE_EDGE_INSET;
    return clamp(x, edge, this.width - edge);
  }

  movePaddle(x) {
    if (this.phase !== 'ready' && this.phase !== 'countdown' && this.phase !== 'serve' && this.phase !== 'playing') return;
    this.paddleX = this.clampPaddleX(x);
    if (this.phase !== 'playing') this.balls[0].x = this.paddleX;
  }

  stopPaddle() {
    this.paddleVelocity = 0;
  }

  updatePaddle(seconds, direction, pointerX) {
    const speed = this.paddleSpeed;
    if (!direction && pointerX !== undefined) {
      this.stopPaddle();
      const target = this.clampPaddleX(pointerX);
      const distance = Math.abs(target - this.paddleX);
      const topSpeed = speed * POINTER_SPEED_MULTIPLIER;
      const braking = topSpeed / POINTER_BRAKE_SECONDS;
      // Cap the approach speed by the distance available to brake.
      const travel = Math.min(topSpeed, Math.sqrt(2 * braking * distance)) * seconds;
      this.movePaddle(travel >= distance ? target : this.paddleX + Math.sign(target - this.paddleX) * travel);
      return;
    }

    const targetVelocity = direction * speed;
    const startVelocity = clamp(this.paddleVelocity, -speed, speed) || targetVelocity * KEYBOARD_START_SPEED_RATIO;
    let goal = targetVelocity;
    let acceleration = speed * (1 - KEYBOARD_START_SPEED_RATIO) / KEYBOARD_ACCELERATION_SECONDS;
    if (!direction) {
      acceleration = speed / KEYBOARD_RELEASE_SECONDS;
    } else if (direction * startVelocity < 0) {
      goal = 0;
      acceleration = speed / KEYBOARD_TURN_BRAKE_SECONDS;
    }

    const maxChange = acceleration * seconds;
    const change = clamp(goal - startVelocity, -maxChange, maxChange);
    const rampTime = Math.abs(change) / acceleration;
    this.paddleVelocity = startVelocity + change;
    const offset = this.paddleVelocity * seconds + (startVelocity - this.paddleVelocity) * rampTime / 2;
    this.movePaddle(this.paddleX + offset);
    if (this.paddleX === this.clampPaddleX(this.paddleVelocity > 0 ? this.width : 0)) this.stopPaddle();
  }

  action() {
    if (this.phase === 'playing' || this.phase === 'countdown') return;
    if (this.phase === 'serve') {
      this.launchBall();
      return;
    }
    if (this.phase === 'lost' || this.phase === 'time-up' || this.phase === 'won') this.reset(this.startLevel);
    if (this.phase === 'level-clear') {
      this.level += 1;
      this.loadLevel('ready');
    }

    this.launchIn = LAUNCH_COUNTDOWN_SECONDS;
    this.phase = 'countdown';
  }

  launchBall() {
    const speed = INITIAL_SPEED + (this.level - 1) * 32;
    const direction = this.paddleX > this.width / 2 ? -1 : 1;
    const [ball] = this.balls;
    ball.vx = speed * 0.36 * direction;
    ball.vy = -Math.sqrt(speed ** 2 - ball.vx ** 2);
    this.phase = 'playing';
    const firstLaunch = !this.hasLaunchedRun;
    this.hasLaunchedRun = true;
    this.onEvent('launch', { firstLaunch });
  }

  advanceClock(seconds) {
    if (!this.countdownRunning) return;
    this.timeLeft = Math.max(0, this.timeLeft - seconds);
    if (this.timeLeft > CLOCK_EPSILON) return;
    this.timeLeft = 0;
    this.phase = 'time-up';
    this.balls = [];
    this.clearPowerUps();
  }

  findContact(ball, duration, paddleX, paddleVelocity) {
    let closest = null;
    const consider = (contact) => {
      if (contact && contact.time >= 0 && contact.time <= duration && (!closest || contact.time < closest.time)) {
        closest = contact;
      }
    };

    if (ball.vx !== 0) {
      const wall = ball.vx < 0 ? BALL_RADIUS : this.width - BALL_RADIUS;
      consider({ time: (wall - ball.x) / ball.vx, axis: 'x', kind: 'wall' });
    }
    if (ball.vy < 0) {
      consider({ time: (BALL_RADIUS - ball.y) / ball.vy, axis: 'y', kind: 'wall' });
    }
    if (ball.vy > 0) {
      const time = paddleContactTime(ball, paddleX, this.paddleY, paddleVelocity, this.paddleWidth, BALL_RADIUS);
      if (time !== null) {
        consider({ time, axis: 'y', kind: 'paddle' });
      }
      const guardTime = (this.guardY - BALL_RADIUS - ball.y) / ball.vy;
      const guardX = ball.x + ball.vx * guardTime;
      for (const guard of this.guards) {
        if (Math.abs(guardX - guard.x) <= GUARD.width / 2 + BALL_RADIUS) {
          consider({ time: guardTime, axis: 'y', kind: 'guard', guard });
        }
      }
      consider({ time: (this.height + BALL_RADIUS - ball.y) / ball.vy, kind: 'miss' });
    }
    consider(this.findAttackContact(ball, BALL_RADIUS, closest?.time ?? duration));
    return closest;
  }

  findAttackContact(projectile, radius, duration) {
    let closest = null;
    if (projectile.vy < 0 && this.barriers.length > 0) {
      const time = (this.barrierY + BARRIER.height + radius - projectile.y) / projectile.vy;
      if (time >= 0 && time <= duration) {
        const x = projectile.x + projectile.vx * time;
        const barrier = this.barriers.find((segment) => x >= segment.x && x < segment.x + this.barrierWidth);
        if (barrier) closest = { time, axis: 'y', kind: 'barrier-hit', barrier };
      }
    }
    const concealed = [];
    for (const brick of this.bricks) {
      if (!brick.active) continue;
      const contact = brickContact(projectile, brick, radius);
      if (!contact || contact.time > duration) continue;
      if (brick.kind === 'invisible') concealed.push(contact);
      else if (!closest || contact.time < closest.time) closest = contact;
    }

    // Reveal only the bricks the projectile enters before its first solid contact.
    const travelTime = closest?.time ?? duration;
    for (const { brick, time } of concealed) {
      if (time < travelTime) this.hitBrick(brick);
    }
    return closest;
  }

  update(seconds, { direction = 0, pointerX, elapsedSeconds = seconds } = {}) {
    if (this.phase !== 'playing') {
      if (this.phase === 'ready' || this.phase === 'countdown' || this.phase === 'serve') {
        while (seconds > 0 && (direction || pointerX !== undefined || this.paddleVelocity)) {
          const step = Math.min(seconds, MAX_STEP);
          this.updatePaddle(step, direction, pointerX);
          seconds -= step;
        }
      }
      if (this.phase === 'countdown') {
        this.launchIn = Math.max(0, this.launchIn - elapsedSeconds);
        if (this.launchIn <= CLOCK_EPSILON) {
          this.launchIn = 0;
          this.launchBall();
        }
      }
      return;
    }

    // Count wall time that the capped physics update cannot simulate.
    this.advanceClock(Math.max(0, elapsedSeconds - seconds));
    while (seconds > 0 && this.phase === 'playing' && this.timeLeft > CLOCK_EPSILON) {
      const step = Math.min(seconds, MAX_STEP, this.timeLeft);
      this.timeLeft -= step;
      this.updatePlay(step, direction, pointerX);
      seconds -= step;
    }
    this.advanceClock(seconds);
  }

  updatePlay(seconds, direction, pointerX) {
    this.playTime += seconds;
    if (this.effectTimeLeft('guards') === 0) this.guards.length = 0;
    if (this.effectTimeLeft('barrier') === 0) this.barriers.length = 0;

    const paddleStartX = this.paddleX;
    this.updatePaddle(seconds, direction, pointerX);
    const paddleVelocity = (this.paddleX - paddleStartX) / seconds;

    // Newly released balls and shots start moving on the next step.
    const shotCount = this.shots.length;
    let lastExitTime = -Infinity;
    let lastExitX;
    for (let index = this.balls.length - 1; index >= 0; index -= 1) {
      const ball = this.balls[index];
      const exitTime = this.updateBall(ball, seconds, paddleStartX, paddleVelocity);
      if (exitTime !== undefined) {
        this.balls.splice(index, 1);
        // The last ball to cross the bottom may not be the last one processed.
        if (exitTime > lastExitTime) {
          lastExitTime = exitTime;
          lastExitX = ball.x;
        }
      }
      if (this.phase !== 'playing') return;
    }

    if (this.balls.length === 0) {
      this.lives -= 1;
      this.phase = this.lives > 0 ? 'serve' : 'lost';
      this.clearPowerUps();
      this.stopPaddle();
      if (this.lives > 0) {
        this.stageBall();
        this.movePaddle(this.paddleX);
      }
      this.onEvent('miss', { x: lastExitX });
      return;
    }

    this.updateShots(seconds, shotCount);
    if (this.phase !== 'playing') return;
    this.updateTnt();
    if (this.phase === 'playing') this.updateDrops(seconds, paddleStartX, paddleVelocity);
  }

  updateShots(seconds, shotCount) {
    for (let index = shotCount - 1; index >= 0; index -= 1) {
      const shot = this.shots[index];
      const contact = this.findAttackContact(shot, CANNON.shotRadius, seconds);
      if (contact) {
        this.shots.splice(index, 1);
        if (contact.kind === 'barrier-hit') this.breakBarrier(contact.barrier);
        else this.hitBrick(contact.brick);
        if (this.phase !== 'playing') return;
      } else {
        shot.y += shot.vy * seconds;
        if (shot.y < -CANNON.shotRadius) this.shots.splice(index, 1);
      }
    }
  }

  updateTnt() {
    for (const brick of this.bricks) {
      if (!brick.active || brick.detonatesAt === undefined || brick.detonatesAt > this.playTime) continue;
      const x = brick.x + brick.width / 2;
      const y = brick.y + brick.height / 2;
      const scoreBeforeBlast = this.score;
      this.onEvent('tnt-explode', { x, y });
      this.destroyBrick(brick);

      for (const target of this.bricks) {
        if (this.phase !== 'playing') break;
        if (!target.active) continue;
        const dx = x - clamp(x, target.x, target.x + target.width);
        const dy = y - clamp(y, target.y, target.y + target.height);
        if (dx * dx + dy * dy > TNT.radius ** 2) continue;
        this.hitBrick(target);
      }
      const points = this.score - scoreBeforeBlast - this.levelBonus - this.timeBonus;
      this.onEvent('tnt-score', { x, y, points });
      if (this.phase !== 'playing') return;
    }
  }

  updateDrops(seconds, paddleStartX, paddleVelocity) {
    for (let index = this.drops.length - 1; index >= 0; index -= 1) {
      const drop = this.drops[index];
      const falling = { x: drop.x, y: drop.y, vx: 0, vy: DROP_SPEED };
      const time = paddleContactTime(falling, paddleStartX, this.paddleY, paddleVelocity, this.paddleWidth, DROP_RADIUS);
      drop.y += DROP_SPEED * seconds;
      if (time !== null && time <= seconds) {
        this.drops.splice(index, 1);
        if (drop.kind === 'shrink') {
          this.effects.shrink = this.playTime + SHRINK_DURATION;
          this.onEvent('shrink');
        } else {
          this.activateBuff(BUFFS[Math.floor(Math.random() * BUFFS.length)]);
        }
      } else if (drop.y > this.height + DROP_RADIUS) {
        this.drops.splice(index, 1);
      }
    }
  }

  activateBuff(kind) {
    this.effects[kind] = this.playTime + BUFF_DURATION;
    if (kind === 'wide') this.movePaddle(this.paddleX);
    if (kind === 'guards') {
      this.guards = [137, WIDTH / 2, WIDTH - 137].map((x) => ({ x: x * (this.width / WIDTH) }));
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
      if (contact?.kind === 'miss') return seconds - timeLeft;
      if (contact) this.handleContact(ball, contact, paddleX);
    }
  }

  handleContact(ball, contact, paddleX) {
    if (contact.kind === 'paddle') {
      const aim = clamp((ball.x - paddleX) / (this.paddleWidth / 2), -1, 1);
      const direction = Math.sign(aim || ball.vx || 1);
      const angle = Math.max(0.13, Math.abs(aim) * 1.06) * direction;
      const speed = Math.min(MAX_SPEED, Math.hypot(ball.vx, ball.vy) + 4);
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.cos(angle) * speed;
      ball.y = this.paddleY - BALL_RADIUS;
      if (this.effectTimeLeft('cannons') > 0) {
        const offset = this.paddleWidth / 2 - CANNON.inset;
        for (const x of [paddleX - offset, paddleX + offset]) {
          this.shots.push({ x, y: this.cannonY - CANNON.shotRadius, vx: 0, vy: -SHOT_SPEED });
        }
      }
    } else if (contact.axis === 'x') {
      ball.vx *= -1;
    } else {
      ball.vy *= -1;
    }

    // Keep the new position just outside the surface that was hit.
    if (contact.axis === 'x') ball.x += Math.sign(ball.vx) * SEPARATION;
    else ball.y += Math.sign(ball.vy) * SEPARATION;

    if (contact.kind === 'brick') {
      this.hitBrick(contact.brick);
      return;
    }
    if (contact.kind === 'barrier-hit') {
      this.breakBarrier(contact.barrier);
      return;
    }
    if (contact.kind === 'paddle') {
      const halfWidth = this.paddleWidth / 2;
      const x = clamp(ball.x, paddleX - halfWidth, paddleX + halfWidth);
      this.onEvent('paddle', { x, y: this.paddleY });
      return;
    }
    if (contact.kind === 'guard') {
      this.guards.splice(this.guards.indexOf(contact.guard), 1);
      if (this.guards.length === 0) delete this.effects.guards;
    }
    this.onEvent(contact.kind);
  }

  hitBrick(brick) {
    if (!brick.active) return;
    if (brick.kind === 'invisible') {
      brick.kind = 'standard';
      this.onEvent('brick-reveal', brick);
      return;
    }
    if (brick.shielded) {
      brick.shielded = false;
      this.onEvent('shield-break', brick);
      return;
    }
    if (brick.kind === 'tnt') {
      if (brick.detonatesAt === undefined) {
        brick.detonatesAt = this.playTime + TNT.delay;
        this.onEvent('tnt-armed', brick);
      }
      return;
    }
    if (brick.kind === 'hard') {
      brick.hitsLeft -= 1;
      if (brick.hitsLeft > 0) {
        this.onEvent('brick-damage', brick);
        return;
      }
    }
    this.destroyBrick(brick);
  }

  destroyBrick(brick) {
    brick.active = false;
    this.score += brick.points;
    this.remaining -= 1;
    if (this.remaining === 0) {
      this.phase = this.level < LEVELS ? 'level-clear' : 'won';
      this.levelBonus = layouts[this.level - 1].clearBonus;
      this.score += this.levelBonus;
      if (this.phase === 'won' && this.startLevel === 1) {
        this.timeBonus = Math.floor(this.timeLeft + CLOCK_EPSILON) * TIME_BONUS_RATE;
        this.score += this.timeBonus;
      }
      this.balls = [];
      this.clearPowerUps();
      this.onEvent('clear', brick);
      return;
    }

    if (brick.kind === 'extra-ball') {
      // Start just inside the corners so a ball can collide with a close neighbor on its way out.
      const insetX = Math.min(BALL_RADIUS, brick.width / 2);
      const left = brick.x + insetX;
      const right = brick.x + brick.width - insetX;
      const top = brick.y + BALL_RADIUS;
      const bottom = brick.y + brick.height - BALL_RADIUS;
      const horizontalSpeed = 190;
      const verticalSpeed = 310;
      const spawnedBalls = [
        { x: left, y: top, vx: -horizontalSpeed, vy: -verticalSpeed, bonus: true },
        { x: right, y: top, vx: horizontalSpeed, vy: -verticalSpeed, bonus: true },
        { x: left, y: bottom, vx: -horizontalSpeed, vy: verticalSpeed, bonus: true },
        { x: right, y: bottom, vx: horizontalSpeed, vy: verticalSpeed, bonus: true },
      ];
      this.balls.push(...spawnedBalls);
      this.onEvent('extra-ball', brick, spawnedBalls);
      return;
    }
    if (brick.kind === 'buff' || brick.kind === 'shrink') {
      this.drops.push({ x: brick.x + brick.width / 2, y: brick.y + brick.height / 2, kind: brick.kind });
    }
    if (brick.kind === 'shield') this.shieldAdjacentBricks(brick);
    if (brick.kind === 'barrier') {
      this.effects.barrier = this.playTime + BARRIER.duration;
      this.barriers = [0, 1, 2].map((index) => ({ x: index * this.barrierWidth }));
      this.onEvent('barrier-raise');
    }
    this.onEvent('brick', brick);
  }

  shieldAdjacentBricks(source) {
    const x = source.x + source.width / 2;
    const y = source.y + source.height / 2;
    const distance = (target) => Math.hypot(target.x + target.width / 2 - x, target.y + target.height / 2 - y);
    const neighbors = this.bricks.filter((target) => target.active && !target.shielded && target.detonatesAt === undefined
      && areBrickNeighbors(source, target, this.width / WIDTH));
    neighbors.sort((a, b) => distance(a) - distance(b));
    for (const target of neighbors.slice(0, 2)) {
      target.shielded = true;
      this.onEvent('shield-raise', target);
    }
  }

  breakBarrier(barrier) {
    this.barriers.splice(this.barriers.indexOf(barrier), 1);
    if (this.barriers.length === 0) delete this.effects.barrier;
    this.onEvent('barrier-hit');
  }
}
