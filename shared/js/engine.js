
(function(){
  const cfg = window.GAME_CONFIG || {};
  const $ = (s)=>document.querySelector(s);
  const isTouchDevice = matchMedia('(pointer:coarse)').matches || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const isSmallScreen = Math.min(screen.width || innerWidth, screen.height || innerHeight) <= 1024;
  const mobileOnlyMode = true;
  if(mobileOnlyMode && !(isTouchDevice && isSmallScreen)) { document.documentElement.classList.add('desktop-block'); const note = document.createElement('div'); note.className='mobile-only-note'; note.textContent='This version is mobile-only. Open it on a phone or tablet.'; document.body.appendChild(note); }
  const safeText = (sel,val)=>{ const el=$(sel); if(el) el.textContent = val; };
  document.body.classList.add('clean-ui');

  if (typeof THREE === 'undefined') {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#08111f;color:#fff;font-family:system-ui;padding:20px;text-align:center">3D engine failed to load. Refresh the page.</div>';
    return;
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x08111f, 0.03);
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, powerPreference:'high-performance'});
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0x000000, 0);
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
  let audioReady = false;
  let audioInitPromise = null;
  let fallbackCtx = null;
  let masterGain = null;
  let fallbackReady = false;
  let audioUnlockAttempted = false;
  let toneReady = false;
  let tonePreferred = true;

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
      new THREE.MeshStandardMaterial({
        color:pal[i%pal.length].clone().offsetHSL((i*0.03)%1,0,0.02),
        emissive:pal[i%pal.length], emissiveIntensity:0.08, metalness:.2, roughness:.65
      })
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
    safeText('#gameTitle','');
    safeText('#infoText','');
    safeText('#modeText','');
    safeText('#instrumentText','');
    safeText('#status','');
    safeText('#score','♪ 0');
    const setBtn=(id,val,aria)=>{
      const el=$(id); if(!el) return;
      el.textContent=val; el.setAttribute('aria-label', aria); el.title = aria;
    };
    setBtn('#loopBtn','▶','Loop');
    setBtn('#randomBtn','✦','Auto Jam');
    setBtn('#soundBtn','♫','Sound Set');
    const back=$('#backLink');
    if(back){ back.textContent=''; back.setAttribute('aria-label','Home'); back.title='Home'; }
  }
  applyCleanLabels();

  function fit(){
    const vv = window.visualViewport;
    const wrap = $('#three');
    const w = Math.max(1, Math.round(window.innerWidth || (vv && vv.width) || wrap.clientWidth || 1));
    const h = Math.max(1, Math.round(window.innerHeight || (vv && vv.height) || wrap.clientHeight || 1));
    const dpr = Math.min(window.devicePixelRatio || 1, w <= 600 ? 1 : 1.15);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w,h,false);
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', fit, {passive:true});
  if(window.visualViewport) window.visualViewport.addEventListener('resize', fit, {passive:true});
  if(window.ResizeObserver){
    const ro = new ResizeObserver(fit);
    const host = $('#three');
    if(host) ro.observe(host);
  }
  fit();

  const ToneOK = ()=> typeof Tone !== 'undefined';
  let reverb, delay, toneBus, fxSend, compressor, limiter, accentSynth;
  const players = {};
  const playerState = {};

  const bankLabels = {
    piano:'Grand Piano', organ:'Church Organ', bells:'Tubular Bells', musicBox:'Music Box',
    marimba:'Marimba', xylophone:'Xylophone', vibraphone:'Vibraphone', guitar:'Nylon Guitar',
    harp:'Orchestral Harp', bass:'Acoustic Bass', cello:'Cello', violin:'Violin', flute:'Flute',
    clarinet:'Clarinet', trumpet:'Trumpet', choir:'Choir', taiko:'Taiko Drum', timpani:'Timpani',
    woodblock:'Woodblock', steelDrums:'Steel Drums'
  };

  const supportedBanks = {
    piano:{ type:'sample' },
    organ:{ type:'sample' },
    bells:{ type:'sample' },
    musicBox:{ type:'sample' },
    marimba:{ type:'sample' },
    xylophone:{ type:'sample' },
    vibraphone:{ type:'sample' },
    guitar:{ type:'sample' },
    harp:{ type:'sample' },
    bass:{ type:'sample' },
    cello:{ type:'sample' },
    violin:{ type:'sample' },
    flute:{ type:'sample' },
    clarinet:{ type:'sample' },
    trumpet:{ type:'sample' },
    choir:{ type:'sample' },
    taiko:{ type:'drum' },
    timpani:{ type:'drum' },
    woodblock:{ type:'drum' },
    steelDrums:{ type:'sample' }
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
    steelDrums:{ baseUrl: base + 'steel_drums-mp3/', urls: commonUrls }
  };

  function setupAudioFX(){
    if(!ToneOK()) return;
    if(toneBus) return;
    toneBus = new Tone.Gain(0.9);
    compressor = new Tone.Compressor(-20, 3);
    limiter = new Tone.Limiter(-1);
    toneBus.chain(compressor, limiter, Tone.Destination);
    reverb = new Tone.Reverb({decay:1.8, wet:0.16});
    delay = new Tone.PingPongDelay('8n', 0.08);
    fxSend = new Tone.Gain(0.16);
    delay.connect(reverb);
    fxSend.connect(delay);
    reverb.connect(toneBus);
    accentSynth = new Tone.Synth({
      oscillator:{type:'triangle'},
      envelope:{attack:0.012, decay:0.06, sustain:0.0, release:0.12}
    });
    accentSynth.connect(toneBus);
  }

  function setupFallbackAudio(){
    try{
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) return;
      fallbackCtx = fallbackCtx || new Ctx();
      masterGain = masterGain || fallbackCtx.createGain();
      masterGain.gain.value = 0.15;
      try{ masterGain.disconnect(); }catch(e){}
      masterGain.connect(fallbackCtx.destination);
      fallbackReady = true;
    }catch(e){}
  }

  function pokeSilentBuffer(){
    if(!fallbackCtx || !masterGain) return;
    try{
      const buffer = fallbackCtx.createBuffer(1, 1, fallbackCtx.sampleRate);
      const src = fallbackCtx.createBufferSource();
      const g = fallbackCtx.createGain();
      g.gain.value = 0.00001;
      src.buffer = buffer;
      src.connect(g);
      g.connect(masterGain);
      src.start(0);
    }catch(e){}
  }

  function unlockAudioNow(){
    setupFallbackAudio();
    audioUnlockAttempted = true;
    try{ if(fallbackCtx && fallbackCtx.state === 'suspended') fallbackCtx.resume(); }catch(e){}
    pokeSilentBuffer();
    if(ToneOK()) {
      try{ Tone.start(); toneReady = true; }catch(e){}
      try{ if(Tone.context && Tone.context.state === 'suspended') Tone.context.resume(); }catch(e){}
      setupAudioFX();
      createSampler(currentBankName()).catch(()=>{});
    }
    audioReady = fallbackReady || toneReady;
    return audioReady;
  }

  function midiFreq(note){
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(note);
    if(!m) return 440;
    const map = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
    let n = map[m[1]] + (m[2]==='#' ? 1 : (m[2]==='b' ? -1 : 0));
    let octave = parseInt(m[3],10);
    let midi = (octave + 1) * 12 + n;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function fallbackPlay(note, bankName, strong){
    if(!fallbackReady || !fallbackCtx || !masterGain) return;
    const now = fallbackCtx.currentTime + 0.001;
    const freq = midiFreq(note);
    const type = (supportedBanks[bankName] && supportedBanks[bankName].type) || 'sample';

    if(type === 'drum'){
      const osc = fallbackCtx.createOscillator();
      const gain = fallbackCtx.createGain();
      const filter = fallbackCtx.createBiquadFilter();
      filter.type = bankName === 'woodblock' ? 'highpass' : 'lowpass';
      filter.frequency.value = bankName === 'woodblock' ? 1800 : 600;
      osc.type = bankName === 'timpani' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(bankName === 'woodblock' ? 950 : (bankName === 'taiko' ? 130 : 180), now);
      osc.frequency.exponentialRampToValueAtTime(bankName === 'woodblock' ? 350 : 55, now + 0.12);
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(strong ? 0.22 : 0.15, now + 0.012);
      gain.gain.setTargetAtTime(0.0001, now + 0.03, 0.06);
      osc.connect(filter); filter.connect(gain); gain.connect(masterGain);
      osc.start(now); osc.stop(now + 0.2);

      const buffer = fallbackCtx.createBuffer(1, fallbackCtx.sampleRate * 0.08, fallbackCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0;i<data.length;i++) data[i] = (Math.random()*2-1) * Math.pow(1 - i/data.length, 2);
      const noise = fallbackCtx.createBufferSource();
      const ng = fallbackCtx.createGain();
      noise.buffer = buffer;
      ng.gain.setValueAtTime(0.0001, now);
      ng.gain.linearRampToValueAtTime(bankName === 'woodblock' ? 0.012 : 0.03, now + 0.006);
      ng.gain.setTargetAtTime(0.0001, now + 0.015, 0.025);
      noise.connect(ng); ng.connect(masterGain);
      noise.start(now);
      return;
    }

    const osc1 = fallbackCtx.createOscillator();
    const osc2 = fallbackCtx.createOscillator();
    const gain = fallbackCtx.createGain();
    const filter = fallbackCtx.createBiquadFilter();

    const toneMap = {
      organ:['square','square',1200],
      bells:['sine','triangle',2600],
      musicBox:['triangle','sine',2200],
      marimba:['triangle','triangle',1800],
      xylophone:['triangle','sine',2000],
      vibraphone:['sine','triangle',2400],
      guitar:['triangle','sawtooth',1500],
      harp:['triangle','sine',1700],
      bass:['triangle','square',700],
      cello:['sawtooth','triangle',1000],
      violin:['sawtooth','sawtooth',1600],
      flute:['sine','triangle',2200],
      clarinet:['square','triangle',1300],
      trumpet:['sawtooth','square',1500],
      choir:['triangle','sine',1200],
      steelDrums:['sine','sine',2600],
      piano:['triangle','square',1400]
    };
    const shape = toneMap[bankName] || toneMap.piano;
    osc1.type = shape[0];
    osc2.type = shape[1];
    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 2.0;
    filter.type = 'lowpass';
    filter.frequency.value = shape[2];
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(strong ? 0.10 : 0.072, now + 0.02);
    gain.gain.setTargetAtTime(0.0001, now + 0.11, bankName === 'organ' || bankName === 'choir' ? 0.5 : 0.28);
    osc1.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(masterGain);
    osc1.start(now); osc2.start(now);
    osc1.stop(now + 1.2); osc2.stop(now + 1.2);
  }

  function setupAudio(){
    setupAudioFX();
    setupFallbackAudio();
  }
  setupAudio();

  function getBankCycle(){
    return (cfg.bankSet && cfg.bankSet.length ? cfg.bankSet : ['piano']).filter(Boolean);
  }
  function currentBankName(){
    const cycle = getBankCycle();
    return cycle[activeBankIndex % cycle.length] || 'piano';
  }

  async function createSampler(name){
    if(!ToneOK() || !reverb || !(name in BANKS)) return null;
    if(players[name]) return players[name];
    if(playerState[name] === 'failed') return null;
    playerState[name] = 'loading';
    try{
      players[name] = await new Promise((resolve, reject)=>{
        const sampler = new Tone.Sampler({
          urls: BANKS[name].urls,
          baseUrl: BANKS[name].baseUrl,
          attack: 0.012,
          release: 0.8,
          curve: 'linear',
          onload: ()=>resolve(sampler),
          onerror: (err)=>reject(err || new Error('sample load failed'))
        });
        if(toneBus) sampler.connect(toneBus);
        if(fxSend) sampler.connect(fxSend);
        setTimeout(()=>reject(new Error('sample timeout')), 4000);
      });
      playerState[name] = 'ready';
      return players[name];
    }catch(e){
      playerState[name] = 'failed';
      delete players[name];
      return null;
    }
  }

  async function initAudio(){
    if(audioReady) return true;
    if(audioInitPromise) return audioInitPromise;
    audioInitPromise = Promise.resolve(unlockAudioNow());
    return audioInitPromise;
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
    try {
      if(ToneOK()) return Tone.Frequency(note).transpose(semis).toNote();
    } catch(e){}
    const order = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(note);
    if(!m) return note;
    let key = m[1] + (m[2] || '');
    if (key.includes('b')) {
      const flats = {'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#'};
      key = flats[key] || key[0];
    }
    let idx = order.indexOf(key);
    let oct = parseInt(m[3],10);
    let total = idx + semis;
    while(total < 0){ total += 12; oct--; }
    while(total >= 12){ total -= 12; oct++; }
    return order[total] + oct;
  }
  function noteAt(i){
    const pool = activeNotePool();
    const idx = ((i % pool.length) + pool.length) % pool.length;
    return shiftNote(pool[idx], activeOctaveOffset * 12);
  }

  async function accent(i, strong){
    if(!audioReady) initAudio();
    if(accentSynth && strong && (clicks % 7 === 0) && !/iPhone|iPad|iPod/i.test(navigator.userAgent)){
      try{
        accentSynth.volume.value = -34;
        accentSynth.triggerAttackRelease(noteAt(i), '96n');
        return;
      }catch(e){}
    }
  }

  async function triggerSound(i, strong=false){
    if(!audioReady) initAudio();
    const note = noteAt(i);
    const bankName = currentBankName();
    const vel = strong ? 0.95 : 0.72;
    let played = false;

    if(ToneOK() && tonePreferred){
      try{
        const sampler = await createSampler(bankName);
        if(sampler){
          if(cfg.mode==='chords' || cfg.mode==='orchestra'){
            const third = shiftNote(note, 4);
            const fifth = shiftNote(note, 7);
            sampler.triggerAttackRelease([note, third, fifth], strong ? 0.55 : 0.42, undefined, vel);
          } else if(cfg.mode==='sequencer') {
            sampler.triggerAttackRelease(note, 0.22, undefined, vel);
          } else if(cfg.mode==='spinner' || cfg.mode==='arpeggio') {
            sampler.triggerAttackRelease(note, 0.22, undefined, vel);
            setTimeout(async()=>{
              try {
                const s2 = await createSampler(bankName);
                if (s2) s2.triggerAttackRelease(shiftNote(note, 7), 0.14, undefined, vel*0.68);
              } catch(e){}
            }, 120);
          } else if(cfg.mode==='slider') {
            sampler.triggerAttackRelease(note, 0.5, undefined, vel);
          } else {
            sampler.triggerAttackRelease(note, strong ? 0.34 : 0.24, undefined, vel);
          }
          played = true; toneReady = true;
        }
      }catch(e){}
    }

    if(!played || (fallbackCtx && fallbackCtx.state !== 'running')) fallbackPlay(note, bankName, strong);
    accent(i, strong);
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
      const len = 3.8 - i*0.18;
      const mat = new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:0.12, metalness:.12, roughness:.3});
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.82,0.38,len), mat);
      m.rotation.z = -0.08;
      m.position.set((i-(n-1)/2)*0.94, 0, (i%2?0.18:-0.18));
      m.castShadow = m.receiveShadow = true; m.userData = {idx:i,type:'sound'};
      interactives.push(m); g.add(m);
    }
    scene.add(g); return g;
  }
  function buildSequencer(rows=4, cols=10){
    const g = new THREE.Group();
    seqGrid = [];
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const mat = new THREE.MeshStandardMaterial({color:0x28405c, emissive:0x000000, metalness:.15, roughness:.45});
        const m = new THREE.Mesh(new THREE.BoxGeometry(1,0.5,1), mat);
        m.position.set((c-(cols-1)/2)*1.18, r*0.78-1.1, 0);
        m.castShadow = m.receiveShadow = true;
        m.userData = {idx:r*cols+c, row:r, col:c, type:'toggle', active: Math.random()>0.7};
        if(m.userData.active){ mat.color = new THREE.Color(pal[r%pal.length]); mat.emissive = new THREE.Color(pal[r%pal.length]); mat.emissiveIntensity=.18; }
        interactives.push(m); seqGrid.push(m); g.add(m);
      }
    }
    scene.add(g); return g;
  }
  function buildStrings(n=8){
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(9.5,0.5,1.6), new THREE.MeshStandardMaterial({color:0x472a1d, roughness:.7}));
    base.position.y = -0.8; g.add(base);
    for(let i=0;i<n;i++){
      const geo = new THREE.CylinderGeometry(0.05,0.05,9.3,10);
      const mat = new THREE.MeshStandardMaterial({color:0xe8eef7, emissive:pal[i%pal.length], emissiveIntensity:0.07});
      const s = new THREE.Mesh(geo, mat);
      s.rotation.z = Math.PI/2;
      s.position.set(0, -0.3 + (i-(n-1)/2)*0.22, 0);
      s.userData = {idx:i,type:'sound'};
      interactives.push(s); g.add(s);
    }
    scene.add(g); return g;
  }
  function buildWave(){
    const g = new THREE.Group();
    stars = [];
    for(let i=0;i<20;i++){
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 20, 20),
        new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:0.18})
      );
      m.position.set((i-9.5)*0.75, 1 + Math.sin(i*0.4), 0);
      m.userData = {idx:i,type:'sound'};
      interactives.push(m); stars.push(m); g.add(m);
    }
    scene.add(g); return g;
  }
  function buildArpeggio(){
    const g = new THREE.Group();
    for(let i=0;i<10;i++){
      const geo = i%2 ? new THREE.IcosahedronGeometry(0.75,0) : new THREE.OctahedronGeometry(0.82,0);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:0.16, metalness:.32, roughness:.28}));
      const a = (i/10)*Math.PI*2;
      m.position.set(Math.cos(a)*4.6, 1 + (i%3)*0.5, Math.sin(a)*4.6);
      m.userData = {idx:i,type:'sound'};
      interactives.push(m); g.add(m);
    }
    scene.add(g); return g;
  }
  function buildSlider(){
    const g = new THREE.Group();
    const rail = new THREE.Mesh(new THREE.BoxGeometry(9,0.18,0.4), new THREE.MeshStandardMaterial({color:0xc9d7ff}));
    g.add(rail);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.55,24,24), new THREE.MeshStandardMaterial({color:pal[1], emissive:pal[1], emissiveIntensity:.16}));
    knob.position.set(0,0.55,0);
    knob.userData = {idx:5,type:'slider'};
    interactives.push(knob); g.add(knob);
    scene.add(g); return g;
  }
  function buildMemory(){
    const g = new THREE.Group();
    for(let i=0;i<8;i++){
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85,0.85,0.45,32),
        new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:.1})
      );
      const a = (i/8)*Math.PI*2;
      m.position.set(Math.cos(a)*3.8, 0, Math.sin(a)*3.8);
      m.userData = {idx:i,type:'sound'};
      interactives.push(m); g.add(m);
    }
    scene.add(g); return g;
  }
  function buildPaint(){
    const g = new THREE.Group();
    for(let i=0;i<15;i++){
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(1,1,1),
        new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:.1})
      );
      m.position.set((i%5-2)*1.5, Math.floor(i/5)*1.3-1.2, 0);
      m.userData = {idx:i,type:'sound'};
      interactives.push(m); g.add(m);
    }
    scene.add(g); return g;
  }
  function buildOrchestra(){
    const g = new THREE.Group();
    for(let i=0;i<9;i++){
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 24, 24),
        new THREE.MeshStandardMaterial({color:pal[i%pal.length], emissive:pal[i%pal.length], emissiveIntensity:.14})
      );
      const a = (i/9)*Math.PI*2;
      m.position.set(Math.cos(a)*4.2, 0.6 + (i%2)*0.35, Math.sin(a)*4.2);
      m.userData = {idx:i,type:'sound'};
      interactives.push(m); g.add(m);
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
    safeText('#instrumentText', (bankLabels[currentBankName()] || currentBankName()) + ' • ' + pool.length + ' notes');
  }
  function updateStats(msg){
    safeText('#status', msg || '');
    safeText('#score', `♪ ${clicks}`);
  }
  updateStats('');

  const keyboardMap = 'asdfghjkl;zxcv';
  window.addEventListener('keydown', async (e)=>{
    const idx = keyboardMap.indexOf(e.key.toLowerCase());
    if(idx >=0){
      const target = interactives.find(o=>o.userData && o.userData.idx===idx) || interactives[idx%interactives.length];
      if(target) await handleObject(target);
    }
    if(e.key===' '){ e.preventDefault(); if(cfg.mode==='sequencer') togglePlay(); }
    if(e.key==='q'){ activeOctaveOffset = Math.max(-1, activeOctaveOffset-1); updateInstrumentLabel(); updateStats(''); }
    if(e.key==='e'){ activeOctaveOffset = Math.min(1, activeOctaveOffset+1); updateInstrumentLabel(); updateStats(''); }
  });

  async function cycleSequence(){
    if(cfg.mode!=='sequencer' || !seqGrid.length) return;
    const cols = 10;
    const activeCol = seqStep % cols;
    for (const cell of seqGrid) {
      const mat = cell.material;
      mat.emissiveIntensity = cell.userData.active ? 0.16 : 0;
      if(cell.userData.col===activeCol){
        mat.emissiveIntensity += 0.4;
        if(cell.userData.active){ await triggerSound(cell.userData.row*2 + activeCol, true); pulse(cell, cell.userData.row); }
      }
    }
    seqStep++;
  }
  function togglePlay(){
    initAudio();
    transportStarted = !transportStarted;
    const btn = $('#loopBtn');
    if (btn) btn.textContent = transportStarted ? '■' : '▶';
    updateStats('');
  }
  async function cycleBank(){
    const cycle = getBankCycle();
    activeBankIndex = (activeBankIndex + 1) % cycle.length;
    await initAudio();
    await createSampler(currentBankName());
    updateInstrumentLabel();
    updateStats('');
  }
  if($('#loopBtn')) $('#loopBtn').addEventListener('click', togglePlay);
  if($('#soundBtn')) $('#soundBtn').addEventListener('click', cycleBank);
  if($('#randomBtn')) $('#randomBtn').addEventListener('click', async ()=>{
    await initAudio();
    if(cfg.mode==='sequencer'){
      seqGrid.forEach((cell)=>{
        cell.userData.active = Math.random() > 0.54;
        cell.material.color.set(cell.userData.active ? pal[cell.userData.row%pal.length] : new THREE.Color(0x28405c));
        cell.material.emissive.copy(cell.userData.active ? pal[cell.userData.row%pal.length] : new THREE.Color(0x000000));
      });
    } else {
      interactives.forEach((o,i)=> pulse(o,i));
      for(let i=0;i<interactives.length && i<16;i++) {
        setTimeout(()=>triggerSound(i, i%3===0), i*85);
      }
    }
    updateStats('');
  });

  const tempoEl = $('#tempo');
  if (tempoEl) tempoEl.addEventListener('input', ()=>{});
  const wetEl = $('#wet');
  if (wetEl) wetEl.addEventListener('input', (e)=>{
    if(reverb) reverb.wet.value = Number(e.target.value)/100;
  });

  async function handleObject(obj){
    clicks++;
    if(obj.userData.type==='toggle'){
      obj.userData.active = !obj.userData.active;
      obj.material.color.set(obj.userData.active ? pal[obj.userData.row%pal.length] : new THREE.Color(0x28405c));
      obj.material.emissive.copy(obj.userData.active ? pal[obj.userData.row%pal.length] : new THREE.Color(0x000000));
      obj.material.emissiveIntensity = obj.userData.active ? .18 : 0;
      await triggerSound(obj.userData.row + obj.userData.col);
      pulse(obj, obj.userData.row); updateStats(''); return;
    }
    if(obj.userData.type==='slider'){
      obj.position.x = ((Math.random()*2)-1)*4;
      const idx = Math.round(((obj.position.x+4)/8)*11);
      await triggerSound(idx, true); pulse(obj, idx); updateStats(''); return;
    }
    if(cfg.mode==='memory'){
      memoryInput.push(obj.userData.idx); await triggerSound(obj.userData.idx); pulse(obj, obj.userData.idx);
      if(memoryPattern[memoryInput.length-1] !== obj.userData.idx){ memoryInput = []; playPatternDemo(); }
      else if(memoryInput.length===memoryPattern.length){ memoryInput = []; memoryPattern.push(Math.floor(Math.random()*8)); setTimeout(playPatternDemo, 350); }
      updateStats('');
      return;
    }
    if(cfg.mode==='spinner'){ await triggerSound(obj.userData.idx, true); pulse(obj, obj.userData.idx); updateStats(''); return; }
    if(cfg.mode==='orchestra'){
      await triggerSound(obj.userData.idx);
      const cycle = getBankCycle();
      const extra = cycle[(activeBankIndex+1)%cycle.length];
      const extraNote = noteAt(obj.userData.idx);
      if(ToneOK() && tonePreferred){
        try{
          const s2 = await createSampler(extra);
          if(s2) s2.triggerAttackRelease([extraNote, shiftNote(extraNote,7)], 0.45, undefined, 0.42);
          else fallbackPlay(extraNote, extra, false);
        }catch(e){ fallbackPlay(extraNote, extra, false); }
      } else {
        fallbackPlay(extraNote, extra, false);
      }
      pulse(obj, obj.userData.idx); updateStats(''); return;
    }
    await triggerSound(obj.userData.idx, true); pulse(obj, obj.userData.idx); updateStats('');
  }

  async function onPointer(ev){
    if(ev && ev.cancelable) ev.preventDefault();
    await initAudio();
    const source = ('touches' in ev && ev.touches && ev.touches[0]) ? ev.touches[0] : ev;
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((source.clientX) - rect.left) / rect.width;
    const y = ((source.clientY) - rect.top) / rect.height;
    pointer.x = x*2-1; pointer.y = -(y*2-1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(interactives, false);
    if(hits.length) await handleObject(hits[0].object);
  }


  function bindAudioUnlock(){
    const opts = {capture:true, passive:false};
    const handler = (ev)=>{ try{ if(ev && ev.cancelable) ev.preventDefault(); }catch(e){} unlockAudioNow(); };
    ['touchstart','touchend','pointerdown','pointerup','click','keydown','pageshow'].forEach(type=>{
      window.addEventListener(type, handler, opts);
      document.addEventListener(type, handler, opts);
    });
    document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') unlockAudioNow(); }, {passive:true});
  }
  bindAudioUnlock();

  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.style.webkitTapHighlightColor = 'transparent';
  renderer.domElement.addEventListener('pointerdown', onPointer, {passive:false});
  renderer.domElement.addEventListener('touchstart', onPointer, {passive:false});

  function playPatternDemo(){
    memoryPattern.forEach((step, i)=> setTimeout(async ()=>{
      const target = interactives.find(o=>o.userData.idx===step);
      if(target){ pulse(target, step); await triggerSound(step); }
    }, i*360));
  }
  if(cfg.mode==='memory') { memoryPattern = [Math.floor(Math.random()*8), Math.floor(Math.random()*8)]; setTimeout(playPatternDemo, 500); }

  safeText('#infoText', '');
  safeText('#gameTitle', '');
  safeText('#gameEmoji', cfg.emoji || '🎵');
  const back = $('#backLink'); if(back) back.href = cfg.back || '../index.html';
  safeText('#modeText', '');
  updateInstrumentLabel();
  applyCleanLabels();

  const rotateInput = $('#rotateCam');
  function animate(){
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.033); t += dt;
    stage.rotation.y += dt*0.08;
    skyline.rotation.y -= dt*0.03;
    ring.rotation.z += dt*0.18;
    starPoints.rotation.y += dt*0.01;
    if(transportStarted && cfg.mode==='sequencer'){
      const bpm = Number((tempoEl && tempoEl.value) || 100);
      const stepLen = 60 / bpm / 2;
      if(!animate.nextStep) animate.nextStep = 0;
      if(t > animate.nextStep){ cycleSequence(); animate.nextStep = t + stepLen; }
    }
    if(cfg.mode==='wave' && stars.length){
      stars.forEach((s,i)=>{
        s.position.y = 1 + Math.sin(t*2.2 + i*0.35)*1.2;
        s.scale.setScalar(1 + (Math.sin(t*2 + i)+1)*0.12);
      });
    }
    if(cfg.mode==='spinner' || cfg.mode==='arpeggio'){
      scene.children.forEach(ch=>{ if(ch.type==='Group' && ch!==skyline){ ch.rotation.y += dt*0.35; } });
    }
    if(cfg.mode==='slider' && modeObj){ modeObj.rotation.y += dt*0.6; }

    pulses = pulses.filter(p=>{
      p.life -= dt*2.5;
      const s = 1 + Math.max(p.life,0)*0.22;
      p.obj.scale.copy(p.base).multiplyScalar(s);
      if(p.obj.material){
        if('emissiveIntensity' in p.obj.material){
          p.obj.material.emissiveIntensity = Math.max(0.08, p.life*0.45);
        }
      }
      if(p.life <= 0){
        p.obj.scale.copy(p.base);
        return false;
      }
      return true;
    });

    const autoRotate = !rotateInput || rotateInput.checked;
    if(autoRotate){
      const radius = 16;
      camera.position.x = Math.cos(t*0.25)*radius;
      camera.position.z = Math.sin(t*0.25)*radius;
      camera.position.y = 7.5 + Math.sin(t*0.3)*1.2;
      camera.lookAt(0, 0.8, 0);
    } else {
      camera.position.lerp(new THREE.Vector3(0,8,16), 0.08);
      camera.lookAt(0,0.5,0);
    }
    renderer.render(scene, camera);
  }
  animate();
})();
