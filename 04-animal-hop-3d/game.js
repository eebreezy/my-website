
import {THREE, makeRenderer, makeScene, makeCamera, addLights, resize, toon, rand} from '../shared/js/engine.js';
const mount=document.getElementById('game');
const renderer=makeRenderer(mount);
const scene=makeScene(0xa4e7ff);
const camera=makeCamera(8,12,58);
addLights(scene); resize(renderer,camera);

const scoreEl=document.getElementById('scorePill');
const overlay=document.getElementById('overlay');
const startBtn=document.getElementById('startBtn');
const restartBtn=document.getElementById('restartBtn');
const keys={left:false,right:false,jump:false};
document.querySelectorAll('.touch-btn').forEach(btn=>{btn.onpointerdown=()=>keys[btn.dataset.key]=true;btn.onpointerup=()=>keys[btn.dataset.key]=false;btn.onpointerleave=()=>keys[btn.dataset.key]=false;});
addEventListener('keydown',e=>{ if(e.code==='ArrowLeft')keys.left=true; if(e.code==='ArrowRight')keys.right=true; if(e.code==='Space')keys.jump=true; });
addEventListener('keyup',e=>{ if(e.code==='ArrowLeft')keys.left=false; if(e.code==='ArrowRight')keys.right=false; if(e.code==='Space')keys.jump=false; });

let started=false, over=false, score=0, vy=0;
const platforms=[]; const world = new THREE.Group(); scene.add(world);
for(let i=0;i<50;i++){
  const p = new THREE.Mesh(new THREE.CylinderGeometry(1.7,1.9,.55,18), toon(i%2?0x88f58a:0x7cd3ff));
  p.position.set(rand(-3.2,3.2), i*2.1, -i*5.2);
  p.castShadow=p.receiveShadow=true;
  world.add(p); platforms.push(p);
}
const player = new THREE.Group();
const body = new THREE.Mesh(new THREE.SphereGeometry(.7,18,18), toon(0xffffff));
body.castShadow=true; player.add(body);
const ear1 = new THREE.Mesh(new THREE.BoxGeometry(.25,.8,.25), toon(0xffb7d8));
const ear2 = ear1.clone(); ear1.position.set(-.22,.85,0); ear2.position.set(.22,.85,0); player.add(ear1,ear2);
player.position.copy(platforms[0].position).add(new THREE.Vector3(0,1,0));
scene.add(player);

function reset(){
  score=0; vy=0; started=false; over=false;
  player.position.copy(platforms[0].position).add(new THREE.Vector3(0,1,0));
  scoreEl.textContent='Score: 0';
}
function end(title){
  started=false; over=true; overlay.classList.remove('hide');
  overlay.querySelector('h1').textContent=title;
  overlay.querySelector('p').textContent='Hop back in and beat your best distance.';
}
startBtn.onclick=()=>{overlay.classList.add('hide'); started=true;};
restartBtn.onclick=()=>{reset(); overlay.classList.add('hide'); started=true;};

let currentIndex = 0, targetX = 0;
let last=performance.now();
function loop(now){
  const dt=Math.min(.033,(now-last)/1000); last=now;
  if(started && !over){
    if(keys.left){ targetX -= 3*dt; }
    if(keys.right){ targetX += 3*dt; }
    targetX = Math.max(-3.3, Math.min(3.3, targetX));
    player.position.x += (targetX-player.position.x)*dt*8;
    if(keys.jump && Math.abs(vy)<0.01 && Math.abs(player.position.y-(platforms[currentIndex].position.y+1))<.02){ vy=10.5; keys.jump=false; }
    vy -= 20*dt; player.position.y += vy*dt;

    let landed = false;
    for(let i=currentIndex;i<Math.min(platforms.length,currentIndex+3);i++){
      const p = platforms[i];
      const top = p.position.y + .55/2 + .8;
      if(vy<=0 && Math.abs(player.position.y-top)<.28 && Math.abs(player.position.x-p.position.x)<1.45 && Math.abs(player.position.z-p.position.z)<1.45){
        player.position.y = top;
        player.position.z = p.position.z;
        vy = 0; currentIndex = i; landed = true;
        score = Math.max(score, i); scoreEl.textContent='Score: '+score;
        if(score>=28) end('Great hopping!');
      }
    }
    if(!landed && player.position.y < platforms[Math.max(0,currentIndex-1)].position.y - 6) end('Cloud tumble!');

    camera.position.x += (player.position.x-camera.position.x)*dt*2;
    camera.position.y += ((player.position.y+6)-camera.position.y)*dt*2;
    camera.position.z += ((player.position.z+10)-camera.position.z)*dt*2;
    camera.lookAt(player.position.x, player.position.y, player.position.z-2);
  }
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
reset();
requestAnimationFrame(loop);
