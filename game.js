const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// === AUDIO ===
const bgMusic = new Audio("background-music.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.2;

const jumpSound = new Audio("jump.wav");
const gameOverSound = new Audio("gameover.mp3");

// === IMAGES ===
const backgroundImg = new Image();
backgroundImg.src = "cityscape.png";

const enemyImages = [new Image(), new Image(), new Image(), new Image()];
enemyImages[0].src = "cactus.png";
enemyImages[1].src = "cactus1.png";
enemyImages[2].src = "cactus2.png";
enemyImages[3].src = "cactus3.png";

const heroImg = new Image();
heroImg.src = "hero-single-frame.png";

let heroReady = false;
heroImg.onload = () => { heroReady = true; };

// === SPRITE CONFIG ===
const collisionOffset = { top: 20, bottom: 10, left: 45, right: 110 };
const frameWidth = 100;
const frameHeight = 75;
const scale = 2;

// === PLAYER SETUP ===
let player = {
  width: frameWidth * scale,
  height: frameHeight * scale,
  x: 50,
  y: 0,
  velocityY: 0,
  gravity: 0.8,
  jumpPower: -25,
  grounded: true
};

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  player.y = canvas.height - player.height;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

let score = 0;
let obstacles = [];
let obstacleTimer = 0;
let nextObstacleGap = randomRange(60, 150);
let gameOver = false;
let highScores = [];
let bgX = 0;

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

document.addEventListener("keydown", function (e) {
  if (e.code === "Space") handleJumpOrRestart();
});

canvas.addEventListener("touchstart", function (e) {
  e.preventDefault();
  handleJumpOrRestart();
}, { passive: false });

function handleJumpOrRestart() {
  if (!bgMusic.played.length && !gameOver) bgMusic.play();
  if (!gameOver && player.grounded) {
    jumpSound.currentTime = 0;
    jumpSound.play();
    player.velocityY = player.jumpPower;
    player.grounded = false;
  } else if (gameOver) {
    resetGame();
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
    return;
  }
  ctx.drawImage(heroImg, 0, 0, frameWidth, frameHeight, player.x, player.y, player.width, player.height);
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
  let height = 40 * 3.5;
  switch (type) {
    case "short": height = randomRange(25, 35); break;
    case "tall": height = randomRange(50, 70); break;
    case "wide": width = 45; height = randomRange(30, 45); break;
    case "double": width = 30; height = randomRange(40, 60); break;
  }
  obstacles.push({
    x: canvas.width,
    y: canvas.height - height,
    width,
    height,
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
      if (!gameOver) {
        handleGameOver(score);
        return;
      }
    }
  }
  obstacles = obstacles.filter(obs => obs.x + obs.width > 0);
}

function updateScore() {
  if (!gameOver) score++;
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, canvas.width - 150, 30);
}

function showGameOverMessage() {
  ctx.fillStyle = "red";
  ctx.font = "30px Arial";
  ctx.fillText("Game Over!", canvas.width / 2 - 80, 130);
  ctx.font = "16px Arial";
  ctx.fillText("Press SPACE or TAP to restart", canvas.width / 2 - 100, 160);
}

function resetGame() {
  bgMusic.play();
  player.height = frameHeight * scale;
  player.width = frameWidth * scale;
  player.y = canvas.height - player.height;
  player.velocityY = 0;
  player.grounded = true;
  obstacles = [];
  obstacleTimer = 0;
  nextObstacleGap = randomRange(60, 150);
  score = 0;
  gameOver = false;
  bgX = 0;
  fetchHighScores();
}

// === Firebase High Scores ===
function fetchHighScores() {
  firebase.database().ref("scores").orderByChild("score").limitToLast(10).once("value", snapshot => {
    const scores = [];
    snapshot.forEach(child => {
      scores.push(child.val());
    });
    highScores = scores.reverse();
    renderHighScoresToPage();
  });
}

function submitHighScore(initials, score) {
  const newScoreRef = firebase.database().ref("scores").push();
  newScoreRef.set({ initials, score });
}

function renderHighScoresToPage() {
  const scoreList = document.getElementById("scoreList");
  if (!scoreList) return;
  scoreList.innerHTML = "";
  highScores.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = `${entry.initials}: ${entry.score}`;
    scoreList.appendChild(li);
  });
}

function handleGameOver(currentScore) {
  if (isHighScore(currentScore)) {
    let initials = prompt("New High Score! Enter your initials (3 characters):");
    if (initials && initials.trim() !== "") {
      initials = initials.substring(0, 3).toUpperCase();
      submitHighScore(initials, currentScore);
      setTimeout(fetchHighScores, 1000);
    }
  }
  gameOverSound.play();
  bgMusic.pause();
  bgMusic.currentTime = 0;
  gameOver = true;
}

function isHighScore(score) {
  if (highScores.length < 10) return true;
  return score > highScores[highScores.length - 1].score;
}

function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

fetchHighScores();
gameLoop();

function gameLoop() {
  drawBackground();
  drawPlayer();
  updatePlayer();
  updateObstacles();
  updateScore();
  if (gameOver) showGameOverMessage();
  requestAnimationFrame(gameLoop);
}

fetchHighScores();
gameLoop();
