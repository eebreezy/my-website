const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// === FIREBASE GLOBAL ===
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







canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});


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
let obstacleTimer = 0;
let nextObstacleGap = randomRange(60, 150);
let gameOver = false;
let highScores = JSON.parse(localStorage.getItem("highScores")) || [];
let bgX = 0;

// === SCOREBOARD DOM ===
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

// === INPUT HANDLER ===
document.addEventListener("keydown", function (e) {
  if (e.code === "Space") {
    if (!bgMusic.played.length && !gameOver) bgMusic.play();
    if (!gameOver && player.grounded) {
      jumpSound.currentTime = 0;
      jumpSound.play();

canvas.addEventListener("touchstart", function () {
  if (!bgMusic.played.length && !gameOver) bgMusic.play();
  if (!gameOver && player.grounded) {
    jumpSound.currentTime = 0;
    jumpSound.play();
    player.velocityY = player.jumpPower;
    player.grounded = false;
  } else if (gameOver) {
    resetGame();
  }
});

      player.velocityY = player.jumpPower;
      player.grounded = false;
    } else if (gameOver) {
      resetGame();
    }
  }
});

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
    const speed = 3;
    obs.x -= speed;
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
  ctx.fillText("Score: " + score, 850, 30);
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
  renderHighScoresToPage();
}

function gameLoop() {
  drawBackground();
  drawPlayer();
  updatePlayer();
  updateObstacles();
  updateScore();
  requestAnimationFrame(gameLoop);
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

function handleGameOver(currentScore) {
  gameOver = true;
  bgMusic.pause();
  bgMusic.currentTime = 0;

  gameOverSound.play();

  setTimeout(() => {
    // Force prompt for testing
    let initials = prompt("New High Score! Enter your initials (3 characters):");
    if (initials && initials.trim() !== "") {
      initials = initials.substring(0, 3).toUpperCase();
      highScores.push({ initials: initials, score: currentScore });
      highScores.sort((a, b) => b.score - a.score);
      highScores = highScores.slice(0, 10);
      localStorage.setItem("highScores", JSON.stringify(highScores));
    }
    renderHighScoresToPage();
  }, 200);
}

function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

renderHighScoresToPage();
gameLoop();


function submitHighScore(initials, score) {
  const scoreRef = ref(db, 'scores');
  push(scoreRef, { initials, score });
}

function fetchHighScores() {
  const scoreRef = query(ref(db, 'scores'), orderByChild('score'), limitToLast(10));
  get(scoreRef).then(snapshot => {
    const data = [];
    snapshot.forEach(child => data.push(child.val()));
    highScores = data.sort((a, b) => b.score - a.score);
    renderHighScoresToPage();
  }).catch(error => {
    console.error("Failed to fetch scores:", error);
  });
}


fetchHighScores();
