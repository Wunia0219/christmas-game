import { Graphics } from 'pixi.js';
import { BALL_RADIUS, CANNON, DROP_RADIUS, PADDLE } from './game.js';

const ink = 0x111b20;
const cream = 0xfff2cf;
const gold = 0xffcb70;
const burgundy = 0x7b263b;
const pine = 0x236047;

const paddlePalettes = {
  standard: { face: 0xba4d53, edge: 0xd99279, shadow: burgundy },
  buff: { face: 0x648c69, edge: 0xa3b388, shadow: 0x3e5947 },
  shrink: { face: 0xb16e51, edge: 0xe0ac78, shadow: 0x744333 },
};

const bombBody = ['..#####..', '.#######.', '#########', '#########', '#########', '.#######.', '..#####..'];

export const assist = {
  ice: 0x9cf3ff,
  blue: 0x194b71,
  violet: 0xc6b4ff,
  plum: 0x402c6a,
};

const brickFaces = {
  'extra-ball': 0xffebb0,
  buff: 0xf6bf65,
  tnt: 0xe45754,
  shrink: 0xff9d71,
  shield: 0xe4dfd0,
  barrier: 0xecb990,
};
const hardFaces = [0x9f998a, 0xc8c0ad, 0xeee4ce];
const glyphs = {
  'extra-ball': ['...........', '##..###..##', '##..###..##', '....###....', '...........'],
  buff: ['..###..', '.##.##.', '...##..', '...#...', '...#...', '.......', '...#...'],
  shrink: ['#.....#', '##...##', '.##.##.', '##...##', '#.....#'],
  shield: ['.#####.', '#######', '##...##', '.##.##.', '..###..', '...#...'],
  barrier: ['##.##.##', '........', '########', '########'],
  tnt: ['###.#..#.###', '.#..##.#..#.', '.#..#.##..#.', '.#..#..#..#.'],
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

export function brickColor({ kind, paint, hitsLeft }) {
  if (kind === 'hard') return hardFaces[hitsLeft - 1] ?? hardFaces[0];
  if (kind === 'tnt') return brickFaces.tnt;
  return paint?.[0] ?? brickFaces[kind] ?? gold;
}

export function durabilityPip(graphic, brick, index, color, alpha, offsetX = 0, offsetY = 0) {
  const scale = Math.min(1, brick.width / 29, brick.height / 16);
  graphic.rect(offsetX + brick.width / 2 + (index * 8 - 11) * scale,
    offsetY + brick.height / 2 - 3 * scale, 6 * scale, 5 * scale).fill({ color, alpha });
}

export function drawBrick(brick, graphic = new Graphics()) {
  const { width, height, kind } = brick;
  graphic.clear();
  graphic.position.set(brick.x, brick.y);
  graphic.visible = brick.active;
  if (!graphic.visible) return graphic;

  if (kind === 'invisible') {
    for (let x = 4; x < width - 4; x += 8) {
      const length = Math.min(4, width - 3 - x);
      graphic.rect(x, 1, length, 2).rect(x, height - 3, length, 2);
    }
    graphic.rect(1, 5, 2, height - 10).rect(width - 3, 5, 2, height - 10)
      .fill({ color: cream, alpha: 0.8 });
  } else {
    drawBrickFace(graphic, brick);
  }

  if (brick.shielded) {
    for (const x of [0, width - 8]) {
      for (const y of [0, height - 6]) graphic.rect(x, y, 8, 6);
    }
    graphic.fill(assist.blue);
    for (const x of [0, width - 2]) graphic.rect(x, 0, 2, height);
    for (const x of [0, width - 8]) {
      graphic.rect(x, 0, 8, 2).rect(x, height - 2, 8, 2);
    }
    graphic.fill(assist.ice);
  }
  return graphic;
}

function drawBrickFace(graphic, brick) {
  const { width, height, kind, paint } = brick;
  const x = width / 2;
  const y = height / 2 - 0.5;
  const armed = kind === 'tnt' && brick.detonatesAt !== undefined;
  const color = armed ? gold : brickColor(brick);
  const shadow = kind === 'tnt' ? burgundy : paint?.[1] ?? pine;
  pixelPanel(graphic, 0, 0, width, height, 2, ink);
  pixelPanel(graphic, 1, 1, width - 2, height - 2, 2, shadow);
  pixelPanel(graphic, 2, 1, width - 4, height - 5, 2, color);
  graphic.rect(4, 2, width - 8, 1).rect(3, 3, 1, 4).fill({ color: cream, alpha: 0.25 })
    .rect(5, 4, width - 10, height - 11).fill({ color: ink, alpha: 0.09 })
    .rect(5, height - 6, width - 9, 1).rect(width - 5, 5, 1, height - 11)
    .fill({ color: ink, alpha: 0.23 });
  if (kind === 'standard') return;

  const badge = kind === 'hard' ? color : brickFaces[kind];
  const scale = Math.min(1, width / 31, height / 17);
  const badgeWidth = (kind === 'tnt' ? 28 : 29) * scale;
  pixelPanel(graphic, x - badgeWidth / 2, y - 6 * scale, badgeWidth, 12 * scale, scale, ink);
  if (kind === 'hard') {
    for (let index = 0; index < 3; index += 1) {
      durabilityPip(graphic, brick, index, badge, index < brick.hitsLeft ? 1 : 0.25);
    }
  } else {
    glyph(graphic, glyphs[kind], x, y, (kind === 'tnt' ? 1.6 : 1.4) * scale, armed ? gold : badge);
    if (armed) {
      const sparkX = Math.min(width - 4, x + badgeWidth / 2 + 4);
      graphic.rect(sparkX - 3, y - 1, 6, 2).rect(sparkX - 1, y - 3, 2, 6).fill(cream);
    }
  }
}

export function drawPaddle(graphic, appearance) {
  const { width, height } = PADDLE;
  const left = -width / 2;
  const { face, edge, shadow } = paddlePalettes[appearance];
  graphic.clear();
  pixelPanel(graphic, left, 0, width, height + 2, 2, ink);
  pixelPanel(graphic, left + 1, 0, width - 2, height, 2, shadow);
  graphic.rect(left + 3, 1, width - 6, height - 4).fill(face)
    .rect(left + 3, 0, width - 6, 2).fill(edge);

  // A small holly sprig fits inside the face at every paddle width.
  graphic.rect(-7, 3, 5, 3).rect(-5, 6, 4, 2)
    .rect(2, 6, 5, 3).rect(2, 4, 3, 2).fill(0x2c513b)
    .rect(-6, 4, 3, 2).rect(3, 6, 3, 2).fill(0xbac287)
    .rect(-2, 4, 3, 3).rect(0, 7, 2, 2).fill(0xf2be90);
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

export function drawBall(graphic, x, y, bonus) {
  const radius = BALL_RADIUS;
  const size = radius * 2;
  pixelPanel(graphic, x - radius, y - radius, size, size, 4, ink);
  pixelPanel(graphic, x - radius + 1, y - radius + 1, size - 2, size - 2, 3, bonus ? gold : cream);
  graphic.rect(x - 3, y + 4, 6, 2).rect(x + 3, y + 2, 2, 2).fill(bonus ? 0xb75b36 : 0xb9ab91)
    .rect(x - 3, y - 4, 4, 2).rect(x - 4, y - 2, 2, 2).fill(0xfffefa);
}

export function drawRail(graphic, x, y, width, height, kind, warning) {
  const guard = kind === 'guard';
  const color = guard ? assist.ice : assist.violet;
  const fill = guard ? assist.blue : assist.plum;
  pixelPanel(graphic, x, y, width, height, 1, ink);
  pixelPanel(graphic, x + 1, y + 1, width - 2, height - 2, 1, fill);
  if (guard) {
    graphic.rect(x + 2, y + 1, width - 4, 2);
    for (let offset = 6; offset < width - 7; offset += 16) graphic.rect(x + offset, y + 3, 4, 3);
  } else {
    for (let offset = 3; offset < width - 3; offset += 13) {
      const dash = Math.min(8, width - offset - 3);
      graphic.rect(x + offset, y + 2, dash, 2).rect(x + offset, y + height - 4, dash, 2);
    }
  }
  graphic.fill(color);
  if (warning > 0) {
    graphic.rect(x + 1, y + 1, width - 2, height - 2).fill({ color: cream, alpha: warning * 0.55 });
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
