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
const numberSymbols = {
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  ':': ['.....', '..##.', '..##.', '.....', '..##.', '..##.', '.....'],
  ',': ['..', '..', '..', '..', '##', '##', '#.'],
};

export function drawScore(canvas, value, { color = '#ffcb70', outline } = {}) {
  const context = canvas.getContext('2d');
  if (!context) return false;

  const glyphs = [...value].map((symbol) => numberSymbols[symbol] ?? digits[Number(symbol)]);
  const spacing = 2;
  const padding = outline ? 1 : 0;
  canvas.width = glyphs.reduce((width, rows) => width + rows[0].length + spacing, 0) - spacing + padding * 2;
  canvas.height = digits[0].length + padding * 2;
  const pixels = [];
  let left = padding;
  for (const rows of glyphs) {
    for (const [row, line] of rows.entries()) {
      for (const match of line.matchAll(/#+/g)) {
        pixels.push([left + match.index, row + padding, match[0].length]);
      }
    }
    left += rows[0].length + spacing;
  }
  if (outline) {
    context.fillStyle = outline;
    for (const [x, y, width] of pixels) context.fillRect(x - 1, y - 1, width + 2, 3);
  }
  context.fillStyle = color;
  for (const [x, y, width] of pixels) context.fillRect(x, y, width, 1);
  return true;
}
