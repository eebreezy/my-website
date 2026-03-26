const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const restartBtn = document.getElementById('restartBtn');
const backBtn = document.getElementById('backBtn');

const W = canvas.width;
const H = canvas.height;

let best = 0;
let pressing = false;
let animationId = null;

const player = { x: 72, y: H / 2, vy: 0, r: 15 };
let walls = [];
let score = 0;
let frame = 0;
let gameOver = false;

backBtn.addEventListener('click', () => {
  window.location.href = '../../index.html';
});

function resetGame() {
  player.y = H / 2;
  player.vy = 0;
  walls = [];
  score = 0;
  frame = 0;
  gameOver = false;
  scoreEl.textContent = 'Score: 0';
  restartBtn.textContent = 'Restart';
}

function spawnWall() {
  const gapHeight = 150;
  const gapY = 80 + Math.random() * (H - 220);
  walls.push({ x: W + 40, gapY, gapHeight, passed: false });
}

function drawRocket() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = '#ff7a59';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-12, -12);
  ctx.lineTo(-12, 12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#72e6ff';
  ctx.beginPath();
  ctx.arc(-2, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function update() {
  frame += 1;
  player.vy += pressing ? -0.38 : 0.34;
  player.vy = Math.max(-5.2, Math.min(5.2, player.vy));
  player.y += player.vy;

  if (frame % 85 === 0) spawnWall();

  walls.forEach((wall) => {
    wall.x -= 2.7;
    if (!wall.passed && wall.x + 36 < player.x) {
      wall.passed = true;
      score += 1;
      best = Math.max(best, score);
      scoreEl.textContent = `Score: ${score}`;
      bestEl.textContent = `Best: ${best}`;
    }
  });

  walls = walls.filter((wall) => wall.x > -50);

  if (player.y < 0 || player.y > H) {
    gameOver = true;
  }

  for (const wall of walls) {
    const hitX = player.x + player.r > wall.x && player.x - player.r < wall.x + 36;
    const inGap = player.y - player.r > wall.gapY && player.y + player.r < wall.gapY + wall.gapHeight;
    if (hitX && !inGap) {
      gameOver = true;
      break;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 22; i += 1) {
    ctx.globalAlpha = 0.15;
    ctx.fillRect((i * 43 + frame * 0.3) % W, (i * 67) % H, 2, 2);
  }
  ctx.globalAlpha = 1;

  walls.forEach((wall) => {
    ctx.fillStyle = '#4dd18b';
    ctx.fillRect(wall.x, 0, 36, wall.gapY);
    ctx.fillRect(wall.x, wall.gapY + wall.gapHeight, 36, H);
  });

  drawRocket();

  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', W / 2, H / 2 - 6);
    ctx.font = '18px Arial';
    ctx.fillText(`Score: ${score}`, W / 2, H / 2 + 28);
    restartBtn.textContent = 'Play Again';
  }
}

function loop() {
  update();
  draw();
  if (!gameOver) {
    animationId = requestAnimationFrame(loop);
  } else {
    cancelAnimationFrame(animationId);
  }
}

function start() {
  cancelAnimationFrame(animationId);
  resetGame();
  loop();
}

['pointerdown', 'touchstart', 'mousedown'].forEach((eventName) => {
  canvas.addEventListener(eventName, (event) => {
    event.preventDefault();
    pressing = true;
  }, { passive: false });
});
['pointerup', 'pointercancel', 'touchend', 'mouseup', 'mouseleave'].forEach((eventName) => {
  canvas.addEventListener(eventName, (event) => {
    event.preventDefault();
    pressing = false;
  }, { passive: false });
});
restartBtn.addEventListener('click', start);

bestEl.textContent = 'Best: 0';
start();
