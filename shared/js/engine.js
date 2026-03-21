
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export { THREE };

export function makeRenderer(container){
  const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  return renderer;
}

export function makeScene(fogColor=0x8bd3ff){
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(fogColor);
  scene.fog = new THREE.Fog(fogColor, 18, 90);
  return scene;
}

export function makeCamera(y=6,z=12,fov=60){
  const camera = new THREE.PerspectiveCamera(fov, innerWidth/innerHeight, 0.1, 200);
  camera.position.set(0,y,z);
  return camera;
}

export function addLights(scene){
  const hemi = new THREE.HemisphereLight(0xffffff, 0x4a67a1, 1.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(8,16,10);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  scene.add(sun);
  return {hemi, sun};
}

export function makeGround({size=240,color=0x62b95b}={}){
  const geo = new THREE.PlaneGeometry(size,size,24,24);
  const mat = new THREE.MeshStandardMaterial({color, roughness:1, metalness:0});
  const ground = new THREE.Mesh(geo, mat);
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  return ground;
}

export function toon(color){
  return new THREE.MeshStandardMaterial({color, roughness:.9, metalness:.08});
}

export function addSkyDots(scene, count=200, radius=90, color=0xffffff){
  const pts = [];
  for(let i=0;i<count;i++){
    const a = Math.random()*Math.PI*2;
    const y = Math.random()*30 + 4;
    const r = 30 + Math.random()*radius;
    pts.push(Math.cos(a)*r, y, Math.sin(a)*r);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts,3));
  const m = new THREE.PointsMaterial({color,size:.6,sizeAttenuation:true});
  const p = new THREE.Points(g,m);
  scene.add(p);
  return p;
}

export function resize(renderer,camera){
  function onResize(){
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }
  addEventListener('resize', onResize);
  return onResize;
}

export function makeLabelSprite(text, {bg='#0d1a35', fg='#ffffff'}={}){
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  roundRect(ctx, 4,4,248,88,24); ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = 'bold 34px Inter, Arial';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(text, 128, 48);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({map:tex});
  const s = new THREE.Sprite(mat);
  s.scale.set(5.5,2.1,1);
  return s;
}
function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

export function touchBind(el, onStart, onEnd){
  const start = e=>{e.preventDefault(); onStart?.();};
  const end = e=>{e.preventDefault(); onEnd?.();};
  el.addEventListener('touchstart', start, {passive:false});
  el.addEventListener('touchend', end, {passive:false});
  el.addEventListener('mousedown', start);
  addEventListener('mouseup', end);
}

export function rand(a,b){ return a + Math.random()*(b-a); }
export function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
export function pick(arr){ return arr[(Math.random()*arr.length)|0]; }

export function roundedBox(w,h,d,r=0.12,color=0xffffff){
  const shape = new THREE.Shape();
  const x=-w/2, y=-h/2;
  shape.moveTo(x+r,y);
  shape.lineTo(x+w-r,y);
  shape.quadraticCurveTo(x+w,y,x+w,y+r);
  shape.lineTo(x+w,y+h-r);
  shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  shape.lineTo(x+r,y+h);
  shape.quadraticCurveTo(x,y+h,x,y+h-r);
  shape.lineTo(x,y+r);
  shape.quadraticCurveTo(x,y,x+r,y);
  const geo = new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false});
  geo.center();
  const mesh = new THREE.Mesh(geo, toon(color));
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
