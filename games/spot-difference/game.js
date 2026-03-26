const grid = document.getElementById('grid');
const message = document.getElementById('message');
const levelEl = document.getElementById('level');
const timerEl = document.getElementById('timer');
const backBtn = document.getElementById('backBtn');

let level = 1;
let timeLeft = 12;
let timerId = null;

backBtn.addEventListener('click', () => {
  window.location.href = '../../index.html';
});

function shadeForLevel(currentLevel) {
  const diff = Math.max(8, 30 - currentLevel * 2);
  const base = 110 + Math.min(currentLevel * 4, 80);
  return { base, odd: base + diff };
}

function startLevel() {
  clearInterval(timerId);
  message.textContent = '';
  levelEl.textContent = `Level ${level}`;
  timeLeft = Math.max(4, 12 - Math.floor(level / 2));
  timerEl.textContent = timeLeft;

  const { base, odd } = shadeForLevel(level);
  const oddIndex = Math.floor(Math.random() * 25);
  grid.innerHTML = '';

  for (let i = 0; i < 25; i += 1) {
    const tile = document.createElement('button');
    tile.className = 'tile';
    const shade = i === oddIndex ? odd : base;
    tile.style.background = `rgb(${shade}, ${shade + 30}, 255)`;
    tile.addEventListener('click', () => {
      if (i === oddIndex) {
        message.textContent = 'Nice! Next level.';
        level += 1;
        setTimeout(startLevel, 450);
      } else {
        message.textContent = 'Wrong tile. Try again.';
      }
    });
    grid.appendChild(tile);
  }

  timerId = setInterval(() => {
    timeLeft -= 1;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerId);
      message.textContent = `Time up. You reached level ${level}. Restarting...`;
      level = 1;
      setTimeout(startLevel, 900);
    }
  }, 1000);
}

startLevel();
