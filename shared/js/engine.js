import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
export { THREE };

export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game-root').appendChild(renderer.domElement);
  return renderer;
}

export function createScene(bg = 0x7cc7ff, fog = null) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  if (fog) scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);
  return scene;
}

export function createCamera(x=0,y=6,z=12) {
  const camera = new THREE.PerspectiveCamera(65, window.innerWidth/window.innerHeight, 0.1, 300);
  camera.position.set(x,y,z);
  return camera;
}

export function addLights(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x5a88aa, 1.2);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.1);
  dir.position.set(8,16,10);
  dir.castShadow = true;
  dir.shadow.mapSize.width = 2048;
  dir.shadow.mapSize.height = 2048;
  dir.shadow.camera.left = -30;
  dir.shadow.camera.right = 30;
  dir.shadow.camera.top = 30;
  dir.shadow.camera.bottom = -30;
  scene.add(dir);
  return { hemi, dir };
}

export function addGround(scene, {width=120, depth=120, color=0x75d36f} = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, 1, depth),
    new THREE.MeshStandardMaterial({ color, roughness: .9 })
  );
  mesh.position.y = -.5;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

export function onResize(camera, renderer) {
  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);
  resize();
}

export function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
export function rand(min, max){ return Math.random() * (max - min) + min; }
export function pick(arr){ return arr[(Math.random() * arr.length) | 0]; }

export function makeLabelCanvas(text, sub='Tap / Space'){
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#07152b'; g.fillRect(0,0,c.width,c.height);
  const grad = g.createLinearGradient(0,0,c.width,c.height);
  grad.addColorStop(0,'#6ee7ff'); grad.addColorStop(1,'#ffe07a');
  g.fillStyle = grad; g.fillRect(18,18,c.width-36,c.height-36);
  g.fillStyle = '#0b1a34'; g.fillRect(30,30,c.width-60,c.height-60);
  g.fillStyle = 'white';
  g.font = 'bold 92px Arial'; g.textAlign = 'center';
  g.fillText(text, c.width/2, 112);
  g.font = 'bold 52px Arial';
  g.fillStyle = '#cbd8ff';
  g.fillText(sub, c.width/2, 190);
  return c;
}

export function addSkyDecor(scene, count=24) {
  const group = new THREE.Group();
  for (let i=0;i<count;i++) {
    const cloud = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({color:0xffffff, roughness:1});
    for (let j=0;j<3;j++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(rand(1.4,2.6), 18, 18), mat);
      m.position.set(j*1.7, rand(-.2,.4), rand(-.5,.5));
      m.castShadow = true;
      cloud.add(m);
    }
    cloud.position.set(rand(-50,50), rand(8,20), rand(-50,50));
    cloud.scale.setScalar(rand(.5,1.3));
    group.add(cloud);
  }
  scene.add(group);
  return group;
}
