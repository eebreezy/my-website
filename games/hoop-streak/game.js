const marker = document.getElementById('marker');
const shootBtn = document.getElementById('shootBtn');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const message = document.getElementById('message');
const backBtn = document.getElementById('backBtn');

let pos = 0;
let dir = 1;
let speed = 2.6;
let score = 0;
let best = 0;
let playing = true;

backBtn.addEventListener('click', () => {
  window.location.href = '../../index.html';
});

function animate() {
  if (playing) {
    pos += dir * speed;
    if (pos <= 0) {
      pos = 0;
      dir = 1;
    }
    if (pos >= 100 - 8) {
      pos = 100 - 8;
      dir = -1;
    }
    marker.style.left = `${pos}%`;
  }
  requestAnimationFrame(animate);
}

function resetRound() {
  pos = Math.random() * 60;
  dir = Math.random() > 0.5 ? 1 : -1;
  speed = Math.min(5.5, 2.6 + score * 0.18);
  playing = true;
}

shootBtn.addEventListener('click', () => {
  if (!playing) return;
  playing = false;

  const center = pos + 4;
  const isGood = center >= 38 && center <= 62;

  if (isGood) {
    score += 1;
    best = Math.max(best, score);
    message.textContent = 'Bucket!';
  } else {
    message.textContent = `Miss! Final streak: ${score}`;
    score = 0;
  }

  scoreEl.textContent = `Score: ${score}`;
  bestEl.textContent = `Best: ${best}`;

  setTimeout(resetRound, 450);
});

resetRound();
animate();
