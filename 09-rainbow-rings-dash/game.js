
import {THREE, makeRenderer, makeScene, makeCamera, addLights, resize, toon, rand} from '../shared/js/engine.js';
const mount=document.getElementById('game'); const renderer=makeRenderer(mount);
const scene=makeScene(0x10224c); const camera=makeCamera(2,9,68); addLights(scene); resize(renderer,camera);
const scoreEl=document.getElementById('scorePill'); const overlay=document.getElementById('overlay'); const startBtn=document.getElementById('startBtn'); const restartBtn=document.getElementById('restartBtn');
const keys={left:false,right:false,boost:false};
document.querySelectorAll('.touch-btn').forEach(btn=>{btn.onpointerdown=()=>keys[btn.dataset.key]=true;btn.onpointerup=()=>keys[btn.dataset.key]=false;btn.onpointerleave=()=>keys[btn.dataset.key]=false;});
addEventListener('keydown',e=>{ if(e.code==='ArrowLeft')keys.left=true; if(e.code==='ArrowRight')keys.right=true; if(e.code==='Space')keys.boost=true;});
addEventListener('keyup',e=>{ if(e.code==='ArrowLeft')keys.left=false; if(e.code==='ArrowRight')keys.right=false; if(e.code==='Space')keys.boost=false;});

const orb = new THREE.Mesh(new THREE.SphereGeometry(.5,18,18), toon(0xffffff)); orb.position.set(0,0,4); orb.castShadow=true; scene.add(orb);
let hoops=[], blockers=[], score=0, started=false, over=false;
function addHoop(z, color){
  const h = new THREE.Mesh(new THREE.TorusGeometry(1.45,.13,10,26), toon(color));
  h.position.set(rand(-4.2,4.2), rand(-2.4,2.4), z); scene.add(h); hoops.push(h);
}
function addBlock(z){
  const b = new THREE.Mesh(new THREE.BoxGeometry(rand(.8,1.6),rand(1,2.4),.8), toon(0xff8c8c));
  b.position.set(rand(-4.4,4.4), rand(-2.6,2.6), z); scene.add(b); blockers.push(b);
}
function reset(){
  score=0; started=false; over=false; orb.position.set(0,0,4);
  [...hoops,...blockers].forEach(o=>scene.remove(o)); hoops=[]; blockers=[];
  const colors=[0xff6b6b,0xffd56a,0x92ff93,0x7cf3ff,0xbe9bff];
  for(let i=0;i<50;i++){ addHoop(-i*6-12, colors[i%colors.length]); if(Math.random()<.58) addBlock(-i*8-10); }
  scoreEl.textContent='Score: 0';
}
function end(title){ started=false; over=true; overlay.classList.remove('hide'); overlay.querySelector('h1').textContent=title; overlay.querySelector('p').textContent='Chase another rainbow combo.'; }
startBtn.onclick=()=>{overlay.classList.add('hide'); started=true;}; restartBtn.onclick=()=>{reset(); overlay.classList.add('hide'); started=true;};

let last=performance.now();
function loop(now){
  const dt=Math.min(.033,(now-last)/1000); last=now;
  if(started && !over){
    const speed = keys.boost ? 22 : 14;
    if(keys.left) orb.position.x -= 5*dt;
    if(keys.right) orb.position.x += 5*dt;
    orb.position.x = Math.max(-4.8, Math.min(4.8, orb.position.x));
    orb.position.y = Math.sin(now*.006)*.5;

    hoops.forEach(h=>{
      h.position.z += speed*dt; h.rotation.y += dt;
      if(h.position.z>8){ h.position.z -= 300; h.position.x=rand(-4.2,4.2); h.position.y=rand(-2.4,2.4); h.visible=true; }
      if(h.visible && h.position.distanceTo(orb.position)<1.3){ h.visible=false; score++; scoreEl.textContent='Score: '+score; if(score>=40) end('Rainbow streak!'); }
    });
    blockers.forEach(b=>{
      b.position.z += speed*dt; b.rotation.x += dt*.8; b.rotation.y += dt*.6;
      if(b.position.z>8){ b.position.z -= 260; b.position.x=rand(-4.4,4.4); b.position.y=rand(-2.6,2.6); }
      if(b.position.distanceTo(orb.position)<.95) end('Hoop miss!');
    });
    camera.position.x += (orb.position.x-camera.position.x)*dt*2;
    camera.lookAt(orb.position.x, orb.position.y*.4, -25);
  }
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
reset(); requestAnimationFrame(loop);
