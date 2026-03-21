
import {THREE, makeRenderer, makeScene, makeCamera, addLights, resize, toon, rand} from '../shared/js/engine.js';
const mount=document.getElementById('game'); const renderer=makeRenderer(mount);
const scene=makeScene(0x071126); const camera=makeCamera(4,12,62); addLights(scene); resize(renderer,camera);
const scoreEl=document.getElementById('scorePill'); const overlay=document.getElementById('overlay'); const startBtn=document.getElementById('startBtn'); const restartBtn=document.getElementById('restartBtn');
const keys={left:false,right:false,up:false,down:false};
document.querySelectorAll('.touch-btn').forEach(btn=>{btn.onpointerdown=()=>keys[btn.dataset.key]=true;btn.onpointerup=()=>keys[btn.dataset.key]=false;btn.onpointerleave=()=>keys[btn.dataset.key]=false;});
addEventListener('keydown',e=>{ if(e.code==='ArrowLeft')keys.left=true; if(e.code==='ArrowRight')keys.right=true; if(e.code==='ArrowUp')keys.up=true; if(e.code==='ArrowDown')keys.down=true;});
addEventListener('keyup',e=>{ if(e.code==='ArrowLeft')keys.left=false; if(e.code==='ArrowRight')keys.right=false; if(e.code==='ArrowUp')keys.up=false; if(e.code==='ArrowDown')keys.down=false;});

const stars = new THREE.Points(
  (()=>{ const g=new THREE.BufferGeometry(); const pts=[]; for(let i=0;i<500;i++) pts.push(rand(-80,80), rand(-20,60), rand(-180,20)); g.setAttribute('position', new THREE.Float32BufferAttribute(pts,3)); return g; })(),
  new THREE.PointsMaterial({color:0xffffff,size:.28})
);
scene.add(stars);

const rocket = new THREE.Group();
rocket.add(new THREE.Mesh(new THREE.CylinderGeometry(.35,.55,2.2,14), toon(0xff605f)));
const nose = new THREE.Mesh(new THREE.ConeGeometry(.35,.8,14), toon(0xffd45c)); nose.position.y=1.5; rocket.add(nose);
const fin1 = new THREE.Mesh(new THREE.BoxGeometry(.12,.7,.6), toon(0x6fd5ff)); fin1.position.set(.45,-.4,0); rocket.add(fin1);
const fin2 = fin1.clone(); fin2.position.x=-.45; rocket.add(fin2);
rocket.rotation.z = Math.PI/2;
rocket.position.set(0,0,4); rocket.traverse(m=>m.castShadow=true); scene.add(rocket);

let rings=[], asteroids=[], rescues=[], score=0, started=false, over=false;
function addRing(z){
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3,.12,10,30), toon(0x7cf3ff));
  ring.position.set(rand(-4,4), rand(-3.2,3.2), z); scene.add(ring); rings.push(ring);
}
function addAst(z){
  const a = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(.55,.95)), toon(0x927968));
  a.position.set(rand(-4.2,4.2), rand(-3.5,3.5), z); scene.add(a); asteroids.push(a);
}
function addRescue(z){
  const s = new THREE.Mesh(new THREE.IcosahedronGeometry(.42), toon(0xffef84));
  s.position.set(rand(-3.8,3.8), rand(-3.2,3.2), z); scene.add(s); rescues.push(s);
}
function reset(){
  score=0; started=false; over=false; rocket.position.set(0,0,4);
  [...rings,...asteroids,...rescues].forEach(o=>scene.remove(o)); rings=[]; asteroids=[]; rescues=[];
  for(let i=0;i<32;i++){ if(Math.random()<.9) addRing(-i*7-12); if(Math.random()<.7) addAst(-i*8-10); if(Math.random()<.8) addRescue(-i*9-15);}
  scoreEl.textContent='Score: 0';
}
function end(title){ started=false; over=true; overlay.classList.remove('hide'); overlay.querySelector('h1').textContent=title; overlay.querySelector('p').textContent='Fly another rescue run.'; }
startBtn.onclick=()=>{overlay.classList.add('hide'); started=true;}; restartBtn.onclick=()=>{reset(); overlay.classList.add('hide'); started=true;};

let last=performance.now(), speed=15;
function loop(now){
  const dt=Math.min(.033,(now-last)/1000); last=now;
  if(started && !over){
    if(keys.left) rocket.position.x -= 4.8*dt;
    if(keys.right) rocket.position.x += 4.8*dt;
    if(keys.up) rocket.position.y += 4.8*dt;
    if(keys.down) rocket.position.y -= 4.8*dt;
    rocket.position.x = Math.max(-4.5, Math.min(4.5, rocket.position.x));
    rocket.position.y = Math.max(-3.8, Math.min(3.8, rocket.position.y));
    rocket.rotation.y = -rocket.position.x*.08;
    rocket.rotation.x = rocket.position.y*.08;

    rings.forEach(r=>{
      r.position.z += speed*dt; r.rotation.x += dt;
      if(r.position.z>8){ r.position.z -= 250; r.position.x=rand(-4,4); r.position.y=rand(-3.2,3.2);}
    });
    asteroids.forEach(a=>{
      a.position.z += speed*dt; a.rotation.x += dt*.9; a.rotation.y += dt*1.2;
      if(a.position.z>8){ a.position.z -= 260; a.position.x=rand(-4.2,4.2); a.position.y=rand(-3.5,3.5);}
      if(a.position.distanceTo(rocket.position)<1) end('Asteroid bump!');
    });
    rescues.forEach(s=>{
      s.position.z += speed*dt; s.rotation.y += dt*3;
      if(s.position.z>8){ s.position.z -= 280; s.position.x=rand(-3.8,3.8); s.position.y=rand(-3.2,3.2); s.visible=true; }
      if(s.visible && s.position.distanceTo(rocket.position)<.8){ s.visible=false; score++; scoreEl.textContent='Score: '+score; if(score>=20) end('Stars rescued!');}
    });

    camera.position.x += (rocket.position.x-camera.position.x)*dt*2;
    camera.position.y += ((rocket.position.y+4)-camera.position.y)*dt*2;
    camera.lookAt(rocket.position.x*.4, rocket.position.y*.3, -25);
  }
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
reset(); requestAnimationFrame(loop);
