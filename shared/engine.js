
import { GAMES } from './config.js';

const qs = new URLSearchParams(location.search);
const slug = qs.get('g') || location.pathname.split('/').slice(-2,-1)[0] || Object.keys(GAMES)[0];
const meta = GAMES[slug] || Object.values(GAMES)[0];

const app = document.getElementById('game');
app.innerHTML = `
<canvas id="c"></canvas>
<div class="hud">
  <div class="pill grow"><div class="title">${meta.title}</div><div class="sub">Mobile only • Touch controls • Tap Play to unlock sound</div></div>
  <div class="pill stat"><div class="label">Score</div><div class="value" id="score">0</div></div>
  <div class="pill stat"><div class="label">Best</div><div class="value" id="best">0</div></div>
</div>
<div class="msg" id="msg"></div>
<a class="home" href="../../index.html">Home</a>
<div class="mobile-note">Touch left pad to move • right buttons to act</div>
<div class="bottom">
 <div class="dpad">
  <div class="stack"><button class="ctl small" data-k="up">▲</button><div style="display:flex;gap:10px"><button class="ctl" data-k="left">◀</button><button class="ctl" data-k="down">▼</button><button class="ctl" data-k="right">▶</button></div></div>
 </div>
 <div class="actions"><div class="stack"><button class="ctl wide small" data-k="jump">JUMP</button><button class="ctl wide" data-k="action">GO</button></div></div>
</div>
<div class="overlay" id="overlay"><div class="modal"><h2>${meta.title}</h2><p>${instructions(meta.mode)}</p><div class="tip">Tip: ${tip(meta.mode)}</div><div class="btns"><button class="btn primary" id="playBtn">Play</button><button class="btn secondary" id="muteBtn">Sound On</button></div></div></div>`;

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const msgEl = document.getElementById('msg');
const overlay = document.getElementById('overlay');
const muteBtn = document.getElementById('muteBtn');
const playBtn = document.getElementById('playBtn');
const bestKey = 'best_'+slug;
bestEl.textContent = localStorage.getItem(bestKey)||'0';

const state = {
  w: innerWidth, h: innerHeight, score:0, t:0, over:false, started:false,
  input: {left:false,right:false,up:false,down:false,action:false,jump:false},
  press: {left:false,right:false,up:false,down:false,action:false,jump:false},
  audio: createAudio(), entities: [], particles: [], stars: [],
  player: {}, extra: {}, lastTime:0, msgTimer:0,
};
for(let i=0;i<100;i++) state.stars.push({x:Math.random(), y:Math.random(), z:Math.random()*1+.2});

function resize(){ state.w = canvas.width = innerWidth * devicePixelRatio; state.h = canvas.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); }
addEventListener('resize', resize, {passive:true}); resize();

function pulseMessage(text){ msgEl.textContent=text; msgEl.classList.add('show'); clearTimeout(state.msgTimer); state.msgTimer=setTimeout(()=>msgEl.classList.remove('show'), 1000); }
function setBest(){ const v=Math.max(+localStorage.getItem(bestKey)||0, Math.floor(state.score)); localStorage.setItem(bestKey, String(v)); bestEl.textContent=String(v); }
function setScore(v){ state.score=v; scoreEl.textContent=String(Math.max(0,Math.floor(v))); }
function addScore(v){ setScore(state.score+v); }
function resetPress(){ for(const k in state.press) state.press[k]=false; }

function bindControls(){
  const set = (key,val) => { if(val && !state.input[key]) state.press[key]=true; state.input[key]=val; };
  document.querySelectorAll('[data-k]').forEach(btn=>{
    const k = btn.dataset.k;
    const down = e=>{ e.preventDefault(); state.audio.unlock(); set(k,true); btn.style.transform='scale(.96)'; };
    const up = e=>{ e.preventDefault(); set(k,false); btn.style.transform=''; };
    btn.addEventListener('pointerdown', down, {passive:false});
    btn.addEventListener('pointerup', up, {passive:false});
    btn.addEventListener('pointercancel', up, {passive:false});
    btn.addEventListener('pointerleave', up, {passive:false});
    btn.addEventListener('contextmenu', e=>e.preventDefault());
  });
  canvas.addEventListener('pointerdown', e=>{ state.audio.unlock(); state.press.action = !state.input.action; state.input.action=true; }, {passive:true});
  canvas.addEventListener('pointerup', e=>{ state.input.action=false; }, {passive:true});
}
bindControls();
playBtn.onclick = ()=>{ state.audio.unlock(); overlay.classList.add('hidden'); state.started=true; startGame(); };
muteBtn.onclick = ()=>{ state.audio.muted=!state.audio.muted; muteBtn.textContent = state.audio.muted ? 'Sound Off' : 'Sound On'; };

function startGame(){ setScore(0); state.t=0; state.over=false; state.entities=[]; state.particles=[]; state.extra={spawn:0, lane:1, memoryStep:0, sequence:[], phase:'play'}; state.player={x:0,y:0,z:0,lane:1,vy:0,ground:true,charge:0,angle:0,size:18,color:'#78e7ff',lives:3}; initMode(meta.mode); }
function gameOver(reason='Game over'){ if(state.over) return; state.over=true; setBest(); pulseMessage(reason); state.audio.fail(); setTimeout(()=>{ overlay.classList.remove('hidden'); playBtn.textContent='Play Again'; }, 850); }

function instructions(mode){
 const map = {
  runner:'Tap left or right to switch lanes. Jump over walls and grab rings.', hoop:'Use left/right to line up and tap GO to shoot the ball.', stack:'Tap GO when the moving block is centered to stack higher.', dodge:'Switch lanes to avoid meteors. Survive as long as possible.', switch:'Flip toward the glowing color lane. Wrong color hurts your score.', aim:'Move crosshair with arrows and tap GO to burst targets.', drift:'Steer through gates and keep your speed alive.', bridge:'Switch to the matching bridge color before landing.', orbit:'Catch orbs while rotating around the core.', balance:'Tap left/right to keep the tower centered.', memory:'Watch the crystal pattern then repeat it with directions.', fuel:'Collect fuel canisters and avoid dry zones.', rhythm:'Tap GO on the beat for combo points.', miner:'Move and collect asteroids before they leave range.', sort:'Send prisms left or right into matching bins.', golf:'Aim the shot and tap GO to putt into the hole.', rescue:'Guide the drone to survivors and back home.', surfer:'Ride the wave and dodge foam spikes.', portal:'Dash through the safe portal color only.', maze:'Slide until you hit a wall, then find the exit.', cannon:'Aim the cannon and pop floating targets.', shield:'Rotate around the center to block red shards.', collector:'Use your magnet to pull coins and avoid bombs.', shadow:'Match the 3D shape to its shadow lane.', lava:'Hop between cool tiles before lava rises.', rail:'Lean left or right on the rail and jump barriers.', bubble:'Pop only the marked bubble depth color.', chef:'Catch the right ingredients in order.', builder:'Drop modules neatly to build higher.', pinball:'Use left and right flippers to keep the star ball alive.'
 };
 return map[mode] || 'Use touch controls to move and score points.';
}
function tip(mode){
 const tips = {runner:'Stay in the middle lane unless a wall is coming.',hoop:'Shoot at the top of the rise for perfect arcs.',stack:'Short taps work best.',dodge:'Middle lane is safest between waves.',switch:'Watch the floor glow, not the gem.',aim:'Small moves beat wild swings.',drift:'Tap instead of holding for cleaner turns.',bridge:'Decide early, not late.',orbit:'Collect in streaks for extra points.',balance:'Counter quickly before it leans too far.',memory:'Say the pattern out loud in your head.',fuel:'Fuel matters more than score early.',rhythm:'Listen for the click track.',miner:'Prioritize the bright rocks.',sort:'Read the bin color first.',golf:'Half power is usually enough.',rescue:'One survivor at a time is safer.',surfer:'Tap against the drift.',portal:'The outline color is the rule.',maze:'Corners save moves.',cannon:'Lead the target a little.',shield:'Move early and stay smooth.',collector:'Don’t chase every coin.',shadow:'Compare top edges first.',lava:'Keep moving—standing still loses tiles.',rail:'Gentle leans beat full holds.',bubble:'Depth color changes after each chain.',chef:'Memorize the next ingredient in line.',builder:'Centering beats speed.',pinball:'Use one flipper at a time.'};
 return tips[mode] || 'Fast restarts help you improve.';
}

function createAudio(){
 let ac = null; const api = { muted:false, unlock, tone, click, coin, jump, hit, fail };
 function unlock(){ if(!ac){ ac = new (window.AudioContext||window.webkitAudioContext)(); } if(ac.state==='suspended') ac.resume(); }
 function tone(f=440,d=.08,type='sine',vol=.04){ if(api.muted||!ac) return; const t=ac.currentTime; const o=ac.createOscillator(); const g=ac.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+.01); g.gain.exponentialRampToValueAtTime(0.0001,t+d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+d+.02); }
 function click(){ tone(520,.05,'triangle',.03);} function coin(){ [700,880].forEach((f,i)=>setTimeout(()=>tone(f,.05,'triangle',.035),i*35)); } function jump(){ tone(310,.08,'square',.03); setTimeout(()=>tone(460,.07,'triangle',.025),35);} function hit(){ tone(180,.11,'sawtooth',.035);} function fail(){ tone(180,.12,'square',.04); setTimeout(()=>tone(120,.18,'sawtooth',.03),100);} return api;
}

function laneX(lane){ return [-110,0,110][Math.max(0,Math.min(2,lane))]; }
function p2(x,y,z){ const horizon = 110; const scale = 1/(1+z*0.015); return { x: innerWidth/2 + x*scale, y: horizon + y*scale + z*0.9, s:scale }; }
function rect3d(x,y,z,w,h,color,depth=26){ const a=p2(x-w/2,y-h,z), b=p2(x+w/2,y-h,z), c=p2(x+w/2,y+h,z), d=p2(x-w/2,y+h,z); ctx.fillStyle=shade(color,-.18); poly([a,b,c,d]); const a2=p2(x-w/2,y-h,z+depth), b2=p2(x+w/2,y-h,z+depth), c2=p2(x+w/2,y+h,z+depth), d2=p2(x-w/2,y+h,z+depth); ctx.fillStyle=shade(color,.1); poly([a,b,b2,a2]); ctx.fillStyle=shade(color,.18); poly([b,c,c2,b2]); ctx.fillStyle=color; poly([a2,b2,c2,d2]); }
function poly(points){ ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); for(let i=1;i<points.length;i++) ctx.lineTo(points[i].x, points[i].y); ctx.closePath(); ctx.fill(); }
function shade(hex,amt){ const c = hex.startsWith('#')?hex.slice(1):hex; let n=parseInt(c,16), r=(n>>16)&255,g=(n>>8)&255,b=n&255; r=Math.max(0,Math.min(255,r+255*amt)); g=Math.max(0,Math.min(255,g+255*amt)); b=Math.max(0,Math.min(255,b+255*amt)); return `rgb(${r|0},${g|0},${b|0})`; }
function circle3d(x,y,z,r,color){ const p=p2(x,y,z); const rr = Math.max(3, r*p.s); const g=ctx.createRadialGradient(p.x-r*0.25*p.s,p.y-r*0.3*p.s,rr*0.2,p.x,p.y,rr); g.addColorStop(0,shade(color,.25)); g.addColorStop(1,shade(color,-.2)); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,rr,0,Math.PI*2); ctx.fill(); }
function drawWorld(){
 ctx.clearRect(0,0,innerWidth,innerHeight);
 const sky=ctx.createLinearGradient(0,0,0,innerHeight); sky.addColorStop(0,'#173860'); sky.addColorStop(.45,'#0c1c32'); sky.addColorStop(1,'#050b16'); ctx.fillStyle=sky; ctx.fillRect(0,0,innerWidth,innerHeight);
 for(const s of state.stars){ const x=s.x*innerWidth, y=s.y*innerHeight*.58; ctx.fillStyle='rgba(255,255,255,'+(0.25+s.z*0.6)+')'; ctx.fillRect(x,y,1.2+s.z*1.2,1.2+s.z*1.2); }
 // floor perspective lanes
 for(let z=0; z<740; z+=34){ const p1=p2(-180,210,z), p2b=p2(180,210,z), p3=p2(200,250,z+34), p4=p2(-200,250,z+34); ctx.fillStyle = (z/34)%2 ? 'rgba(17,30,52,.72)' : 'rgba(10,20,36,.78)'; poly([p1,p2b,p3,p4]); }
 // lane markers
 [ -70, 70 ].forEach(x=>{ ctx.strokeStyle='rgba(140,220,255,.18)'; ctx.lineWidth=2; ctx.beginPath(); for(let z=0;z<720;z+=18){ const a=p2(x,210,z), b=p2(x,248,z+10); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);} ctx.stroke(); });
}
function drawPlayer(){ const p=state.player; rect3d(p.x,185-p.y,p.z,34,34,p.color,22); circle3d(p.x,150-p.y,p.z,14,'#ffd873'); }
function spawnBurst(x,y,z,color='#7ef7b8'){ for(let i=0;i<12;i++) state.particles.push({x,y,z,vx:(Math.random()-.5)*80,vy:(Math.random()-.5)*80,vz:(Math.random()-.5)*60,life:.6+Math.random()*.4,color}); }
function updateParticles(dt){ state.particles = state.particles.filter(p=> (p.life-=dt)>0); for(const p of state.particles){ p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt; circle3d(p.x,p.y,p.z,4*p.life,p.color); } }

function initMode(mode){
 const p=state.player; p.x=0;p.y=0;p.z=20;p.lane=1;p.vy=0;p.ground=true;p.angle=0;p.color='#78e7ff';
 if(mode==='memory'){ buildSequence(); }
 if(mode==='maze'){ state.extra.mx=0; state.extra.my=0; state.extra.maze=[[0,0],[1,0],[-1,0],[-1,1],[0,1],[1,1],[1,2],[0,2],[-1,2]]; }
 if(mode==='builder' || mode==='stack' || mode==='balance'){ state.extra.offset=0; state.extra.dir=1; state.extra.height=0; }
 if(mode==='pinball'){ state.player.ball={x:0,y:100,vx:120,vy:-30,r:12}; }
}
function buildSequence(){ state.extra.sequence = Array.from({length:4+Math.floor(Math.random()*3)},()=> ['left','right','up','down'][Math.floor(Math.random()*4)]); state.extra.showIndex=0; state.extra.showTimer=0; state.extra.inputIndex=0; state.extra.phase='show'; }

function update(dt){ if(!state.started){ requestAnimationFrame(loop); return; } state.t += dt; drawWorld(); if(!state.over) runMode(meta.mode, dt); updateParticles(dt); if(meta.mode!=='pinball') drawPlayer(); resetPress(); requestAnimationFrame(loop); }
function loop(ts){ const dt=Math.min(.033, ((ts||0)-state.lastTime)/1000 || .016); state.lastTime=ts||0; update(dt); }
requestAnimationFrame(loop);

function runMode(mode,dt){
 const p=state.player, ex=state.extra, input=state.input, press=state.press;
 // universal movement helpers
 if(mode==='runner' || mode==='dodge' || mode==='switch' || mode==='bridge' || mode==='fuel' || mode==='portal' || mode==='shadow' || mode==='lava' || mode==='rail'){
   if(press.left) p.lane=Math.max(0,p.lane-1), state.audio.click();
   if(press.right) p.lane=Math.min(2,p.lane+1), state.audio.click();
   p.x += (laneX(p.lane)-p.x)*Math.min(1,dt*10);
 }
 if(press.jump && p.ground){ p.vy=260; p.ground=false; state.audio.jump(); }
 if(!p.ground){ p.y += p.vy*dt; p.vy -= 580*dt; if(p.y<=0){ p.y=0; p.vy=0; p.ground=true; } }

 switch(mode){
  case 'runner': return modeRunner(dt,false);
  case 'dodge': return modeRunner(dt,true);
  case 'switch': return modeSwitch(dt,false);
  case 'bridge': return modeSwitch(dt,true);
  case 'hoop': return modeHoop(dt);
  case 'stack': return modeStack(dt,false);
  case 'balance': return modeStack(dt,true);
  case 'aim': return modeAim(dt);
  case 'drift': return modeDrift(dt);
  case 'orbit': return modeOrbit(dt);
  case 'memory': return modeMemory(dt);
  case 'fuel': return modeFuel(dt);
  case 'rhythm': return modeRhythm(dt);
  case 'miner': return modeMiner(dt);
  case 'sort': return modeSort(dt);
  case 'golf': return modeGolf(dt);
  case 'rescue': return modeRescue(dt);
  case 'surfer': return modeSurfer(dt);
  case 'portal': return modePortal(dt);
  case 'maze': return modeMaze(dt);
  case 'cannon': return modeCannon(dt);
  case 'shield': return modeShield(dt);
  case 'collector': return modeCollector(dt);
  case 'shadow': return modeShadow(dt);
  case 'lava': return modeLava(dt);
  case 'rail': return modeRail(dt);
  case 'bubble': return modeBubble(dt);
  case 'chef': return modeChef(dt);
  case 'builder': return modeBuilder(dt);
  case 'pinball': return modePinball(dt);
 }
}

function modeRunner(dt, meteors){ const ex=state.extra,p=state.player; ex.spawn=(ex.spawn||0)-dt; if(ex.spawn<=0){ ex.spawn=.48-Math.min(.22,state.score*0.004); const lane=Math.floor(Math.random()*3); const kind = Math.random()<0.66 ? 'wall':'ring'; state.entities.push({lane,z:0,kind}); }
 for(const e of state.entities) e.z += (meteors?520:460)*dt;
 state.entities = state.entities.filter(e=>e.z<760);
 for(const e of state.entities){ const x=laneX(e.lane); if(e.kind==='wall'){ rect3d(x,175,e.z,48,58, meteors ? '#ff795e' : '#ff6f7e'); if(e.z>620 && e.z<700 && e.lane===p.lane && p.y<28) return gameOver(meteors?'Meteor smashed you':'You hit a wall'); }
 else { circle3d(x,145,e.z,18,'#ffd45b'); if(e.z>620 && e.z<700 && e.lane===p.lane){ addScore(1); state.audio.coin(); spawnBurst(x,145,e.z,'#ffd45b'); e.z=999; } }
 }
 addScore(dt*2.3); }

function modeSwitch(dt, bridge){ const ex=state.extra,p=state.player; ex.spawn=(ex.spawn||0)-dt; ex.goal = ex.goal || Math.floor(Math.random()*3); if(ex.spawn<=0){ ex.spawn=.9; ex.goal=Math.floor(Math.random()*3); }
 for(let i=0;i<3;i++){ rect3d(laneX(i),205,460,98,18, i===ex.goal ? '#65f2b0' : (bridge? '#7e8cff' : '#4d6a8f')); }
 circle3d(laneX(ex.goal),145,260,18, bridge? '#7e8cff' : '#65f2b0');
 ex.timer=(ex.timer||0)+dt; if(ex.timer>1.2){ ex.timer=0; if(p.lane===ex.goal){ addScore(3); state.audio.coin(); } else { addScore(-2); state.audio.hit(); pulseMessage('Wrong lane'); } }
 }

function modeHoop(dt){ const ex=state.extra,p=state.player; ex.aim = (ex.aim||0) + dt*1.8; p.x += (((state.input.left?-1:0)+(state.input.right?1:0))*120 - p.x)*Math.min(1,dt*5); rect3d(0,160,260,120,10,'#ff9c5e'); circle3d(0,145,260,22,'#ffcf57'); circle3d(p.x,195,640,16,'#78e7ff'); if(state.press.action){ const perfect = Math.abs(p.x) < 28; addScore(perfect?3:1); state.audio[perfect?'coin':'click'](); spawnBurst(p.x,160,320, perfect?'#7ef7b8':'#78e7ff'); } }

function modeStack(dt,balance){ const ex=state.extra; ex.offset += ex.dir*dt*220*(1+state.score*.01); if(Math.abs(ex.offset)>120) ex.dir*=-1; rect3d(0,220-(ex.height||0)*18,420,110,18,'#234d7a'); if(ex.height) for(let i=0;i<ex.height;i++) rect3d(ex.tilt||0,220-i*18,420,110,18,balance?'#8dffc4':'#6ec6ff'); rect3d(ex.offset,220-(ex.height||0)*18-18,420,110,18,balance?'#ffd268':'#ff8e70'); if(state.press.action){ const off=Math.abs(ex.offset-(ex.tilt||0)); if(off<26){ ex.height=(ex.height||0)+1; addScore(2); state.audio.coin(); if(balance) ex.tilt=(ex.tilt||0)+(Math.random()-.5)*16; } else if(balance){ ex.tilt=(ex.tilt||0)+(ex.offset-(ex.tilt||0))*0.2; addScore(1); state.audio.click(); if(Math.abs(ex.tilt)>110) gameOver('Tower toppled'); } else { gameOver('Bad drop'); } ex.offset=0; } }

function modeAim(dt){ const ex=state.extra; ex.cx=(ex.cx||0)+((state.input.left?-1:0)+(state.input.right?1:0))*dt*180; ex.cy=(ex.cy||0)+((state.input.up?-1:0)+(state.input.down?1:0))*dt*160; ex.cx=Math.max(-150,Math.min(150,ex.cx)); ex.cy=Math.max(-80,Math.min(140,ex.cy)); ex.spawn=(ex.spawn||0)-dt; if(ex.spawn<=0){ ex.spawn=.7; state.entities.push({x:(Math.random()-.5)*260,y:90+Math.random()*120,z:180+Math.random()*220,life:3}); }
 state.entities=state.entities.filter(t=> (t.life-=dt)>0); for(const t of state.entities) circle3d(t.x,t.y,t.z,18,'#ff7a84'); const c=p2(ex.cx,ex.cy,520); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(c.x,c.y,20,0,Math.PI*2); ctx.moveTo(c.x-28,c.y); ctx.lineTo(c.x+28,c.y); ctx.moveTo(c.x,c.y-28); ctx.lineTo(c.x,c.y+28); ctx.stroke(); if(state.press.action){ state.audio.click(); for(const t of state.entities){ if(Math.abs(t.x-ex.cx)<28 && Math.abs(t.y-ex.cy)<28){ t.life=-1; addScore(2); state.audio.coin(); spawnBurst(t.x,t.y,t.z,'#ff7a84'); } } }
 }

function modeDrift(dt){ const ex=state.extra,p=state.player; p.x += (((state.input.left?-1:0)+(state.input.right?1:0))*150 - p.x)*Math.min(1,dt*5); ex.gateZ=(ex.gateZ||200)+dt*280; ex.gap = ex.gap ?? 0; if(ex.gateZ>720){ ex.gateZ=180; ex.gap=(Math.random()-.5)*180; addScore(1); }
 rect3d(ex.gap-110,170,ex.gateZ,70,110,'#ff7a84'); rect3d(ex.gap+110,170,ex.gateZ,70,110,'#ff7a84'); rect3d(p.x,192,640,50,24,'#78e7ff'); if(ex.gateZ>620 && Math.abs(p.x-ex.gap)>58) gameOver('Missed the gate'); }

function modeOrbit(dt){ const ex=state.extra; ex.a=(ex.a||0)+dt*2.2*((state.input.left?-1:0)+(state.input.right?1:0)); circle3d(0,150,420,38,'#7e8cff'); ex.spawn=(ex.spawn||0)-dt; if(ex.spawn<=0){ ex.spawn=.8; state.entities.push({a:Math.random()*Math.PI*2,life:4}); }
 state.entities=state.entities.filter(o=> (o.life-=dt)>0); const px=Math.cos(ex.a)*110, py=150+Math.sin(ex.a)*54; circle3d(px,py,420,18,'#78e7ff'); for(const o of state.entities){ const ox=Math.cos(o.a)*110, oy=150+Math.sin(o.a)*54; circle3d(ox,oy,420,14,'#ffd45b'); if(Math.hypot(ox-px,oy-py)<24){ o.life=-1; addScore(2); state.audio.coin(); } o.a += dt; }
 }

function modeMemory(dt){ const ex=state.extra; const buttons=[['left',-110,160],['right',110,160],['up',0,110],['down',0,210]]; buttons.forEach(([k,x,y])=> rect3d(x,y,420,80,50, ex.flash===k ? '#ffd45b' : '#38567d'));
 if(ex.phase==='show'){ ex.showTimer=(ex.showTimer||0)+dt; if(ex.showTimer>.65){ ex.showTimer=0; ex.flash = ex.sequence[ex.showIndex++]; state.audio.click(); if(ex.showIndex>ex.sequence.length){ ex.phase='input'; ex.flash=null; } } }
 else { for(const [k] of buttons){ if(state.press[k]){ const ok = ex.sequence[ex.inputIndex]===k; ex.flash=k; if(ok){ ex.inputIndex++; state.audio.coin(); if(ex.inputIndex>=ex.sequence.length){ addScore(5); buildSequence(); pulseMessage('Nice memory'); } } else { gameOver('Wrong crystal'); } } } }
 }

function modeFuel(dt){ const ex=state.extra,p=state.player; ex.fuel=(ex.fuel??100)-dt*14; ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(20,130,120,10); ctx.fillStyle='#7ef7b8'; ctx.fillRect(20,130,Math.max(0,ex.fuel)*1.2,10); if(ex.fuel<=0) gameOver('Out of fuel'); ex.spawn=(ex.spawn||0)-dt; if(ex.spawn<=0){ ex.spawn=.75; state.entities.push({lane:Math.floor(Math.random()*3),z:0,kind:Math.random()<0.7?'fuel':'rock'}); }
 for(const e of state.entities) e.z += 430*dt; state.entities=state.entities.filter(e=>e.z<760); for(const e of state.entities){ const x=laneX(e.lane); if(e.kind==='fuel'){ rect3d(x,170,e.z,38,42,'#7ef7b8'); if(e.z>620&&e.z<700&&e.lane===p.lane){ ex.fuel=Math.min(100,ex.fuel+26); e.z=999; addScore(2); state.audio.coin(); } } else { rect3d(x,175,e.z,48,54,'#ff795e'); if(e.z>620&&e.z<700&&e.lane===p.lane&&p.y<24) gameOver('Hit debris'); } }
 addScore(dt*2); }

function modeRhythm(dt){ const ex=state.extra; ex.beat=(ex.beat||0)+dt; const phase=ex.beat%1; const x=(phase*320)-160; rect3d(x,180,420,36,36,'#ffd45b'); rect3d(0,180,420,56,56,'#38567d'); if(state.press.action){ const good=Math.abs(x)<16; addScore(good?3:0); state.audio[good?'coin':'hit'](); if(!good) pulseMessage('Off beat'); } }

function modeMiner(dt){ const ex=state.extra,p=state.player; p.x += (((state.input.left?-1:0)+(state.input.right?1:0))*150 - p.x)*Math.min(1,dt*5); ex.spawn=(ex.spawn||0)-dt; if(ex.spawn<=0){ ex.spawn=.55; state.entities.push({x:(Math.random()-.5)*220,z:180+Math.random()*120,kind:Math.random()<0.75?'ore':'bomb',life:3}); }
 state.entities=state.entities.filter(e=> (e.life-=dt)>0); for(const e of state.entities){ circle3d(e.x,155,e.z,16,e.kind==='ore'?'#ffd45b':'#ff6f7e'); if(Math.abs(e.x-p.x)<26 && state.press.action){ if(e.kind==='ore'){ addScore(2); state.audio.coin(); } else { gameOver('Bomb ore'); } e.life=-1; } } rect3d(p.x,192,640,58,26,'#78e7ff'); }

function modeSort(dt){ const ex=state.extra; ex.item ||= {x:0,y:120,color: Math.random()<0.5?'#ff7a84':'#7ef7b8'}; ex.item.y += dt*120; rect3d(-110,220,420,90,36,'#ff7a84'); rect3d(110,220,420,90,36,'#7ef7b8'); circle3d(ex.item.x,ex.item.y,420,18,ex.item.color); if(state.press.left||state.press.right){ const target = state.press.left ? -110 : 110; const ok = (target<0 && ex.item.color==='#ff7a84') || (target>0 && ex.item.color==='#7ef7b8'); addScore(ok?2:-1); state.audio[ok?'coin':'hit'](); ex.item={x:0,y:120,color:Math.random()<0.5?'#ff7a84':'#7ef7b8'}; } if(ex.item.y>220) { addScore(-1); ex.item={x:0,y:120,color:Math.random()<0.5?'#ff7a84':'#7ef7b8'}; }
 }

function modeGolf(dt){ const ex=state.extra; ex.angle = ex.angle ?? -.4; ex.power = ex.power ?? .45; ex.ball ||= {x:-120,y:205,vx:0,vy:0}; ex.holeX=120; rect3d(ex.holeX,220,420,24,10,'#000'); circle3d(ex.holeX,210,420,12,'#000'); circle3d(ex.ball.x,200,420,12,'#fff'); if(state.input.left) ex.power=Math.max(.1,ex.power-dt*.4); if(state.input.right) ex.power=Math.min(1,ex.power+dt*.4); if(state.press.action && ex.ball.vx===0){ ex.ball.vx = 260*ex.power; state.audio.jump(); }
 ex.ball.x += ex.ball.vx*dt; ex.ball.vx *= .985; if(Math.abs(ex.ball.x-ex.holeX)<14 && Math.abs(ex.ball.vx)<40){ addScore(4); state.audio.coin(); ex.ball={x:-120,y:205,vx:0,vy:0}; } if(ex.ball.x>180 || Math.abs(ex.ball.vx)<2 && ex.ball.vx!==0){ ex.ball={x:-120,y:205,vx:0,vy:0}; }
 }

function modeRescue(dt){ const ex=state.extra,p=state.player; p.x += (((state.input.left?-1:0)+(state.input.right?1:0))*150 - p.x)*Math.min(1,dt*5); p.y += (((state.input.up?-1:0)+(state.input.down?1:0))*150 - p.y)*Math.min(1,dt*5); rect3d(0,215,620,70,20,'#7ef7b8'); circle3d(0,180,620,12,'#7ef7b8'); ex.target ||= {x:(Math.random()-.5)*180,y:130+Math.random()*80}; circle3d(ex.target.x,ex.target.y,420,12,'#ffd45b'); rect3d(p.x,190-p.y,560,48,22,'#78e7ff'); if(Math.hypot(p.x-ex.target.x,(190-p.y)-ex.target.y)<26){ addScore(3); state.audio.coin(); ex.target={x:(Math.random()-.5)*180,y:130+Math.random()*80}; } }

function modeSurfer(dt){ const ex=state.extra,p=state.player; ex.wave=(ex.wave||0)+dt*2; p.x += (((state.input.left?-1:0)+(state.input.right?1:0))*140 - p.x)*Math.min(1,dt*4); const waveY = Math.sin(ex.wave + p.x*.02)*32; circle3d(p.x,180+waveY,560,18,'#78e7ff'); ex.spawn=(ex.spawn||0)-dt; if(ex.spawn<=0){ ex.spawn=.65; state.entities.push({x:(Math.random()-.5)*240,z:160}); }
 for(const s of state.entities) s.z += 360*dt; state.entities=state.entities.filter(s=>s.z<760); for(const s of state.entities){ rect3d(s.x,180, s.z, 34,48,'#ff6f7e'); if(s.z>600 && Math.abs(s.x-p.x)<28 && Math.abs(waveY)<20) gameOver('Wave crash'); }
 addScore(dt*2); }

function modePortal(dt){ const ex=state.extra,p=state.player; ex.color = ex.color || 0; if((ex.timer=(ex.timer||0)+dt)>1.1){ ex.timer=0; ex.color=Math.floor(Math.random()*3); }
 ['#ff7a84','#7ef7b8','#7e8cff'].forEach((c,i)=> rect3d(laneX(i),180,380,70,92,c)); rect3d(p.x,192,640,48,24,'#78e7ff'); if(ex.timer>.8 && ex.timer<.82){ if(p.lane===ex.color){ addScore(3); state.audio.coin(); } else { gameOver('Wrong portal'); } }
 }

function modeMaze(dt){ const ex=state.extra; // 3x3 slide maze visualized front-on
 const cells=[[-1,-1],[0,-1],[1,-1],[-1,0],[0,0],[1,0],[-1,1],[0,1],[1,1]]; for(const [x,y] of cells) rect3d(x*90,140+y*60,420,74,46,'#2b456c'); rect3d(ex.mx*90,140+ex.my*60,420,52,32,'#78e7ff'); circle3d(90,200,420,10,'#7ef7b8'); if(state.press.left) ex.mx=-1, state.audio.click(); if(state.press.right) ex.mx=1, state.audio.click(); if(state.press.up) ex.my=-1, state.audio.click(); if(state.press.down) ex.my=1, state.audio.click(); if(ex.mx===1 && ex.my===1){ addScore(4); state.audio.coin(); ex.mx=0; ex.my=0; pulseMessage('Escaped'); }
 }

function modeCannon(dt){ const ex=state.extra; ex.ang = ex.ang ?? 0; if(state.input.left) ex.ang-=dt*1.5; if(state.input.right) ex.ang+=dt*1.5; ex.ang=Math.max(-.8,Math.min(.2,ex.ang)); rect3d(-120,210,520,70,26,'#38567d'); const tx=-120+Math.cos(ex.ang)*70, ty=210+Math.sin(ex.ang)*50; ctx.strokeStyle='#ffd45b'; ctx.lineWidth=8; const a=p2(-120,210,520), b=p2(tx,ty,500); ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); ex.target ||= {x:120,y:130}; circle3d(ex.target.x,ex.target.y,420,16,'#ff7a84'); if(state.press.action){ const hit = Math.abs(tx-ex.target.x)<40 && Math.abs(ty-ex.target.y)<40; addScore(hit?3:0); state.audio[hit?'coin':'hit'](); if(hit) ex.target={x:40+Math.random()*140,y:90+Math.random()*100}; }
 }

function modeShield(dt){ const ex=state.extra; ex.a=(ex.a||0)+dt*2*((state.input.left?-1:0)+(state.input.right?1:0)); ex.shards=(ex.shards||[]); ex.spawn=(ex.spawn||0)-dt; if(ex.spawn<=0){ ex.spawn=.6; ex.shards.push({a:Math.random()*Math.PI*2,dist:220}); }
 circle3d(0,150,420,32,'#7e8cff'); const sx=Math.cos(ex.a)*90, sy=150+Math.sin(ex.a)*50; rect3d(sx,sy,420,24,68,'#78e7ff'); for(const s of ex.shards){ s.dist -= dt*140; const x=Math.cos(s.a)*s.dist, y=150+Math.sin(s.a)*s.dist*.55; circle3d(x,y,420,12,'#ff7a84'); if(s.dist<110){ if(Math.hypot(x-sx,y-sy)<40){ addScore(2); state.audio.coin(); s.dist=999; } else if(s.dist<70) return gameOver('Shield missed'); } }
 ex.shards=ex.shards.filter(s=>s.dist<900); }

function modeCollector(dt){ const ex=state.extra,p=state.player; p.x += (((state.input.left?-1:0)+(state.input.right?1:0))*160 - p.x)*Math.min(1,dt*5); ex.spawn=(ex.spawn||0)-dt; if(ex.spawn<=0){ ex.spawn=.45; state.entities.push({x:(Math.random()-.5)*260,z:180,kind:Math.random()<0.8?'coin':'bomb'}); }
 for(const e of state.entities){ e.z += 360*dt; if(state.input.action){ e.x += (p.x-e.x)*dt*1.8; } circle3d(e.x,170,e.z, e.kind==='coin'?12:14, e.kind==='coin'?'#ffd45b':'#ff6f7e'); if(e.z>620 && Math.abs(e.x-p.x)<26){ if(e.kind==='coin'){ addScore(1); state.audio.coin(); } else gameOver('Bomb pulled in'); e.z=999; } }
 state.entities=state.entities.filter(e=>e.z<760); rect3d(p.x,192,640,54,24,'#78e7ff'); }

function modeShadow(dt){ const ex=state.extra,p=state.player; ex.target = ex.target || Math.floor(Math.random()*3); ['#2f4b73','#445f8f','#5774ae'].forEach((c,i)=> rect3d(laneX(i),180,420,70,70,c)); circle3d(laneX(ex.target),120,420,14,'#fff'); if((ex.timer=(ex.timer||0)+dt)>1){ ex.timer=0; if(p.lane===ex.target){ addScore(2); state.audio.coin(); ex.target=Math.floor(Math.random()*3);} else gameOver('Wrong shadow'); } }

function modeLava(dt){ const ex=state.extra,p=state.player; ex.safe = ex.safe ?? 1; if((ex.timer=(ex.timer||0)+dt)>1){ ex.timer=0; ex.safe=Math.floor(Math.random()*3); addScore(1); }
 ['#ff6f2f','#ff6f2f','#ff6f2f'].forEach((c,i)=> rect3d(laneX(i),210,420,98,18, i===ex.safe ? '#7ef7b8' : '#ff6f2f')); if(ex.timer>.75 && p.lane!==ex.safe) gameOver('Lava tile'); }

function modeRail(dt){ const ex=state.extra,p=state.player; p.x += (((state.input.left?-1:0)+(state.input.right?1:0))*100 - p.x)*Math.min(1,dt*5); rect3d(0,210,420,240,12,'#5a7aa8'); ex.spawn=(ex.spawn||0)-dt; if(ex.spawn<=0){ ex.spawn=.7; state.entities.push({x:(Math.random()-.5)*180,z:180}); }
 for(const e of state.entities){ e.z += 370*dt; rect3d(e.x,175,e.z,34,48,'#ff7a84'); if(e.z>620 && Math.abs(e.x-p.x)<30 && p.y<22) gameOver('Rail obstacle'); } state.entities=state.entities.filter(e=>e.z<760); rect3d(p.x,192-p.y,640,40,22,'#78e7ff'); addScore(dt*2); }

function modeBubble(dt){ const ex=state.extra; ex.need = ex.need || ['#7e8cff','#7ef7b8','#ff7a84'][Math.floor(Math.random()*3)]; ex.spawn=(ex.spawn||0)-dt; if(ex.spawn<=0){ ex.spawn=.3; state.entities.push({x:(Math.random()-.5)*260,y:210,color:['#7e8cff','#7ef7b8','#ff7a84'][Math.floor(Math.random()*3)],life:2}); }
 rect3d(0,86,420,120,24,ex.need); state.entities=state.entities.filter(b=> (b.life-=dt)>0); for(const b of state.entities){ b.y -= dt*65; circle3d(b.x,b.y,420,16,b.color); if(state.press.action && Math.abs(b.x)<40 && Math.abs(b.y-160)<60){ const ok=b.color===ex.need; addScore(ok?2:-1); state.audio[ok?'coin':'hit'](); if(ok) ex.need=['#7e8cff','#7ef7b8','#ff7a84'][Math.floor(Math.random()*3)]; b.life=-1; } }
 }

function modeChef(dt){ const ex=state.extra,p=state.player; ex.want = ex.want || ['#ffcf57','#7ef7b8','#ff7a84'][Math.floor(Math.random()*3)]; rect3d(0,225,420,170,20,'#38567d'); rect3d(0,86,420,120,24,ex.want); p.x += (((state.input.left?-1:0)+(state.input.right?1:0))*160 - p.x)*Math.min(1,dt*5); ex.spawn=(ex.spawn||0)-dt; if(ex.spawn<=0){ ex.spawn=.5; state.entities.push({x:(Math.random()-.5)*260,z:180,color:['#ffcf57','#7ef7b8','#ff7a84'][Math.floor(Math.random()*3)]}); }
 for(const e of state.entities){ e.z += 360*dt; circle3d(e.x,160,e.z,14,e.color); if(e.z>620 && Math.abs(e.x-p.x)<24){ const ok=e.color===ex.want; addScore(ok?2:-1); state.audio[ok?'coin':'hit'](); ex.want=['#ffcf57','#7ef7b8','#ff7a84'][Math.floor(Math.random()*3)]; e.z=999; } } state.entities=state.entities.filter(e=>e.z<760); rect3d(p.x,192,640,56,24,'#78e7ff'); }

function modeBuilder(dt){ const ex=state.extra; ex.offset += ex.dir*dt*220; if(Math.abs(ex.offset)>120) ex.dir*=-1; for(let i=0;i<(ex.height||0);i++) rect3d(0,220-i*18,420,120,18,'#7e8cff'); rect3d(ex.offset,220-(ex.height||0)*18-18,420,120,18,'#7ef7b8'); if(state.press.action){ const ok=Math.abs(ex.offset)<26; if(ok){ ex.height=(ex.height||0)+1; addScore(2); state.audio.coin(); } else gameOver('Crooked build'); ex.offset=0; } }

function modePinball(dt){ const ex=state.extra,b=state.player.ball; const left = state.input.left, right=state.input.right; rect3d(-90,220,420,70,14,left?'#ffd45b':'#4f6f9a'); rect3d(90,220,420,70,14,right?'#ffd45b':'#4f6f9a'); circle3d(b.x,b.y,420,b.r,'#fff'); b.x += b.vx*dt; b.y += b.vy*dt; b.vy += 120*dt; if(b.x<-150 || b.x>150) b.vx*=-1; if(b.y<90) b.vy=Math.abs(b.vy); if(b.y>214){ if((b.x<0&&left)||(b.x>0&&right)){ b.vy=-220; b.vx += (b.x<0?-40:40); addScore(1); state.audio.coin(); } else gameOver('Ball drained'); }
 }
}
