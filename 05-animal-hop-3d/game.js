import { THREE, createRenderer, createScene, createCamera, addLights, onResize, rand, clamp } from '../shared/js/engine.js';
const renderer=createRenderer(), scene=createScene(0x89d8ff), camera=createCamera(0,7,12); addLights(scene); onResize(camera,renderer);
document.getElementById('title').textContent='Animal Hop 3D';
const stats=document.getElementById('stats'), help=document.getElementById('help'); help.textContent='Tap, click, or press space to hop forward and collect stars.';
const sun=new THREE.Mesh(new THREE.SphereGeometry(2.2,22,22), new THREE.MeshBasicMaterial({color:0xffef9f})); sun.position.set(16,18,-30); scene.add(sun);
const platforms=[]; const stars=[];
for(let i=0;i<22;i++) makePlatform(-i*5, i===0 ? 0 : rand(-2.5,2.5));
function makePlatform(z,x){ const p=new THREE.Mesh(new THREE.BoxGeometry(4,.8,4), new THREE.MeshStandardMaterial({color:new THREE.Color(`hsl(${Math.floor(rand(100,150))} 55% ${Math.floor(rand(48,64))}%)`)})); p.position.set(x,0,z); p.receiveShadow=true; scene.add(p); platforms.push(p); const star=new THREE.Mesh(new THREE.OctahedronGeometry(.45), new THREE.MeshStandardMaterial({color:0xffdd55, emissive:0x443300})); star.position.set(x,1.4,z); scene.add(star); stars.push(star); }
const animal=new THREE.Group(); const body=new THREE.Mesh(new THREE.SphereGeometry(.85,18,18), new THREE.MeshStandardMaterial({color:0xf0c59a})); const head=new THREE.Mesh(new THREE.SphereGeometry(.55,18,18), new THREE.MeshStandardMaterial({color:0xf0c59a})); head.position.set(0,.78,.45); const ear1=new THREE.Mesh(new THREE.SphereGeometry(.18,12,12), new THREE.MeshStandardMaterial({color:0xf0c59a})); ear1.position.set(-.25,1.2,.35); const ear2=ear1.clone(); ear2.position.x=.25; animal.add(body,head,ear1,ear2); animal.position.set(0,1,1); body.castShadow=head.castShadow=ear1.castShadow=ear2.castShadow=true; scene.add(animal);
let vy=0,score=0,over=false,targetX=0; const gravity=.028;
function hop(){ if(animal.position.y<=1.02 && !over){ vy=.36; animal.position.z -= 5; }}
window.addEventListener('keydown',e=>{ if(e.code==='Space') hop(); if(e.code==='ArrowLeft') targetX-=2.4; if(e.code==='ArrowRight') targetX+=2.4;});
window.addEventListener('pointerdown', hop);
document.getElementById('restartBtn').onclick=()=>location.reload();
function hud(){ stats.innerHTML=`<div>Stars: ${score}</div><div>Lane: ${animal.position.x.toFixed(1)}</div>`; }
function animate(){ requestAnimationFrame(animate); if(!over){ targetX=clamp(targetX,-2.5,2.5); animal.position.x += (targetX-animal.position.x)*.18; animal.position.y += vy; vy -= gravity; if(animal.position.y<1) animal.position.y=1, vy=0; animal.rotation.z = -animal.position.x*.05;
    camera.position.x += (animal.position.x-camera.position.x)*.08; camera.position.z = animal.position.z + 11; camera.lookAt(animal.position.x,1.8,animal.position.z-8);
    platforms.forEach((p,i)=>{ if(p.position.z-animal.position.z>10){ p.position.z -= 110; p.position.x=rand(-2.5,2.5); stars[i].position.set(p.position.x,1.4,p.position.z); stars[i].visible=true; } });
    stars.forEach(s=>{ s.rotation.y += .04; if(s.visible && s.position.distanceTo(animal.position) < 1.2){ s.visible=false; score++; } });
    let supported=false; for(const p of platforms){ if(Math.abs(animal.position.z-p.position.z)<2 && Math.abs(animal.position.x-p.position.x)<2){ supported=true; break; } }
    if(!supported && animal.position.y<=1.01){ over=true; help.textContent='Splash! You missed the platform. Press Restart.'; }
  }
  hud(); renderer.render(scene,camera);
}
animate();
