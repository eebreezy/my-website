
import {THREE, makeRenderer, makeScene, makeCamera, addLights, resize, toon, rand} from '../shared/js/engine.js';

const mount = document.getElementById('game');
const renderer = makeRenderer(mount);
const scene = makeScene(0x8de0b6);
const camera = makeCamera(5, 16, 58);
addLights(scene); resize(renderer,camera);

const scoreEl = document.getElementById('scorePill');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

const world = new THREE.Group(); scene.add(world);
const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 40), toon(0x4faa5c));
ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; world.add(ground);

for(let i=0;i<40;i++){
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,1.4,8), toon(0x8d5d2f));
  const top = new THREE.Mesh(new THREE.SphereGeometry(rand(.7,1.2), 16, 16), toon([0x56b85f,0x6acf62,0x7bdc79][i%3]));
  top.position.y=1.25; trunk.castShadow=top.castShadow=true;
  tree.add(trunk,top);
  const a = Math.random()*Math.PI*2, r = rand(8,32);
  tree.position.set(Math.cos(a)*r, .7, Math.sin(a)*r);
  world.add(tree);
}

let balloons=[], score=0, timeLeft=45, started=false, over=false;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function makeBalloon(){
  const group = new THREE.Group();
  const color = [0xff6b6b,0xffcf5b,0x67d7ff,0xb28dff,0x7dff8b][(Math.random()*5)|0];
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.55, 18, 18), toon(color));
  ball.scale.y = 1.18;
  const tie = new THREE.Mesh(new THREE.ConeGeometry(.1,.18,8), toon(color));
  tie.position.y=-.64;
  const line = new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,1.4,6), toon(0xffffff));
  line.position.y=-1.35/2-.65;
  group.add(ball,tie,line);
  group.position.set(rand(-12,12), rand(2.2,10), rand(-12,12));
  group.userData.vy = rand(.5,1.2);
  group.traverse(m=>m.castShadow=true);
  world.add(group); balloons.push(group);
}
function refill(){ while(balloons.length<18) makeBalloon(); }
function reset(){
  score=0; timeLeft=45; started=false; over=false;
  balloons.forEach(b=>world.remove(b)); balloons=[]; refill();
  scoreEl.textContent='Score: 0';
  document.getElementById('goalPill').textContent='Time: 45s';
}
function end(title){
  started=false; over=true;
  overlay.classList.remove('hide');
  overlay.querySelector('h1').textContent=title;
  overlay.querySelector('p').textContent='Pop play to try another balloon round.';
}
function onPointer(ev){
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(balloons, true);
  if(hits.length && started){
    let root = hits[0].object;
    while(root.parent && root.parent!==world) root = root.parent;
    world.remove(root);
    balloons = balloons.filter(b=>b!==root);
    score++; scoreEl.textContent='Score: '+score;
    if(score>=35) end('Safari clear!');
    refill();
  }
}
renderer.domElement.addEventListener('pointerdown', onPointer);
document.querySelector('[data-key="tap"]')?.addEventListener('pointerdown', e=>{});
startBtn.onclick=()=>{ overlay.classList.add('hide'); started=true; };
restartBtn.onclick=()=>{ reset(); overlay.classList.add('hide'); started=true; };

let last=performance.now(), timerAcc=0;
function loop(now){
  const dt = Math.min(.033,(now-last)/1000); last=now;
  if(started && !over){
    timerAcc += dt;
    if(timerAcc>=1){ timerAcc=0; timeLeft--; document.getElementById('goalPill').textContent='Time: '+timeLeft+'s'; if(timeLeft<=0) end(score>=35?'Safari clear!':'Time up!'); }
    balloons.forEach((b,i)=>{
      b.position.y += b.userData.vy*dt;
      b.position.x += Math.sin(now*.001+i)*dt*.6;
      b.rotation.y += dt*.7;
      if(b.position.y>12){ b.position.y=2; b.position.x=rand(-12,12); b.position.z=rand(-12,12); }
    });
    const t = now*.00015;
    camera.position.set(Math.sin(t)*16, 7.5, Math.cos(t)*16);
    camera.lookAt(0,5,0);
  }
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
reset();
requestAnimationFrame(loop);
