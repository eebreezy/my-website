import { THREE, createRenderer, createScene, createCamera, addLights, onResize, rand, clamp } from '../shared/js/engine.js';
const renderer=createRenderer(), scene=createScene(0x081225, {color:0x081225, near:15, far:160}), camera=createCamera(0,2,10); addLights(scene); onResize(camera,renderer);
document.getElementById('title').textContent='Space Ring Dodge';
const stats=document.getElementById('stats'), help=document.getElementById('help'); help.textContent='Drag, swipe, or use arrow keys to move through glowing rings.';
const stars = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({color:0xffffff,size:.18}));
const starPos=[]; for(let i=0;i<1800;i++) starPos.push(rand(-60,60),rand(-30,30),rand(-160,20)); stars.geometry.setAttribute('position', new THREE.Float32BufferAttribute(starPos,3)); scene.add(stars);
const ship=new THREE.Mesh(new THREE.ConeGeometry(.7,2,12), new THREE.MeshStandardMaterial({color:0x6ee7ff, emissive:0x103850})); ship.rotation.x=Math.PI/2; ship.castShadow=true; scene.add(ship);
let targetX=0,targetY=0,score=0,over=false;
const rings=[];
for(let i=0;i<16;i++) addRing(-i*12);
function addRing(z){ const ring=new THREE.Mesh(new THREE.TorusGeometry(2.4,.28,14,40), new THREE.MeshStandardMaterial({color:new THREE.Color(`hsl(${Math.floor(rand(0,360))} 85% 65%)`), emissive:0x222222})); ring.position.set(rand(-4,4),rand(-2,3),z); ring.userData={passed:false}; scene.add(ring); rings.push(ring); }
window.addEventListener('keydown',e=>{ if(e.code==='ArrowLeft') targetX-=1; if(e.code==='ArrowRight') targetX+=1; if(e.code==='ArrowUp') targetY+=1; if(e.code==='ArrowDown') targetY-=1; });
window.addEventListener('pointermove',e=>{ if(e.pressure>0 || e.buttons>0){ targetX=(e.clientX/innerWidth-.5)*10; targetY=-(e.clientY/innerHeight-.5)*6; }});
document.getElementById('restartBtn').onclick=()=>location.reload();
function hud(){ stats.innerHTML=`<div>Rings: ${score}</div><div>Status: ${over?'Crash':'Flying'}</div>`; }
function animate(){ requestAnimationFrame(animate); if(!over){ targetX=clamp(targetX,-5,5); targetY=clamp(targetY,-3,3); ship.position.x += (targetX-ship.position.x)*.12; ship.position.y += (targetY-ship.position.y)*.12; ship.rotation.z = -ship.position.x*.08; rings.forEach(r=>{ r.position.z += .55; r.rotation.x += .02; r.rotation.y += .01; if(Math.abs(r.position.z)<0.45){ const dx=Math.abs(ship.position.x-r.position.x), dy=Math.abs(ship.position.y-r.position.y); if(dx<1.75 && dy<1.75){ score++; } else { over=true; help.textContent='Crash! You missed the ring. Press Restart.'; } }
      if(r.position.z>12){ r.position.z -= 192; r.position.x=rand(-4,4); r.position.y=rand(-2,3); }
    });
  }
  camera.lookAt(ship.position.x, ship.position.y, -10); hud(); renderer.render(scene,camera);
}
animate();
