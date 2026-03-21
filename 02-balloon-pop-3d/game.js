import { THREE, createRenderer, createScene, createCamera, addLights, addGround, onResize, rand, addSkyDecor } from '../shared/js/engine.js';
const renderer=createRenderer(), scene=createScene(0x83d8ff), camera=createCamera(0,7,16); addLights(scene); addGround(scene,{width:40,depth:40,color:0x7edc6d}); addSkyDecor(scene,16); onResize(camera,renderer);
document.getElementById('title').textContent='Balloon Pop 3D';
const stats=document.getElementById('stats'), help=document.getElementById('help'); help.textContent='Tap or click balloons to pop them before time runs out.';
let score=0, time=45;
const balloons=[]; const raycaster=new THREE.Raycaster(); const pointer=new THREE.Vector2();
for(let i=0;i<18;i++) spawn();
function makeBalloon(color){
  const g=new THREE.Group();
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.8,20,20), new THREE.MeshStandardMaterial({color, roughness:.4, metalness:.05}));
  ball.castShadow=true; g.add(ball);
  const knot=new THREE.Mesh(new THREE.ConeGeometry(.12,.18,10), new THREE.MeshStandardMaterial({color})); knot.position.y=-.88; g.add(knot);
  const pts=[new THREE.Vector3(0,-.98,0),new THREE.Vector3(.06,-1.6,0),new THREE.Vector3(-.05,-2.2,0),new THREE.Vector3(.04,-2.9,0)];
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color:0xffffff})); g.add(line);
  return g;
}
function spawn(){ const b=makeBalloon(new THREE.Color(`hsl(${Math.floor(rand(0,360))} 85% 60%)`)); b.position.set(rand(-9,9),rand(2,8),rand(-12,6)); b.userData={speed:rand(.01,.03), bob:rand(0,Math.PI*2)}; scene.add(b); balloons.push(b); }
window.addEventListener('pointerdown', e=>{
  pointer.x = (e.clientX / innerWidth) * 2 - 1; pointer.y = -(e.clientY / innerHeight) * 2 + 1; raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(balloons.map(b=>b.children[0]));
  if(hits[0]){
    const balloon = hits[0].object.parent; scene.remove(balloon); const idx=balloons.indexOf(balloon); if(idx>=0) balloons.splice(idx,1); score++; spawn(); spawn();
  }
});
document.getElementById('restartBtn').onclick=()=>location.reload();
setInterval(()=>{ time--; if(time<=0) help.textContent='Time is up! Press Restart to play again.'; },1000);
function hud(){ stats.innerHTML=`<div>Score: ${score}</div><div>Time: ${Math.max(0,time)}s</div>`; }
function animate(){ requestAnimationFrame(animate); balloons.forEach((b,i)=>{ b.userData.bob+=0.03; b.position.y += Math.sin(b.userData.bob)*0.01 + b.userData.speed; b.rotation.y += 0.01; if(b.position.y>14 || time<=0){ b.position.y=rand(2,4); b.position.x=rand(-9,9); b.position.z=rand(-12,6); }}); camera.lookAt(0,4,0); hud(); renderer.render(scene,camera);} animate();
