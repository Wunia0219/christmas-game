export const WIDTH = 800;
export const HEIGHT = 480;
export const BRICK = { width: 42, height: 16 };
export const LIVES = 3;
export const BALL_RADIUS = 7;
export const PADDLE = { width: 112, height: 13, y: 447 };
export const DROP_RADIUS = 11;
export const GUARD = { y: 470, width: 210, height: 8 };
export const BARRIER = { y: 230, width: WIDTH / 3, height: 9, duration: 6 };
export const CANNON = { inset: 9, muzzleY: PADDLE.y - 12, shotRadius: 3 };
export const TNT = { delay: 0.75, radius: 47 };
export const BUFF_DURATION = 12;
export const SHRINK_DURATION = 5;
export const BUFFS = ['wide', 'fast', 'guards', 'cannons'];

// Each position is [x, y, standardOnly].
const giraffeLetters = [
  [ // G
    [21, 0], [65, 0], [7, 19], [83, 19], [0, 38], [0, 57], [0, 76],
    [44, 76], [88, 76], [0, 95], [88, 95], [7, 114], [81, 114],
    [21, 133], [65, 133],
  ],
  [ // i
    [0, 21, true], [0, 57], [0, 76], [0, 95], [0, 114], [0, 133],
  ],
  [ // r
    [3, 57], [47, 61, true], [0, 76], [0, 95], [0, 114], [0, 133],
  ],
  [ // a
    [14, 57], [58, 57], [65, 76, true], [11, 95], [55, 95],
    [0, 114], [65, 114], [8, 133], [65, 133],
  ],
  [ // f
    [29, 0, true], [16, 19], [11, 38], [0, 57], [44, 57, true],
    [11, 76], [11, 95], [11, 114], [11, 133],
  ],
  [ // f
    [29, 0, true], [16, 19], [11, 38], [0, 57], [44, 57, true],
    [11, 76], [11, 95], [11, 114], [11, 133],
  ],
  [ // e
    [12, 57, true], [56, 57, true], [0, 76], [63, 76], [0, 95], [44, 95],
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
      x: left + x, y: top + y, ...BRICK, cell: index, standardOnly,
    }));
    const right = Math.max(...glyph.map(({ x, width }) => x + width));
    left = right + (spacing[index] ?? 0);
    return glyph;
  });
  return centerSlots(slots).sort((a, b) => a.y - b.y || a.x - b.x);
}

const draftSpecials = 'BBB???HHHIITTSPW';
const christmasRed = [0xff8b83, 0xb54960];
const christmasGreen = [0x91dbad, 0x458568];
const christmasGold = [0xffdc82, 0xb8893f];
const skyBlue = [0x93caff, 0x527fbd];
const layouts = [
  {
    name: 'Xmas',
    slots: wordSlots(xmasLetters, [24, 24, 24], 53),
    specials: draftSpecials,
    palette: [christmasRed, christmasGreen, christmasGold, christmasRed],
  },
  {
    name: 'Giraffe',
    slots: wordSlots(giraffeLetters, [11, 10, 13, 13, 15, 13], 60),
    specials: draftSpecials,
    palette: [
      [0xff8b83, 0xb54960], [0xffad71, 0xb86146], [0xffca69, 0xb88740],
      [0xffe17e, 0xb89146], [0x99e6bf, 0x488e7c], skyBlue,
      [0xc5adff, 0x7d60b5],
    ],
  },
  {
    name: '十方　五甲',
    slots: wordSlots(charityCharacters, [22, 54, 22], 53),
    specials: 'BBBB????HHHIITTSPW',
    palette: [christmasGold, christmasGold, skyBlue, skyBlue],
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
const PADDLE_SPEED = 700;
const PADDLE_CONTACT_Y = PADDLE.y - BALL_RADIUS;
const PADDLE_GRACE_TIME = 0.045;
const PADDLE_GRACE_DEPTH = 18;
const DROP_SPEED = 145;
const SHOT_SPEED = 760;
const SHIELD_NEIGHBOR_GAP = 8;
const MAX_STEP = 1 / 120;
const SEPARATION = 0.01;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function makeBricks(level) {
  const { slots, palette, specials } = layouts[level - 1];
  const shuffleCount = slots.filter(({ standardOnly }) => !standardOnly).length;
  const kinds = [...specials.padEnd(shuffleCount, '#')];
  for (let index = kinds.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [kinds[index], kinds[other]] = [kinds[other], kinds[index]];
  }

  return slots.map(({ cell, standardOnly, ...bounds }) => {
    const kind = standardOnly ? 'standard' : BRICK_KINDS[kinds.pop()] ?? 'standard';
    return {
      ...bounds,
      kind,
      paint: palette?.[cell],
      hitsLeft: kind === 'hard' ? 3 : 1,
      points: 30,
      active: true,
    };
  });
}

function areBrickNeighbors(a, b) {
  const gapX = Math.max(a.x - b.x - b.width, b.x - a.x - a.width);
  const gapY = Math.max(a.y - b.y - b.height, b.y - a.y - a.height);
  return gapX <= SHIELD_NEIGHBOR_GAP && gapY <= SHIELD_NEIGHBOR_GAP;
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

function paddleContactTime({ x, y, vx, vy }, paddleX, paddleVelocity, paddleWidth, radius) {
  const crossing = (PADDLE.y - radius - y) / vy;
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
    this.reset();
  }

  reset(level = 1) {
    if (!Number.isInteger(level) || level < 1 || level > LEVELS) throw new RangeError('Unknown level');
    this.startLevel = level;
    this.level = level;
    this.lives = LIVES;
    this.score = 0;
    this.loadLevel('ready');
  }

  loadLevel(phase) {
    this.bricks = makeBricks(this.level);
    this.layoutBottom = Math.max(...this.bricks.map(({ y, height }) => y + height));
    this.barrierY = Math.max(BARRIER.y, this.layoutBottom + 10);
    this.remaining = this.bricks.length;
    this.playTime = 0;
    this.clearPowerUps();
    this.paddleX = WIDTH / 2;
    this.stageBall();
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
    this.balls = [{ x: this.paddleX, y: PADDLE.y - BALL_RADIUS - 4, vx: 0, vy: 0 }];
  }

  effectTimeLeft(kind) {
    return Math.max(0, (this.effects[kind] ?? 0) - this.playTime);
  }

  get paddleWidth() {
    const width = PADDLE.width + (this.effectTimeLeft('wide') > 0 ? 64 : 0);
    return this.effectTimeLeft('shrink') > 0 ? width * 0.75 : width;
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
    if (this.phase === 'lost' || this.phase === 'won') this.reset(this.startLevel);
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
      const time = paddleContactTime(ball, paddleX, paddleVelocity, this.paddleWidth, BALL_RADIUS);
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
    consider(this.findAttackContact(ball, BALL_RADIUS, closest?.time ?? duration));
    return closest;
  }

  findAttackContact(projectile, radius, duration) {
    let closest = null;
    if (projectile.vy < 0 && this.barriers.length > 0) {
      const time = (this.barrierY + BARRIER.height + radius - projectile.y) / projectile.vy;
      if (time >= 0 && time <= duration) {
        const x = projectile.x + projectile.vx * time;
        const barrier = this.barriers.find((segment) => x >= segment.x && x < segment.x + BARRIER.width);
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
    if (this.effectTimeLeft('barrier') === 0) this.barriers.length = 0;

    const keyboardStep = this.paddleSpeed * seconds;
    const pointerStep = keyboardStep * 1.6;
    const offset = direction || pointerX === undefined
      ? direction * keyboardStep
      : clamp(pointerX - this.paddleX, -pointerStep, pointerStep);
    const paddleStartX = this.paddleX;
    this.movePaddle(this.paddleX + offset);
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
      this.onEvent('tnt-score', { x, y, points: this.score - scoreBeforeBlast });
      if (this.phase !== 'playing') return;
    }
  }

  updateDrops(seconds, paddleStartX, paddleVelocity) {
    for (let index = this.drops.length - 1; index >= 0; index -= 1) {
      const drop = this.drops[index];
      const falling = { x: drop.x, y: drop.y, vx: 0, vy: DROP_SPEED };
      const time = paddleContactTime(falling, paddleStartX, paddleVelocity, this.paddleWidth, DROP_RADIUS);
      drop.y += DROP_SPEED * seconds;
      if (time !== null && time <= seconds) {
        this.drops.splice(index, 1);
        if (drop.kind === 'shrink') {
          this.effects.shrink = this.playTime + SHRINK_DURATION;
          this.onEvent('shrink');
        } else {
          this.activateBuff(BUFFS[Math.floor(Math.random() * BUFFS.length)]);
        }
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
      ball.y = PADDLE_CONTACT_Y;
      if (this.effectTimeLeft('cannons') > 0) {
        const offset = this.paddleWidth / 2 - CANNON.inset;
        for (const x of [paddleX - offset, paddleX + offset]) {
          this.shots.push({ x, y: CANNON.muzzleY - CANNON.shotRadius, vx: 0, vy: -SHOT_SPEED });
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
      this.onEvent('paddle', { x, y: PADDLE.y });
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
      this.balls = [];
      this.clearPowerUps();
      this.onEvent('clear', brick);
      return;
    }

    const x = brick.x + brick.width / 2;
    const y = brick.y + brick.height / 2;
    if (brick.kind === 'extra-ball') {
      const direction = x < WIDTH / 2 ? 1 : -1;
      const spawnedBalls = [[-15, -125], [0, 75], [15, 185]].map(([offset, speed]) => ({
        x: x + offset * direction, y, vx: speed * direction, vy: 310, bonus: true,
      }));
      this.balls.push(...spawnedBalls);
      this.onEvent('extra-ball', brick, spawnedBalls);
      return;
    }
    if (brick.kind === 'buff' || brick.kind === 'shrink') this.drops.push({ x, y, kind: brick.kind });
    if (brick.kind === 'shield') this.shieldAdjacentBricks(brick);
    if (brick.kind === 'barrier') {
      this.effects.barrier = this.playTime + BARRIER.duration;
      this.barriers = [0, BARRIER.width, BARRIER.width * 2].map((left) => ({ x: left }));
      this.onEvent('barrier-raise');
    }
    this.onEvent('brick', brick);
  }

  shieldAdjacentBricks(source) {
    const x = source.x + source.width / 2;
    const y = source.y + source.height / 2;
    const distance = (target) => Math.hypot(target.x + target.width / 2 - x, target.y + target.height / 2 - y);
    const neighbors = this.bricks.filter((target) => target.active && !target.shielded && target.detonatesAt === undefined
      && areBrickNeighbors(source, target));
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
