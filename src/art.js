import { Assets, Container, Graphics } from 'pixi.js';
import { BALL_RADIUS, BRICK_PALETTES, BRICK_TEXTURES, CANNON, DROP_RADIUS, PADDLE, SPRITE_TEXTURES } from './game.js';

const ink = 0x111b20;
const cream = 0xfff2cf;
const gold = 0xffcb70;
const burgundy = 0x7b263b;
const pine = 0x236047;
export const bonusBallColor = 0xffb36b;
// Pixi multiplies the tint by the warm white in the shared ball texture.
const bonusBallTint = 0xffc075;

const paddlePalette = { face: 0xba4d53, edge: 0xd99279, shadow: burgundy };
const hollyPalette = { d: 0x263e31, g: 0x718b51, l: 0xb2c978, s: 0x426248, r: 0x6f2136, b: 0xd55b64, h: 0xf5a090 };
const hollyPixels = [
  '....d.....d...',
  '..ddgd...dgdd.',
  '.dglgd..dglggd',
  'dgglgsddglggd.',
  '.dgglsgslggsd.',
  '..ddsgrdrrsd..',
  '....drhbrhbr..',
  '.....rbbrbbr..',
  '......rr.rr...',
];

export async function loadGameTextures() {
  const files = [...Object.values(BRICK_TEXTURES), ...Object.values(SPRITE_TEXTURES)].map((path) => ({
    alias: path,
    src: new URL(`../${path}`, import.meta.url).href,
    data: { scaleMode: 'nearest' },
  }));
  try {
    return await Assets.load(files);
  } catch (error) {
    console.warn('Could not load Christmas textures. Using the drawn artwork.', error);
    return {};
  }
}

const bombBody = ['..#####..', '.#######.', '#########', '#########', '#########', '.#######.', '..#####..'];

export const assist = {
  ice: 0x9cf3ff,
  blue: 0x194b71,
  plum: 0x402c6a,
};

const railPalettes = {
  guard: { face: 0x407b88, edge: 0x8fd5dc, shadow: assist.blue },
  barrier: { face: 0x79679e, edge: 0xbca7dc, shadow: assist.plum },
};

const glyphs = {
  'extra-ball': [
    '.###...###...###...###.',
    '#####.#####.#####.#####',
    '#####.#####.#####.#####',
    '#####.#####.#####.#####',
    '.###...###...###...###.',
  ],
  buff: ['..###..', '.##.##.', '...##..', '...#...', '...#...', '.......', '...#...'],
  shield: ['.#####.', '#######', '##...##', '.##.##.', '..###..', '...#...'],
  barrier: ['##.##.##', '........', '########', '########'],
  tnt: ['###.#..#.###', '.#..##.#..#.', '.#..#.##..#.', '.#..#..#..#.'],
};

const fracture = [
  [-6, 1, 2, 4], [-6, 4, 4, 2], [-3, 5, 2, 4], [-3, 8, 5, 2],
  [1, 9, 2, 4], [1, 12, 4, 2], [4, 13, 2, 5],
  [-8, 8, 6, 2], [-9, 9, 2, 3], [-11, 11, 3, 2],
  [3, 10, 5, 2], [7, 8, 2, 3], [8, 7, 3, 2],
];

const leftSnowMound = ['...#####...', '..#######..', '.#########.', '###########', '.####.###..'];
const rightSnowMound = ['.....#####...', '...########..', '.###########.', '#############', '..###.######.'];
const snowCaps = {
  double: [
    [0.22, ['..########..', '.###########', '############', '############', '..####..###.'], 1.15],
    [0.78, ['.#########..', '###########.', '############', '############', '.###..#####.'], 1.15],
  ],
  left: [[0.31, leftSnowMound, 1]],
  right: [[0.71, rightSnowMound, 1]],
};

function glyph(graphic, rows, x, y, size, color) {
  const left = x - rows[0].length * size / 2;
  const top = y - rows.length * size / 2;
  for (const [row, line] of rows.entries()) {
    for (const match of line.matchAll(/#+/g)) {
      graphic.rect(left + match.index * size, top + row * size, match[0].length * size, size);
    }
  }
  graphic.fill(color);
}

function pixelPanel(graphic, x, y, width, height, step, color) {
  graphic.rect(x + step, y, width - step * 2, height)
    .rect(x, y + step, step, height - step * 2)
    .rect(x + width - step, y + step, step, height - step * 2)
    .fill(color);
}

export function brickColor({ paint }) {
  return BRICK_PALETTES[paint]?.face ?? gold;
}

function brickIconColor(color) {
  const red = color >> 16;
  const green = (color >> 8) & 0xff;
  const blue = color & 0xff;
  return 0.299 * red + 0.587 * green + 0.114 * blue > 136 ? 0x302319 : cream;
}

export function drawHardCrack(graphic, brick, offsetX = 0, offsetY = 0, flashAlpha = 0) {
  const centerX = offsetX + Math.floor(brick.width / 2);
  for (const [x, y, width, height] of fracture) {
    graphic.rect(centerX + x + 1, offsetY + y + 1, width, height);
  }
  graphic.fill({ color: cream, alpha: flashAlpha || 0.5 });
  if (flashAlpha > 0) return;

  for (const [x, y, width, height] of fracture) {
    graphic.rect(centerX + x, offsetY + y, width, height);
  }
  graphic.fill({ color: 0x2c1d18, alpha: 0.92 });
}

export function drawBrick(brick, textures, graphic = new Graphics()) {
  graphic.clear();
  graphic.alpha = 1;
  graphic.position.set(brick.x, brick.y);
  graphic.visible = brick.active;
  if (!graphic.visible) return graphic;

  if (brick.kind === 'invisible') {
    drawConcealedBrick(graphic, brick.width, brick.height);
  } else {
    drawBrickFace(graphic, brick, textures);
  }
  if (brick.shielded) drawShieldCover(graphic, brick.width, brick.height);
  return graphic;
}

function drawConcealedBrick(graphic, width, height) {
  for (let x = 4; x < width - 3; x += 9) {
    const dash = Math.min(5, width - 3 - x);
    graphic.rect(x, 1, dash, 2).rect(x, height - 3, dash, 2);
  }
  for (let y = 4; y < height - 3; y += 8) {
    const dash = Math.min(4, height - 3 - y);
    graphic.rect(1, y, 2, dash).rect(width - 3, y, 2, dash);
  }
  graphic.fill({ color: cream, alpha: 0.8 });
}

function drawShieldCover(graphic, width, height) {
  pixelPanel(graphic, 0, 0, width, height, 2, { color: assist.ice, alpha: 0.12 });
  graphic.rect(2, 0, width - 4, 1).rect(1, 1, width - 2, 1)
    .rect(0, 2, 2, height - 4).rect(width - 2, 2, 2, height - 4)
    .rect(1, height - 2, width - 2, 1).rect(2, height - 1, width - 4, 1)
    .fill(0x72c6d5)
    .rect(4, 2, Math.min(15, width - 8), 1).rect(2, 3, 1, 4).fill(assist.ice)
    .rect(3, height - 3, width - 6, 1).fill({ color: assist.blue, alpha: 0.7 });
}

function drawSnowCaps(graphic, width, style) {
  for (const [offset, rows, pixel] of snowCaps[style] ?? []) {
    const x = Math.round(width * offset);
    glyph(graphic, rows, x, 0.5 + rows.length * pixel / 2, pixel, 0xdce1e5);
    glyph(graphic, rows.slice(0, 4), x, 0.5 + 2 * pixel, pixel, 0xffffff);
  }
}

function drawBrickFace(graphic, brick, textures) {
  const { width, height, kind, paint, snow } = brick;
  const color = brickColor(brick);
  const shadow = BRICK_PALETTES[paint]?.shadow ?? pine;
  if (kind === 'hard') {
    graphic.rect(6, 0, width - 12, height)
      .rect(3, 2, width - 6, height - 4)
      .rect(0, 5, width, height - 10).fill(ink)
      .rect(6, 1, width - 12, height - 2)
      .rect(3, 5, 3, height - 10).rect(width - 6, 5, 3, height - 10).fill(shadow)
      .rect(7, 2, width - 14, height - 6)
      .rect(5, 5, 2, height - 10).rect(width - 7, 5, 2, height - 10).fill(color)
      .rect(7, 2, width - 14, 3).fill({ color: cream, alpha: 0.62 })
      .rect(5, 5, 3, 4).rect(width - 8, 5, 3, 2).fill({ color: cream, alpha: 0.38 })
      .rect(7, height - 7, width - 14, 3)
      .rect(width - 8, 7, 3, height - 14).fill({ color: ink, alpha: 0.42 });
    drawSnowCaps(graphic, width, snow);
    if (brick.hitsLeft === 1) drawHardCrack(graphic, brick);
    return;
  }

  const texture = textures[BRICK_TEXTURES[paint]];
  if (texture) {
    // Keep the face opaque when a texture has translucent pixels inside the bevel.
    graphic.rect(4, 5, width - 8, height - 9).fill(color)
      .rect(0, 0, width, height).fill({ texture });
  } else {
    graphic.rect(3, 0, width - 6, height)
      .rect(1.5, 1.5, width - 3, height - 3)
      .rect(0, 3.5, width, height - 7).fill(shadow)
      .rect(3, 1.5, width - 6, height - 4).fill(color)
      .rect(3, 1.5, width - 6, 2)
      .rect(1.5, 3.5, 2, height - 7).rect(width - 3.5, 3.5, 2, height - 7).fill({ color: cream, alpha: 0.53 })
      .rect(3, 3.5, width - 6, 1.5).fill({ color: cream, alpha: 0.28 })
      .rect(3, height - 3, width - 6, 1.5).fill({ color: shadow, alpha: 0.5 });
  }
  drawSnowCaps(graphic, width, snow);
  if (kind === 'standard') return;

  if (kind === 'shrink') {
    drawBomb(graphic, width / 2, height / 2, 2 / 3);
    return;
  }

  const buffMark = textures[SPRITE_TEXTURES.buffMark];
  if (kind === 'buff' && buffMark) {
    const size = Math.min(height - 5, 13);
    graphic.rect((width - size) / 2, (height - size) / 2, size, size).fill({ texture: buffMark });
    return;
  }

  const scale = Math.min(1, width / 31, height / 17);
  glyph(graphic, glyphs[kind], width / 2, height * (kind === 'buff' ? 0.5 : 0.55),
    (kind === 'tnt' ? 1.65 : 1.45) * scale, brickIconColor(color));
}

function drawPlatform(graphic, x, y, width, height, { face, edge, shadow }, faceHeight = height - 6) {
  pixelPanel(graphic, x, y, width, height, 2, ink);
  pixelPanel(graphic, x + 1, y, width - 2, height - 2, 2, shadow);
  graphic.rect(x + 3, y + 1, width - 6, faceHeight).fill(face)
    .rect(x + 3, y, width - 6, 2).fill(edge);
}

export function makePaddle() {
  const paddle = new Container();
  const body = new Graphics();
  const holly = new Graphics();
  const { width, height } = PADDLE;
  drawPlatform(body, -width / 2, 0, width, height, paddlePalette, height - 4);
  const hollyCenterY = Math.floor((height - hollyPixels.length) / 2) + hollyPixels.length / 2;
  for (const [pixel, color] of Object.entries(hollyPalette)) {
    const rows = hollyPixels.map((line) => [...line].map((value) => value === pixel ? '#' : '.').join(''));
    glyph(holly, rows, 0, hollyCenterY, 1, color);
  }
  paddle.addChild(body, holly);
  return { paddle, body };
}

export function makeCannon() {
  const graphic = new Graphics();
  pixelPanel(graphic, -7, 8, 14, 9, 2, ink);
  graphic.rect(-5, 10, 10, 5).fill(assist.blue)
    .rect(-4, 0, 8, 11).fill(assist.blue)
    .rect(-2, 1, 4, 10).fill(assist.ice)
    .rect(-5, 11, 10, 2).fill(assist.ice);
  return graphic;
}

export function drawShot(graphic, x, y) {
  const radius = CANNON.shotRadius;
  graphic.rect(x - radius, y - radius, radius * 2, 12).fill(assist.blue)
    .rect(x - 1, y - radius, 2, 9).fill(assist.ice);
}

function drawBomb(graphic, x, y, scale = 1) {
  graphic.save().setTransform(scale, 0, 0, scale, x, y);
  graphic.rect(-2, -7, 4, 4).rect(1, -9, 5, 3).fill(0xc27a5d)
    .rect(5, -9, 6, 2).rect(7, -11, 2, 6).fill(0xffa365)
    .rect(7, -9, 2, 2).fill(cream);
  glyph(graphic, bombBody, -1, 3, 2, 0xffba91);
  pixelPanel(graphic, -8, -2, 14, 10, 2, 0x30292e);
  graphic.rect(-6, 0, 4, 2).rect(-7, 2, 2, 2).fill(0xc89490);
  graphic.restore();
}

export function drawDrop(graphic, x, y, kind) {
  if (kind === 'shrink') {
    drawBomb(graphic, x, y);
    return;
  }

  pixelPanel(graphic, x - 10, y - 2, 20, 13, 2, ink);
  pixelPanel(graphic, x - DROP_RADIUS, y - 5, DROP_RADIUS * 2, 6, 1, ink);
  graphic.rect(x - 8, y + 1, 16, 8).fill(0xc98d47)
    .rect(x - 9, y - 4, 18, 4).fill(gold)
    .rect(x - 7, y + 1, 14, 2).fill(0xeeb762)
    .rect(x - 2, y - 5, 4, 14).fill(burgundy)
    .rect(x - 7, y - 10, 5, 4).rect(x + 2, y - 10, 5, 4).fill(gold)
    .rect(x - 4, y - 8, 8, 3).fill(0xe39c52)
    .rect(x - 2, y - 7, 4, 3).fill(cream);
}

const giftSparkles = [
  [0, -16, -5, 20, 7, gold],
  [0.08, 16, 5, 22, 7, 0xffdf8d],
  [0.03, -12, -6, 28, 2, 0xffba60],
  [0.15, 13, 7, 30, 3, gold],
  [0.21, -14, -5, 24, 3, gold],
  [0.25, 12, 6, 27, 2, 0xffba60],
];
const giftSparkleCycle = 0.34;

export function drawGiftSparkles(graphic, x, y, age, reduced) {
  if (reduced) {
    graphic.rect(Math.round(x) - 15, Math.round(y) - 5, 3, 3)
      .rect(Math.round(x) + 13, Math.round(y) - 8, 3, 3).fill(gold);
    return;
  }

  // Small stars peel away from the box and fade above it as it falls.
  for (const [delay, offset, drift, lift, size, color] of giftSparkles) {
    if (age < delay) continue;
    const progress = ((age - delay) % giftSparkleCycle) / giftSparkleCycle;
    const alpha = Math.min(1, 0.7 + progress * 5) * (1 - progress) ** 0.85;
    const px = Math.round(x + offset + drift * progress);
    const py = Math.round(y - 4 - lift * progress);
    if (size === 7) {
      graphic.rect(px - 3, py, 7, 1)
        .rect(px, py - 3, 1, 3).rect(px, py + 1, 1, 3).fill({ color, alpha })
        .rect(px - 1, py - 1, 3, 3).fill({ color: cream, alpha });
    } else {
      graphic.rect(px, py, size, size).fill({ color, alpha });
    }
  }
}

export function drawBall(graphic, x, y, bonus, textures) {
  const radius = BALL_RADIUS;
  const size = radius * 2;
  const texture = textures[SPRITE_TEXTURES.mainBall];
  if (texture) {
    graphic.rect(x - radius, y - radius, size, size).fill({ texture, color: bonus ? bonusBallTint : 0xffffff });
    return;
  }
  pixelPanel(graphic, x - radius, y - radius, size, size, 4, ink);
  pixelPanel(graphic, x - radius + 1, y - radius + 1, size - 2, size - 2, 3, bonus ? bonusBallColor : cream);
  graphic.rect(x - 3, y + 4, 6, 2).rect(x + 3, y + 2, 2, 2).fill(bonus ? 0xb75b36 : 0xb9ab91)
    .rect(x - 3, y - 4, 4, 2).rect(x - 4, y - 2, 2, 2).fill(0xfffefa);
}

export function drawRail(graphic, x, y, width, height, kind, warning) {
  drawPlatform(graphic, x, y, width, height, railPalettes[kind]);
  if (warning > 0) {
    graphic.rect(x + 3, y, width - 6, 2).fill({ color: cream, alpha: warning * 0.55 });
  }
}

const paddleSparkSpread = [
  [-19, 2, 2, 0xf6b866],
  [-12, 3, 2, 0xffe9ab],
  [12, 3, 2, 0xffe9ab],
  [19, 2, 2, 0xffb765],
];

export function drawPaddleImpact(graphic, x, y, progress, reduced) {
  const centerX = Math.round(x);
  const top = Math.round(y);
  const remaining = 1 - progress;
  const coreAlpha = reduced ? remaining * 0.8 : remaining ** 2;
  graphic.rect(centerX - 6, top, 13, 2).fill({ color: cream, alpha: coreAlpha });
  if (reduced) return;

  // Begin outside the ball's silhouette and spread out along the paddle.
  const innerGap = BALL_RADIUS + 2;
  const spread = 1 - 0.58 * remaining ** 2;
  const alpha = remaining ** 1.1;
  for (const [distance, lift, size, color] of paddleSparkSpread) {
    const offset = Math.sign(distance) * (innerGap + Math.round((Math.abs(distance) - innerGap) * spread));
    graphic.rect(centerX + offset - Math.floor(size / 2), top - size - Math.round(lift * spread), size, size)
      .fill({ color, alpha });
  }
}

export function drawSpark(graphic, x, y, radius, color, alpha) {
  const step = Math.max(1, Math.round(radius / 4));
  graphic.rect(x - radius, y - step, radius * 2, step * 2)
    .rect(x - step, y - radius, step * 2, radius - step)
    .rect(x - step, y + step, step * 2, radius - step)
    .rect(x - step * 2, y - step * 2, step * 4, step)
    .rect(x - step * 2, y + step, step * 4, step)
    .fill({ color, alpha });
}
