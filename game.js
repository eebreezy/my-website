import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('game');
const loading = document.getElementById('loading');
const selectedNameEl = document.getElementById('selectedName');
const modeNameEl = document.getElementById('modeName');
const healthValueEl = document.getElementById('healthValue');
const enemyCountEl = document.getElementById('enemyCount');
const toolButtons = [...document.querySelectorAll('.tool[data-block]')];
const removeBtn = document.getElementById('removeBtn');
const placeBtn = document.getElementById('placeBtn');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 28, 120);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(35, 60, 20);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.78));

const worldGroup = new THREE.Group();
scene.add(worldGroup);
const enemyGroup = new THREE.Group();
scene.add(enemyGroup);

const BLOCK_SIZE = 1;
const WORLD_SIZE = 42;
const MAX_HEIGHT = 11;
const SEA_LEVEL = 2;
const PLAYER_HEIGHT = 1.72;
const PLAYER_RADIUS = 0.28;
const GRAVITY = 28;
const MOVE_SPEED = 5.9;
const JUMP_SPEED = 8.6;
const LOOK_SENS = 0.0025;
const TOUCH_LOOK_SENS = 0.0038;
const INTERACT_DISTANCE = 7;
const ENEMY_SPEED = 1.5;
const ENEMY_COUNT = 7;
const ENEMY_HIT_DISTANCE = 1.15;
const ENEMY_ATTACK_COOLDOWN = 1.1;

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const blockMap = new Map();
const solidKeys = new Set();
const enemies = [];

const textures = makeTextures();
const materials = {
  grass: new THREE.MeshLambertMaterial({ map: textures.grass }),
  dirt: new THREE.MeshLambertMaterial({ map: textures.dirt }),
  stone: new THREE.MeshLambertMaterial({ map: textures.stone }),
  wood: new THREE.MeshLambertMaterial({ map: textures.wood }),
  water: new THREE.MeshLambertMaterial({ map: textures.water, transparent: true, opacity: 0.8 }),
  enemy: new THREE.MeshLambertMaterial({ color: 0x2f8f5b }),
  enemyEye: new THREE.MeshBasicMaterial({ color: 0x111111 })
};

Object.values(materials).forEach((m) => {
  if (m.map) {
    m.map.magFilter = THREE.NearestFilter;
    m.map.minFilter = THREE.NearestFilter;
    m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping;
  }
});

const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
const outlineGeo = new THREE.EdgesGeometry(cubeGeo);
const outlineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
const highlight = new THREE.LineSegments(outlineGeo, outlineMat);
highlight.visible = false;
scene.add(highlight);

const waterPlane = new THREE.Mesh(
  new THREE.BoxGeometry(WORLD_SIZE + 12, 0.8, WORLD_SIZE + 12),
  materials.water
);
waterPlane.position.set(WORLD_SIZE / 2 - 0.5, SEA_LEVEL - 0.35, WORLD_SIZE / 2 - 0.5);
scene.add(waterPlane);

const player = {
  position: new THREE.Vector3(WORLD_SIZE / 2, MAX_HEIGHT + 4, WORLD_SIZE / 2),
  velocity: new THREE.Vector3(),
  yaw: Math.PI,
  pitch: -0.22,
  onGround: false,
  health: 100,
  damageFlash: 0,
};

const input = {
  forward: 0,
  backward: 0,
  left: 0,
  right: 0,
  up: 0,
  down: 0,
  placeMode: true,
};

let selectedBlock = 'grass';
let pointerLocked = false;
let targetBlock = null;
const faceNormal = new THREE.Vector3();

function makeTextures() {
  return {
    grass: makePixelTexture(['#3a8f35', '#49a53d', '#2f7f2c', '#5ab449']),
    dirt: makePixelTexture(['#7a4d27', '#8b5a2c', '#6b3f1e', '#9b6735']),
    stone: makePixelTexture(['#8d8f93', '#9d9fa3', '#77797d', '#a9abb0']),
    wood: makePixelTexture(['#8a5a2a', '#9c6a36', '#71461f', '#ad7a45']),
    water: makePixelTexture(['#4ea3ff', '#67b5ff', '#388fe9', '#79c3ff'])
  };
}

function makePixelTexture(palette) {
  const size = 32;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      ctx.fillStyle = palette[(Math.random() * palette.length) | 0];
      ctx.fillRect(x, y, 4, 4);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function worldKey(x, y, z) {
  return `${x}|${y}|${z}`;
}

function addBlock(x, y, z, type) {
  if (x < 0 || x >= WORLD_SIZE || z < 0 || z >= WORLD_SIZE || y < 0 || y > 40) return;
  const key = worldKey(x, y, z);
  if (blockMap.has(key)) return;
  const mesh = new THREE.Mesh(cubeGeo, materials[type]);
  mesh.position.set(x, y, z);
  mesh.userData = { x, y, z, type };
  worldGroup.add(mesh);
  blockMap.set(key, mesh);
  solidKeys.add(key);
}

function removeBlockAt(x, y, z) {
  const key = worldKey(x, y, z);
  const mesh = blockMap.get(key);
  if (!mesh) return false;
  worldGroup.remove(mesh);
  blockMap.delete(key);
  solidKeys.delete(key);
  return true;
}

function getGroundHeight(x, z) {
  const hills = (
    Math.sin(x * 0.23) * 1.8 +
    Math.cos(z * 0.19) * 1.4 +
    Math.sin((x + z) * 0.11) * 1.7 +
    Math.cos((x - z) * 0.09) * 1.1
  );
  const islandFalloff = 1 - Math.min(1, Math.hypot(x - WORLD_SIZE / 2, z - WORLD_SIZE / 2) / (WORLD_SIZE * 0.78));
  return Math.max(1, Math.min(MAX_HEIGHT, Math.floor(SEA_LEVEL + 1 + hills * 0.8 + islandFalloff * 3.5)));
}

function generateWorld() {
  for (let x = 0; x < WORLD_SIZE; x++) {
    for (let z = 0; z < WORLD_SIZE; z++) {
      const h = getGroundHeight(x, z);
      for (let y = 0; y <= h; y++) {
        let type = 'stone';
        if (y === h) type = h <= SEA_LEVEL + 1 ? 'dirt' : 'grass';
        else if (y >= h - 2) type = 'dirt';
        addBlock(x, y, z, type);
      }

      if (Math.random() < 0.04 && h > SEA_LEVEL + 1 && x > 2 && z > 2 && x < WORLD_SIZE - 2 && z < WORLD_SIZE - 2) {
        const trunk = 2 + ((Math.random() * 2) | 0);
        for (let ty = 1; ty <= trunk; ty++) addBlock(x, h + ty, z, 'wood');
        for (let ox = -2; ox <= 2; ox++) {
          for (let oz = -2; oz <= 2; oz++) {
            for (let oy = 0; oy <= 2; oy++) {
              if (Math.abs(ox) + Math.abs(oz) + oy < 5 && !(ox === 0 && oz === 0 && oy === 2)) {
                addBlock(x + ox, h + trunk + oy, z + oz, 'grass');
              }
            }
          }
        }
      }
    }
  }
}

function createEnemy() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), materials.enemy);
  body.position.y = 0.95;
  const eye1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05), materials.enemyEye);
  const eye2 = eye1.clone();
  eye1.position.set(-0.18, 1.03, 0.46);
  eye2.position.set(0.18, 1.03, 0.46);
  group.add(body, eye1, eye2);
  enemyGroup.add(group);
  const enemy = {
    mesh: group,
    velocityY: 0,
    attackCooldown: 0,
    wanderAngle: Math.random() * Math.PI * 2,
  };
  enemies.push(enemy);
  return enemy;
}

function placeEnemy(enemy, x, z) {
  const gx = THREE.MathUtils.clamp(Math.round(x), 1, WORLD_SIZE - 2);
  const gz = THREE.MathUtils.clamp(Math.round(z), 1, WORLD_SIZE - 2);
  const y = getGroundHeight(gx, gz) + 1;
  enemy.mesh.position.set(gx + 0.5, y, gz + 0.5);
  enemy.velocityY = 0;
}

function spawnEnemies() {
  for (let i = 0; i < ENEMY_COUNT; i++) {
    const enemy = createEnemy();
    const angle = (i / ENEMY_COUNT) * Math.PI * 2;
    const radius = 10 + Math.random() * 8;
    const ex = WORLD_SIZE / 2 + Math.cos(angle) * radius;
    const ez = WORLD_SIZE / 2 + Math.sin(angle) * radius;
    placeEnemy(enemy, ex, ez);
  }
  enemyCountEl.textContent = String(enemies.length);
}

function spawnPlayer() {
  const cx = Math.floor(WORLD_SIZE / 2);
  const cz = Math.floor(WORLD_SIZE / 2) + 3;
  let bestY = getGroundHeight(cx, cz) + PLAYER_HEIGHT + 1.1;
  player.position.set(cx + 0.5, bestY, cz + 0.5);
}

function updateCamera() {
  camera.position.copy(player.position);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

function updateHud() {
  selectedNameEl.textContent = selectedBlock.charAt(0).toUpperCase() + selectedBlock.slice(1);
  modeNameEl.textContent = input.placeMode ? 'Place' : 'Remove';
  healthValueEl.textContent = String(Math.max(0, Math.round(player.health)));
  enemyCountEl.textContent = String(enemies.length);
}

function setSelectedBlock(type) {
  selectedBlock = type;
  toolButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.block === type));
  updateHud();
}

function setPlaceMode(v) {
  input.placeMode = v;
  placeBtn.classList.toggle('active', v);
  removeBtn.classList.toggle('active', !v);
  updateHud();
}

function collidesPlayer(x, y, z) {
  const px = player.position.x;
  const py = player.position.y;
  const pz = player.position.z;
  const blockMinX = x - 0.5, blockMaxX = x + 0.5;
  const blockMinY = y - 0.5, blockMaxY = y + 0.5;
  const blockMinZ = z - 0.5, blockMaxZ = z + 0.5;
  const playerMinX = px - PLAYER_RADIUS, playerMaxX = px + PLAYER_RADIUS;
  const playerMinY = py - PLAYER_HEIGHT, playerMaxY = py;
  const playerMinZ = pz - PLAYER_RADIUS, playerMaxZ = pz + PLAYER_RADIUS;
  return (
    playerMaxX > blockMinX && playerMinX < blockMaxX &&
    playerMaxY > blockMinY && playerMinY < blockMaxY &&
    playerMaxZ > blockMinZ && playerMinZ < blockMaxZ
  );
}

function isSolidAt(x, y, z) {
  return solidKeys.has(worldKey(Math.floor(x), Math.floor(y), Math.floor(z)));
}

function resolveCollisions(nextPos) {
  const feet = nextPos.y - PLAYER_HEIGHT;
  const head = nextPos.y - 0.1;
  const samplesY = [feet + 0.05, feet + 0.9, head];

  let onGroundNow = false;

  const testXZ = (px, pz) => {
    for (const sy of samplesY) {
      if (isSolidAt(px, sy, pz)) return true;
    }
    return false;
  };

  const tryMoveX = nextPos.x;
  if (
    testXZ(tryMoveX + PLAYER_RADIUS, nextPos.z + PLAYER_RADIUS) ||
    testXZ(tryMoveX + PLAYER_RADIUS, nextPos.z - PLAYER_RADIUS) ||
    testXZ(tryMoveX - PLAYER_RADIUS, nextPos.z + PLAYER_RADIUS) ||
    testXZ(tryMoveX - PLAYER_RADIUS, nextPos.z - PLAYER_RADIUS)
  ) {
    nextPos.x = player.position.x;
    player.velocity.x = 0;
  }

  const tryMoveZ = nextPos.z;
  if (
    testXZ(nextPos.x + PLAYER_RADIUS, tryMoveZ + PLAYER_RADIUS) ||
    testXZ(nextPos.x + PLAYER_RADIUS, tryMoveZ - PLAYER_RADIUS) ||
    testXZ(nextPos.x - PLAYER_RADIUS, tryMoveZ + PLAYER_RADIUS) ||
    testXZ(nextPos.x - PLAYER_RADIUS, tryMoveZ - PLAYER_RADIUS)
  ) {
    nextPos.z = player.position.z;
    player.velocity.z = 0;
  }

  const checkGround = () => {
    const probeY = nextPos.y - PLAYER_HEIGHT - 0.08;
    return (
      isSolidAt(nextPos.x + PLAYER_RADIUS, probeY, nextPos.z + PLAYER_RADIUS) ||
      isSolidAt(nextPos.x + PLAYER_RADIUS, probeY, nextPos.z - PLAYER_RADIUS) ||
      isSolidAt(nextPos.x - PLAYER_RADIUS, probeY, nextPos.z + PLAYER_RADIUS) ||
      isSolidAt(nextPos.x - PLAYER_RADIUS, probeY, nextPos.z - PLAYER_RADIUS)
    );
  };

  if (player.velocity.y <= 0 && checkGround()) {
    nextPos.y = Math.floor(nextPos.y - PLAYER_HEIGHT) + 1 + PLAYER_HEIGHT;
    player.velocity.y = 0;
    onGroundNow = true;
  }

  const headY = nextPos.y - 0.15;
  if (
    player.velocity.y > 0 && (
      isSolidAt(nextPos.x + PLAYER_RADIUS, headY, nextPos.z + PLAYER_RADIUS) ||
      isSolidAt(nextPos.x + PLAYER_RADIUS, headY, nextPos.z - PLAYER_RADIUS) ||
      isSolidAt(nextPos.x - PLAYER_RADIUS, headY, nextPos.z + PLAYER_RADIUS) ||
      isSolidAt(nextPos.x - PLAYER_RADIUS, headY, nextPos.z - PLAYER_RADIUS)
    )
  ) {
    player.velocity.y = 0;
    nextPos.y = Math.floor(headY) + 0.15;
  }

  player.onGround = onGroundNow;
}

function updatePlayer(dt) {
  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, -Math.cos(player.yaw)).normalize();
  const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
  const move = new THREE.Vector3();

  move.addScaledVector(forward, input.forward - input.backward);
  move.addScaledVector(right, input.right - input.left);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(MOVE_SPEED);
  }

  player.velocity.x = move.x;
  player.velocity.z = move.z;
  player.velocity.y -= GRAVITY * dt;

  if (player.onGround && input.up) {
    player.velocity.y = JUMP_SPEED;
    player.onGround = false;
  }
  if (!player.onGround && input.down) {
    player.velocity.y -= 18 * dt;
  }

  const nextPos = player.position.clone().addScaledVector(player.velocity, dt);
  resolveCollisions(nextPos);

  if (nextPos.y < -10) {
    player.health = Math.max(0, player.health - 20);
    spawnPlayer();
    player.velocity.set(0, 0, 0);
  } else {
    player.position.copy(nextPos);
  }

  if (player.damageFlash > 0) player.damageFlash = Math.max(0, player.damageFlash - dt * 2.2);
  canvas.style.filter = player.damageFlash > 0 ? `saturate(${1 + player.damageFlash * 0.4}) brightness(${1 - player.damageFlash * 0.15})` : '';
  updateCamera();
}

function updateTargetBlock() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(worldGroup.children, false);
  targetBlock = null;
  highlight.visible = false;
  if (!hits.length) return;
  const hit = hits.find(h => h.distance <= INTERACT_DISTANCE);
  if (!hit) return;
  targetBlock = hit;
  faceNormal.copy(hit.face.normal).round();
  highlight.visible = true;
  highlight.position.copy(hit.object.position);
}

function interact() {
  if (!targetBlock) return;
  const { x, y, z } = targetBlock.object.userData;
  if (!input.placeMode) {
    removeBlockAt(x, y, z);
    return;
  }
  const nx = x + faceNormal.x;
  const ny = y + faceNormal.y;
  const nz = z + faceNormal.z;
  if (ny < 0 || ny > 40) return;
  if (collidesPlayer(nx, ny, nz)) return;
  for (const enemy of enemies) {
    if (Math.abs(enemy.mesh.position.x - (nx + 0.5)) < 0.7 && Math.abs(enemy.mesh.position.y - (ny + 0.5)) < 1.2 && Math.abs(enemy.mesh.position.z - (nz + 0.5)) < 0.7) return;
  }
  addBlock(nx, ny, nz, selectedBlock);
}

function takeDamage(amount, sourceX, sourceZ) {
  player.health -= amount;
  player.damageFlash = 1;
  const knock = new THREE.Vector3(player.position.x - sourceX, 0.35, player.position.z - sourceZ);
  if (knock.lengthSq() > 0.001) {
    knock.normalize().multiplyScalar(2.4);
    player.position.addScaledVector(knock, 0.12);
  }
  if (player.health <= 0) {
    player.health = 100;
    spawnPlayer();
    for (const enemy of enemies) {
      placeEnemy(enemy, Math.random() * WORLD_SIZE, Math.random() * WORLD_SIZE);
    }
  }
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    const pos = enemy.mesh.position;
    const toPlayer = new THREE.Vector3(player.position.x - pos.x, 0, player.position.z - pos.z);
    const distance = toPlayer.length();

    let moveDir = new THREE.Vector3();
    if (distance < 12) {
      moveDir.copy(toPlayer).normalize();
    } else {
      enemy.wanderAngle += (Math.random() - 0.5) * dt * 1.4;
      moveDir.set(Math.cos(enemy.wanderAngle), 0, Math.sin(enemy.wanderAngle));
    }

    const step = moveDir.multiplyScalar(ENEMY_SPEED * dt);
    const nx = THREE.MathUtils.clamp(pos.x + step.x, 1, WORLD_SIZE - 1);
    const nz = THREE.MathUtils.clamp(pos.z + step.z, 1, WORLD_SIZE - 1);
    const gy = getGroundHeight(Math.floor(nx), Math.floor(nz)) + 1;

    const blocked = isSolidAt(nx, gy + 0.3, nz);
    if (!blocked) {
      pos.x = nx;
      pos.z = nz;
    } else {
      enemy.wanderAngle += Math.PI * 0.65;
    }

    pos.y = gy;

    const flatDist = Math.hypot(player.position.x - pos.x, player.position.z - pos.z);
    if (flatDist < ENEMY_HIT_DISTANCE && Math.abs(player.position.y - pos.y) < 1.8 && enemy.attackCooldown <= 0) {
      enemy.attackCooldown = ENEMY_ATTACK_COOLDOWN;
      takeDamage(10, pos.x, pos.z);
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.033, clock.getDelta());
  updatePlayer(dt);
  updateEnemies(dt);
  updateTargetBlock();
  updateHud();
  renderer.render(scene, camera);
}

setPlaceMode(true);
setSelectedBlock('grass');
generateWorld();
spawnPlayer();
spawnEnemies();
updateCamera();
updateHud();
loading.style.display = 'none';
animate();

toolButtons.forEach((btn) => btn.addEventListener('click', () => setSelectedBlock(btn.dataset.block)));
placeBtn.addEventListener('click', () => setPlaceMode(true));
removeBtn.addEventListener('click', () => setPlaceMode(false));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Mobile controls
const leftZone = document.getElementById('leftZone');
const leftBase = document.getElementById('leftBase');
const leftStick = document.getElementById('leftStick');
const rightZone = document.getElementById('rightZone');
const rightBase = document.getElementById('rightBase');
const rightStick = document.getElementById('rightStick');
const jumpBtn = document.getElementById('jumpBtn');
const downBtn = document.getElementById('downBtn');
const mineBtn = document.getElementById('mineBtn');
const buildBtn = document.getElementById('buildBtn');

const touchState = {
  moveId: null,
  lookId: null,
  moveOrigin: { x: 0, y: 0 },
  lastLook: { x: 0, y: 0 },
};

function stopEvent(e) {
  e.preventDefault();
}

['pointerdown','pointermove','pointerup','pointercancel'].forEach(type => {
  document.body.addEventListener(type, stopEvent, { passive: false });
});

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  interact();
}, { passive: false });

function resetMoveStick() {
  rightBase.style.display = 'none';
  rightStick.style.transform = 'translate(0px, 0px)';
  input.forward = input.backward = input.left = input.right = 0;
}

leftZone.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (touchState.lookId !== null) return;
  touchState.lookId = e.pointerId;
  touchState.lastLook.x = e.clientX;
  touchState.lastLook.y = e.clientY;
  leftZone.setPointerCapture(e.pointerId);
}, { passive: false });

leftZone.addEventListener('pointermove', (e) => {
  e.preventDefault();
  if (touchState.lookId !== e.pointerId) return;
  const dx = e.clientX - touchState.lastLook.x;
  const dy = e.clientY - touchState.lastLook.y;
  touchState.lastLook.x = e.clientX;
  touchState.lastLook.y = e.clientY;
  player.yaw -= dx * TOUCH_LOOK_SENS;
  player.pitch -= dy * TOUCH_LOOK_SENS;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.2, 1.2);
}, { passive: false });

function endLookPointer(e) {
  if (touchState.lookId !== e.pointerId) return;
  touchState.lookId = null;
}
leftZone.addEventListener('pointerup', endLookPointer, { passive: false });
leftZone.addEventListener('pointercancel', endLookPointer, { passive: false });

rightZone.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (touchState.moveId !== null) return;
  touchState.moveId = e.pointerId;
  touchState.moveOrigin.x = e.clientX;
  touchState.moveOrigin.y = e.clientY;
  rightBase.style.display = 'block';
  rightBase.style.left = `${Math.max(12, Math.min(window.innerWidth - 132, e.clientX - 60))}px`;
  rightBase.style.top = `${Math.max(60, Math.min(window.innerHeight - 220, e.clientY - 60))}px`;
  rightZone.setPointerCapture(e.pointerId);
}, { passive: false });

rightZone.addEventListener('pointermove', (e) => {
  e.preventDefault();
  if (touchState.moveId !== e.pointerId) return;
  const dx = e.clientX - touchState.moveOrigin.x;
  const dy = e.clientY - touchState.moveOrigin.y;
  const limit = 38;
  const dist = Math.hypot(dx, dy);
  const scale = dist > limit ? limit / dist : 1;
  const px = dx * scale;
  const py = dy * scale;
  rightStick.style.transform = `translate(${px}px, ${py}px)`;

  const nx = THREE.MathUtils.clamp(dx / limit, -1, 1);
  const ny = THREE.MathUtils.clamp(dy / limit, -1, 1);
  input.left = nx < -0.18 ? -nx : 0;
  input.right = nx > 0.18 ? nx : 0;
  input.forward = ny < -0.18 ? -ny : 0;
  input.backward = ny > 0.18 ? ny : 0;
}, { passive: false });

function endMovePointer(e) {
  if (touchState.moveId !== e.pointerId) return;
  touchState.moveId = null;
  resetMoveStick();
}
rightZone.addEventListener('pointerup', endMovePointer, { passive: false });
rightZone.addEventListener('pointercancel', endMovePointer, { passive: false });

jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); input.up = 1; }, { passive: false });
jumpBtn.addEventListener('pointerup', () => { input.up = 0; }, { passive: false });
jumpBtn.addEventListener('pointercancel', () => { input.up = 0; }, { passive: false });
downBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); input.down = 1; }, { passive: false });
downBtn.addEventListener('pointerup', () => { input.down = 0; }, { passive: false });
downBtn.addEventListener('pointercancel', () => { input.down = 0; }, { passive: false });
mineBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); setPlaceMode(false); interact(); }, { passive: false });
buildBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); setPlaceMode(true); interact(); }, { passive: false });
