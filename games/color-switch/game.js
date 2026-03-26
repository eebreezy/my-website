const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('restartBtn');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const backBtn = document.getElementById('backBtn');

const colors = ['#ff5d73', '#72e6ff'];
let best = 0;
let animationId = null;

const player = { x: 180, y: 480, colorIndex: 0, r: 20 };
let gates = [];
let score = 0;
let frame = 0;
let gameOver = false;

backBtn.addEventListener('click', () => {
  window.location.href = '../../index.html';
});

function resetGame() {
  player.colorIndex = 0;
  gates = [];
  score = 0;
  frame = 0;
  gameOver = false;
  scoreEl.textContent = 'Score: 0';
  restartBtn.textContent = 'Restart';
}

function spawnGate() {
  const colorIndex = Math.random() > 0.5 ? 1 : 0;
  gates.push({ y: -50, colorIndex, counted: false });
}

function drawPlayer() {
  ctx.fillStyle = colors[player.colorIndex];
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();
}

function update() {
  frame += 1;
  if (frame % 60 === 0) spawnGate();

  gates.forEach((gate) => {
    gate.y += 4;

    if (!gate.counted && gate.y + 18 >= player.y) {
      gate.counted = true;
      if (gate.colorIndex === player.colorIndex) {
        score += 1;
        best = Math.max(best, score);
        scoreEl.textContent = `Score: ${score}`;
        bestEl.textContent = `Best: ${best}`;
      } else {
        gameOver = true;
      }
    }
  });

  gates = gates.filter((gate) => gate.y < canvas.height + 40);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  gates.forEach((gate) => {
    ctx.fillStyle = colors[gate.colorIndex];
    ctx.fillRect(60, gate.y, 240, 18);
  });

  drawPlayer();

  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 6);
    ctx.font = '18px Arial';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 28);
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

canvas.addEventListener('click', () => {
  if (!gameOver) {
    player.colorIndex = player.colorIndex === 0 ? 1 : 0;
  }
});
restartBtn.addEventListener('click', start);

bestEl.textContent = 'Best: 0';
start();
