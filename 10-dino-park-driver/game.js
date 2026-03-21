
import {THREE, makeRenderer, makeScene, makeCamera, addLights, resize, toon, rand, clamp} from '../shared/js/engine.js';
const mount=document.getElementById('game'); const renderer=makeRenderer(mount);
const scene=makeScene(0xa4e4ff); const camera=makeCamera(8,12,58); addLights(scene); resize(renderer,camera);
const scoreEl=document.getElementById('scorePill'); const overlay=document.getElementById('overlay'); const startBtn=document.getElementById('startBtn'); const restartBtn=document.getElementById('restartBtn');
const keys={left:false,right:false,up:false,down:false};
document.querySelectorAll('.touch-btn').forEach(btn=>{btn.onpointerdown=()=>keys[btn.dataset.key]=true;btn.onpointerup=()=>keys[btn.dataset.key]=false;btn.onpointerleave=()=>keys[btn.dataset.key]=false;});
addEventListener('keydown',e=>{ if(e.code==='ArrowLeft')keys.left=true; if(e.code==='ArrowRight')keys.right=true; if(e.code==='ArrowUp')keys.up=true; if(e.code==='ArrowDown')keys.down=true;});
addEventListener('keyup',e=>{ if(e.code==='ArrowLeft')keys.left=false; if(e.code==='ArrowRight')keys.right=false; if(e.code==='ArrowUp')keys.up=false; if(e.code==='ArrowDown')keys.down=false;});

const park = new THREE.Group(); scene.add(park);
const lawn = new THREE.Mesh(new THREE.CircleGeometry(24,40), toon(0x66c56b)); lawn.rotation.x=-Math.PI/2; lawn.receiveShadow=true; park.add(lawn);
const road = new THREE.Mesh(new THREE.TorusGeometry(12,.9,14,80), toon(0x4a5368)); road.rotation.x=-Math.PI/2; road.receiveShadow=true; park.add(road);

for(let i=0;i<18;i++){
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,1.4,8), toon(0x865128));
  const top = new THREE.Mesh(new THREE.SphereGeometry(rand(.7,1.1),16,16), toon([0x69c65e,0x8bdd6f,0x58b960][i%3]));
  top.position.y=1.2; trunk.castShadow=top.castShadow=true; tree.add(trunk, top);
  const a=i/18*Math.PI*2, r=rand(15,20); tree.position.set(Math.cos(a)*r,.7,Math.sin(a)*r); park.add(tree);
}
const jeep = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(1.8,.7,1.1), toon(0xffcf58)); body.position.y=.75; jeep.add(body);
const cab = new THREE.Mesh(new THREE.BoxGeometry(1,.55,.95), toon(0x7cf3ff)); cab.position.set(0,.35,0); body.add(cab);
function wheel(x,z){ const w=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.25,14), toon(0x222222)); w.rotation.z=Math.PI/2; w.position.set(x,.25,z); jeep.add(w); return w; }
const wheels=[wheel(.72,.56),wheel(-.72,.56),wheel(.72,-.56),wheel(-.72,-.56)];
jeep.position.set(12,0,0); scene.add(jeep);

let bones=[], bumpers=[], score=0, started=false, over=false, angle=0, speed=0;
function addBone(a){
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(.32), toon(0xffef9e));
  b.position.set(Math.cos(a)*12, .75, Math.sin(a)*12); scene.add(b); bones.push(b);
}
function addBumper(a){
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.1,1,1.1), toon(0xff8888));
  b.position.set(Math.cos(a)*12, .55, Math.sin(a)*12); scene.add(b); bumpers.push(b);
}
function reset(){
  score=0; started=false; over=false; angle=0; speed=0;
  jeep.position.set(12,0,0); jeep.rotation.y = -Math.PI/2;
  [...bones,...bumpers].forEach(o=>scene.remove(o)); bones=[]; bumpers=[];
  for(let i=0;i<42;i++){ if(Math.random()<.7) addBone((i/42)*Math.PI*2); if(Math.random()<.35) addBumper((i/42)*Math.PI*2 + .04); }
  scoreEl.textContent='Score: 0';
}
function end(title){ started=false; over=true; overlay.classList.remove('hide'); overlay.querySelector('h1').textContent=title; overlay.querySelector('p').textContent='Drive another dino loop.'; }
startBtn.onclick=()=>{overlay.classList.add('hide'); started=true;}; restartBtn.onclick=()=>{reset(); overlay.classList.add('hide'); started=true;};

let last=performance.now();
function loop(now){
  const dt=Math.min(.033,(now-last)/1000); last=now;
  if(started && !over){
    if(keys.up) speed += dt*4;
    if(keys.down) speed -= dt*5;
    speed *= .985;
    speed = clamp(speed, -3.5, 7);
    angle += speed*dt/4.5;
    if(keys.left) angle += dt*0.8;
    if(keys.right) angle -= dt*0.8;
    jeep.position.set(Math.cos(angle)*12, 0, Math.sin(angle)*12);
    jeep.rotation.y = -angle - Math.PI/2;
    wheels.forEach(w=>w.rotation.x += speed*dt*4);

    bones.forEach(b=>{
      b.rotation.y += dt*2.3;
      if(b.visible && b.position.distanceTo(jeep.position)<1){ b.visible=false; score++; scoreEl.textContent='Score: '+score; if(score>=30) end('Park complete!'); }
    });
    bumpers.forEach(b=>{ if(b.position.distanceTo(jeep.position)<1) end('Bumper bonk!'); });

    camera.position.x += ((jeep.position.x+6)-camera.position.x)*dt*2;
    camera.position.z += ((jeep.position.z+6)-camera.position.z)*dt*2;
    camera.lookAt(jeep.position.x, .6, jeep.position.z);
  }
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
reset(); requestAnimationFrame(loop);
