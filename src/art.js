import { Assets, Graphics } from 'pixi.js';
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
  shrink: ['#.....#', '##...##', '.##.##.', '##...##', '#.....#'],
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

const digits = [
  ['.###.', '##.##', '##.##', '##.##', '##.##', '##.##', '.###.'],
  ['..##.', '.###.', '..##.', '..##.', '..##.', '..##.', '.####'],
  ['.###.', '##.##', '...##', '..##.', '.##..', '##...', '#####'],
  ['####.', '...##', '...##', '.###.', '...##', '...##', '####.'],
  ['##.##', '##.##', '##.##', '#####', '...##', '...##', '...##'],
  ['#####', '##...', '##...', '####.', '...##', '##.##', '.###.'],
  ['.###.', '##...', '##...', '####.', '##.##', '##.##', '.###.'],
  ['#####', '...##', '...##', '..##.', '..##.', '.##..', '.##..'],
  ['.###.', '##.##', '##.##', '.###.', '##.##', '##.##', '.###.'],
  ['.###.', '##.##', '##.##', '.####', '...##', '...##', '.###.'],
];

export function drawScore(canvas, value) {
  const digitWidth = digits[0][0].length;
  const advance = digitWidth + 2;
  canvas.width = advance * value.length - 2;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffcb70';
  for (const [index, digit] of [...value].entries()) {
    for (const [row, line] of digits[Number(digit)].entries()) {
      for (const match of line.matchAll(/#+/g)) {
        context.fillRect(index * advance + match.index, row, match[0].length, 1);
      }
    }
  }
}

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

function drawPlatform(graphic, x, y, width, height, { face, edge, shadow }) {
  pixelPanel(graphic, x, y, width, height + 2, 2, ink);
  pixelPanel(graphic, x + 1, y, width - 2, height, 2, shadow);
  graphic.rect(x + 3, y + 1, width - 6, height - 4).fill(face)
    .rect(x + 3, y, width - 6, 2).fill(edge);
}

export function makePaddle() {
  const graphic = new Graphics();
  const { width, height } = PADDLE;
  drawPlatform(graphic, -width / 2, 0, width, height, paddlePalette);

  // A small holly sprig fits inside the face at every paddle width.
  graphic.rect(-7, 3, 5, 3).rect(-5, 6, 4, 2)
    .rect(2, 6, 5, 3).rect(2, 4, 3, 2).fill(0x2c513b)
    .rect(-6, 4, 3, 2).rect(3, 6, 3, 2).fill(0xbac287)
    .rect(-2, 4, 3, 3).rect(0, 7, 2, 2).fill(0xf2be90);
  return graphic;
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

export function drawDrop(graphic, x, y, kind) {
  if (kind === 'shrink') {
    graphic.rect(x - 2, y - 7, 4, 4).rect(x + 1, y - 9, 5, 3).fill(0xc27a5d)
      .rect(x + 5, y - 9, 6, 2).rect(x + 7, y - 11, 2, 6).fill(0xffa365)
      .rect(x + 7, y - 9, 2, 2).fill(cream);
    glyph(graphic, bombBody, x - 1, y + 3, 2, 0xffba91);
    pixelPanel(graphic, x - 8, y - 2, 14, 10, 2, 0x30292e);
    graphic.rect(x - 6, y, 4, 2).rect(x - 7, y + 2, 2, 2).fill(0xc89490);
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
  drawPlatform(graphic, x, y, width, height - 2, railPalettes[kind]);
  if (warning > 0) {
    graphic.rect(x + 3, y, width - 6, 2).fill({ color: cream, alpha: warning * 0.55 });
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
