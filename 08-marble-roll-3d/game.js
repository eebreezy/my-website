
import {THREE, makeRenderer, makeScene, makeCamera, addLights, resize, toon, rand} from '../shared/js/engine.js';
const mount=document.getElementById('game'); const renderer=makeRenderer(mount);
const scene=makeScene(0x9fdfff); const camera=makeCamera(7,10,64); addLights(scene); resize(renderer,camera);
const scoreEl=document.getElementById('scorePill'); const overlay=document.getElementById('overlay'); const startBtn=document.getElementById('startBtn'); const restartBtn=document.getElementById('restartBtn');
const keys={left:false,right:false,up:false};
document.querySelectorAll('.touch-btn').forEach(btn=>{btn.onpointerdown=()=>keys[btn.dataset.key]=true;btn.onpointerup=()=>keys[btn.dataset.key]=false;btn.onpointerleave=()=>keys[btn.dataset.key]=false;});
addEventListener('keydown',e=>{ if(e.code==='ArrowLeft')keys.left=true; if(e.code==='ArrowRight')keys.right=true; if(e.code==='ArrowUp')keys.up=true;});
addEventListener('keyup',e=>{ if(e.code==='ArrowLeft')keys.left=false; if(e.code==='ArrowRight')keys.right=false; if(e.code==='ArrowUp')keys.up=false;});

const track = new THREE.Group(); scene.add(track);
const gems=[]; let score=0, started=false, over=false, zProgress=0;
for(let i=0;i<36;i++){
  const seg = new THREE.Mesh(new THREE.BoxGeometry(4.6,.4,6), toon(i%2?0xffffff:0x7cd3ff));
  seg.position.set(Math.sin(i*.55)*2.4, 0, -i*5.7);
  seg.receiveShadow=true; track.add(seg);
  if(i<30){
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.35), toon(0xffd76a));
    gem.position.set(seg.position.x, .8, seg.position.z); track.add(gem); gems.push(gem);
  }
}
const marble = new THREE.Mesh(new THREE.SphereGeometry(.48,24,24), new THREE.MeshStandardMaterial({color:0x7cf3ff, roughness:.15, metalness:.3}));
marble.position.set(0,.8,2.3); marble.castShadow=true; scene.add(marble);

function reset(){
  score=0; zProgress=0; started=false; over=false;
  marble.position.set(0,.8,2.3);
  gems.forEach(g=>g.visible=true);
  scoreEl.textContent='Score: 0';
}
function end(title){ started=false; over=true; overlay.classList.remove('hide'); overlay.querySelector('h1').textContent=title; overlay.querySelector('p').textContent='Roll back onto the track.'; }
startBtn.onclick=()=>{overlay.classList.add('hide'); started=true;}; restartBtn.onclick=()=>{reset(); overlay.classList.add('hide'); started=true;};

let last=performance.now();
function loop(now){
  const dt=Math.min(.033,(now-last)/1000); last=now;
  if(started && !over){
    const speed = keys.up ? 8 : 5.7;
    zProgress += speed*dt;
    marble.position.z -= speed*dt;
    marble.position.x += (keys.left?-4.2:0 + (keys.right?4.2:0))*dt*.7;
    marble.position.x = Math.max(-3.4, Math.min(3.4, marble.position.x));
    marble.rotation.z += speed*dt*2;

    const pathX = Math.sin((-marble.position.z/5.7)*.55)*2.4;
    if(Math.abs(marble.position.x-pathX)>2.3) end('Marble fell!');
    gems.forEach(g=>{
      g.rotation.y += dt*3;
      if(g.visible && g.position.distanceTo(marble.position)<.75){ g.visible=false; score++; scoreEl.textContent='Score: '+score; if(score>=24) end('Gem route clear!'); }
    });
    camera.position.x += ((marble.position.x+4)-camera.position.x)*dt*2;
    camera.position.z += ((marble.position.z+8)-camera.position.z)*dt*2.4;
    camera.lookAt(marble.position.x, marble.position.y, marble.position.z-8);
  }
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
reset(); requestAnimationFrame(loop);
