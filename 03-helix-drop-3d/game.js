
import {THREE, makeRenderer, makeScene, makeCamera, addLights, resize, toon} from '../shared/js/engine.js';

const mount=document.getElementById('game');
const renderer=makeRenderer(mount);
const scene=makeScene(0x8ccfff);
const camera=makeCamera(10,12,58);
addLights(scene); resize(renderer,camera);

const scoreEl=document.getElementById('scorePill');
const overlay=document.getElementById('overlay');
const startBtn=document.getElementById('startBtn');
const restartBtn=document.getElementById('restartBtn');
const pressed={left:false,right:false};

document.querySelectorAll('.touch-btn').forEach(btn=>{
  btn.onpointerdown=()=>pressed[btn.dataset.key]=true;
  btn.onpointerup=()=>pressed[btn.dataset.key]=false;
  btn.onpointerleave=()=>pressed[btn.dataset.key]=false;
});
addEventListener('keydown',e=>{ if(e.code==='ArrowLeft') pressed.left=true; if(e.code==='ArrowRight') pressed.right=true;});
addEventListener('keyup',e=>{ if(e.code==='ArrowLeft') pressed.left=false; if(e.code==='ArrowRight') pressed.right=false;});

let started=false, over=false, level=0, speedY=0;
const tower=new THREE.Group(); scene.add(tower);
scene.add(new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,40,16), toon(0xffffff)));

const safeColor=0x6fe37a, badColor=0xff6d7a;
let platforms=[];

function makePlatform(y, seed){
  const ring = new THREE.Group();
  for(let i=0;i<8;i++){
    if(i===seed || i===(seed+1)%8) continue;
    const arc = new THREE.Mesh(new THREE.BoxGeometry(2.3,.5,1.1), toon((i+seed)%5===0?badColor:safeColor));
    const ang = i/8*Math.PI*2;
    arc.position.set(Math.cos(ang)*3.4, y, Math.sin(ang)*3.4);
    arc.lookAt(0,y,0);
    arc.castShadow = arc.receiveShadow = true;
    arc.userData.bad = arc.material.color.getHex()===badColor;
    ring.add(arc);
  }
  tower.add(ring); platforms.push(ring);
}
function build(){
  platforms.forEach(p=>tower.remove(p)); platforms=[];
  for(let i=0;i<30;i++) makePlatform(-i*1.5, (Math.random()*8)|0);
}
const ball = new THREE.Mesh(new THREE.SphereGeometry(.55, 20, 20), toon(0xffcf58));
ball.castShadow=true; scene.add(ball);

function reset(){
  level=0; speedY=0; started=false; over=false;
  tower.rotation.y = 0; ball.position.set(0,2,0); build();
  scoreEl.textContent='Score: 0';
}
function end(title){
  started=false; over=true; overlay.classList.remove('hide');
  overlay.querySelector('h1').textContent=title;
  overlay.querySelector('p').textContent='Rotate the tower and drop again.';
}
startBtn.onclick=()=>{overlay.classList.add('hide'); started=true;};
restartBtn.onclick=()=>{reset(); overlay.classList.add('hide'); started=true;};

let last=performance.now();
function loop(now){
  const dt=Math.min(.033,(now-last)/1000); last=now;
  if(started && !over){
    if(pressed.left) tower.rotation.y += dt*2.8;
    if(pressed.right) tower.rotation.y -= dt*2.8;
    speedY += 19*dt;
    ball.position.y -= speedY*dt;

    let onPlatform = false;
    for(const ring of platforms){
      for(const seg of ring.children){
        const p = seg.getWorldPosition(new THREE.Vector3());
        if(Math.abs(ball.position.y - p.y) < .35 && ball.position.distanceTo(new THREE.Vector3(p.x, ball.position.y, p.z)) < 1.2){
          onPlatform = true;
          if(seg.userData.bad) return end('Uh oh!');
          ball.position.y = p.y + .8;
          speedY = 0.2;
          break;
        }
      }
      if(onPlatform) break;
    }
    if(!onPlatform && speedY<1) speedY = 7;

    const newLevel = Math.max(0, Math.floor(-ball.position.y/1.5));
    if(newLevel!==level){
      level = newLevel;
      scoreEl.textContent='Score: '+level;
      if(level>=30) end('Tower cleared!');
    }

    camera.position.y += ((ball.position.y + 8) - camera.position.y)*dt*2;
    camera.lookAt(0, ball.position.y-1.8, 0);
  }
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
reset();
requestAnimationFrame(loop);
