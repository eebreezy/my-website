
import {THREE, makeRenderer, makeScene, makeCamera, addLights, resize, toon, rand} from '../shared/js/engine.js';
const mount=document.getElementById('game'); const renderer=makeRenderer(mount);
const scene=makeScene(0x97d6ff); const camera=makeCamera(10,14,54); addLights(scene); resize(renderer,camera);
const scoreEl=document.getElementById('scorePill'); const overlay=document.getElementById('overlay'); const startBtn=document.getElementById('startBtn'); const restartBtn=document.getElementById('restartBtn');
const world = new THREE.Group(); scene.add(world);
const basePad = new THREE.Mesh(new THREE.BoxGeometry(5,1,5), toon(0xffffff)); basePad.position.y=.5; basePad.receiveShadow=true; world.add(basePad);
let moving, towerTop=1.05, dir=1, score=0, started=false, over=false;
let stack=[];

function makeBlock(y){
  const colors=[0xff7d7d,0xffc75f,0x7cf3ff,0x96ff9f,0xd3a2ff];
  moving = new THREE.Mesh(new THREE.BoxGeometry(4, .8, 4), toon(colors[score%colors.length]));
  moving.position.set(-6, y, 0); moving.castShadow=true; scene.add(moving); dir=1;
}
function dropBlock(){
  if(!started || over) return;
  const prev = stack.length?stack[stack.length-1]:basePad;
  const dx = moving.position.x - prev.position.x;
  const overlap = 4 - Math.abs(dx);
  if(overlap < 1.1) return end('Tower toppled!');
  moving.scale.x = overlap / 4 * moving.scale.x;
  moving.position.x = prev.position.x + dx/2;
  scene.remove(moving); world.add(moving); stack.push(moving); score++; scoreEl.textContent='Score: '+score;
  towerTop += .8; if(score>=18) return end('Tower complete!');
  makeBlock(towerTop + .4);
}
document.querySelector('[data-key="drop"]')?.addEventListener('pointerdown',dropBlock);
addEventListener('keydown',e=>{ if(e.code==='Space') dropBlock(); });

function reset(){
  score=0; towerTop=1.05; started=false; over=false;
  stack.forEach(s=>world.remove(s)); stack=[];
  if(moving) scene.remove(moving);
  scoreEl.textContent='Score: 0'; makeBlock(1.45);
}
function end(title){ started=false; over=true; overlay.classList.remove('hide'); overlay.querySelector('h1').textContent=title; overlay.querySelector('p').textContent='Tap play to stack again.'; }
startBtn.onclick=()=>{overlay.classList.add('hide'); started=true;}; restartBtn.onclick=()=>{reset(); overlay.classList.add('hide'); started=true;};

let last=performance.now();
function loop(now){
  const dt=Math.min(.033,(now-last)/1000); last=now;
  if(started && !over && moving){
    moving.position.x += dir*dt*8;
    if(moving.position.x>6) dir=-1;
    if(moving.position.x<-6) dir=1;
    camera.position.y += ((towerTop+7)-camera.position.y)*dt*1.8;
    camera.lookAt(0, towerTop-1.2, 0);
  }
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
reset(); requestAnimationFrame(loop);
