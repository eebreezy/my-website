
import {THREE, makeRenderer, makeScene, makeCamera, addLights, resize, toon, rand} from '../shared/js/engine.js';
const mount=document.getElementById('game'); const renderer=makeRenderer(mount);
const scene=makeScene(0x180d35); const camera=makeCamera(0,8,70); addLights(scene); resize(renderer,camera);
const scoreEl=document.getElementById('scorePill'); const goalEl=document.getElementById('goalPill');
const overlay=document.getElementById('overlay'); const startBtn=document.getElementById('startBtn'); const restartBtn=document.getElementById('restartBtn');
const keys={left:false,right:false,boost:false};
document.querySelectorAll('.touch-btn').forEach(btn=>{btn.onpointerdown=()=>keys[btn.dataset.key]=true;btn.onpointerup=()=>keys[btn.dataset.key]=false;btn.onpointerleave=()=>keys[btn.dataset.key]=false;});
addEventListener('keydown',e=>{ if(e.code==='ArrowLeft')keys.left=true; if(e.code==='ArrowRight')keys.right=true; if(e.code==='Space')keys.boost=true;});
addEventListener('keyup',e=>{ if(e.code==='ArrowLeft')keys.left=false; if(e.code==='ArrowRight')keys.right=false; if(e.code==='Space')keys.boost=false;});

let started=false, over=false, survive=75, gems=0, timeAcc=0;
const player = new THREE.Mesh(new THREE.SphereGeometry(.45,16,16), toon(0x7cf3ff)); player.castShadow=true; scene.add(player);
const tunnel = new THREE.Group(); scene.add(tunnel);

const ringGeo = new THREE.TorusGeometry(5.4,.1,10,32);
for(let i=0;i<32;i++){
  const ring = new THREE.Mesh(ringGeo, toon(i%2?0xff71d1:0x7cf3ff));
  ring.position.z = -i*5;
  tunnel.add(ring);
}
let obstacles=[], gemsArr=[];
function addObstacle(z){
  const o = new THREE.Mesh(new THREE.BoxGeometry(rand(1,2),rand(1,3),.9), toon(0xff8b8b));
  o.position.set(rand(-2.9,2.9), rand(-2.4,2.4), z); o.castShadow=true; scene.add(o); obstacles.push(o);
}
function addGem(z){
  const g = new THREE.Mesh(new THREE.OctahedronGeometry(.35), toon(0xffdd75));
  g.position.set(rand(-2.8,2.8), rand(-2.2,2.2), z); scene.add(g); gemsArr.push(g);
}
function reset(){
  survive=75; gems=0; timeAcc=0; started=false; over=false;
  player.position.set(0,0,4);
  obstacles.forEach(o=>scene.remove(o)); gemsArr.forEach(g=>scene.remove(g)); obstacles=[]; gemsArr=[];
  for(let i=0;i<36;i++){ if(Math.random()<.8) addObstacle(-i*6-10); if(Math.random()<.85) addGem(-i*5-7); }
  scoreEl.textContent='Score: 0'; goalEl.textContent='Survive: 75s';
}
function end(title){
  started=false; over=true; overlay.classList.remove('hide');
  overlay.querySelector('h1').textContent=title;
  overlay.querySelector('p').textContent='Scoot through the tunnel again.';
}
startBtn.onclick=()=>{overlay.classList.add('hide'); started=true;};
restartBtn.onclick=()=>{reset(); overlay.classList.add('hide'); started=true;};

let speed=18, last=performance.now();
function loop(now){
  const dt=Math.min(.033,(now-last)/1000); last=now;
  if(started && !over){
    timeAcc += dt; if(timeAcc>=1){ timeAcc=0; survive--; goalEl.textContent='Survive: '+survive+'s'; if(survive<=0) end('Candy champion!'); }
    speed = keys.boost ? 28 : 18;
    if(keys.left) player.position.x -= 4.5*dt;
    if(keys.right) player.position.x += 4.5*dt;
    player.position.x = Math.max(-3.2, Math.min(3.2, player.position.x));
    player.position.y = Math.sin(now*.007)*.35;

    tunnel.children.forEach((r,i)=>{
      r.position.z += speed*dt;
      r.rotation.z += dt*(i%2?1.6:-1.4);
      if(r.position.z>8) r.position.z -= 160;
    });
    obstacles.forEach(o=>{
      o.position.z += speed*dt;
      o.rotation.x += dt*1.5; o.rotation.y += dt*1.2;
      if(o.position.z>8){ o.position.z -= 220; o.position.x=rand(-2.9,2.9); o.position.y=rand(-2.4,2.4);}
      if(o.position.distanceTo(player.position)<.9) end('Sweet crash!');
    });
    gemsArr.forEach(g=>{
      g.position.z += speed*dt; g.rotation.y += dt*3;
      if(g.position.z>8){ g.position.z -= 180; g.position.x=rand(-2.8,2.8); g.position.y=rand(-2.2,2.2); g.visible=true; }
      if(g.visible && g.position.distanceTo(player.position)<.75){ g.visible=false; gems++; scoreEl.textContent='Score: '+gems; }
    });
    camera.lookAt(player.position.x*.6, player.position.y*.5, -20);
  }
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
reset(); requestAnimationFrame(loop);
