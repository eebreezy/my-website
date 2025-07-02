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

// (rest of your script remains unchanged)

// Ensure game starts
fetchHighScores?.();
gameLoop?.();
