const canvas = document.getElementById('lobby-snow');
const context = canvas.getContext('2d');

// Reuse the large flake, small flake, and gold speck from the original wallpaper.
const snowSprites = {
  large: { left: 13, top: 15, size: 11 },
  small: { left: 57, top: 60, size: 7 },
  speck: { left: 61, top: 17, size: 2 },
};

if (context) {
  const sheet = new Image();
  sheet.addEventListener('load', () => createSnowfall(sheet), { once: true });
  sheet.src = new URL('../assets/lobby-snow.webp', import.meta.url).href;
}

function createSnowfall(sheet) {
  const lobby = document.getElementById('lobby-view');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const flakes = [];
  let width = 0;
  let height = 0;
  let frame;
  let previousTime;

  function newFlake(y) {
    const depth = Math.random();
    const sprite = depth > 0.82 ? snowSprites.large : depth > 0.33 ? snowSprites.small : snowSprites.speck;
    return {
      x: Math.random() * width,
      y,
      sprite,
      alpha: 0.30 + depth * 0.20 + (sprite === snowSprites.speck ? 0 : 0.03),
      fall: 14 + depth * 34 + Math.random() * 8,
      drift: (Math.random() - 0.5) * 9,
      phase: Math.random() * Math.PI * 2,
      sway: 0.5 + Math.random() * 1.2,
    };
  }

  function drawSnow() {
    context.clearRect(0, 0, width, height);
    for (const { x, y, sprite: { left, top, size }, alpha } of flakes) {
      context.globalAlpha = alpha;
      context.drawImage(sheet, left, top, size, size, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    }
  }

  function animate(time) {
    const seconds = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    for (const flake of flakes) {
      flake.phase += flake.sway * seconds;
      flake.x += (flake.drift + Math.sin(flake.phase) * 7) * seconds;
      flake.y += flake.fall * seconds;
      if (flake.y > height + flake.sprite.size) Object.assign(flake, newFlake(-6 - Math.random() * 72));
    }
    drawSnow();
    frame = requestAnimationFrame(animate);
  }

  function syncAnimation() {
    if (lobby.hidden || document.hidden || reducedMotion.matches || width === 0 || height === 0) {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      previousTime = undefined;
    } else if (frame === undefined) {
      frame = requestAnimationFrame(animate);
    }
  }

  new ResizeObserver(([{ contentRect }]) => {
    const { width: nextWidth, height: nextHeight } = contentRect;
    if (!nextWidth || !nextHeight) {
      syncAnimation();
      return;
    }
    for (const flake of flakes) {
      flake.x *= nextWidth / width;
      flake.y *= nextHeight / height;
    }
    width = nextWidth;
    height = nextHeight;
    const scale = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    context.imageSmoothingEnabled = false;

    const baseCount = Math.min(180, Math.max(22, Math.round(width * height / 8500)));
    const count = Math.round(baseCount * 1.10);
    if (flakes.length > count) flakes.length = count;
    while (flakes.length < count) flakes.push(newFlake(Math.random() * height));
    drawSnow();
    syncAnimation();
  }).observe(canvas);

  document.addEventListener('visibilitychange', syncAnimation);
  reducedMotion.addEventListener('change', syncAnimation);
}
