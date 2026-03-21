
import {THREE, makeRenderer, makeScene, makeCamera, addLights, resize, toon, clamp, rand} from '../shared/js/engine.js';

const mount = document.getElementById('game');
const renderer = makeRenderer(mount);
const scene = makeScene(0x95d8ff);
const camera = makeCamera(5, 10, 62);
addLights(scene);
resize(renderer, camera);

const scoreEl = document.getElementById('scorePill');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const toast = document.getElementById('toast');

let started = false, over = false, score = 0, speed = 18, lane = 0, vy = 0;
const pressed = {left:false,right:false,jump:false};

document.querySelectorAll('.touch-btn').forEach(btn=>{
  btn.onpointerdown=()=>pressed[btn.dataset.key]=true;
  btn.onpointerup=()=>pressed[btn.dataset.key]=false;
  btn.onpointerleave=()=>pressed[btn.dataset.key]=false;
});
addEventListener('keydown',e=>{
  if(e.code==='ArrowLeft') pressed.left=true;
  if(e.code==='ArrowRight') pressed.right=true;
  if(e.code==='Space') pressed.jump=true;
});
addEventListener('keyup',e=>{
  if(e.code==='ArrowLeft') pressed.left=false;
  if(e.code==='ArrowRight') pressed.right=false;
  if(e.code==='Space') pressed.jump=false;
});

const world = new THREE.Group(); scene.add(world);

const groundGeo = new THREE.BoxGeometry(3.2, .6, 12);
for(let i=0;i<18;i++){
  const tile = new THREE.Mesh(groundGeo, toon(i%2?0x6bcf73:0x60c6ff));
  tile.position.set(0,-0.3,-i*12);
  tile.receiveShadow = true;
  world.add(tile);
}
for(let x of [-4,4]){
  for(let i=0;i<18;i++){
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(rand(.5,1.1), 16, 16), toon(0xffffff));
    cloud.position.set(x + rand(-1,1), rand(3,8), -i*14 + rand(-3,3));
    world.add(cloud);
  }
}

const player = new THREE.Group();
const body = new THREE.Mesh(new THREE.CapsuleGeometry(.7,1.6,8,16), toon(0xffce55));
body.castShadow = true;
player.add(body);
const eye1 = new THREE.Mesh(new THREE.SphereGeometry(.08,8,8), toon(0x111111));
const eye2 = eye1.clone();
eye1.position.set(-.18,.42,.61); eye2.position.set(.18,.42,.61); player.add(eye1, eye2);
player.position.set(0,1.3,3.5);
scene.add(player);

let obstacles=[], coins=[];

function addObstacle(z){
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.1, rand(1.2,2.5), 2.1), toon(0xff7b7b));
  box.castShadow = true;
  box.position.set([-2.8,0,2.8][(Math.random()*3)|0], box.geometry.parameters.height/2, z);
  world.add(box);
  obstacles.push(box);
}
function addCoin(z){
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.45), toon(0xffef84));
  gem.position.set([-2.8,0,2.8][(Math.random()*3)|0], rand(1.4,2.8), z);
  gem.castShadow = true;
  world.add(gem);
  coins.push(gem);
}
for(let i=3;i<36;i++){ if(Math.random()<.75) addObstacle(-i*10); if(Math.random()<.9) addCoin(-i*8 - 4); }

function reset(){
  score=0; speed=18; lane=0; vy=0; over=false;
  player.position.set(0,1.3,3.5); player.rotation.set(0,0,0);
  obstacles.forEach(o=>world.remove(o)); coins.forEach(c=>world.remove(c)); obstacles=[]; coins=[];
  for(let i=3;i<40;i++){ if(Math.random()<.76) addObstacle(-i*10); if(Math.random()<.92) addCoin(-i*8 - 4); }
  scoreEl.textContent='Score: 0';
}
function end(msg){
  over=true; started=false;
  overlay.classList.remove('hide');
  overlay.querySelector('h1').textContent = msg;
  overlay.querySelector('p').textContent = 'Tap play to run again.';
}
function flash(msg){
  toast.textContent=msg; toast.classList.remove('hide');
  clearTimeout(flash.t); flash.t = setTimeout(()=>toast.classList.add('hide'),1200);
}

startBtn.onclick=()=>{ overlay.classList.add('hide'); started=true; over=false; };
restartBtn.onclick=()=>{ reset(); overlay.classList.add('hide'); started=true; };

let last=performance.now();
function loop(now){
  const dt = Math.min(.033, (now-last)/1000); last=now;
  if(started && !over){
    if(pressed.left) lane = Math.max(-1, lane-1), pressed.left=false;
    if(pressed.right) lane = Math.min(1, lane+1), pressed.right=false;
    if(pressed.jump && player.position.y<=1.31){ vy=9; pressed.jump=false; }
    player.position.x += (lane*2.8 - player.position.x)*Math.min(1, dt*10);
    vy -= 20*dt;
    player.position.y = Math.max(1.3, player.position.y + vy*dt);
    if(player.position.y===1.3) vy = Math.max(0, vy);
    speed += dt*.12;

    world.children.forEach(obj=>{
      if(obj!==player) obj.position.z += speed*dt;
      if(obj.geometry?.type==='OctahedronGeometry') obj.rotation.y += dt*3;
    });

    obstacles.forEach(o=>{
      if(o.position.z > 10){ o.position.z -= 420; o.position.x=[-2.8,0,2.8][(Math.random()*3)|0]; o.position.y=o.geometry.parameters.height/2; }
      if(Math.abs(o.position.z-player.position.z)<1.4 && Math.abs(o.position.x-player.position.x)<1.25 && player.position.y<o.geometry.parameters.height+.8){
        flash('Oops!');
        end('Try again!');
      }
    });
    coins.forEach(c=>{
      if(c.position.z > 10){ c.position.z -= 320; c.position.x=[-2.8,0,2.8][(Math.random()*3)|0]; c.position.y=rand(1.4,2.8); c.visible=true; }
      if(c.visible && c.position.distanceTo(player.position)<1){
        c.visible=false; score++; scoreEl.textContent='Score: '+score; flash('+1 star');
        if(score>=60) end('You won!');
      }
    });

    camera.position.x += (player.position.x - camera.position.x)*dt*3;
    camera.position.y += ((4.6 + Math.max(0, player.position.y-1.3)*.35) - camera.position.y)*dt*2.6;
    camera.lookAt(player.position.x, 1.9, -1.5);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
reset();
requestAnimationFrame(loop);
