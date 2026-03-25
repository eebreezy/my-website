import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('game');
const loading = document.getElementById('loading');
const selectedNameEl = document.getElementById('selectedName');
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

const sun = new THREE.DirectionalLight(0xffffff, 1.25);
sun.position.set(35, 60, 20);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.72));

const worldGroup = new THREE.Group();
scene.add(worldGroup);

const BLOCK_SIZE = 1;
const WORLD_SIZE = 36;
const MAX_HEIGHT = 10;
const SEA_LEVEL = 2;
const PLAYER_HEIGHT = 1.72;
const PLAYER_RADIUS = 0.28;
const GRAVITY = 28;
const MOVE_SPEED = 5.8;
const JUMP_SPEED = 8.8;
const LOOK_SENS = 0.0026;
const TOUCH_LOOK_SENS = 0.0045;
const INTERACT_DISTANCE = 7;

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const blockMap = new Map();
const solidKeys = new Set();

const textures = makeTextures();
const materials = {
  grass: new THREE.MeshLambertMaterial({ map: textures.grass }),
  dirt: new THREE.MeshLambertMaterial({ map: textures.dirt }),
  stone: new THREE.MeshLambertMaterial({ map: textures.stone }),
  wood: new THREE.MeshLambertMaterial({ map: textures.wood }),
  water: new THREE.MeshLambertMaterial({ map: textures.water, transparent: true, opacity: 0.8 })
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
  yaw: 0,
  pitch: -0.25,
  onGround: false,
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
let faceNormal = new THREE.Vector3();

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
        if (y === h) type = h <= SEA_LEVEL + 1 ? 'sand' : 'grass';
        else if (y >= h - 2) type = 'dirt';
        if (type === 'sand') type = 'dirt';
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

generateWorld();
spawnPlayer();
updateCamera();
loading.style.display = 'none';

function spawnPlayer() {
  let bestY = 0;
  const cx = Math.floor(WORLD_SIZE / 2);
  const cz = Math.floor(WORLD_SIZE / 2);
  for (let y = MAX_HEIGHT + 10; y >= 0; y--) {
    if (solidKeys.has(worldKey(cx, y, cz))) {
      bestY = y + PLAYER_HEIGHT + 0.3;
      break;
    }
  }
  player.position.set(cx + 0.5, bestY, cz + 4.5);
}

function updateCamera() {
  camera.position.copy(player.position);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

function setSelectedBlock(type) {
  selectedBlock = type;
  selectedNameEl.textContent = type.charAt(0).toUpperCase() + type.slice(1);
  toolButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.block === type));
}

function setPlaceMode(v) {
  input.placeMode = v;
  placeBtn.classList.toggle('active', v);
  removeBtn.classList.toggle('active', !v);
}

setPlaceMode(true);
setSelectedBlock('grass');

toolButtons.forEach((btn) => btn.addEventListener('click', () => setSelectedBlock(btn.dataset.block)));
placeBtn.addEventListener('click', () => setPlaceMode(true));
removeBtn.addEventListener('click', () => setPlaceMode(false));

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyW') input.forward = 1;
  if (e.code === 'KeyS') input.backward = 1;
  if (e.code === 'KeyA') input.left = 1;
  if (e.code === 'KeyD') input.right = 1;
  if (e.code === 'Space') input.up = 1;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.down = 1;
  if (e.code === 'Digit1') setSelectedBlock('grass');
  if (e.code === 'Digit2') setSelectedBlock('dirt');
  if (e.code === 'Digit3') setSelectedBlock('stone');
  if (e.code === 'Digit4') setSelectedBlock('wood');
  if (e.code === 'KeyQ') setPlaceMode(false);
  if (e.code === 'KeyE') setPlaceMode(true);
  if ((e.code === 'KeyF' || e.code === 'Enter') && targetBlock) interact();
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW') input.forward = 0;
  if (e.code === 'KeyS') input.backward = 0;
  if (e.code === 'KeyA') input.left = 0;
  if (e.code === 'KeyD') input.right = 0;
  if (e.code === 'Space') input.up = 0;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.down = 0;
});

canvas.addEventListener('click', () => {
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !pointerLocked) {
    canvas.requestPointerLock();
  } else {
    interact();
  }
});

document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
});

document.addEventListener('mousemove', (e) => {
  if (!pointerLocked) return;
  player.yaw -= e.movementX * LOOK_SENS;
  player.pitch -= e.movementY * LOOK_SENS;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.45, 1.45);
});

window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('mousedown', (e) => {
  if (!pointerLocked) return;
  if (e.button === 0) {
    setPlaceMode(false);
    interact();
  }
  if (e.button === 2) {
    setPlaceMode(true);
    interact();
  }
});

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
  addBlock(nx, ny, nz, selectedBlock);
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
    const probeY = nextPos.y - PLAYER_HEIGHT - 0.05;
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
  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw)).normalize();
  const right = new THREE.Vector3(forward.z, 0, -forward.x).normalize();
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
    spawnPlayer();
    player.velocity.set(0, 0, 0);
  } else {
    player.position.copy(nextPos);
  }

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

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.033, clock.getDelta());
  updatePlayer(dt);
  updateTargetBlock();
  renderer.render(scene, camera);
}
animate();

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
const jumpBtn = document.getElementById('jumpBtn');
const downBtn = document.getElementById('downBtn');

const touchState = {
  moveId: null,
  lookId: null,
  moveOrigin: { x: 0, y: 0 },
};

function resetMoveStick() {
  leftBase.style.display = 'none';
  leftStick.style.transform = 'translate(0px, 0px)';
  input.forward = input.backward = input.left = input.right = 0;
}

leftZone.addEventListener('pointerdown', (e) => {
  touchState.moveId = e.pointerId;
  touchState.moveOrigin.x = e.clientX;
  touchState.moveOrigin.y = e.clientY;
  leftBase.style.display = 'block';
  leftBase.style.left = `${Math.max(12, e.clientX - 60)}px`;
  leftBase.style.top = `${Math.max(window.innerHeight - 220, e.clientY - 60)}px`;
  leftBase.setPointerCapture(e.pointerId);
});

leftZone.addEventListener('pointermove', (e) => {
  if (touchState.moveId !== e.pointerId) return;
  const dx = e.clientX - touchState.moveOrigin.x;
  const dy = e.clientY - touchState.moveOrigin.y;
  const len = Math.min(42, Math.hypot(dx, dy) || 1);
  const ang = Math.atan2(dy, dx);
  const px = Math.cos(ang) * len;
  const py = Math.sin(ang) * len;
  leftStick.style.transform = `translate(${px}px, ${py}px)`;

  const nx = THREE.MathUtils.clamp(dx / 38, -1, 1);
  const ny = THREE.MathUtils.clamp(dy / 38, -1, 1);
  input.left = nx < -0.15 ? -nx : 0;
  input.right = nx > 0.15 ? nx : 0;
  input.forward = ny < -0.15 ? -ny : 0;
  input.backward = ny > 0.15 ? ny : 0;
});

leftZone.addEventListener('pointerup', (e) => {
  if (touchState.moveId !== e.pointerId) return;
  touchState.moveId = null;
  resetMoveStick();
});
leftZone.addEventListener('pointercancel', resetMoveStick);

rightZone.addEventListener('pointerdown', (e) => {
  touchState.lookId = e.pointerId;
  rightZone.setPointerCapture(e.pointerId);
});

rightZone.addEventListener('pointermove', (e) => {
  if (touchState.lookId !== e.pointerId) return;
  player.yaw -= e.movementX * TOUCH_LOOK_SENS;
  player.pitch -= e.movementY * TOUCH_LOOK_SENS;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.45, 1.45);
});

rightZone.addEventListener('pointerup', (e) => {
  if (touchState.lookId !== e.pointerId) return;
  touchState.lookId = null;
});
rightZone.addEventListener('click', () => interact());

jumpBtn.addEventListener('pointerdown', () => { input.up = 1; });
jumpBtn.addEventListener('pointerup', () => { input.up = 0; });
jumpBtn.addEventListener('pointercancel', () => { input.up = 0; });
downBtn.addEventListener('pointerdown', () => { input.down = 1; });
downBtn.addEventListener('pointerup', () => { input.down = 0; });
downBtn.addEventListener('pointercancel', () => { input.down = 0; });
