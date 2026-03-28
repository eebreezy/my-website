const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const playBtn = document.getElementById('playBtn');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');

const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
canvas.width = 900 * DPR;
canvas.height = 1400 * DPR;
ctx.scale(DPR, DPR);
const W = 900;
const H = 1400;

const game = {
  rows: 12,
  cols: 9,
  hexR: 52,
  topOffset: 90,
  leftOffset: 82,
  tiles: [],
  enemies: [],
  particles: [],
  cops: [],
  score: 0,
  wave: 1,
  lives: 3,
  running: false,
  paused: false,
  lastTime: 0,
  spawnTimer: 0,
  spawnEvery: 1.2,
  dropTimer: 0,
  loseTriggered: false,
};

function resetGame() {
  game.tiles = [];
  game.enemies = [];
  game.particles = [];
  game.score = 0;
  game.wave = 1;
  game.lives = 3;
  game.running = true;
  game.paused = false;
  game.loseTriggered = false;
  game.spawnEvery = 1.15;
  game.spawnTimer = 0;
  game.dropTimer = 0;

  for (let r = 0; r < game.rows; r++) {
    const count = game.cols - (r > 8 ? (r - 8) : 0);
    const start = Math.floor((game.cols - count) / 2);
    for (let c = start; c < start + count; c++) {
      const { x, y } = hexCenter(r, c);
      const isBottomWhite = r >= 8;
      game.tiles.push({ r, c, x, y, alive: true, color: isBottomWhite ? '#ffffff' : '#4b4b4b' });
    }
  }

  game.cops = [
    { x: W / 2 - 65, y: H - 120 },
    { x: W / 2 + 65, y: H - 120 },
  ];

  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(game.score);
  waveEl.textContent = String(game.wave);
  livesEl.textContent = String(game.lives);
}

function hexCenter(r, c) {
  const h = Math.sqrt(3) * game.hexR;
  const x = game.leftOffset + c * game.hexR * 1.52 + (r % 2) * (game.hexR * 0.76);
  const y = game.topOffset + r * (h * 0.44);
  return { x, y };
}

function hexPath(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function findTile(r, c) {
  return game.tiles.find(t => t.r === r && t.c === c && t.alive);
}

function supported(tile) {
  const below = [
    findTile(tile.r + 1, tile.c),
    findTile(tile.r + 1, tile.c - 1),
    findTile(tile.r + 1, tile.c + 1),
  ];
  return below.some(Boolean) || tile.r >= game.rows - 1;
}

function spawnEnemy() {
  const topTiles = game.tiles.filter(t => t.alive && t.r <= 2);
  if (!topTiles.length) return;
  const anchor = topTiles[(Math.random() * topTiles.length) | 0];
  game.enemies.push({ r: anchor.r, c: anchor.c, fall: 0, dead: false, shake: 0 });
}

function breakTileAt(x, y) {
  const candidate = game.tiles.find(t => t.alive && t.color === '#ffffff' && pointInHex(x, y, t.x, t.y, game.hexR * 0.96));
  if (!candidate) return;
  candidate.alive = false;
  for (let i = 0; i < 10; i++) {
    game.particles.push({ x: candidate.x, y: candidate.y, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4 - 1, life: 0.7 + Math.random() * 0.5, s: 4 + Math.random() * 4, color: '#111' });
  }

  let dropped = 0;
  game.enemies.forEach(e => {
    if (!e.dead && e.r === candidate.r - 1 && Math.abs(e.c - candidate.c) <= 1) {
      const underneath = findTile(e.r + 1, e.c) || findTile(e.r + 1, e.c - 1) || findTile(e.r + 1, e.c + 1);
      if (!underneath) {
        e.dead = true;
        dropped++;
        for (let i = 0; i < 12; i++) {
          game.particles.push({ x: candidate.x, y: candidate.y - 35, vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 6, life: 0.8 + Math.random() * 0.6, s: 5 + Math.random() * 5, color: i % 3 === 0 ? '#ff5761' : '#000' });
        }
      }
    }
  });

  game.score += 2 + dropped * 8;
  if (game.score > game.wave * 80) {
    game.wave++;
    game.spawnEvery = Math.max(0.36, game.spawnEvery - 0.08);
  }
  updateHud();
}

function pointInHex(px, py, x, y, r) {
  // good enough hit test for this game
  return Math.hypot(px - x, py - y) < r;
}

function canvasPoint(evt) {
  const rect = canvas.getBoundingClientRect();
  const touch = evt.touches ? evt.touches[0] : evt;
  const x = (touch.clientX - rect.left) * (W / rect.width);
  const y = (touch.clientY - rect.top) * (H / rect.height);
  return { x, y };
}

canvas.addEventListener('pointerdown', e => {
  if (!game.running || game.paused) return;
  const p = canvasPoint(e);
  breakTileAt(p.x, p.y);
});
canvas.addEventListener('touchstart', e => {
  if (!game.running || game.paused) return;
  const p = canvasPoint(e);
  breakTileAt(p.x, p.y);
}, { passive: true });

function update(dt) {
  game.spawnTimer += dt;
  if (game.spawnTimer >= game.spawnEvery) {
    game.spawnTimer = 0;
    spawnEnemy();
  }

  game.enemies.forEach(e => {
    if (e.dead) {
      e.fall += 520 * dt;
      return;
    }
    e.shake += dt * 8;
    const moveRate = 0.20 + game.wave * 0.01;
    e.fall += moveRate * dt;
    if (e.fall >= 1) {
      e.fall = 0;
      e.r += 1;
      const tile = findTile(e.r, e.c) || findTile(e.r, e.c - 1) || findTile(e.r, e.c + 1);
      if (!tile) {
        e.dead = true;
        game.score += 5;
      } else {
        e.c = tile.c;
        if (e.r >= game.rows - 1 || tile.y > H - 180) {
          e.dead = true;
          game.lives -= 1;
          for (let i = 0; i < 16; i++) {
            game.particles.push({ x: tile.x, y: tile.y, vx: (Math.random() - 0.5) * 10, vy: -Math.random() * 7, life: 0.8 + Math.random() * 0.8, s: 5 + Math.random() * 6, color: i % 3 ? '#ff5761' : '#000' });
          }
          updateHud();
          if (game.lives <= 0 && !game.loseTriggered) {
            loseGame();
          }
        }
      }
    }
  });

  game.enemies = game.enemies.filter(e => !(e.dead && e.fall > 1400));

  game.particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.18;
    p.life -= dt;
  });
  game.particles = game.particles.filter(p => p.life > 0);
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#dffcff');
  g.addColorStop(1, '#69e6ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawTiles() {
  for (const t of game.tiles) {
    if (!t.alive) continue;
    hexPath(t.x, t.y, game.hexR);
    ctx.fillStyle = t.color;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = t.color === '#ffffff' ? '#d4d4d4' : '#1a1a1a';
    ctx.stroke();
  }
}

function drawEnemy(x, y, bob = 0) {
  ctx.save();
  ctx.translate(x, y + Math.sin(bob) * 3);
  ctx.fillStyle = '#f7f7f7';
  ctx.beginPath();
  ctx.arc(0, -28, 23, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-16, -2, 32, 34);
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.ellipse(-9, -31, 5, 8, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(9, -31, 5, 8, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-5, -17); ctx.lineTo(0, -12); ctx.lineTo(5, -17); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-10, 8); ctx.lineTo(-20, 26); ctx.moveTo(10, 8); ctx.lineTo(20, 26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-8, 34); ctx.lineTo(-10, 58); ctx.moveTo(8, 34); ctx.lineTo(10, 58); ctx.stroke();
  ctx.restore();
}

function drawCop(x, y) {
  ctx.save();
  hexPath(x, y, 58);
  ctx.fillStyle = '#47a7ff';
  ctx.fill();
  ctx.strokeStyle = '#143e74';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.translate(x, y + 10);
  ctx.fillStyle = '#f4d0b4';
  ctx.beginPath(); ctx.arc(0, -22, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#204981';
  ctx.fillRect(-18, -38, 36, 10);
  ctx.fillRect(-7, -44, 14, 8);
  ctx.fillStyle = '#163152';
  ctx.fillRect(-16, -5, 32, 32);
  ctx.strokeStyle = '#0b1728';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-20, 28); ctx.moveTo(6, 4); ctx.lineTo(20, 28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-5, 28); ctx.lineTo(-8, 48); ctx.moveTo(5, 28); ctx.lineTo(8, 48); ctx.stroke();
  ctx.strokeStyle = '#101010';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(6, 10); ctx.lineTo(26, 16); ctx.stroke();
  ctx.restore();
}

function drawEnemies() {
  game.enemies.forEach(e => {
    const base = findTile(e.r, e.c) || findTile(e.r - 1, e.c) || findTile(e.r, e.c - 1) || findTile(e.r, e.c + 1);
    let x = base ? base.x : W / 2;
    let y = base ? base.y - 24 : 100;
    if (e.dead) y += e.fall;
    drawEnemy(x, y, e.shake);
  });
}

function drawParticles() {
  game.particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawCops() {
  game.cops.forEach(c => drawCop(c.x, c.y));
}

function draw() {
  drawBackground();
  drawTiles();
  drawEnemies();
  drawParticles();
  drawCops();

  if (game.paused && game.running) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Paused', W / 2, H / 2);
  }
}

function loseGame() {
  game.running = false;
  game.loseTriggered = true;
  overlay.classList.add('show');
  overlay.querySelector('h2').textContent = 'Game Over';
  overlay.querySelector('p').textContent = `Final score: ${game.score}. Tap play to try again.`;
}

function loop(ts) {
  if (!game.lastTime) game.lastTime = ts;
  const dt = Math.min(0.033, (ts - game.lastTime) / 1000);
  game.lastTime = ts;
  if (game.running && !game.paused) update(dt);
  draw();
  requestAnimationFrame(loop);
}

playBtn.addEventListener('click', () => {
  overlay.classList.remove('show');
  overlay.querySelector('h2').textContent = 'Hex Last Stand';
  overlay.querySelector('p').textContent = 'Original game inspired by the video style you shared.';
  resetGame();
});
startBtn.addEventListener('click', () => {
  overlay.classList.remove('show');
  resetGame();
});
pauseBtn.addEventListener('click', () => {
  if (!game.running) return;
  game.paused = !game.paused;
  pauseBtn.textContent = game.paused ? 'Resume' : 'Pause';
});

resetGame();
draw();
requestAnimationFrame(loop);
