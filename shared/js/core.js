import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>Math.random()*(b-a)+a;
const STORAGE_KEY='omfunny_roblox_arcade_scores_v1';

function loadScores(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}} }
function saveScore(key, value){ const s=loadScores(); s[key]=Math.max(s[key]||0, value); localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

function makeBlockCharacter(){
  const g=new THREE.Group();
  const matBody=new THREE.MeshStandardMaterial({color:0x3b82f6});
  const matHead=new THREE.MeshStandardMaterial({color:0xffd7b5});
  const matLimb=new THREE.MeshStandardMaterial({color:0x2563eb});
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.6,.8),matBody); body.position.y=2.2;
  const head=new THREE.Mesh(new THREE.BoxGeometry(.95,.95,.95),matHead); head.position.y=3.55;
  const armL=new THREE.Mesh(new THREE.BoxGeometry(.35,1.1,.35),matLimb); armL.position.set(-.95,2.25,0);
  const armR=armL.clone(); armR.position.x=.95;
  const legL=new THREE.Mesh(new THREE.BoxGeometry(.42,1.2,.42),matLimb); legL.position.set(-.3,1.0,0);
  const legR=legL.clone(); legR.position.x=.3;
  g.add(body,head,armL,armR,legL,legR);
  g.userData={armL,armR,legL,legR};
  return g;
}

function addLights(scene){
  scene.add(new THREE.HemisphereLight(0xffffff,0x335577,1.2));
  const sun=new THREE.DirectionalLight(0xffffff,1.5);
  sun.position.set(12,22,8); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.near=1; sun.shadow.camera.far=70; sun.shadow.camera.left=-30; sun.shadow.camera.right=30; sun.shadow.camera.top=30; sun.shadow.camera.bottom=-30;
  scene.add(sun);
}

function createRenderer(root){
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  root.appendChild(renderer.domElement);
  return renderer;
}

function createSky(scene, colorTop=0x87ceeb, colorBottom=0xe0f2fe){
  scene.fog=new THREE.Fog(colorBottom,35,120);
  scene.background=new THREE.Color(colorTop);
}

function createGround(scene,{size=120,color=0x63c35f, y=0}={}){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(size,1,size), new THREE.MeshStandardMaterial({color}));
  mesh.receiveShadow=true; mesh.position.y=y-.5; scene.add(mesh); return mesh;
}

function makeCoin(color=0xfbbf24){
  const g=new THREE.Group();
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,.18,28), new THREE.MeshStandardMaterial({color,metalness:.5,roughness:.3,emissive:0x553300}));
  mesh.rotation.z=Math.PI/2; mesh.castShadow=true; g.add(mesh); return g;
}

function makeStar(color=0xf472b6){
  const shape=new THREE.Shape();
  for(let i=0;i<5;i++){
    const a=(i/5)*Math.PI*2-Math.PI/2;
    const r= i===0?1:1;
    const x=Math.cos(a)*1.0, y=Math.sin(a)*1.0;
    if(i===0) shape.moveTo(x,y); else shape.lineTo(x,y);
    const ia=a+Math.PI/5;
    shape.lineTo(Math.cos(ia)*.45, Math.sin(ia)*.45);
  }
  shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.25,bevelEnabled:false});
  const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,emissive:0x330011}));
  mesh.scale.set(.35,.35,.35); mesh.castShadow=true; mesh.rotation.x=Math.PI/2;
  return mesh;
}

function makePad(){
  const pad=document.querySelector('.pad');
  const stick=document.querySelector('.stick');
  const state={x:0,y:0,active:false};
  if(!pad||!stick) return state;
  const reset=()=>{state.x=0;state.y=0;state.active=false;stick.style.transform='translate(0px,0px)'};
  const onMove=e=>{
    const t=e.touches?e.touches[0]:e;
    const r=pad.getBoundingClientRect();
    const cx=r.left+r.width/2, cy=r.top+r.height/2;
    let dx=t.clientX-cx, dy=t.clientY-cy;
    const dist=Math.hypot(dx,dy), max=48;
    if(dist>max){dx=dx/dist*max; dy=dy/dist*max;}
    stick.style.transform=`translate(${dx}px,${dy}px)`;
    state.x=clamp(dx/max,-1,1); state.y=clamp(dy/max,-1,1); state.active=true;
  };
  pad.addEventListener('touchstart', onMove,{passive:true});
  pad.addEventListener('touchmove', onMove,{passive:true});
  pad.addEventListener('touchend', reset);
  pad.addEventListener('mousedown', e=>{onMove(e); const mm=ev=>onMove(ev); const mu=()=>{window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu);reset();}; window.addEventListener('mousemove',mm); window.addEventListener('mouseup',mu);});
  return state;
}

export function initGame(config){
  const root=document.getElementById('game-root');
  const canvasWrap=root.querySelector('.canvas-wrap');
  const renderer=createRenderer(canvasWrap);
  const scene=new THREE.Scene();
  createSky(scene, config.skyTop, config.skyBottom);
  addLights(scene);
  const camera=new THREE.PerspectiveCamera(65,1,.1,250);
  const player=makeBlockCharacter();
  player.position.set(config.start?.x||0,2,config.start?.z||0);
  scene.add(player);
  const playerRadius=.6;
  const cameraPivot=new THREE.Object3D(); scene.add(cameraPivot);
  createGround(scene, config.ground||{});
  const world={coins:[], hazards:[], goals:[], boosts:[], moving:[], solids:[], decor:[], extraState:{}};
  const updaters=[];

  const key={};
  window.addEventListener('keydown',e=>key[e.code]=true);
  window.addEventListener('keyup',e=>key[e.code]=false);
  const padState=makePad();
  document.querySelector('.jump')?.addEventListener('click',()=>key.Space=true);
  document.querySelector('.jump')?.addEventListener('touchstart',()=>key.Space=true,{passive:true});
  document.querySelector('.jump')?.addEventListener('touchend',()=>key.Space=false,{passive:true});

  const scoreEl=document.getElementById('score');
  const goalEl=document.getElementById('goal');
  const statusEl=document.getElementById('status');
  const bestEl=document.getElementById('best');
  const modal=document.getElementById('message');
  const modalTitle=document.getElementById('message-title');
  const modalText=document.getElementById('message-text');
  const restartBtn=document.getElementById('restart');
  const restartModalBtn=document.getElementById('restart-modal');
  const nextBtn=document.getElementById('back-home');
  document.getElementById('title').textContent=config.title;
  goalEl.textContent=config.goalText;
  const bestScores=loadScores(); bestEl.textContent=bestScores[config.id]||0;

  const state={score:0,status:'Playing',time:0,vx:0,vz:0,vy:0,onGround:false,canDouble:false,finished:false};
  scoreEl.textContent='0'; statusEl.textContent=state.status;

  function addSolid(mesh){ world.solids.push(mesh); scene.add(mesh); return mesh; }
  function addCoin(pos){ const c=makeCoin(config.coinColor); c.position.copy(pos); world.coins.push(c); scene.add(c); return c; }
  function addGoal(mesh){ mesh.userData.goal=true; world.goals.push(mesh); scene.add(mesh); return mesh; }
  function addHazard(mesh){ mesh.userData.hazard=true; world.hazards.push(mesh); scene.add(mesh); return mesh; }
  function addBoost(mesh){ world.boosts.push(mesh); scene.add(mesh); return mesh; }
  function addUpdater(fn){ updaters.push(fn); }

  const api={THREE,scene,camera,player,state,world,addSolid,addCoin,addGoal,addHazard,addBoost,addUpdater,rand,makeStar,makeCoin};
  config.build(api);

  function resize(){
    const w=canvasWrap.clientWidth,h=canvasWrap.clientHeight;
    camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false);
  }
  window.addEventListener('resize',resize); resize();

  function showMessage(title,text,win=false){
    modalTitle.textContent=title; modalText.textContent=text; modal.classList.remove('hidden');
    nextBtn.classList.toggle('hidden', !win);
  }

  function finish(win,text){
    if(state.finished) return; state.finished=true; state.status=win?'You Win!':'Try Again'; statusEl.textContent=state.status;
    if(win){ saveScore(config.id, state.score); bestEl.textContent=loadScores()[config.id]||0; }
    showMessage(state.status, text, win);
  }

  function reset(){ window.location.reload(); }
  restartBtn?.addEventListener('click', reset);
  restartModalBtn?.addEventListener('click', reset);
  nextBtn.addEventListener('click', ()=>window.location.href='../../index.html');

  const pBox=new THREE.Box3();
  const objBox=new THREE.Box3();
  const clock=new THREE.Clock();

  function updateAnimation(speed,dt){
    const limb=player.userData; const s=Math.sin(state.time*10*speed)*0.8;
    limb.armL.rotation.x=s; limb.armR.rotation.x=-s; limb.legL.rotation.x=-s; limb.legR.rotation.x=s;
  }

  function moveCamera(){
    const target=player.position.clone();
    const camOffset=new THREE.Vector3(0,5.8,8.8).applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);
    camera.position.lerp(target.clone().add(camOffset), .12);
    camera.lookAt(target.x,target.y+1.8,target.z);
  }

  function intersects(a,b){ pBox.setFromObject(a); objBox.setFromObject(b); return pBox.intersectsBox(objBox); }

  function loop(){
    const dt=Math.min(clock.getDelta(),0.033); state.time+=dt;
    const moveX=(key.KeyD?1:0)-(key.KeyA?1:0) + padState.x;
    const moveZ=(key.KeyS?1:0)-(key.KeyW?1:0) + padState.y;
    const len=Math.hypot(moveX,moveZ)||1;
    const speed=config.speed||7;
    state.vx=(moveX/len)*speed; state.vz=(moveZ/len)*speed;
    if(Math.abs(moveX)+Math.abs(moveZ)>.12){ player.rotation.y=Math.atan2(state.vx,state.vz); }
    if((key.Space||key.Numpad0) && (state.onGround || state.canDouble)){
      state.vy=config.jump||9;
      if(!state.onGround) state.canDouble=false;
      state.onGround=false; key.Space=false;
    }
    state.vy-=20*dt;
    player.position.x+=state.vx*dt;
    player.position.z+=state.vz*dt;
    player.position.y+=state.vy*dt;

    const floorY=(config.floorY??1.5);
    let landed=false;
    if(player.position.y<=floorY){ player.position.y=floorY; state.vy=0; landed=true; }
    for(const solid of world.solids){
      const box=new THREE.Box3().setFromObject(solid);
      const half=playerRadius;
      const withinX = player.position.x + half > box.min.x && player.position.x - half < box.max.x;
      const withinZ = player.position.z + half > box.min.z && player.position.z - half < box.max.z;
      const top = box.max.y;
      const nearTop = player.position.y >= top-1.4 && player.position.y <= top+1.1;
      if(withinX && withinZ && nearTop && state.vy <= 2){
        if(player.position.y <= top + 0.85){
          player.position.y = top + 0.5;
          state.vy = 0;
          landed = true;
        }
      }
    }
    state.onGround = landed;
    if(landed) state.canDouble=true;
    if(player.position.y<-15){ finish(false,'You fell out of the map. Tap restart and try again.'); }

    world.coins.forEach((coin,i)=>{ if(!coin.visible) return; coin.rotation.y+=dt*6; coin.position.y += Math.sin(state.time*4 + i)*dt*.25; if(intersects(player,coin)){ coin.visible=false; state.score+=10; scoreEl.textContent=state.score; } });
    world.hazards.forEach(h=>{ if(intersects(player,h)){ finish(false, config.failText || 'A hazard got you. Try again.'); } });
    world.goals.forEach(g=>{ if(!state.finished && intersects(player,g)){ finish(true, config.winText || 'Nice job! You cleared the challenge.'); } });
    world.boosts.forEach(b=>{ if(intersects(player,b)){ state.vy=Math.max(state.vy, config.jumpBoost||14); } });
    updaters.forEach(fn=>fn(dt, api));
    updateAnimation(Math.hypot(state.vx,state.vz)/speed,dt);
    moveCamera();
    renderer.render(scene,camera);
    if(!state.finished) requestAnimationFrame(loop);
  }
  loop();
}
