import { THREE, createRenderer, createScene, createCamera, addLights, onResize, rand } from '../shared/js/engine.js';
const renderer=createRenderer(), scene=createScene(0x8fc8ff), camera=createCamera(8,10,14); addLights(scene); onResize(camera,renderer);
document.getElementById('title').textContent='Shape Stack 3D';
const stats=document.getElementById('stats'), help=document.getElementById('help'); help.textContent='Tap or press space to drop the moving block.';
const base=new THREE.Mesh(new THREE.BoxGeometry(8,1,8), new THREE.MeshStandardMaterial({color:0x79d36b})); base.receiveShadow=true; scene.add(base);
let score=0, towerHeight=1, mover, dir=1, dropped=false, gameOver=false; const pieces=[];
function newMover(){ mover=new THREE.Mesh(new THREE.BoxGeometry(rand(2.2,4.6),1,rand(2.2,4.6)), new THREE.MeshStandardMaterial({color:new THREE.Color(`hsl(${Math.floor(rand(0,360))} 80% 62%)`)})); mover.position.set(-5,towerHeight+1,0); mover.castShadow=true; mover.receiveShadow=true; scene.add(mover); dropped=false; }
newMover();
function drop(){ if(dropped||gameOver) return; dropped=true; const target = pieces[pieces.length-1] || base; const dx=Math.abs(mover.position.x - target.position.x); const dz=Math.abs(mover.position.z - target.position.z); if(dx<2.3 && dz<2.3){ pieces.push(mover); score++; towerHeight+=1; newMover(); } else { gameOver=true; help.textContent='Tower fell! Press Restart.'; } }
window.addEventListener('keydown',e=>{ if(e.code==='Space') drop(); }); window.addEventListener('pointerdown',drop);
document.getElementById('restartBtn').onclick=()=>location.reload();
function hud(){ stats.innerHTML=`<div>Stacks: ${score}</div><div>Height: ${towerHeight}</div>`; }
function animate(){ requestAnimationFrame(animate); if(!gameOver && !dropped){ mover.position.x += 0.09*dir; mover.position.z = Math.sin(performance.now()*0.0012)*2; if(mover.position.x>5||mover.position.x<-5) dir*=-1; }
  pieces.forEach((p,i)=>p.rotation.y += 0.005*(i%2?1:-1));
  camera.position.y += ((towerHeight+7)-camera.position.y)*.05; camera.lookAt(0,towerHeight*.6,0);
  hud(); renderer.render(scene,camera);
}
animate();
