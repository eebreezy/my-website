(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const $ = (id) => document.getElementById(id);
  const elScore = $("score");
  const elStreak = $("streak");
  const elLevel = $("level");
  const elBest = $("best");
  const btnStart = $("btnStart");
  const btnPause = $("btnPause");
  const btnSound = $("btnSound");
  const overlay = $("overlay");
  const overlayTitle = $("overlayTitle");
  const overlayMsg = $("overlayMsg");
  const btnOverlay = $("btnOverlay");
  const jumpBtn = $("jumpBtn");

  // Prevent page scroll while playing on mobile
  ["touchstart", "touchmove", "touchend"].forEach((evt) => {
    canvas.addEventListener(evt, (e) => e.preventDefault(), { passive: false });
  });

  // ===== Audio (SFX + Background Music, no external files) =====
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let soundOn = true;

  function ensureAudio() {
    if (!soundOn) return;
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  function beep({ freq = 440, dur = 0.08, type = "sine", gain = 0.05, sweep = 0 }) {
    if (!soundOn) return;
    ensureAudio();
    if (!audioCtx) return;

    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t0 + dur);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const sfx = {
    jump: () => beep({ freq: 360, dur: 0.06, type: "triangle", gain: 0.045, sweep: 1.5 }),
    star: () => beep({ freq: 740, dur: 0.08, type: "sine", gain: 0.05, sweep: 1.8 }),
    hit: () => beep({ freq: 160, dur: 0.12, type: "sawtooth", gain: 0.035, sweep: 0.7 }),
    level: () => beep({ freq: 520, dur: 0.10, type: "square", gain: 0.03, sweep: 1.9 }),
  };

  // Background music (simple catchy loop)
  let musicTimer = null;
  let musicStep = 0;
  let musicPlaying = false;

  // Melody that feels "happy arcade"
  const melody = [
    523, 659, 784, 659, 523, 659, 880, 784,
    523, 659, 784, 988, 784, 659, 587, 659
  ];

  function playMusicNote(freq, dur = 0.18) {
    if (!soundOn) return;
    ensureAudio();
    if (!audioCtx) return;

    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t0);

    // soft attack/decay
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.035, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function startMusic() {
    if (!soundOn) return;
    if (musicPlaying) return;
    ensureAudio();
    if (!audioCtx) return;

    musicPlaying = true;
    // tempo scales slightly with level (keeps kids engaged)
    const baseMs = 240;

    musicTimer = setInterval(() => {
      if (!soundOn || !audioCtx) return;

      const speed = Math.max(0.72, 1 - (state.level - 1) * 0.03);
      const idx = musicStep % melody.length;

      // Add tiny variation as levels go up
      const freq = melody[idx] * (state.level >= 6 && idx % 8 === 7 ? 2 : 1);

      playMusicNote(freq, 0.18);
      musicStep++;

      // adjust interval as levels change (simple way: restart occasionally)
      // (we keep it light; it still sounds fine)
    }, baseMs);
  }

  function stopMusic() {
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
    musicPlaying = false;
  }

  // ===== Responsive canvas sizing =====
  function resizeCanvasToCSS() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    if (rect.width < 2 || rect.height < 2) return;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", () => setTimeout(resizeCanvasToCSS, 0));
  window.addEventListener("orientationchange", () => setTimeout(resizeCanvasToCSS, 120));
  setTimeout(resizeCanvasToCSS, 0);

  const W = () => canvas.getBoundingClientRect().width;
  const H = () => canvas.getBoundingClientRect().height;

  // ===== Game state =====
  const state = {
    running: false,
    paused: false,
    time: 0,
    score: 0,
    best: Number(localStorage.getItem("starhopper_best") || 0),
    streak: 0,
    level: 1,
    nextLevelAt: 120,
    mood: 0,
  };

  elBest.textContent = state.best;

  const player = {
    x: 0,
    y: 0,
    r: 22,
    vy: 0,
    gravity: 1400,
    jumpV: -520,
    blink: 0,
  };

  const stars = [];
  const clouds = [];
  const particles = [];

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function syncHUD() {
    elScore.textContent = state.score;
    elStreak.textContent = state.streak;
    elLevel.textContent = state.level;
    elBest.textContent = state.best;
  }

  function showOverlay(title, msg, btnText = "Play") {
    overlayTitle.textContent = title;
    overlayMsg.textContent = msg;
    btnOverlay.textContent = btnText;
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function spawnStar() {
    stars.push({
      x: W() + rand(40, 220),
      y: rand(90, H() - 90),
      r: rand(12, 16),
      vx: -(240 + state.level * 25),
      wob: rand(0, Math.PI * 2),
      value: 10 + Math.min(20, state.level * 2),
    });
  }

  function spawnCloud() {
    clouds.push({
      x: W() + rand(40, 260),
      y: rand(90, H() - 90),
      w: rand(60, 95),
      h: rand(40, 70),
      vx: -(220 + state.level * 28),
      puff: rand(0, Math.PI * 2),
    });
  }

  function puffParticles(x, y, count, kind) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y,
        vx: rand(-180, 180),
        vy: rand(-220, 140),
        life: rand(0.35, 0.7),
        t: 0,
        size: rand(2, 6) + (kind === "star" ? 2 : 0),
        kind,
      });
    }
  }

  function resetGame() {
    resizeCanvasToCSS();

    state.time = 0;
    state.score = 0;
    state.streak = 0;
    state.level = 1;
    state.nextLevelAt = 120;
    state.mood = 0;

    player.x = Math.max(120, W() * 0.18);
    player.y = H() * 0.5;
    player.vy = 0;

    stars.length = 0;
    clouds.length = 0;
    particles.length = 0;

    for (let i = 0; i < 3; i++) spawnStar();
    for (let i = 0; i < 2; i++) spawnCloud();

    syncHUD();
  }

  function startGame() {
    hideOverlay();
    state.running = true;
    state.paused = false;
    resetGame();
    startMusic();
  }

  function endGame(reason) {
    state.running = false;
    state.paused = false;
    stopMusic();

    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem("starhopper_best", String(state.best));
    }
    syncHUD();

    showOverlay(
      "Game Over",
      `${reason}\nScore: ${state.score} • Best: ${state.best}\nTap to try again!`,
      "Try Again"
    );
  }

  function togglePause() {
    if (!state.running) return;
    state.paused = !state.paused;
    btnPause.textContent = state.paused ? "Resume" : "Pause";
    if (state.paused) {
      stopMusic();
      showOverlay("Paused", "Tap Play to resume.", "Resume");
    } else {
      hideOverlay();
      startMusic();
    }
  }

  function jump() {
    if (!state.running || state.paused) return;
    player.vy = player.jumpV;
    player.blink = 0.08;
    sfx.jump();
  }

  // ===== Input =====
  function pointerJump(e) {
    e.preventDefault();
    ensureAudio();
    if (!state.running) startGame();
    else jump();
  }

  canvas.addEventListener("pointerdown", pointerJump, { passive: false });

  if (jumpBtn) {
    jumpBtn.addEventListener("pointerdown", pointerJump, { passive: false });
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      ensureAudio();
      if (!state.running) startGame();
      else jump();
    }
    if (e.code === "KeyP") togglePause();
  });

  // ===== UI buttons =====
  btnStart.addEventListener("click", () => {
    ensureAudio();
    startGame();
  });

  btnPause.addEventListener("click", () => togglePause());

  btnOverlay.addEventListener("click", () => {
    ensureAudio();
    startGame();
  });

  btnSound.addEventListener("click", () => {
    soundOn = !soundOn;
    btnSound.textContent = `Sound: ${soundOn ? "On" : "Off"}`;

    if (!soundOn) {
      stopMusic();
    } else {
      ensureAudio();
      if (state.running && !state.paused) startMusic();
    }
  });

  // ===== Collision helpers =====
  function circleHit(ax, ay, ar, bx, by, br) {
    const dx = ax - bx,
      dy = ay - by;
    return dx * dx + dy * dy <= (ar + br) * (ar + br);
  }

  function rectCircleHit(rx, ry, rw, rh, cx, cy, cr) {
    const px = Math.max(rx, Math.min(cx, rx + rw));
    const py = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - px,
      dy = cy - py;
    return dx * dx + dy * dy <= cr * cr;
  }

  // ===== Drawing =====
  function drawBackground(t) {
    const w = W(),
      h = H();

    const g = ctx.createLinearGradient(0, 0, 0, h);
    const mood = state.mood;
    const top = mood === 0 ? "#151e55" : mood === 1 ? "#1a3a5f" : mood === 2 ? "#3a215e" : "#1a2a3d";
    const bot = mood === 0 ? "#0b1020" : mood === 1 ? "#0a1823" : mood === 2 ? "#0b1020" : "#0b1020";
    g.addColorStop(0, top);
    g.addColorStop(1, bot);

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // floating bokeh dots
    for (let i = 0; i < 18; i++) {
      const x = (i * 97 + t * 22) % (w + 120) - 60;
      const y = 60 + (i * 53) % Math.max(1, h - 120);
      const r = 16 + (i % 5) * 6;
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = i % 2 ? "#7cf2ff" : "#ffd66e";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ground
    ctx.fillStyle = "#08102a";
    ctx.fillRect(0, h - 58, w, 58);

    // candy stripes
    ctx.globalAlpha = 0.2;
    for (let x = 0; x < w; x += 34) {
      ctx.fillStyle = Math.floor((x + t * 150) / 34) % 2 === 0 ? "#7cf2ff" : "#ffd66e";
      ctx.fillRect(x, h - 58, 18, 58);
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    const x = player.x,
      y = player.y,
      r = player.r;

    // shadow
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(x + 4, y + r + 16, r * 1.2, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // body
    const bodyGrad = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    const mood = state.mood;
    const c1 = mood === 0 ? "#3fe8ff" : mood === 1 ? "#7dff9f" : mood === 2 ? "#ff6a88" : "#b6c7ff";
    const c2 = mood === 0 ? "#ffd66e" : mood === 1 ? "#3fe8ff" : mood === 2 ? "#ffd66e" : "#7cf2ff";
    bodyGrad.addColorStop(0, c1);
    bodyGrad.addColorStop(1, c2);

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // face
    const blink = player.blink > 0;
    ctx.fillStyle = "#071023";
    if (!blink) {
      ctx.beginPath();
      ctx.arc(x - 7, y - 4, 3.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 7, y - 4, 3.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(x - 8.2, y - 5.2, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 5.8, y - 5.2, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#071023";
      ctx.beginPath();
      ctx.moveTo(x - 11, y - 4);
      ctx.lineTo(x - 3, y - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 3, y - 4);
      ctx.lineTo(x + 11, y - 4);
      ctx.stroke();
    }

    // smile
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#071023";
    ctx.beginPath();
    ctx.arc(x, y + 4, 7, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // blush
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#ff6a88";
    ctx.beginPath();
    ctx.arc(x - 12, y + 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 12, y + 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawStar(s, t) {
    const wob = Math.sin(t * 5 + s.wob) * 3;
    const x = s.x;
    const y = s.y + wob;

    // glow
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffd66e";
    ctx.beginPath();
    ctx.arc(x, y, s.r * 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // star shape
    const spikes = 5;
    const outer = s.r;
    const inner = s.r * 0.5;
    const rot = t * 1.6;
    ctx.fillStyle = "#ffd66e";
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const rr = i % 2 === 0 ? outer : inner;
      const ang = rot + (i * Math.PI) / spikes;
      ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
    }
    ctx.closePath();
    ctx.fill();

    // face
    ctx.fillStyle = "#071023";
    ctx.beginPath();
    ctx.arc(x - 4, y - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 4, y - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#071023";
    ctx.beginPath();
    ctx.arc(x, y + 2, 4, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  function drawCloud(c, t) {
    const x = c.x;
    const y = c.y + Math.sin(t * 2 + c.puff) * 4;
    const w = c.w,
      h = c.h;

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#eaf2ff";
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.5, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.ellipse(x - w * 0.2, y - h * 0.18, w * 0.25, h * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.05, y - h * 0.28, w * 0.28, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.28, y - h * 0.12, w * 0.22, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = "#b6c7ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.5, h * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // warning face
    ctx.fillStyle = "#071023";
    ctx.beginPath();
    ctx.arc(x - 8, y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 8, y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#071023";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 8);
    ctx.lineTo(x + 10, y + 8);
    ctx.stroke();
  }

  function drawParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += dt;
      const u = p.t / p.life;
      if (u >= 1) {
        particles.splice(i, 1);
        continue;
      }

      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const a = 1 - u;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.kind === "star" ? "#ffd66e" : "#7cf2ff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.6 + a * 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ===== Update / Render Loop =====
  let last = performance.now();

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    if (state.running && !state.paused) update(dt);
    render(dt);
  }

  function update(dt) {
    state.time += dt;

    if (player.blink > 0) player.blink -= dt;

    // physics
    player.vy += player.gravity * dt;
    player.y += player.vy * dt;

    // bounds (use canvas height)
    const topBound = 40;
    const bottomBound = H() - 70;

    if (player.y < topBound + player.r) {
      player.y = topBound + player.r;
      player.vy = 0;
    }
    if (player.y > bottomBound - player.r) {
      player.y = bottomBound - player.r;
      player.vy = 0;
    }

    // spawns
    const targetStars = 2 + Math.min(4, Math.floor(state.level / 2));
    const targetClouds = 2 + Math.min(4, Math.floor((state.level - 1) / 2));
    while (stars.length < targetStars) spawnStar();
    while (clouds.length < targetClouds) spawnCloud();

    // move
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.x += s.vx * dt;
      if (s.x < -120) stars.splice(i, 1);
    }
    for (let i = clouds.length - 1; i >= 0; i--) {
      const c = clouds[i];
      c.x += c.vx * dt;
      if (c.x < -180) clouds.splice(i, 1);
    }

    // star collisions
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      const sy = s.y + Math.sin(state.time * 5 + s.wob) * 3;

      if (circleHit(player.x, player.y, player.r, s.x, sy, s.r)) {
        stars.splice(i, 1);

        state.score += s.value + state.streak; // streak bonus
        state.streak += 1;

        puffParticles(player.x + 10, player.y - 8, 14, "star");
        sfx.star();

        // level up
        if (state.score >= state.nextLevelAt) {
          state.level += 1;
          state.nextLevelAt = Math.floor(state.nextLevelAt * 1.25 + 80);
          state.mood = Math.min(3, Math.floor((state.level - 1) / 3));
          puffParticles(player.x, player.y, 24, "level");
          sfx.level();
        }

        if (state.score > state.best) {
          state.best = state.score;
          localStorage.setItem("starhopper_best", String(state.best));
        }

        syncHUD();
      }
    }

    // cloud collisions
// cloud collisions
for (let i = clouds.length - 1; i >= 0; i--) {
  const c = clouds[i];
  const cy = c.y + Math.sin(state.time * 2 + c.puff) * 4;
  const rx = c.x - c.w * 0.5;
  const ry = cy - c.h * 0.45;
  const rw = c.w;
  const rh = c.h * 0.9;

  if (rectCircleHit(rx, ry, rw, rh, player.x, player.y, player.r)) {
    clouds.splice(i, 1);

    puffParticles(player.x, player.y, 18, "hit");
    sfx.hit();

    state.streak = 0;

    // subtract points
    state.score = Math.max(0, state.score - 25);
    syncHUD();

    // ✅ NEW: if no points left, game over
    if (state.score === 0) {
      endGame("No points left! ☁️💥");
      return;
    }
  }
}

  function render(dt) {
    drawBackground(state.time);

    for (const s of stars) drawStar(s, state.time);
    for (const c of clouds) drawCloud(c, state.time);

    drawPlayer();
    drawParticles(dt);

    // corner hint
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#eaf2ff";
    ctx.font = "800 12px ui-rounded, system-ui, sans-serif";
    ctx.fillText("Tap / Click / JUMP • Space/↑ on PC", 14, 22);
    ctx.globalAlpha = 1;
  }

  // Start screen
  syncHUD();
  showOverlay("Star Hopper", "Tap Play (or tap the game) to start collecting stars!", "Play");
  requestAnimationFrame(loop);
})();
