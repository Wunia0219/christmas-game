import { drawScore } from './score-art.js';

const value = document.getElementById('leader-score-value');
const canvas = document.getElementById('leader-score-pixels');

if (drawScore(canvas, value.textContent, { color: '#ffdc96' })) {
  value.classList.add('sr-only');
  canvas.hidden = false;
}
