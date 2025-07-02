// === SETUP ===
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// === FIREBASE SETUP ===
const firebaseConfig = {
  apiKey: "AIzaSyBMC0MvJCPFVbNFO8torYoDW_Y5yXadnok",
  authDomain: "my-website-17f82.firebaseapp.com",
  databaseURL: "https://my-website-17f82-default-rtdb.firebaseio.com/",
  projectId: "my-website-17f82",
  storageBucket: "my-website-17f82.appspot.com",
  messagingSenderId: "134510582511",
  appId: "1:134510582511:web:bcd7b25eeaaff4f0e5991a",
  measurementId: "G-80C3H4LCKZ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// === AUDIO ===
const laserSound = new Audio("laser.wav");
const bgMusic = new Audio("background-music.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.2;

const jumpSound = new Audio("jump.wav");
const gameOverSound = new Audio("gameover.mp3");
let explosionSound;
try {
  explosionSound = new Audio("explosion.wav");
} catch (e) {
  explosionSound = { play: () => {}, currentTime: 0 };
  console.warn("Explosion sound failed to load.");
}

// === IMAGES ===
const backgroundImg = new Image();
backgroundImg.src = "cityscape.png";
backgroundImg.onerror = () => {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
};

const enemyImages = ["cactus.png", "cactus1.png", "cactus2.png", "cactus3.png"].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

const heroImg = new Image();
heroImg.src = "hero-single-frame.png";

let heroReady = false;
heroImg.onload = () => { heroReady = true; };

const collisionOffset = { top: 20, bottom: 10, left: 45, right: 110 };
const frameWidth = 100;
const frameHeight = 75;
const scale = 2;

let player = {
  width: frameWidth * scale,
  height: frameHeight * scale,
  x: 50,
  y: canvas.height - frameHeight * scale,
  velocityY: 0,
  gravity: 0.8,
  jumpPower: -25,
  grounded: true
};

let score = 0;
let obstacles = [];
let lightningBolts = [];
let explosions = [];
let obstacleTimer = 0;
let nextObstacleGap = 100;
let gameOver = false;
let highScores = [];
let bgX = 0;

// === FALLBACK FUNCTION ===
function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// === REST OF GAME LOGIC CONTINUES BELOW ===

// === SCOREBOARD ===
const scoreBoard = document.createElement("div");
scoreBoard.id = "highScoreBoard";
scoreBoard.style.position = "absolute";
scoreBoard.style.top = "10px";
scoreBoard.style.left = "10px";
scoreBoard.style.background = "rgba(255,255,255,0.8)";
scoreBoard.style.padding = "10px";
scoreBoard.style.borderRadius = "8px";
scoreBoard.style.fontFamily = "Arial, sans-serif";
scoreBoard.innerHTML = '<h3>High Scores</h3><ol id="scoreList"></ol>';
document.body.appendChild(scoreBoard);

// === INPUT HANDLING ===
function handleJumpOrReset() {
  if (!bgMusic.played.length && !gameOver) {
    bgMusic.play().catch(() => console.warn("Audio blocked until user interaction"));
  }
  if (!gameOver && player.grounded) {
    jumpSound.currentTime = 0;
    jumpSound.play();
    player.velocityY = player.jumpPower;
    player.grounded = false;
  } else if (gameOver) {
    resetGame();
  }
}

document.addEventListener("keydown", e => {
  if (e.code === "Space") e.preventDefault();
  if (e.code === "Space") handleJumpOrReset();
  if (e.code === "KeyL") shootLightning();
});

document.addEventListener("touchstart", e => {
  if (e.touches.length === 2) {
    shootLightning();
  } else {
    e.preventDefault();
    handleJumpOrReset();
  }
}, { passive: false });

function shootLightning() {
  lightningBolts.push({
    x: player.x + player.width,
    y: player.y + player.height / 2,
    width: 40,
    height: 5,
    speed: 10
  });
  laserSound.currentTime = 0;
  laserSound.play();
});
  laserSound.currentTime = 0;
  laserSound.play();
});
}

function updateLightning() {
  for (let bolt of lightningBolts) {
    bolt.x += bolt.speed;
    ctx.fillStyle = "yellow";
    ctx.fillRect(bolt.x, bolt.y, bolt.width, bolt.height);

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (
        bolt.x < obs.x + obs.width &&
        bolt.x + bolt.width > obs.x &&
        bolt.y < obs.y + obs.height &&
        bolt.y + bolt.height > obs.y
      ) {
        obs.hitCount = (obs.hitCount || 0) + 1;
        if (obs.hitCount >= (obs.isStrong ? 2 : 1)) {
          explosions.push({ x: obs.x + obs.width / 2, y: obs.y + obs.height / 2, timer: 30 });
          explosionSound.currentTime = 0;
          explosionSound.play();
          obstacles.splice(i, 1);
        }
        break;
      }
    }
  }
  lightningBolts = lightningBolts.filter(b => b.x < canvas.width);
}

function updateExplosions() {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const ex = explosions[i];
    ctx.fillStyle = `rgba(255, 100, 0, ${ex.timer / 30})`;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, 30 * (1 - ex.timer / 30), 0, Math.PI * 2);
    ctx.fill();
    ex.timer--;
    if (ex.timer <= 0) explosions.splice(i, 1);
  }
}

function drawBackground() {
  if (!gameOver) bgX -= 1;
  if (bgX <= -canvas.width) bgX = 0;
  ctx.drawImage(backgroundImg, bgX, 0, canvas.width, canvas.height);
  ctx.drawImage(backgroundImg, bgX + canvas.width, 0, canvas.width, canvas.height);
}

function drawPlayer() {
  if (!heroReady) {
    ctx.fillStyle = "blue";
    ctx.fillRect(player.x, player.y, player.width, player.height);
  } else {
    ctx.drawImage(heroImg, 0, 0, frameWidth, frameHeight, player.x, player.y, player.width, player.height);
  }
}

function updatePlayer() {
  if (gameOver) return;
  player.velocityY += player.gravity;
  player.y += player.velocityY;

  if (player.y + player.height >= canvas.height) {
    player.y = canvas.height - player.height;
    player.velocityY = 0;
    player.grounded = true;
  } else {
    player.grounded = false;
  }
}

function createObstacle() {
  const types = ["short", "tall", "wide", "double"];
  const type = types[Math.floor(Math.random() * types.length)];
  let width = 30;
  let height = 140;
  let isStrong = Math.random() < 0.3;

  switch (type) {
    case "short": height = randomRange(25, 35); break;
    case "tall": height = randomRange(50, 70); break;
    case "wide": width = 45; height = randomRange(30, 45); break;
    case "double": width = 30; height = randomRange(40, 60); break;
  }

  if (isStrong) {
    height = player.height + randomRange(30, 80);
  }

  obstacles.push({
    x: canvas.width,
    y: canvas.height - height,
    width,
    height,
    isStrong,
    hitCount: 0,
    wiggleOffset: Math.random() * 100,
    image: enemyImages[Math.floor(Math.random() * enemyImages.length)]
  });
}

function updateObstacles() {
  if (gameOver) return;
  obstacleTimer++;
  if (obstacleTimer >= nextObstacleGap) {
    createObstacle();
    obstacleTimer = 0;
    nextObstacleGap = randomRange(60, 150);
  }

  for (let obs of obstacles) {
    obs.x -= 3;
    const wiggleY = Math.sin((score + obs.wiggleOffset) * 0.1) * 3;
    ctx.drawImage(obs.image, obs.x, obs.y + wiggleY, obs.width, obs.height);

    if (
      player.x + collisionOffset.left < obs.x + obs.width &&
      player.x + player.width - collisionOffset.right > obs.x &&
      player.y + collisionOffset.top < obs.y + wiggleY + obs.height &&
      player.y + player.height - collisionOffset.bottom > obs.y + wiggleY
    ) {
      if (!gameOver) handleGameOver(score);
    }
  }

  obstacles = obstacles.filter(obs => obs.x + obs.width > 0);
}

function updateScore() {
  if (!gameOver) score++;
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, canvas.width - 200, 30);
}

function resetGame() {
  bgMusic.play();
  player.height = frameHeight * scale;
  player.width = frameWidth * scale;
  player.y = canvas.height - player.height;
  player.velocityY = 0;
  player.grounded = true;
  obstacles = [];
  lightningBolts = [];
  explosions = [];
  obstacleTimer = 0;
  nextObstacleGap = randomRange(60, 150);
  score = 0;
  gameOver = false;
  bgX = 0;
  renderHighScoresToPage();
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawPlayer();
  updatePlayer();
  updateObstacles();
  updateLightning();
  updateExplosions();
  updateScore();
  requestAnimationFrame(gameLoop);
}

function handleGameOver(currentScore) {
  gameOver = true;
  bgMusic.pause();
  bgMusic.currentTime = 0;
  gameOverSound.play();

  setTimeout(() => {
    let initials = prompt("New High Score! Enter your initials (3 characters):");
    if (initials && initials.trim() !== "") {
      initials = initials.substring(0, 3).toUpperCase();
      submitHighScore(initials, currentScore);
    }
  }, 200);
}

function submitHighScore(initials, score) {
  const scoreRef = db.ref('scores');
  scoreRef.push({ initials, score });
}

function fetchHighScores() {
  const scoreRef = db.ref('scores').orderByChild('score').limitToLast(10);
  scoreRef.once('value', snapshot => {
    const data = [];
    snapshot.forEach(child => data.push(child.val()));
    highScores = data.sort((a, b) => b.score - a.score);
    renderHighScoresToPage();
  });
}

function renderHighScoresToPage() {
  const scoreList = document.getElementById("scoreList");
  if (!scoreList) return;
  scoreList.innerHTML = "";
  highScores.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = `${entry.initials || "---"}: ${entry.score}`;
    scoreList.appendChild(li);
  });
}

// Ensure game starts
fetchHighScores?.();
gameLoop?.();
