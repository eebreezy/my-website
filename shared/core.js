
import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

export { THREE };

export function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
export function lerp(a,b,t){ return a + (b-a)*t; }
export function rand(a=0,b=1){ return a + Math.random()*(b-a); }
export function randi(a,b){ return Math.floor(rand(a,b+1)); }
export function choice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

export function createAppShell(meta){
  document.body.innerHTML = `
    <div id="app"></div>
    <a class="home" href="../../index.html"><div class="icon-btn">⌂</div></a>
    <div class="topbar">
      <div class="brand card">
        <h1>${meta.title}</h1>
        <p>${meta.tagline}</p>
      </div>
      <div class="stats">
        <div class="stat card"><div class="label">Score</div><div class="value" id="score">0</div></div>
        <div class="stat card"><div class="label">Best</div><div class="value" id="best">0</div></div>
        <div class="stat card"><div class="label">${meta.sideLabel || 'Time'}</div><div class="value" id="side">0</div></div>
      </div>
    </div>
    <div class="corner-actions">
      <button class="icon-btn" id="muteBtn" aria-label="Toggle sound">🔊</button>
      <button class="icon-btn" id="restartBtn" aria-label="Restart">↺</button>
    </div>
    <div id="message"></div>
    <div class="badge">${meta.controls || 'Tap the buttons to move and act.'}</div>
    <div class="overlay" id="overlay">
      <div class="modal card">
        <h2>${meta.title}</h2>
        <p>${meta.instructions}</p>
        <div class="grid">
          <button class="primary" id="startBtn">Play</button>
          <button class="secondary" id="howBtn">Tip: ${meta.tip || 'Chase the combo meter.'}</button>
        </div>
      </div>
    </div>
    <div class="controls">
      <div class="pad">
        <div class="action-stack">
          <button class="ctrl small" data-key="up">▲</button>
          <div style="display:flex;gap:10px">
            <button class="ctrl" data-key="left">◀</button>
            <button class="ctrl" data-key="down">▼</button>
            <button class="ctrl" data-key="right">▶</button>
          </div>
        </div>
      </div>
      <div class="actions">
        <div class="action-stack">
          <button class="ctrl small" data-key="jump">JUMP</button>
          <button class="ctrl" data-key="action">GO</button>
        </div>
      </div>
    </div>
  `;
  const app = document.getElementById('app');
  const scoreEl = document.getElementById('score');
  const sideEl = document.getElementById('side');
  const bestEl = document.getElementById('best');
  const msgEl = document.getElementById('message');
  const overlay = document.getElementById('overlay');

  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x08121f, 0.028);

  const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 250);
  camera.position.set(0, 6, 10);

  const hemi = new THREE.HemisphereLight(0xaedcff, 0x112244, 1.5);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(6, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(38, 48, 2, 48, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x0d1e36, metalness: .15, roughness: .85, side:THREE.DoubleSide
    })
  );
  floor.position.y = -1.2;
  floor.receiveShadow = true;
  scene.add(floor);

  const stars = new THREE.Group();
  for(let i=0;i<120;i++){
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(rand(.03,.08), 8, 8),
      new THREE.MeshBasicMaterial({ color: choice([0x6af6ff,0xffd76b,0xffffff,0xc18fff]) })
    );
    s.position.set(rand(-40,40), rand(2,24), rand(-40,10));
    stars.add(s);
  }
  scene.add(stars);

  const audio = createAudio();
  const input = createInput();

  function resize(){
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }
  addEventListener('resize', resize);

  function setScore(v){ scoreEl.textContent = Math.floor(v); }
  function setSide(v){ sideEl.textContent = typeof v === 'number' ? Math.floor(v) : v; }
  function setBest(key, v){
    localStorage.setItem(key, String(Math.max(Number(localStorage.getItem(key)||0), Math.floor(v))));
    bestEl.textContent = localStorage.getItem(key) || '0';
  }
  bestEl.textContent = localStorage.getItem(meta.storageKey) || '0';

  let msgTimer = 0;
  function message(text, ms=1200){
    msgEl.textContent = text;
    msgEl.classList.add('show');
    clearTimeout(msgTimer);
    msgTimer = setTimeout(()=> msgEl.classList.remove('show'), ms);
  }

  document.getElementById('startBtn').onclick = ()=>{
    overlay.style.display = 'none';
    audio.unlock();
    if(shell.onStart) shell.onStart();
  };
  document.getElementById('restartBtn').onclick = ()=> shell.reset();
  document.getElementById('muteBtn').onclick = ()=>{
    audio.muted = !audio.muted;
    document.getElementById('muteBtn').textContent = audio.muted ? '🔇' : '🔊';
  };
  document.getElementById('howBtn').onclick = ()=> message(meta.tip || meta.instructions, 1800);

  const clock = new THREE.Clock();
  const shell = {
    app, scene, camera, renderer, floor, stars, audio, input, message,
    setScore, setSide, setBest, meta,
    overlay,
    running:true,
    reset(){ if(shell.onReset) shell.onReset(); overlay.style.display='flex'; },
    animate(update){
      function tick(){
        const dt = Math.min(clock.getDelta(), 0.033);
        stars.rotation.y += dt * 0.02;
        input.flushFrame();
        if(update) update(dt);
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
      }
      tick();
    }
  };
  return shell;
}

function createInput(){
  const state = {
    left:false,right:false,up:false,down:false,action:false,jump:false,
    pressedLeft:false, pressedRight:false, pressedUp:false, pressedDown:false,
    pressedAction:false, pressedJump:false,
    pointerX:0,pointerY:0
  };
  const map = {
    ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down',
    Space:'action', KeyZ:'action', KeyX:'jump', Enter:'jump'
  };
  addEventListener('keydown', e=>{
    const k = map[e.code]; if(!k) return;
    if(!state[k]) state['pressed'+capitalize(k)] = true;
    state[k] = true;
  });
  addEventListener('keyup', e=>{
    const k = map[e.code]; if(k) state[k] = false;
  });
  document.querySelectorAll('[data-key]').forEach(btn=>{
    const key = btn.dataset.key;
    const down = e=>{ e.preventDefault(); if(!state[key]) state['pressed'+capitalize(key)] = true; state[key]=true; };
    const up = e=>{ e.preventDefault(); state[key]=false; };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointerleave', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('contextmenu', e=>e.preventDefault());
  });
  addEventListener('pointermove', e=>{ state.pointerX = e.clientX; state.pointerY = e.clientY; }, {passive:true});
  state.flushFrame = ()=>{
    for(const k of ['Left','Right','Up','Down','Action','Jump']) state['pressed'+k] = false;
  };
  return state;
}
function capitalize(s){ return s[0].toUpperCase()+s.slice(1); }

function createAudio(){
  let ctx = null;
  const api = { muted:false, unlock, tone, blip, success, fail, bounce, shoot };
  function unlock(){
    if(ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  function env(node, t, dur, vol=.08){
    node.gain.cancelScheduledValues(t);
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(vol, t+.015);
    node.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  }
  function tone(freq=440, dur=.12, type='sine', vol=.07){
    if(api.muted || !ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.connect(gain); gain.connect(ctx.destination);
    env(gain, t, dur, vol);
    osc.start(t); osc.stop(t+dur+.02);
  }
  function blip(freq=520){ tone(freq, .09, 'triangle', .05); }
  function success(){ [480,640,820].forEach((f,i)=>setTimeout(()=>tone(f,.12,'triangle',.06), i*70)); }
  function fail(){ tone(220,.15,'sawtooth',.05); setTimeout(()=>tone(160,.18,'square',.04),90); }
  function bounce(){ tone(320,.08,'triangle',.045); }
  function shoot(){ tone(780,.06,'square',.04); setTimeout(()=>tone(420,.04,'triangle',.03),20); }
  return api;
}

export function neonMaterial(color, emissive=color, metalness=.18, roughness=.42){
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity:.42, metalness, roughness });
}

export function addGroundGrid(scene, color=0x2bd0ff){
  const grid = new THREE.GridHelper(34, 24, color, 0x19314f);
  grid.position.y = 0.01;
  scene.add(grid);
  return grid;
}

export function roundedBox(w,h,d,r=.08,s=3){
  const shape = new THREE.Shape();
  const x=-w/2, y=-h/2;
  shape.moveTo(x+r, y);
  shape.lineTo(x+w-r, y); shape.quadraticCurveTo(x+w, y, x+w, y+r);
  shape.lineTo(x+w, y+h-r); shape.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  shape.lineTo(x+r, y+h); shape.quadraticCurveTo(x, y+h, x, y+h-r);
  shape.lineTo(x, y+r); shape.quadraticCurveTo(x, y, x+r, y);
  const extrude = new THREE.ExtrudeGeometry(shape, { depth:d, bevelEnabled:true, bevelSegments:s, steps:1, bevelSize:r, bevelThickness:r*.8, curveSegments:10 });
  extrude.center();
  return extrude;
}

export function makePlayer(color=0x62f1ff){
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(.55, 20, 20), neonMaterial(color));
  const core = new THREE.Mesh(new THREE.SphereGeometry(.22, 16, 16), new THREE.MeshBasicMaterial({ color:0xffffff }));
  core.position.y = .05;
  body.castShadow = true;
  g.add(body, core);
  return g;
}

export function makeGlowDisc(color=0xffc96b, radius=.45, height=.18){
  const m = neonMaterial(color);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), m);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

export function makeCrystal(color=0x7dff9d){
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.38, 0), neonMaterial(color));
  mesh.castShadow = true;
  return mesh;
}

export function makeBox(color=0xc18fff, sx=.8, sy=.8, sz=.8){
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), neonMaterial(color));
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

export function confetti(scene, origin, color=0xffffff, count=16){
  const group = new THREE.Group();
  for(let i=0;i<count;i++){
    const p = new THREE.Mesh(new THREE.BoxGeometry(.08,.08,.08), new THREE.MeshBasicMaterial({ color: choice([color,0xffffff,0xffd76b,0x62f1ff]) }));
    p.position.copy(origin);
    p.userData.v = new THREE.Vector3(rand(-2,2), rand(1,4), rand(-2,2));
    group.add(p);
  }
  scene.add(group);
  group.userData.life = 1.2;
  return group;
}

export function updateConfetti(group, dt){
  if(!group) return false;
  group.userData.life -= dt;
  for(const p of group.children){
    p.userData.v.y -= dt*6;
    p.position.addScaledVector(p.userData.v, dt);
    p.rotation.x += dt*8; p.rotation.y += dt*6;
  }
  if(group.userData.life <= 0){ group.parent?.remove(group); return false; }
  return true;
}

export function lookFollow(camera, target, offset=new THREE.Vector3(0,5,8), smooth=5, dt=.016){
  camera.position.lerp(target.clone().add(offset), 1 - Math.exp(-smooth*dt));
  camera.lookAt(target.x, target.y+1.2, target.z-2.5);
}

export function safeRemove(scene, arr){
  for(const o of arr){ scene.remove(o); o.geometry?.dispose?.(); if(o.material){ if(Array.isArray(o.material)) o.material.forEach(m=>m.dispose?.()); else o.material.dispose?.(); } }
  arr.length = 0;
}
