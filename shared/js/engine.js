
(function(){
  const cfg = window.GAME_CONFIG || {};
  const $ = (s)=>document.querySelector(s);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x08111f, 0.03);
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.shadowMap.enabled = true;
  $('#three').appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200);
  camera.position.set(0, 8, 16);
  const clock = new THREE.Clock();
  let t = 0;
  let pulses = [];
  let clicks = 0;
  let seqGrid = [];
  let seqStep = 0;
  let memoryPattern = [];
  let memoryInput = [];
  let transportStarted = false;
  let stars = [];

  const pal = (cfg.palette||['#7cc7ff','#ff7ad9','#ffd166','#06d6a0']).map(c=>new THREE.Color(c));
  scene.background = new THREE.Color(pal[0]).lerp(new THREE.Color(0x050915), 0.78);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x08111f, 1.2);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.45);
  dir.position.set(8,12,6); dir.castShadow = true;
  dir.shadow.mapSize.set(1024,1024);
  scene.add(dir);

  const stage = new THREE.Mesh(
    new THREE.CylinderGeometry(8, 10, 1.2, 48),
    new THREE.MeshStandardMaterial({color:pal[0].clone().lerp(pal[1],.4), metalness:.25, roughness:.45})
  );
  stage.receiveShadow = true;
  stage.position.y = -1.3;
  scene.add(stage);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(8.9, 0.12, 18, 90),
    new THREE.MeshBasicMaterial({color:pal[2]})
  );
  ring.rotation.x = Math.PI/2;
  scene.add(ring);

  const skyline = new THREE.Group();
  for(let i=0;i<24;i++){
    const h = 1.5 + Math.random()*7;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.8+Math.random()*1.5, h, 0.8+Math.random()*1.5),
      new THREE.MeshStandardMaterial({color:pal[i%pal.length].clone().offsetHSL((i*0.03)%1,0,0.02), emissive:pal[i%pal.length], emissiveIntensity:0.08, metalness:.2, roughness:.65})
    );
    const a = (i/24)*Math.PI*2;
    const r = 12 + Math.random()*5;
    m.position.set(Math.cos(a)*r, h/2-1.5, Math.sin(a)*r);
    m.lookAt(0,m.position.y,0);
    m.castShadow = true; m.receiveShadow = true;
    skyline.add(m);
  }
  scene.add(skyline);

  const starGeo = new THREE.BufferGeometry();
  const sp = [];
  for(let i=0;i<600;i++){
    const rr = 20 + Math.random()*50;
    const aa = Math.random()*Math.PI*2;
    const yy = -2 + Math.random()*28;
    sp.push(Math.cos(aa)*rr, yy, Math.sin(aa)*rr);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp,3));
  const starMat = new THREE.PointsMaterial({size:0.15,color:0xffffff,transparent:true,opacity:.8});
  const starPoints = new THREE.Points(starGeo, starMat);
  scene.add(starPoints);

  const interactives = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function fit(){
    const wrap = $('#three');
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w,h,false);
    camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', fit); fit();

  const ToneOK = ()=> typeof Tone !== 'undefined';
  let synth, poly, drumKick, drumSnare, membrane, metal, bell, pluck, fm, duo, organ, flute, reverb, delay;

  function setupAudio(){
    if(!ToneOK()) return;
    reverb = new Tone.Reverb({decay:2.4, wet:0.22}).toDestination();
    delay = new Tone.FeedbackDelay('8n', 0.25).connect(reverb);
    synth = new Tone.Synth({oscillator:{type:'sawtooth6'}, envelope:{attack:0.01,decay:0.15,sustain:0.15,release:0.7}}).connect(delay);
    poly = new Tone.PolySynth(Tone.Synth).connect(reverb);
    fm = new Tone.FMSynth().connect(reverb);
    duo = new Tone.DuoSynth().connect(reverb);
    organ = new Tone.AMSynth({harmonicity:1.5}).connect(reverb);
    flute = new Tone.Synth({oscillator:{type:'triangle8'}, envelope:{attack:0.02,decay:0.1,sustain:0.35,release:0.8}}).connect(reverb);
    pluck = new Tone.PluckSynth().connect(reverb);
    membrane = new Tone.MembraneSynth().toDestination();
    metal = new Tone.MetalSynth({frequency:180, envelope:{attack:0.001,decay:0.4,release:0.1}, harmonicity:5.1, resonance:500}).connect(reverb);
    bell = new Tone.Synth({oscillator:{type:'sine'}, envelope:{attack:0.001,decay:0.2,sustain:0,release:1.6}}).connect(reverb);
    drumKick = membrane;
    drumSnare = new Tone.NoiseSynth({noise:{type:'white'}, envelope:{attack:0.001, decay:0.16, sustain:0}}).toDestination();
  }
  setupAudio();

  async function ensureAudio(){
    try{ if(ToneOK() && Tone.context.state !== 'running') await Tone.start(); }catch(e){}
  }

  const scale = ['C4','D4','E4','G4','A4','C5','D5','E5','G5','A5'];
  const bassScale = ['C2','E2','G2','A1','D2','F2','G1','B1'];
  function noteAt(i){ const arr = cfg.instrument==='bass'?bassScale:scale; return arr[((i%arr.length)+arr.length)%arr.length]; }

  function triggerSound(i, strong=false){
    ensureAudio();
    const inst = cfg.instrument || 'synth';
    const note = noteAt(i);
    const vel = strong ? 0.95 : 0.75;
    try{
      if(inst==='drums'){ if(i%2===0) drumKick.triggerAttackRelease('C1','8n', undefined, vel); else drumSnare.triggerAttackRelease('8n', undefined, vel*0.75); }
      else if(inst==='membrane') membrane.triggerAttackRelease(['C2','G2','A2','D2'][i%4],'8n', undefined, vel);
      else if(inst==='metal') metal.triggerAttackRelease(note,'16n', undefined, vel);
      else if(inst==='bell') bell.triggerAttackRelease(note,'8n', undefined, vel);
      else if(inst==='pluck') pluck.triggerAttack(note);
      else if(inst==='fm') fm.triggerAttackRelease(note,'8n', undefined, vel);
      else if(inst==='duo') duo.triggerAttackRelease(note,'8n', undefined, vel);
      else if(inst==='organ') organ.triggerAttackRelease(note,'8n', undefined, vel);
      else if(inst==='flute') flute.triggerAttackRelease(note,'8n', undefined, vel);
      else if(inst==='poly') poly.triggerAttackRelease([note, Tone.Frequency(note).transpose(4).toNote(), Tone.Frequency(note).transpose(7).toNote()], '4n', undefined, vel);
      else if(inst==='noise'){ synth.volume.value = -8; synth.triggerAttackRelease(note,'16n'); }
      else if(inst==='sampler'){ synth.oscillator.type='square4'; synth.triggerAttackRelease(note,'16n', undefined, vel); }
      else synth.triggerAttackRelease(note,'8n', undefined, vel);
    }catch(e){}
  }

  function pulse(obj, colorIndex=0){
    pulses.push({obj, life:1, base:obj.scale.clone()});
    if(obj.material && obj.material.emissive) obj.material.emissive.copy(pal[colorIndex%pal.length]);
  }

  function buildPads(n=8){
    const g = new THREE.Group();
    for(let i=0;i<n;i++){
      const row = Math.floor(i/4), col = i%4;
      const mat = new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:0.15, metalness:.18, roughness:.35});
      const m = new THREE.Mesh(new THREE.BoxGeometry(2.1,0.7,2.1), mat);
      m.position.set((col-1.5)*2.8, -0.2, (row-0.5)*3.2);
      m.castShadow = m.receiveShadow = true; m.userData = {idx:i,type:'sound'};
      interactives.push(m); g.add(m);
    }
    scene.add(g);
    return g;
  }

  function buildKeyboard(n=10){
    const g = new THREE.Group();
    for(let i=0;i<n;i++){
      const mat = new THREE.MeshStandardMaterial({color:i%2?0xf8fbff:0xd7eaff, emissive:pal[i%pal.length], emissiveIntensity:0.08, metalness:.08, roughness:.28});
      const m = new THREE.Mesh(new THREE.BoxGeometry(1,0.55,4.2), mat);
      m.position.set((i-(n-1)/2)*1.05, -0.1, 0);
      m.castShadow = m.receiveShadow = true; m.userData = {idx:i,type:'sound'};
      interactives.push(m); g.add(m);
    }
    scene.add(g); return g;
  }

  function buildXylophone(n=8){
    const g = new THREE.Group();
    for(let i=0;i<n;i++){
      const len = 4.8 - i*0.28;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.4,len), new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:0.14, metalness:.2, roughness:.38}));
      m.position.set((i-(n-1)/2)*0.95, 0.1, 0);
      m.rotation.x = 0.08;
      m.castShadow = m.receiveShadow = true; m.userData = {idx:i,type:'sound'};
      interactives.push(m); g.add(m);
    }
    g.rotation.y = 0.25; scene.add(g); return g;
  }

  function buildStrings(n=6){
    const g = new THREE.Group();
    for(let i=0;i<n;i++){
      const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-4,2.6-i*0.8,0), new THREE.Vector3(0,2.2-i*0.8,0.3), new THREE.Vector3(4,2.6-i*0.8,0)]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(c, 64, 0.04, 8, false), new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:.25}));
      tube.userData = {idx:i,type:'sound'}; interactives.push(tube); g.add(tube);
    }
    const frame = new THREE.Mesh(new THREE.TorusKnotGeometry(2.9,0.12,120,10), new THREE.MeshStandardMaterial({color:0xffffff,metalness:.3,roughness:.4, emissive:pal[1], emissiveIntensity:.06}));
    frame.scale.set(1.55,1.1,0.4); g.add(frame); g.position.y = 0.4; scene.add(g); return g;
  }

  function buildSequencer(rows=4, cols=8){
    const g = new THREE.Group();
    seqGrid = [];
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const active = (r+c)%5===0;
        const m = new THREE.Mesh(new THREE.BoxGeometry(1,0.45,1), new THREE.MeshStandardMaterial({color: active? pal[r%pal.length]: new THREE.Color(0x28405c), emissive: active? pal[r%pal.length]: new THREE.Color(0x000000), emissiveIntensity: active? .18:0, metalness:.2, roughness:.38}));
        m.position.set((c-(cols-1)/2)*1.2, r*0.7-0.6, 0);
        m.userData = {idx:r*cols+c,row:r,col:c,type:'toggle',active};
        interactives.push(m); g.add(m); seqGrid.push(m);
      }
    }
    g.rotation.x = -0.55; scene.add(g);
    return g;
  }

  function buildWave(){
    const group = new THREE.Group();
    for(let i=0;i<22;i++){
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:.16}));
      m.position.set((i-11)*0.7, 0, 0); m.userData={idx:i,type:'sound'}; interactives.push(m); group.add(m); stars.push(m);
    }
    group.position.y = 1; scene.add(group); return group;
  }

  function buildArpeggio(){
    const g = new THREE.Group();
    for(let i=0;i<9;i++){
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.66,0), new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:.15, metalness:.25, roughness:.35}));
      const a = (i/9)*Math.PI*2;
      m.position.set(Math.cos(a)*3.8, 0.6 + Math.sin(i)*0.4, Math.sin(a)*3.8);
      m.userData={idx:i,type:'sound'}; interactives.push(m); g.add(m);
    }
    scene.add(g); return g;
  }

  function buildSlider(){
    const track = new THREE.Mesh(new THREE.BoxGeometry(10,0.25,0.8), new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.25}));
    track.position.y = 0.5; scene.add(track);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.72,24,24), new THREE.MeshStandardMaterial({color:pal[1], emissive:pal[1], emissiveIntensity:.24}));
    knob.position.set(0,0.95,0); knob.userData={idx:0,type:'slider'}; interactives.push(knob); scene.add(knob); return knob;
  }

  function buildPaint(){
    const g = new THREE.Group();
    for(let i=0;i<12;i++){
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,0.8), new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:.14}));
      m.position.set((i-5.5)*1.1, 0.5, Math.sin(i*0.65)*1.8); m.userData={idx:i,type:'sound'}; interactives.push(m); g.add(m);
    }
    scene.add(g); return g;
  }

  function buildMemory(){
    const g = buildPads(6);
    memoryPattern = [0,2,4,1].map(v=>v%6);
    return g;
  }

  function buildOrchestra(){
    const g = new THREE.Group();
    for(let i=0;i<7;i++){
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.78,24,24), new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:.2}));
      const a=(i/7)*Math.PI*2;
      m.position.set(Math.cos(a)*4, 1+Math.sin(i)*.4, Math.sin(a)*4); m.userData={idx:i,type:'sound'}; interactives.push(m); g.add(m);
    }
    scene.add(g); return g;
  }

  let modeObj;
  switch(cfg.mode){
    case 'pads': modeObj = buildPads(8); break;
    case 'keyboard': modeObj = buildKeyboard(10); break;
    case 'xylophone': modeObj = buildXylophone(8); break;
    case 'sequencer': modeObj = buildSequencer(4,8); break;
    case 'strings': modeObj = buildStrings(6); break;
    case 'wave': modeObj = buildWave(); break;
    case 'chords': modeObj = buildPads(6); break;
    case 'spinner': modeObj = buildArpeggio(); break;
    case 'arpeggio': modeObj = buildArpeggio(); break;
    case 'slider': modeObj = buildSlider(); break;
    case 'memory': modeObj = buildMemory(); break;
    case 'paint': modeObj = buildPaint(); break;
    case 'orchestra': modeObj = buildOrchestra(); break;
    default: modeObj = buildPads(8);
  }

  function updateStats(msg){ $('#status').textContent = msg; $('#score').textContent = `Notes played: ${clicks}`; }
  updateStats('Tap, click, or use the keyboard to start.');

  const keyboardMap = 'asdfghjkl;';
  window.addEventListener('keydown', (e)=>{
    const idx = keyboardMap.indexOf(e.key.toLowerCase());
    if(idx >=0){
      const target = interactives.find(o=>o.userData && o.userData.idx===idx) || interactives[idx%interactives.length];
      if(target) handleObject(target);
    }
    if(e.key===' '){ e.preventDefault(); if(cfg.mode==='sequencer') togglePlay(); }
  });

  function cycleSequence(){
    if(cfg.mode!=='sequencer' || !seqGrid.length) return;
    const cols = 8;
    const activeCol = seqStep % cols;
    seqGrid.forEach(cell=>{
      const mat = cell.material;
      mat.emissiveIntensity = cell.userData.active ? 0.16 : 0;
      if(cell.userData.col===activeCol){
        mat.emissiveIntensity += 0.4;
        if(cell.userData.active){ triggerSound(cell.userData.row + activeCol, true); pulse(cell, cell.userData.row); }
      }
    });
    seqStep++;
  }

  function togglePlay(){
    ensureAudio();
    transportStarted = !transportStarted;
    updateStats(transportStarted ? 'Loop running. Press space or Loop to stop.' : 'Loop stopped.');
    $('#loopBtn').textContent = transportStarted ? 'Stop Loop' : 'Start Loop';
  }

  $('#loopBtn').addEventListener('click', togglePlay);
  $('#randomBtn').addEventListener('click', ()=>{
    if(cfg.mode==='sequencer'){
      seqGrid.forEach((cell,i)=>{
        cell.userData.active = Math.random() > 0.62;
        cell.material.color.set(cell.userData.active ? pal[cell.userData.row%pal.length] : new THREE.Color(0x28405c));
        cell.material.emissive.copy(cell.userData.active ? pal[cell.userData.row%pal.length] : new THREE.Color(0x000000));
      });
      updateStats('New pattern generated.');
    } else {
      interactives.forEach((o,i)=> pulse(o,i));
      for(let i=0;i<interactives.length && i<10;i++) setTimeout(()=>triggerSound(i), i*90);
      updateStats('Auto jam fired.');
    }
  });
  $('#tempo').addEventListener('input', (e)=>{
    $('#tempoVal').textContent = e.target.value + ' BPM';
  });
  $('#wet').addEventListener('input', (e)=>{
    if(reverb) reverb.wet.value = Number(e.target.value)/100;
    $('#wetVal').textContent = e.target.value + '%';
  });

  function handleObject(obj){
    clicks++;
    if(obj.userData.type==='toggle'){
      obj.userData.active = !obj.userData.active;
      obj.material.color.set(obj.userData.active ? pal[obj.userData.row%pal.length] : new THREE.Color(0x28405c));
      obj.material.emissive.copy(obj.userData.active ? pal[obj.userData.row%pal.length] : new THREE.Color(0x000000));
      obj.material.emissiveIntensity = obj.userData.active ? .18 : 0;
      triggerSound(obj.userData.row + obj.userData.col);
      pulse(obj, obj.userData.row);
      updateStats(obj.userData.active ? 'Step enabled.' : 'Step muted.');
      return;
    }
    if(obj.userData.type==='slider'){
      obj.position.x = ((Math.random()*2)-1)*4;
      const idx = Math.round(((obj.position.x+4)/8)*7);
      triggerSound(idx, true); pulse(obj, idx); updateStats('Slider jumped to a new note.'); return;
    }
    if(cfg.mode==='memory'){
      memoryInput.push(obj.userData.idx);
      triggerSound(obj.userData.idx);
      pulse(obj, obj.userData.idx);
      if(memoryPattern[memoryInput.length-1] !== obj.userData.idx){
        memoryInput = []; updateStats('Oops! Pattern reset. Watch the glow and try again.');
        playPatternDemo();
      } else if(memoryInput.length===memoryPattern.length){
        memoryInput = []; updateStats('Nice! You matched the rhythm pattern.');
        memoryPattern.push(Math.floor(Math.random()*6));
        setTimeout(playPatternDemo, 350);
      } else updateStats('Good! Keep repeating the pattern.');
      return;
    }
    if(cfg.mode==='spinner'){
      triggerSound(obj.userData.idx, true);
      pulse(obj, obj.userData.idx);
      updateStats('Spin and tap the glowing shapes to morph the sound.');
      return;
    }
    if(cfg.mode==='orchestra'){
      triggerSound(obj.userData.idx);
      try{ if(poly) poly.triggerAttackRelease([noteAt(obj.userData.idx), Tone.Frequency(noteAt(obj.userData.idx)).transpose(7).toNote()], '2n'); }catch(e){}
      pulse(obj, obj.userData.idx);
      updateStats('Mini orchestra hit! Layer more planets for a bigger chord.');
      return;
    }
    triggerSound(obj.userData.idx, true); pulse(obj, obj.userData.idx);
    updateStats('Nice hit. Keep layering sounds.');
  }

  function onPointer(ev){
    const rect = renderer.domElement.getBoundingClientRect();
    const x = (('clientX' in ev ? ev.clientX : ev.touches[0].clientX) - rect.left) / rect.width;
    const y = (('clientY' in ev ? ev.clientY : ev.touches[0].clientY) - rect.top) / rect.height;
    pointer.x = x*2-1; pointer.y = -(y*2-1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(interactives, false);
    if(hits.length) handleObject(hits[0].object);
  }
  renderer.domElement.addEventListener('pointerdown', onPointer);
  renderer.domElement.addEventListener('touchstart', onPointer, {passive:true});

  function playPatternDemo(){
    memoryPattern.forEach((step, i)=> setTimeout(()=>{
      const target = interactives.find(o=>o.userData.idx===step);
      if(target){ pulse(target, step); triggerSound(step); }
    }, i*360));
  }
  if(cfg.mode==='memory') setTimeout(playPatternDemo, 500);

  const infoText = cfg.description || '';
  $('#infoText').textContent = infoText;
  $('#gameTitle').textContent = cfg.title || 'Music World';
  $('#gameEmoji').textContent = cfg.emoji || '🎵';
  $('#backLink').href = cfg.back || '../index.html';
  $('#modeText').textContent = (cfg.mode || 'pads').replace(/-/g,' ');
  $('#instrumentText').textContent = cfg.instrument || 'synth';

  const rotateInput = $('#rotateCam');
  function animate(){
    requestAnimationFrame(animate);
    const dt = clock.getDelta(); t += dt;
    stage.rotation.y += dt*0.08;
    skyline.rotation.y -= dt*0.03;
    ring.rotation.z += dt*0.18;
    starPoints.rotation.y += dt*0.01;

    if(transportStarted && cfg.mode==='sequencer'){
      const bpm = Number($('#tempo').value || 100);
      const stepLen = 60 / bpm / 2;
      if(!animate.nextStep) animate.nextStep = 0;
      if(t > animate.nextStep){ cycleSequence(); animate.nextStep = t + stepLen; }
    }

    if(cfg.mode==='wave' && stars.length){
      stars.forEach((s,i)=>{ s.position.y = 1 + Math.sin(t*2.2 + i*0.35)*1.2; s.scale.setScalar(1 + (Math.sin(t*2 + i)+1)*0.12); });
    }
    if(cfg.mode==='spinner' || cfg.mode==='arpeggio'){
      scene.children.forEach(ch=>{ if(ch.type==='Group' && ch!==skyline){ ch.rotation.y += dt*0.35; } });
    }
    if(cfg.mode==='slider' && modeObj){ modeObj.rotation.y += dt*0.6; }

    pulses = pulses.filter(p=>{
      p.life -= dt*2.8;
      const s = 1 + Math.max(0,p.life)*0.22;
      p.obj.scale.set(p.base.x*s, p.base.y*(1+Math.max(0,p.life)*0.18), p.base.z*s);
      if(p.obj.material && p.obj.material.emissiveIntensity !== undefined) p.obj.material.emissiveIntensity = 0.14 + Math.max(0,p.life)*0.45;
      if(p.life <= 0){ p.obj.scale.copy(p.base); return false; }
      return true;
    });

    const camAngle = t*(Number(rotateInput.checked)*0.18);
    camera.position.x = Math.cos(camAngle)*16;
    camera.position.z = Math.sin(camAngle)*16;
    camera.position.y = 7.6 + Math.sin(t*0.45)*0.6;
    camera.lookAt(0,0.9,0);
    renderer.render(scene, camera);
  }
  animate();
})();
