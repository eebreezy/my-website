
(function(){
  const cfg = window.GAME_CONFIG || {};
  const $ = (s)=>document.querySelector(s);
  document.body.classList.add('clean-ui');
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
  let activeBankIndex = 0;
  let activeOctaveOffset = 0;

  const pal = (cfg.palette||['#7cc7ff','#ff7ad9','#ffd166','#06d6a0']).map(c=>new THREE.Color(c));
  scene.background = new THREE.Color(pal[0]).lerp(new THREE.Color(0x050915), 0.78);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x08111f, 1.25);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.55);
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


  function applyCleanLabels(){
    const txt = (sel,val)=>{ const el=$(sel); if(el) el.textContent = val; };
    txt('#gameTitle','');
    txt('#infoText','');
    txt('#modeText','');
    txt('#instrumentText','');
    txt('#status','');
    txt('#score','♪ 0');
    const setBtn=(id,val,aria)=>{ const el=$(id); if(!el) return; el.textContent=val; el.setAttribute('aria-label', aria); el.title = aria; };
    setBtn('#loopBtn','▶','Loop');
    setBtn('#randomBtn','✦','Auto Jam');
    setBtn('#soundBtn','♫','Sound Set');
    const back=$('#backLink'); if(back){ back.textContent=''; back.setAttribute('aria-label','Home'); back.title='Home'; }
  }
  applyCleanLabels();

  function fit(){
    const wrap = $('#three');
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w,h,false);
    camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', fit); fit();

  const ToneOK = ()=> typeof Tone !== 'undefined';
  let reverb, delay, accentSynth, accentNoise;
  const players = {};
  const bankLabels = {
    piano:'Grand Piano', organ:'Church Organ', bells:'Tubular Bells', musicBox:'Music Box',
    marimba:'Marimba', xylophone:'Xylophone', vibraphone:'Vibraphone', guitar:'Nylon Guitar',
    harp:'Orchestral Harp', bass:'Acoustic Bass', cello:'Cello', violin:'Violin', flute:'Flute',
    clarinet:'Clarinet', trumpet:'Trumpet', choir:'Choir', taiko:'Taiko Drum', timpani:'Timpani',
    woodblock:'Woodblock', steelDrums:'Steel Drums'
  };
  const base = 'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM/';
  const commonUrls = {
    C2:'C2.mp3', F2:'F2.mp3', A2:'A2.mp3', C3:'C3.mp3', F3:'F3.mp3', A3:'A3.mp3',
    C4:'C4.mp3', F4:'F4.mp3', A4:'A4.mp3', C5:'C5.mp3', F5:'F5.mp3', A5:'A5.mp3'
  };
  const BANKS = {
    piano:{ baseUrl: base + 'acoustic_grand_piano-mp3/', urls: commonUrls },
    organ:{ baseUrl: base + 'church_organ-mp3/', urls: commonUrls },
    bells:{ baseUrl: base + 'tubular_bells-mp3/', urls: commonUrls },
    musicBox:{ baseUrl: base + 'music_box-mp3/', urls: commonUrls },
    marimba:{ baseUrl: base + 'marimba-mp3/', urls: commonUrls },
    xylophone:{ baseUrl: base + 'xylophone-mp3/', urls: commonUrls },
    vibraphone:{ baseUrl: base + 'vibraphone-mp3/', urls: commonUrls },
    guitar:{ baseUrl: base + 'acoustic_guitar_nylon-mp3/', urls: commonUrls },
    harp:{ baseUrl: base + 'orchestral_harp-mp3/', urls: commonUrls },
    bass:{ baseUrl: base + 'acoustic_bass-mp3/', urls: {C2:'C2.mp3', F2:'F2.mp3', A2:'A2.mp3', C3:'C3.mp3', F3:'F3.mp3', A3:'A3.mp3', C4:'C4.mp3'} },
    cello:{ baseUrl: base + 'cello-mp3/', urls: {C2:'C2.mp3', F2:'F2.mp3', A2:'A2.mp3', C3:'C3.mp3', F3:'F3.mp3', A3:'A3.mp3', C4:'C4.mp3', F4:'F4.mp3'} },
    violin:{ baseUrl: base + 'violin-mp3/', urls: commonUrls },
    flute:{ baseUrl: base + 'flute-mp3/', urls: commonUrls },
    clarinet:{ baseUrl: base + 'clarinet-mp3/', urls: commonUrls },
    trumpet:{ baseUrl: base + 'trumpet-mp3/', urls: commonUrls },
    choir:{ baseUrl: base + 'choir_aahs-mp3/', urls: commonUrls },
    taiko:{ baseUrl: base + 'taiko_drum-mp3/', urls: {C2:'C2.mp3', F2:'F2.mp3', A2:'A2.mp3', C3:'C3.mp3', F3:'F3.mp3'} },
    timpani:{ baseUrl: base + 'timpani-mp3/', urls: {C2:'C2.mp3', F2:'F2.mp3', A2:'A2.mp3', C3:'C3.mp3', F3:'F3.mp3'} },
    woodblock:{ baseUrl: base + 'woodblock-mp3/', urls: {C4:'C4.mp3', F4:'F4.mp3', A4:'A4.mp3', C5:'C5.mp3'} },
    steelDrums:{ baseUrl: base + 'steel_drums-mp3/', urls: commonUrls }
  };

  function setupAudio(){
    if(!ToneOK()) return;
    reverb = new Tone.Reverb({decay:2.8, wet:0.24}).toDestination();
    delay = new Tone.PingPongDelay('8n', 0.18).connect(reverb);
    accentSynth = new Tone.Synth({oscillator:{type:'triangle8'}, envelope:{attack:0.002, decay:0.08, sustain:0.02, release:0.15}}).connect(delay);
    accentNoise = new Tone.NoiseSynth({noise:{type:'pink'}, envelope:{attack:0.001, decay:0.06, sustain:0}}).connect(reverb);
  }
  setupAudio();

  function getBankCycle(){
    return (cfg.bankSet && cfg.bankSet.length ? cfg.bankSet : ['piano']).filter(Boolean);
  }
  function currentBankName(){
    const cycle = getBankCycle();
    return cycle[activeBankIndex % cycle.length] || 'piano';
  }
  function ensureSampler(name){
    if(!ToneOK()) return null;
    if(players[name]) return players[name];
    const def = BANKS[name] || BANKS.piano;
    players[name] = new Tone.Sampler({ urls:def.urls, baseUrl:def.baseUrl, attack:0.003, release:1.2 }).connect(reverb);
    return players[name];
  }
  async function ensureAudio(){
    try{ if(ToneOK() && Tone.context.state !== 'running') await Tone.start(); }catch(e){}
    ensureSampler(currentBankName());
  }

  const noteSets = {
    default:['C3','D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4','A4','B4','C5','D5'],
    bass:['C2','D2','E2','F2','G2','A2','B2','C3','D3','E3','F3','G3','A3','B3'],
    bells:['C4','D4','E4','G4','A4','B4','C5','D5','E5','G5','A5','C6'],
    strings:['G2','A2','B2','C3','D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4'],
    winds:['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5','A5'],
    choir:['A3','B3','C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5']
  };
  function activeNotePool(){
    const bank = currentBankName();
    if(['bass','taiko','timpani','woodblock'].includes(bank)) return noteSets.bass;
    if(['bells','musicBox','vibraphone','marimba','xylophone','steelDrums'].includes(bank)) return noteSets.bells;
    if(['guitar','harp','violin','cello'].includes(bank)) return noteSets.strings;
    if(['flute','clarinet','trumpet'].includes(bank)) return noteSets.winds;
    if(['choir','organ'].includes(bank)) return noteSets.choir;
    return noteSets.default;
  }
  function shiftNote(note, semis){
    try { return Tone.Frequency(note).transpose(semis).toNote(); }
    catch(e){ return note; }
  }
  function noteAt(i){
    const pool = activeNotePool();
    const idx = ((i % pool.length) + pool.length) % pool.length;
    return shiftNote(pool[idx], activeOctaveOffset * 12);
  }
  function accent(i, strong){
    if(!accentSynth || !accentNoise) return;
    try{
      accentSynth.volume.value = strong ? -18 : -24;
      accentSynth.triggerAttackRelease(noteAt(i), strong ? '32n' : '64n');
      if(strong) accentNoise.triggerAttackRelease('64n');
    }catch(e){}
  }
  function triggerSound(i, strong=false){
    ensureAudio();
    const sampler = ensureSampler(currentBankName());
    const note = noteAt(i);
    const vel = strong ? 0.95 : 0.72;
    try{
      if(cfg.mode==='chords' || cfg.mode==='orchestra'){
        const third = shiftNote(note, 4);
        const fifth = shiftNote(note, 7);
        sampler.triggerAttackRelease([note, third, fifth], strong ? '2n' : '4n', undefined, vel);
      } else if(cfg.mode==='sequencer') {
        sampler.triggerAttackRelease(note, '8n', undefined, vel);
      } else if(cfg.mode==='spinner' || cfg.mode==='arpeggio') {
        sampler.triggerAttackRelease(note, '8n', undefined, vel);
        setTimeout(()=>{ try{ sampler.triggerAttackRelease(shiftNote(note, 7), '16n', undefined, vel*0.75); }catch(e){} }, 120);
      } else if(cfg.mode==='slider') {
        sampler.triggerAttackRelease(note, '2n', undefined, vel);
      } else {
        sampler.triggerAttackRelease(note, strong ? '4n' : '8n', undefined, vel);
      }
      accent(i, strong);
    }catch(e){}
  }

  function pulse(obj, colorIndex=0){
    pulses.push({obj, life:1, base:obj.scale.clone()});
    if(obj.material && obj.material.emissive) obj.material.emissive.copy(pal[colorIndex%pal.length]);
  }

  function buildPads(n=12){
    const g = new THREE.Group();
    const cols = 4;
    for(let i=0;i<n;i++){
      const row = Math.floor(i/cols), col = i%cols;
      const mat = new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:0.15, metalness:.18, roughness:.35});
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.9,0.7,1.9), mat);
      m.position.set((col-(cols-1)/2)*2.45, -0.2, (row-(Math.ceil(n/cols)-1)/2)*2.55);
      m.castShadow = m.receiveShadow = true; m.userData = {idx:i,type:'sound'};
      interactives.push(m); g.add(m);
    }
    scene.add(g); return g;
  }
  function buildKeyboard(n=14){
    const g = new THREE.Group();
    for(let i=0;i<n;i++){
      const mat = new THREE.MeshStandardMaterial({color:i%2?0xf8fbff:0xd7eaff, emissive:pal[i%pal.length], emissiveIntensity:0.08, metalness:.08, roughness:.28});
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.92,0.55,4.2), mat);
      m.position.set((i-(n-1)/2)*0.96, -0.1, 0);
      m.castShadow = m.receiveShadow = true; m.userData = {idx:i,type:'sound'};
      interactives.push(m); g.add(m);
    }
    scene.add(g); return g;
  }
  function buildXylophone(n=10){
    const g = new THREE.Group();
    for(let i=0;i<n;i++){
      const len = 5.1 - i*0.28;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.66,0.4,len), new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:0.14, metalness:.2, roughness:.38}));
      m.position.set((i-(n-1)/2)*0.85, 0.1, 0); m.rotation.x = 0.08;
      m.castShadow = m.receiveShadow = true; m.userData = {idx:i,type:'sound'};
      interactives.push(m); g.add(m);
    }
    g.rotation.y = 0.25; scene.add(g); return g;
  }
  function buildStrings(n=8){
    const g = new THREE.Group();
    for(let i=0;i<n;i++){
      const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-4.2,3.1-i*0.78,0), new THREE.Vector3(0,2.6-i*0.78,0.3), new THREE.Vector3(4.2,3.1-i*0.78,0)]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(c, 64, 0.04, 8, false), new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:.25}));
      tube.userData = {idx:i,type:'sound'}; interactives.push(tube); g.add(tube);
    }
    const frame = new THREE.Mesh(new THREE.TorusKnotGeometry(2.9,0.12,120,10), new THREE.MeshStandardMaterial({color:0xffffff,metalness:.3,roughness:.4, emissive:pal[1], emissiveIntensity:.06}));
    frame.scale.set(1.55,1.1,0.4); g.add(frame); g.position.y = 0.4; scene.add(g); return g;
  }
  function buildSequencer(rows=4, cols=10){
    const g = new THREE.Group(); seqGrid = [];
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const active = (r+c)%5===0;
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.92,0.45,0.92), new THREE.MeshStandardMaterial({color: active? pal[r%pal.length]: new THREE.Color(0x28405c), emissive: active? pal[r%pal.length]: new THREE.Color(0x000000), emissiveIntensity: active? .18:0, metalness:.2, roughness:.38}));
        m.position.set((c-(cols-1)/2)*1.08, r*0.65-0.5, 0);
        m.userData = {idx:r*cols+c,row:r,col:c,type:'toggle',active};
        interactives.push(m); g.add(m); seqGrid.push(m);
      }
    }
    g.rotation.x = -0.55; scene.add(g); return g;
  }
  function buildWave(){
    const group = new THREE.Group();
    for(let i=0;i<24;i++){
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:.16}));
      m.position.set((i-12)*0.64, 0, 0); m.userData={idx:i,type:'sound'}; interactives.push(m); group.add(m); stars.push(m);
    }
    group.position.y = 1; scene.add(group); return group;
  }
  function buildArpeggio(){
    const g = new THREE.Group();
    for(let i=0;i<12;i++){
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62,0), new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:.15, metalness:.25, roughness:.35}));
      const a = (i/12)*Math.PI*2;
      m.position.set(Math.cos(a)*4.2, 0.6 + Math.sin(i)*0.4, Math.sin(a)*4.2);
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
    for(let i=0;i<16;i++){
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,0.8), new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:.14}));
      m.position.set((i-7.5)*0.92, 0.5, Math.sin(i*0.65)*1.8); m.userData={idx:i,type:'sound'}; interactives.push(m); g.add(m);
    }
    scene.add(g); return g;
  }
  function buildMemory(){ const g = buildPads(8); memoryPattern = [0,2,4,1].map(v=>v%8); return g; }
  function buildOrchestra(){
    const g = new THREE.Group();
    for(let i=0;i<10;i++){
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.72,24,24), new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:.2}));
      const a=(i/10)*Math.PI*2;
      m.position.set(Math.cos(a)*4.2, 1+Math.sin(i)*.4, Math.sin(a)*4.2); m.userData={idx:i,type:'sound'}; interactives.push(m); g.add(m);
    }
    scene.add(g); return g;
  }

  let modeObj;
  switch(cfg.mode){
    case 'pads': modeObj = buildPads(12); break;
    case 'keyboard': modeObj = buildKeyboard(14); break;
    case 'xylophone': modeObj = buildXylophone(10); break;
    case 'sequencer': modeObj = buildSequencer(4,10); break;
    case 'strings': modeObj = buildStrings(8); break;
    case 'wave': modeObj = buildWave(); break;
    case 'chords': modeObj = buildPads(8); break;
    case 'spinner': modeObj = buildArpeggio(); break;
    case 'arpeggio': modeObj = buildArpeggio(); break;
    case 'slider': modeObj = buildSlider(); break;
    case 'memory': modeObj = buildMemory(); break;
    case 'paint': modeObj = buildPaint(); break;
    case 'orchestra': modeObj = buildOrchestra(); break;
    default: modeObj = buildPads(12);
  }

  function updateInstrumentLabel(){
    const pool = activeNotePool();
    $('#instrumentText').textContent = (bankLabels[currentBankName()] || currentBankName()) + ' • ' + pool.length + ' notes';
  }
  function updateStats(msg){ $('#status').textContent = msg; $('#score').textContent = `♪ ${clicks}`; }
  updateStats('Tap, click, or use the keyboard to start.');

  const keyboardMap = 'asdfghjkl;zxcv';
  window.addEventListener('keydown', (e)=>{
    const idx = keyboardMap.indexOf(e.key.toLowerCase());
    if(idx >=0){
      const target = interactives.find(o=>o.userData && o.userData.idx===idx) || interactives[idx%interactives.length];
      if(target) handleObject(target);
    }
    if(e.key===' '){ e.preventDefault(); if(cfg.mode==='sequencer') togglePlay(); }
    if(e.key==='q'){ activeOctaveOffset = Math.max(-1, activeOctaveOffset-1); updateInstrumentLabel(); updateStats('Lower octave selected.'); }
    if(e.key==='e'){ activeOctaveOffset = Math.min(1, activeOctaveOffset+1); updateInstrumentLabel(); updateStats('Higher octave selected.'); }
  });

  function cycleSequence(){
    if(cfg.mode!=='sequencer' || !seqGrid.length) return;
    const cols = 10;
    const activeCol = seqStep % cols;
    seqGrid.forEach(cell=>{
      const mat = cell.material;
      mat.emissiveIntensity = cell.userData.active ? 0.16 : 0;
      if(cell.userData.col===activeCol){
        mat.emissiveIntensity += 0.4;
        if(cell.userData.active){ triggerSound(cell.userData.row*2 + activeCol, true); pulse(cell, cell.userData.row); }
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
  function cycleBank(){
    const cycle = getBankCycle();
    activeBankIndex = (activeBankIndex + 1) % cycle.length;
    ensureSampler(currentBankName());
    updateInstrumentLabel();
    updateStats('Sound changed to ' + (bankLabels[currentBankName()] || currentBankName()) + '.');
  }
  $('#loopBtn').addEventListener('click', togglePlay);
  if($('#soundBtn')) $('#soundBtn').addEventListener('click', cycleBank);
  $('#randomBtn').textContent = 'Auto Jam';
  $('#randomBtn').addEventListener('click', ()=>{
    if(cfg.mode==='sequencer'){
      seqGrid.forEach((cell)=>{
        cell.userData.active = Math.random() > 0.54;
        cell.material.color.set(cell.userData.active ? pal[cell.userData.row%pal.length] : new THREE.Color(0x28405c));
        cell.material.emissive.copy(cell.userData.active ? pal[cell.userData.row%pal.length] : new THREE.Color(0x000000));
      });
      updateStats('New pattern generated.');
    } else {
      interactives.forEach((o,i)=> pulse(o,i));
      for(let i=0;i<interactives.length && i<16;i++) setTimeout(()=>triggerSound(i, i%3===0), i*85);
      updateStats('Auto jam fired.');
    }
  });
  $('#tempo').addEventListener('input', (e)=>{ $('#tempoVal').textContent = e.target.value + ' BPM'; });
  $('#wet').addEventListener('input', (e)=>{ if(reverb) reverb.wet.value = Number(e.target.value)/100; $('#wetVal').textContent = e.target.value + '%'; });

  function handleObject(obj){
    clicks++;
    if(obj.userData.type==='toggle'){
      obj.userData.active = !obj.userData.active;
      obj.material.color.set(obj.userData.active ? pal[obj.userData.row%pal.length] : new THREE.Color(0x28405c));
      obj.material.emissive.copy(obj.userData.active ? pal[obj.userData.row%pal.length] : new THREE.Color(0x000000));
      obj.material.emissiveIntensity = obj.userData.active ? .18 : 0;
      triggerSound(obj.userData.row + obj.userData.col);
      pulse(obj, obj.userData.row); updateStats(obj.userData.active ? 'Step enabled.' : 'Step muted.'); return;
    }
    if(obj.userData.type==='slider'){
      obj.position.x = ((Math.random()*2)-1)*4;
      const idx = Math.round(((obj.position.x+4)/8)*11);
      triggerSound(idx, true); pulse(obj, idx); updateStats('Slider jumped to a new note.'); return;
    }
    if(cfg.mode==='memory'){
      memoryInput.push(obj.userData.idx); triggerSound(obj.userData.idx); pulse(obj, obj.userData.idx);
      if(memoryPattern[memoryInput.length-1] !== obj.userData.idx){ memoryInput = []; updateStats('Oops! Pattern reset. Watch the glow and try again.'); playPatternDemo(); }
      else if(memoryInput.length===memoryPattern.length){ memoryInput = []; updateStats('Nice! You matched the rhythm pattern.'); memoryPattern.push(Math.floor(Math.random()*8)); setTimeout(playPatternDemo, 350); }
      else updateStats('Good! Keep repeating the pattern.'); return;
    }
    if(cfg.mode==='spinner'){ triggerSound(obj.userData.idx, true); pulse(obj, obj.userData.idx); updateStats('Spin and tap the glowing shapes to morph the sound.'); return; }
    if(cfg.mode==='orchestra'){
      triggerSound(obj.userData.idx); const cycle = getBankCycle(); const extra = cycle[(activeBankIndex+1)%cycle.length];
      try{ ensureSampler(extra).triggerAttackRelease([noteAt(obj.userData.idx), shiftNote(noteAt(obj.userData.idx),7)], '2n', undefined, 0.6); }catch(e){}
      pulse(obj, obj.userData.idx); updateStats('Mini orchestra hit! Layer more planets for a bigger chord.'); return;
    }
    triggerSound(obj.userData.idx, true); pulse(obj, obj.userData.idx); updateStats('Nice hit. Keep layering sounds.');
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
    memoryPattern.forEach((step, i)=> setTimeout(()=>{ const target = interactives.find(o=>o.userData.idx===step); if(target){ pulse(target, step); triggerSound(step); } }, i*360));
  }
  if(cfg.mode==='memory') setTimeout(playPatternDemo, 500);

  $('#infoText').textContent = cfg.description || '';
  $('#gameTitle').textContent = cfg.title || 'Music World';
  $('#gameEmoji').textContent = cfg.emoji || '🎵';
  $('#backLink').href = cfg.back || '../index.html';
  $('#modeText').textContent = (cfg.mode || 'pads').replace(/-/g,' ');
  updateInstrumentLabel();

  const rotateInput = $('#rotateCam');
  function animate(){
    requestAnimationFrame(animate);
    const dt = clock.getDelta(); t += dt;
    stage.rotation.y += dt*0.08; skyline.rotation.y -= dt*0.03; ring.rotation.z += dt*0.18; starPoints.rotation.y += dt*0.01;
    if(transportStarted && cfg.mode==='sequencer'){
      const bpm = Number($('#tempo').value || 100); const stepLen = 60 / bpm / 2;
      if(!animate.nextStep) animate.nextStep = 0;
      if(t > animate.nextStep){ cycleSequence(); animate.nextStep = t + stepLen; }
    }
    if(cfg.mode==='wave' && stars.length){ stars.forEach((s,i)=>{ s.position.y = 1 + Math.sin(t*2.2 + i*0.35)*1.2; s.scale.setScalar(1 + (Math.sin(t*2 + i)+1)*0.12); }); }
    if(cfg.mode==='spinner' || cfg.mode==='arpeggio'){ scene.children.forEach(ch=>{ if(ch.type==='Group' && ch!==skyline){ ch.rotation.y += dt*0.35; } }); }
    if(cfg.mode==='slider' && modeObj){ modeObj.rotation.y += dt*0.6; }
    pulses = pulses.filter(p=>{ p.life -= dt*2.8; const s = 1 + Math.max(0,p.life)*0.22; p.obj.scale.set(p.base.x*s, p.base.y*(1+Math.max(0,p.life)*0.18), p.base.z*s); if(p.obj.material && p.obj.material.emissiveIntensity !== undefined) p.obj.material.emissiveIntensity = 0.14 + Math.max(0,p.life)*0.45; if(p.life <= 0){ p.obj.scale.copy(p.base); return false; } return true; });
    const camAngle = t*(Number(rotateInput.checked)*0.18);
    camera.position.x = Math.cos(camAngle)*16; camera.position.z = Math.sin(camAngle)*16; camera.position.y = 7.6 + Math.sin(t*0.45)*0.6; camera.lookAt(0,0.9,0);
    renderer.render(scene, camera);
  }
  animate();
})();
