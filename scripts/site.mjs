import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname } from 'node:path';
import { BRICK_TEXTURES } from '../src/game.js';

const root = new URL('../', import.meta.url);
const files = new Map([
  ['index.html', 'index.html'],
  ['src/style.css', 'src/style.css'],
  ['src/main.js', 'src/main.js'],
  ['src/game.js', 'src/game.js'],
  ['src/art.js', 'src/art.js'],
  ['assets/christmas-forest.webp', 'assets/christmas-forest.webp'],
  ...Object.values(BRICK_TEXTURES).map((asset) => [asset, asset]),
  ['vendor/pixi.mjs', 'node_modules/pixi.js/dist/pixi.min.mjs'],
  ['vendor/archivo-black.woff2', 'node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff2'],
  ['vendor/space-mono.woff2', 'node_modules/@fontsource/space-mono/files/space-mono-latin-400-normal.woff2'],
  ['vendor/space-mono-bold.woff2', 'node_modules/@fontsource/space-mono/files/space-mono-latin-700-normal.woff2'],
  ['vendor/pixi-license.txt', 'node_modules/pixi.js/LICENSE'],
  ['vendor/archivo-black-license.txt', 'node_modules/@fontsource/archivo-black/LICENSE'],
  ['vendor/space-mono-license.txt', 'node_modules/@fontsource/space-mono/LICENSE'],
]);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
};

const [mode, portArgument] = process.argv.slice(2);
if (mode === 'build') {
  for (const [file, source] of files) {
    const destination = new URL(`dist/${file}`, root);
    await mkdir(new URL('.', destination), { recursive: true });
    await copyFile(new URL(source, root), destination);
  }
  console.log('Built dist/');
} else if (mode === 'dev' || mode === 'preview') {
  const port = Number(portArgument ?? (mode === 'dev' ? 5173 : 4173));
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    const source = files.get(file);
    if (!source) {
      response.writeHead(404).end();
      return;
    }

    try {
      const body = await readFile(new URL(mode === 'dev' ? source : `dist/${file}`, root));
      response.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-store' });
      response.end(body);
    } catch (error) {
      console.error(error.message);
      response.writeHead(500).end('Cannot read game files. Run npm install and, for preview, npm run build.');
    }
  });
  server.listen(port, '127.0.0.1', () => console.log(`Arkanoid: http://127.0.0.1:${server.address().port}/`));
}
