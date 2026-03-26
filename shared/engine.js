
(function(){
  const slug = window.GAME_ID;
  const cfg = (window.GAME_CONFIGS||{})[slug] || {title:'Game',genre:'arcade',desc:'Tap Play'};
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="mobileOnly"><div><h2>Mobile only</h2><p>Open this game on your phone or use your browser's mobile device mode.</p></div></div>
    <div class="topbar">
      <a href="../../index.html">← Games</a>
      <div class="title"><strong>${cfg.title}</strong><small>${cfg.desc}</small></div>
      <div class="stats"><div class="pill">Score <b id="scoreVal">0</b></div><div class="pill">Best <b id="bestVal">0</b></div></div>
    </div>
    <div id="gameWrap"><canvas id="cv" class="gameCanvas"></canvas>
      <div class="hint" id="hint">Tap Play, then use the touch controls.</div>
      <div id="overlay"><div class="panel"><img class="hero" src="../../shared/thumbs/${slug}.svg" alt=""><h1>${cfg.title}</h1><p>${cfg.desc}</p><button class="bigPlay" id="playBtn">Play</button></div></div>
      <div class="controls"><div class="pad"><div class="btn" data-key="left">◀</div><div class="btn" data-key="right">▶</div></div><div class="actions"><div class="btn wide" data-key="action">TAP</div></div></div>
    </div>`;

  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  const overlay = document.getElementById('overlay');
  const scoreEl = document.getElementById('scoreVal');
  const bestEl = document.getElementById('bestVal');
  const hintEl = document.getElementById('hint');
  const bestKey = 'miniBest_' + slug;
  let best = +localStorage.getItem(bestKey) || 0;
  bestEl.textContent = best;

  function resize(){
    const dpr = Math.min(window.devicePixelRatio||1,2);
    cv.width = Math.floor(cv.clientWidth * dpr);
    cv.height = Math.floor(cv.clientHeight * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    W = cv.clientWidth; H = cv.clientHeight;
  }
  let W=0,H=0; resize(); addEventListener('resize', resize);

  const input = {left:false,right:false,action:false,justAction:false};
  document.querySelectorAll('.btn').forEach(btn=>{
    const key=btn.dataset.key;
    const down = ev=>{ev.preventDefault(); input[key]=true; if(key==='action') input.justAction=true;};
    const up = ev=>{ev.preventDefault(); input[key]=false;};
    btn.addEventListener('touchstart', down, {passive:false});
    btn.addEventListener('touchend', up, {passive:false});
    btn.addEventListener('touchcancel', up, {passive:false});
  });
  cv.addEventListener('touchstart', ev=>{ input.justAction=true; }, {passive:true});

  // audio
  let ac = null, musicTimer=null;
  function unlockAudio(){
    try{
      ac = ac || new (window.AudioContext||window.webkitAudioContext)();
      if(ac.state==='suspended') ac.resume();
      if(!musicTimer){
        musicTimer = setInterval(()=>{
          if(!running || !ac || ac.state!=='running') return;
          beep(220 + ((Date.now()/320)%4|0)*30, 0.015, 'triangle', 0.012);
        }, 360);
      }
    }catch(e){}
  }
  function beep(freq,dur,type,vol){
    if(!ac || ac.state!=='running') return;
    const o=ac.createOscillator(), g=ac.createGain();
    o.type=type||'sine'; o.frequency.value=freq; g.gain.value=vol||0.03;
    o.connect(g); g.connect(ac.destination);
    const t=ac.currentTime; g.gain.setValueAtTime(vol||0.03,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.start(t); o.stop(t+dur+0.01);
  }
  function scoreSound(){ beep(640,0.07,'triangle',0.05); }
  function failSound(){ beep(180,0.12,'sawtooth',0.06); }

  function rand(a,b){ return Math.random()*(b-a)+a; }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function project(x,y,z){
    const scale = 240/(z+240); return {x:W/2 + x*scale, y:H*0.62 - y*scale, s:scale};
  }
  function rect3d(x,y,z,w,h,d,c1,c2){
    const p1=project(x,y,z), p2=project(x+w,y,z), p3=project(x+w,y+h,z), p4=project(x,y+h,z);
    const q1=project(x,y,z+d), q2=project(x+w,y,z+d), q3=project(x+w,y+h,z+d), q4=project(x,y+h,z+d);
    ctx.fillStyle=c2; ctx.beginPath(); ctx.moveTo(p2.x,p2.y); ctx.lineTo(q2.x,q2.y); ctx.lineTo(q3.x,q3.y); ctx.lineTo(p3.x,p3.y); ctx.closePath(); ctx.fill();
    ctx.fillStyle=shade(c1,1.08); ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.lineTo(q2.x,q2.y); ctx.lineTo(q1.x,q1.y); ctx.closePath(); ctx.fill();
    ctx.fillStyle=c1; ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.lineTo(p3.x,p3.y); ctx.lineTo(p4.x,p4.y); ctx.closePath(); ctx.fill();
  }
  function sphere3d(x,y,z,r,c){ const p=project(x,y,z); const rr=r*p.s; const g=ctx.createRadialGradient(p.x-rr*0.3,p.y-rr*0.35,rr*0.15,p.x,p.y,rr); g.addColorStop(0,shade(c,1.35)); g.addColorStop(.6,c); g.addColorStop(1,shade(c,.55)); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,rr,0,Math.PI*2); ctx.fill(); }
  function shade(hex,m){ const n=parseInt(hex.slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255; r=clamp(Math.round(r*m),0,255); g=clamp(Math.round(g*m),0,255); b=clamp(Math.round(b*m),0,255); return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1); }
  function roundedRect(x,y,w,h,r,fill){ ctx.fillStyle=fill; ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); ctx.fill(); }

  let state={}, running=false, last=0;
  function reset(){
    score=0; state={ t:0, playerX:0, lane:0, rings:[], cubes:[], targets:[], particles:[], seq:[], seqShow:0, seqInput:0, timer:18, stack:[], combo:0, tilt:0, angle:0, rotor:0, extra:0 };
    initForSlug();
  }
  let score=0;
  function saveBest(){ if(score>best){ best=score; localStorage.setItem(bestKey, String(best)); bestEl.textContent=best; } }
  function addScore(n){ score+=n; scoreEl.textContent=score; if(score>best){best=score; bestEl.textContent=best;} scoreSound(); }
  function gameOver(msg){ running=false; saveBest(); failSound(); hintEl.textContent = msg + ' Tap Play to try again.'; overlay.style.display='flex'; }

  function initForSlug(){
    if(slug==='memory-crystals'){ state.seq=[0,1].map(()=>Math.floor(rand(0,4))); state.seqShow=2.4; state.seqInput=0; }
    if(slug==='tower-balance' || slug==='skyline-builder'){ state.stack=[{x:0,w:90}]; state.moveX=-120; state.dir=1; }
    if(slug==='mini-golf-orbit'){ state.ball={x:-120,y:0,vx:0,vy:0}; state.hole={x:100,y:0}; state.planet={x:0,y:0,m:1600}; }
    if(slug==='shield-spin'){ state.rotor=0; state.attack=rand(-Math.PI,Math.PI); }
    if(slug==='starlight-pinball'){ state.ball={x:0,y:120,vx:90,vy:-220}; state.bumpers=[{x:-80,y:20},{x:75,y:-10},{x:0,y:-90}]; }
  }

  function start(){ unlockAudio(); overlay.style.display='none'; hintEl.textContent = 'Use left, right, and TAP.'; reset(); running=true; last=performance.now(); requestAnimationFrame(frame); }
  document.getElementById('playBtn').addEventListener('click', start);

  function frame(ts){ if(!running) return; const dt=Math.min(0.033,(ts-last)/1000||0.016); last=ts; update(dt); draw(); input.justAction=false; requestAnimationFrame(frame); }

  function update(dt){ state.t += dt; state.timer -= dt; if(state.timer<=0 && !['memory-crystals','starlight-pinball'].includes(slug)) return gameOver('Time up.');
    const speed = 140 + score*1.6;
    switch(slug){
      case 'sky-ring-runner':
      case 'meteor-lane-dodge':
      case 'hover-drift-gates':
      case 'rocket-fuel-rush':
      case 'rail-grinder':
      case 'wave-surfer':
      case 'lava-hop':
        updateRunnerLike(dt,speed); break;
      case 'neon-hoop-shot': updateHoop(dt); break;
      case 'cube-stack-drop': updateDrop(dt); break;
      case 'gem-tunnel-switch':
      case 'color-bridge-flip':
      case 'prism-sort': updateSwitch(dt); break;
      case 'target-burst-aim':
      case 'cannon-pop':
      case 'bubble-burst-depth': updateAim(dt); break;
      case 'orbital-catch':
      case 'magnet-collector': updateOrbit(dt); break;
      case 'tower-balance':
      case 'skyline-builder': updateStackBalance(dt); break;
      case 'memory-crystals': updateMemory(dt); break;
      case 'beat-bounce': updateRhythm(dt); break;
      case 'asteroid-miner':
      case 'drone-rescue':
      case 'robot-chef-catch': updateCatch(dt); break;
      case 'mini-golf-orbit': updateGolf(dt); break;
      case 'portal-dash':
      case 'ice-slide-maze':
      case 'shadow-match-3d': updateSelect(dt); break;
      case 'shield-spin': updateShield(dt); break;
      case 'starlight-pinball': updatePinball(dt); break;
      default: updateRunnerLike(dt,speed);
    }
  }

  function lanePlayer(){ if(input.left) state.playerX-=220*0.016*1.5; if(input.right) state.playerX+=220*0.016*1.5; state.playerX = clamp(state.playerX,-110,110); }
  function updateRunnerLike(dt,speed){ lanePlayer(); state.spawn=(state.spawn||0)-dt; if(state.spawn<=0){ state.spawn=0.85-rand(0,0.2); const x=[-100,0,100][Math.floor(rand(0,3))]; state.rings.push({x,z:560, kind: Math.random()<0.66?'good':'bad'}); }
    for(const o of state.rings) o.z-=speed*dt*1.5; state.rings = state.rings.filter(o=>o.z>-20);
    for(const o of state.rings){ if(Math.abs(o.z-70)<28 && Math.abs(o.x-state.playerX)<44){ if(o.kind==='good'){ addScore(1); state.timer=Math.min(22,state.timer+1.1); o.z=-999; } else return gameOver('You crashed.'); } }
    if(slug==='rocket-fuel-rush'){ state.timer=Math.max(0,state.timer-dt*0.4); }
    if(slug==='lava-hop' && input.justAction){ state.timer=Math.min(20,state.timer+0.4); addScore(1); }
  }
  function updateHoop(dt){ state.angle+=dt*1.8; if(input.justAction){ const ok=Math.abs(Math.sin(state.angle))<0.22; if(ok){ addScore(2); state.timer=Math.min(18,state.timer+1.5); } else gameOver('Missed shot.'); } }
  function updateDrop(dt){ state.moveX=(state.moveX||-120)+(state.dir||1)*180*dt; if(state.moveX>120){state.dir=-1} if(state.moveX<-120){state.dir=1} if(input.justAction){ const top=state.stack.length?state.stack[state.stack.length-1].x:0; const dx=Math.abs(state.moveX-top); if(dx<34){ state.stack.push({x:state.moveX}); addScore(1); state.timer=Math.min(18,state.timer+1.2);} else gameOver('Bad drop.'); } }
  function updateSwitch(dt){ state.mode = state.mode || 0; if(input.justAction) state.mode = 1-state.mode; state.spawn=(state.spawn||0)-dt; if(state.spawn<=0){ state.spawn=0.75; state.targets.push({lane:Math.floor(rand(0,2)), z:560}); }
    for(const t of state.targets) t.z -= (160+score*2)*dt; state.targets = state.targets.filter(t=>t.z>-10);
    for(const t of state.targets){ if(Math.abs(t.z-80)<20){ if(t.lane===state.mode){ addScore(1); t.z=-999; } else return gameOver('Wrong color / lane.'); } }
  }
  function updateAim(dt){ state.spawn=(state.spawn||0)-dt; if(state.spawn<=0){ state.spawn=0.75; state.targets.push({x:rand(-120,120), y:rand(-120,60), life:1.2, r:22}); }
    for(const t of state.targets) t.life-=dt; state.targets=state.targets.filter(t=>t.life>0);
    if(input.justAction){ const tx=(Math.random()*240)-120; const ty=(Math.random()*180)-120; let hit=state.targets.find(t=>Math.hypot(t.x-tx,t.y-ty)<36); if(hit){ addScore(2); state.timer=Math.min(18,state.timer+1); hit.life=0;} else failSound(); }
    if(state.targets.length>7) gameOver('Too many targets escaped.');
  }
  function updateOrbit(dt){ state.angle += dt*(1.5+score*0.03); if(input.justAction){ const ok=Math.abs(Math.sin(state.angle*2))<0.24; if(ok){ addScore(1); state.timer=Math.min(18,state.timer+1);} else gameOver('Missed the orbit.'); } }
  function updateStackBalance(dt){ state.moveX += state.dir*180*dt; if(state.moveX>120){state.dir=-1} if(state.moveX<-120){state.dir=1}; state.tilt *= 0.98;
    if(input.left) state.tilt -= 0.03; if(input.right) state.tilt += 0.03;
    if(input.justAction){ const base=state.stack[state.stack.length-1]; const ok=Math.abs(state.moveX-base.x)<base.w*0.5; if(!ok) return gameOver('The tower slipped.'); const newW=Math.max(36, base.w - Math.abs(state.moveX-base.x)); state.stack.push({x:state.moveX,w:newW}); addScore(1); state.timer=Math.min(18,state.timer+1.2); state.moveX=-120; state.dir=1; }
    if(Math.abs(state.tilt)>0.9) gameOver('Tower tipped over.');
  }
  function updateMemory(dt){ if(state.seqShow>0){ state.seqShow-=dt; return; }
    if(input.justAction){ const want=state.seq[state.seqInput]; const guess=((Date.now()/250)|0)%4; if(guess===want){ state.seqInput++; scoreSound(); if(state.seqInput>=state.seq.length){ addScore(state.seq.length); state.seq.push(Math.floor(rand(0,4))); state.seqInput=0; state.seqShow=2.6; state.timer=20; } } else gameOver('Wrong crystal.'); }
  }
  function updateRhythm(dt){ state.beat=(state.beat||0)+dt*2.1; if(input.justAction){ const ok=Math.abs((state.beat%1)-0.5)<0.16; if(ok){ addScore(1); state.combo++; state.timer=Math.min(18,state.timer+0.7);} else gameOver('Off beat.'); } }
  function updateCatch(dt){ if(input.left) state.playerX-=200*dt; if(input.right) state.playerX+=200*dt; state.playerX=clamp(state.playerX,-110,110); state.spawn=(state.spawn||0)-dt; if(state.spawn<=0){ state.spawn=0.7; state.targets.push({x:rand(-120,120), y:-170, vy:rand(80,130), good:Math.random()<0.75}); }
    for(const t of state.targets) t.y += t.vy*dt; state.targets=state.targets.filter(t=>t.y<170);
    for(const t of state.targets){ if(Math.abs(t.y-130)<24 && Math.abs(t.x-state.playerX)<36){ if(t.good){ addScore(1); state.timer=Math.min(18,state.timer+0.8); t.y=999; } else return gameOver('Wrong pickup.'); } }
  }
  function updateGolf(dt){ if(input.justAction && !state.shot){ state.shot=true; state.ball.vx=180; state.ball.vy=-20; }
    if(state.shot){ const dx=state.planet.x-state.ball.x, dy=state.planet.y-state.ball.y, d2=Math.max(2400,dx*dx+dy*dy); const f=state.planet.m/d2; state.ball.vx += dx*f*dt; state.ball.vy += dy*f*dt; state.ball.x += state.ball.vx*dt; state.ball.y += state.ball.vy*dt;
      if(Math.hypot(state.ball.x-state.hole.x,state.ball.y-state.hole.y)<18){ addScore(3); state.timer=18; state.ball={x:-120,y:rand(-30,30),vx:0,vy:0}; state.hole={x:rand(80,120),y:rand(-50,50)}; state.shot=false; }
      if(Math.abs(state.ball.x)>220||Math.abs(state.ball.y)>180) gameOver('Ball lost in space.'); }
  }
  function updateSelect(dt){ state.sel=(state.sel||0) + (input.right?1:0) - (input.left?1:0); state.sel=clamp(state.sel,-1,1); if(input.justAction){ const ok=Math.round(state.sel)===0; if(ok){ addScore(1); state.timer=Math.min(18,state.timer+0.8); } else gameOver('Wrong pick.'); } }
  function updateShield(dt){ if(input.left) state.rotor-=dt*3.2; if(input.right) state.rotor+=dt*3.2; if(input.justAction){ const diff=Math.abs(Math.atan2(Math.sin(state.rotor-state.attack), Math.cos(state.rotor-state.attack))); if(diff<0.45){ addScore(2); state.attack=rand(-Math.PI,Math.PI); state.timer=Math.min(18,state.timer+1); } else gameOver('Shield missed.'); } }
  function updatePinball(dt){ const b=state.ball; b.x+=b.vx*dt; b.y+=b.vy*dt; if(b.x<-140||b.x>140) b.vx*=-1; if(b.y<-160) b.vy=Math.abs(b.vy); if(b.y>180) gameOver('Ball drained.'); if(input.left && b.y>120 && b.x<0){ b.vy=-250; b.vx=140; scoreSound(); } if(input.right && b.y>120 && b.x>0){ b.vy=-250; b.vx=-140; scoreSound(); }
    for(const p of state.bumpers){ if(Math.hypot(b.x-p.x,b.y-p.y)<24){ b.vx += (b.x-p.x)*2; b.vy += (b.y-p.y)*2; addScore(1); } }
  }

  function drawBg(){
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#183764'); g.addColorStop(0.55,'#08101f'); g.addColorStop(1,'#050912'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    for(let i=0;i<24;i++){ const x=(i*73 + (state.t||0)*18)%W; ctx.fillStyle='rgba(255,255,255,.17)'; ctx.beginPath(); ctx.arc(x, 40+((i*33)%120), 1.2+(i%3), 0, Math.PI*2); ctx.fill(); }
  }
  function drawFloor(){
    const grd=ctx.createLinearGradient(0,H*0.54,0,H); grd.addColorStop(0,'rgba(95,227,255,.02)'); grd.addColorStop(1,'rgba(95,227,255,.14)'); ctx.fillStyle=grd; ctx.beginPath(); ctx.moveTo(0,H); ctx.lineTo(W*0.18,H*0.56); ctx.lineTo(W*0.82,H*0.56); ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.08)'; for(let i=0;i<10;i++){ const y=lerp(H*0.58,H, i/9); ctx.beginPath(); ctx.moveTo(W*0.5-(i+1)*32, y); ctx.lineTo(W*0.5+(i+1)*32, y); ctx.stroke(); }
  }
  function drawPlayer(){ rect3d(state.playerX-18, -18, 70, 36, 36, 22, '#62d7ff','#183764'); }
  function draw(){
    drawBg(); drawFloor();
    switch(slug){
      case 'sky-ring-runner':
      case 'meteor-lane-dodge':
      case 'hover-drift-gates':
      case 'rocket-fuel-rush':
      case 'rail-grinder':
      case 'wave-surfer':
      case 'lava-hop':
        for(const o of state.rings){ if(o.kind==='good'){ sphere3d(o.x, 0, o.z, 18, '#7effb5'); } else { rect3d(o.x-22,-18,o.z,44,36,22,'#ff6b87','#4e1022'); } }
        drawPlayer(); break;
      case 'neon-hoop-shot':
        sphere3d(-70, -10, 120, 18, '#ffbe61');
        const py=80+Math.sin(state.angle)*70; ctx.strokeStyle='#5fe3ff'; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(W/2+90, H/2-20+py*0.4, 26, 0, Math.PI*2); ctx.stroke(); break;
      case 'cube-stack-drop':
        for(let i=0;i<state.stack.length;i++) rect3d((state.stack[i].x||0)-24, -18-i*26, 120, 48, 24, 22, '#7effb5','#17355e');
        rect3d((state.moveX||0)-24,-18-state.stack.length*26,120,48,24,22,'#5fe3ff','#17355e'); break;
      case 'gem-tunnel-switch':
      case 'color-bridge-flip':
      case 'prism-sort':
        rect3d(-120,-18,110,100,36,24,state.mode?'#7effb5':'#ff7d96','#183764'); rect3d(20,-18,110,100,36,24,state.mode?'#ff7d96':'#7effb5','#183764');
        state.targets.forEach(t=>sphere3d(t.lane?70:-70,0,t.z,18,t.lane?'#ff7d96':'#7effb5')); break;
      case 'target-burst-aim':
      case 'cannon-pop':
      case 'bubble-burst-depth':
        state.targets.forEach(t=>{ const p=project(t.x,t.y,120); ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(p.x,p.y,18,0,Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x-10,p.y); ctx.lineTo(p.x+10,p.y); ctx.moveTo(p.x,p.y-10); ctx.lineTo(p.x,p.y+10); ctx.stroke(); });
        ctx.fillStyle='rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(W/2,H/2,4,0,Math.PI*2); ctx.fill(); break;
      case 'orbital-catch':
      case 'magnet-collector':
        sphere3d(0,0,160,28,'#5fe3ff');
        for(let i=0;i<4;i++){ const a=state.angle+i*Math.PI/2; sphere3d(Math.cos(a)*90, Math.sin(a)*55, 120, 14, i%2?'#7effb5':'#ffbe61'); } break;
      case 'tower-balance':
      case 'skyline-builder':
        state.stack.forEach((s,i)=>rect3d(s.x-s.w/2,-18-i*24,120,s.w,22,22,'#5fe3ff','#17355e')); rect3d(state.moveX-45,-18-state.stack.length*24,120,90,22,22,'#ffbe61','#17355e'); break;
      case 'memory-crystals':
        for(let i=0;i<4;i++){ const x=[-70,70,-70,70][i], y=[50,50,-55,-55][i]; const lit = state.seqShow>0 && state.seq[Math.floor((2.4-state.seqShow)*2.2)]===i; sphere3d(x,y,130,22, lit?'#7effb5':'#3b5d8f'); } break;
      case 'beat-bounce':
        const pulse = Math.abs(Math.sin((state.beat||0)*Math.PI)); sphere3d(0,0,130,20+10*pulse,'#7effb5'); break;
      case 'asteroid-miner':
      case 'drone-rescue':
      case 'robot-chef-catch':
        drawPlayer(); state.targets.forEach(t=>sphere3d(t.x,60-t.y,120,18,t.good===false?'#ff7d96':'#7effb5')); break;
      case 'mini-golf-orbit':
        sphere3d(state.planet.x,state.planet.y,120,24,'#7864ff'); sphere3d(state.hole.x,state.hole.y,120,12,'#7effb5'); sphere3d(state.ball.x,state.ball.y,120,10,'#ffffff'); break;
      case 'portal-dash':
      case 'ice-slide-maze':
      case 'shadow-match-3d':
        [-1,0,1].forEach((v,i)=>rect3d(v*90-26,-18,120,52,26,22,Math.round(state.sel)===v?'#7effb5':'#35537f','#17355e')); break;
      case 'shield-spin':
        sphere3d(0,0,140,18,'#ffffff'); ctx.save(); ctx.translate(W/2,H*0.62); ctx.rotate(state.rotor); ctx.strokeStyle='#5fe3ff'; ctx.lineWidth=12; ctx.beginPath(); ctx.arc(0,0,72, -0.55,0.55); ctx.stroke(); ctx.restore(); ctx.save(); ctx.translate(W/2,H*0.62); ctx.rotate(state.attack); ctx.fillStyle='#ff7d96'; ctx.beginPath(); ctx.moveTo(0,-95); ctx.lineTo(10,-75); ctx.lineTo(-10,-75); ctx.closePath(); ctx.fill(); ctx.restore(); break;
      case 'starlight-pinball':
        state.bumpers.forEach(p=>sphere3d(p.x,p.y,120,18,'#7effb5')); sphere3d(state.ball.x,state.ball.y,120,10,'#ffffff'); break;
    }
    ctx.fillStyle='rgba(255,255,255,.88)'; ctx.font='14px sans-serif'; ctx.fillText('Time ' + Math.max(0,state.timer|0), 14, H-120);
  }
})();
