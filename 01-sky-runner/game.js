import { THREE, createRenderer, createScene, createCamera, addLights, onResize, clamp, rand, addSkyDecor } from '../shared/js/engine.js';
const renderer = createRenderer();
const scene = createScene(0x8ad7ff, {color:0x8ad7ff, near:25, far:120});
const camera = createCamera(0,6,12);
addLights(scene); addSkyDecor(scene, 18); onResize(camera, renderer);
const title = document.getElementById('title'); title.textContent = 'Sky Runner 3D';
const stats = document.getElementById('stats'); const help = document.getElementById('help');
help.textContent = 'Tap, click, or press space to jump over blocks.';
let score=0,best=0,over=false;

const groundMat = new THREE.MeshStandardMaterial({color:0x9be070, roughness:.9});
for(let i=0;i<24;i++){
  const tile = new THREE.Mesh(new THREE.BoxGeometry(8,1,8), groundMat);
  tile.position.set(0,-.5,-i*8); tile.receiveShadow = true; scene.add(tile);
}
const player = new THREE.Mesh(new THREE.BoxGeometry(1.2,1.8,1.2), new THREE.MeshStandardMaterial({color:0xffd55c}));
player.position.set(0,1,2); player.castShadow=true; scene.add(player);
const eye1 = new THREE.Mesh(new THREE.SphereGeometry(.08,12,12), new THREE.MeshBasicMaterial({color:0x111111})); eye1.position.set(-.22,.25,.62);
const eye2 = eye1.clone(); eye2.position.x=.22; player.add(eye1,eye2);
let vy=0; const gravity=.028; let lane=0;
const obstacles=[];
function spawnObstacle(z){
  const h=rand(1.2,3.6); const mesh=new THREE.Mesh(new THREE.BoxGeometry(rand(1.2,2.2),h,rand(1.2,2.2)), new THREE.MeshStandardMaterial({color:new THREE.Color(`hsl(${Math.floor(rand(0,360))} 80% 60%)`)}));
  mesh.position.set(rand(-2.5,2.5),h/2,z); mesh.castShadow=true; mesh.receiveShadow=true; scene.add(mesh); obstacles.push(mesh);
}
for(let i=0;i<14;i++) spawnObstacle(-25 - i*12);
function jump(){ if(player.position.y<=1.02 && !over) vy=.42; }
window.addEventListener('keydown',e=>{ if(e.code==='Space') jump(); if(e.code==='ArrowLeft') lane=-1; if(e.code==='ArrowRight') lane=1;});
window.addEventListener('pointerdown', jump);
document.getElementById('restartBtn').onclick=()=>location.reload();
function updateHud(){ stats.innerHTML=`<div>Score: ${score}</div><div>Best: ${best}</div>`; }
updateHud();
let scrollZ=0;
function animate(){
  requestAnimationFrame(animate);
  if(!over){
    scrollZ += .34;
    player.position.y += vy; vy -= gravity;
    if(player.position.y<1){ player.position.y=1; vy=0; }
    player.position.x += ((lane*2.2)-player.position.x)*.12;
    obstacles.forEach(o=>{ o.position.z += .34; o.rotation.y += .01; if(o.position.z>8){ o.position.z -= 170; o.position.x=rand(-2.5,2.5); score++; best=Math.max(best,score); } });
    for(const o of obstacles){
      if(Math.abs(o.position.z-player.position.z)<1.1 && Math.abs(o.position.x-player.position.x)<1.2 && player.position.y < o.scale.y + 1.8){ over=true; help.textContent='Oops! You hit a block. Press Restart.'; break; }
      const dx=Math.abs(o.position.x-player.position.x), dz=Math.abs(o.position.z-player.position.z), top=o.position.y + o.geometry.parameters.height/2;
      if(dx<1.2 && dz<1.2 && player.position.y<top) { over=true; help.textContent='Oops! You hit a block. Press Restart.'; break; }
    }
    camera.position.x += (player.position.x*0.35 - camera.position.x)*.08;
    camera.position.y += ((player.position.y+5.5)-camera.position.y)*.08;
    camera.position.z = 11;
    camera.lookAt(player.position.x, player.position.y+1.2, -8);
  }
  updateHud();
  renderer.render(scene,camera);
}
animate();
