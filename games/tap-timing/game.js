const marker = document.getElementById('marker');
const tapBtn = document.getElementById('tapBtn');
const scoreEl = document.getElementById('score');
const roundEl = document.getElementById('round');
const message = document.getElementById('message');
const backBtn = document.getElementById('backBtn');

let pos = 0;
let dir = 1;
let speed = 2.8;
let score = 0;
let round = 1;
let active = true;

backBtn.addEventListener('click', () => {
  window.location.href = '../../index.html';
});

function animate() {
  if (active) {
    pos += dir * speed;
    if (pos <= 0) {
      pos = 0;
      dir = 1;
    }
    if (pos >= 100 - 6) {
      pos = 100 - 6;
      dir = -1;
    }
    marker.style.left = `${pos}%`;
  }
  requestAnimationFrame(animate);
}

function nextRound() {
  round += 1;
  roundEl.textContent = `Round: ${round}`;
  speed = Math.min(7.2, 2.8 + round * 0.22);
  active = true;
}

tapBtn.addEventListener('click', () => {
  if (!active) return;
  active = false;
  const center = pos + 3;
  const distance = Math.abs(50 - center);
  const points = Math.max(0, 12 - Math.round(distance));
  score += points;
  scoreEl.textContent = `Score: ${score}`;
  message.textContent = points >= 10 ? 'Perfect hit!' : points >= 6 ? 'Good hit!' : 'Too early or too late.';
  setTimeout(nextRound, 450);
});

animate();
