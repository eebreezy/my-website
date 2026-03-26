
import { THREE, clamp, lerp, rand, randi, choice, createAppShell, addGroundGrid, makePlayer, makeGlowDisc, makeCrystal, makeBox, confetti, updateConfetti, lookFollow, neonMaterial, safeRemove } from './core.js';

function clearWorld(scene){
  for(let i=scene.children.length-1;i>=0;i--){
    const c = scene.children[i];
    if(c.userData.keep) continue;
    if(c.type === 'HemisphereLight' || c.type === 'DirectionalLight') continue;
    scene.remove(c);
  }
}

export function makeGame(meta, family, config={}){
  const shell = createAppShell(meta);
  shell.scene.children.forEach(o=>o.userData.keep = true);
  let impl = families[family](shell, config, meta);
  shell.onReset = ()=>{ clearWorld(shell.scene); shell.scene.add(shell.floor); shell.scene.add(shell.stars); impl = families[family](shell, config, meta); shell.overlay.style.display='flex'; };
  shell.animate(dt=> impl.update(dt));
}

const families = {
  runnerLane(shell, config, meta){
    addGroundGrid(shell.scene, config.gridColor || 0x2bd0ff);
    const lanes = config.lanes || [-2.4, 0, 2.4];
    const player = makePlayer(config.playerColor || 0x62f1ff);
    let lane = 1, y=0.55, vy=0, t=0, score=0, side=0, alive=true;
    player.position.set(lanes[lane], y, 2.6);
    shell.scene.add(player);
    const path = [];
    for(let i=0;i<18;i++){
      const tile = new THREE.Mesh(new THREE.BoxGeometry(7.5,.18,4.5), neonMaterial(i%2 ? 0x16304f : 0x10253d, 0x10253d));
      tile.position.set(0, 0, -i*4.5);
      tile.receiveShadow = true;
      shell.scene.add(tile);
      path.push(tile);
    }
    const items = [];
    let spawn = 0, combo = 0, fx = [];
    function spawnThing(){
      const isCollect = Math.random() < (config.collectChance ?? .45);
      const mesh = isCollect ? makeCrystal(config.collectColor || 0xffd76b) : makeBox(config.obstacleColor || 0xff6f91, .9,.9,.9);
      mesh.position.set(choice(lanes), isCollect ? .9 : .55, -48);
      mesh.userData.kind = isCollect ? 'collect' : 'obstacle';
      mesh.userData.rot = rand(.8,2.2) * (Math.random()<.5?-1:1);
      shell.scene.add(mesh); items.push(mesh);
    }
    shell.onStart = ()=>{};
    shell.setSide('0');
    shell.setScore(0);
    function crash(){
      alive = false;
      shell.audio.fail();
      shell.message(config.failText || 'Crash!');
      shell.setBest(meta.storageKey, score);
      setTimeout(()=>shell.overlay.style.display='flex', 600);
    }
    return {
      update(dt){
        t += dt;
        if(shell.input.pressedLeft) lane = Math.max(0, lane-1);
        if(shell.input.pressedRight) lane = Math.min(lanes.length-1, lane+1);
        if((shell.input.pressedJump || shell.input.pressedAction) && y <= .56){ vy = config.jump || 6.8; shell.audio.bounce(); }
        vy -= (config.gravity || 15) * dt;
        y += vy*dt;
        if(y < .55){ y = .55; vy = 0; }
        player.position.x = lerp(player.position.x, lanes[lane], 1-Math.exp(-12*dt));
        player.position.y = y;
        player.rotation.y = lerp(player.rotation.y, (lanes[lane]-player.position.x)*0.25, 1-Math.exp(-14*dt));
        for(const tile of path){
          tile.position.z += (config.speed || 20)*dt;
          if(tile.position.z > 6) tile.position.z -= 18*4.5;
        }
        spawn -= dt;
        if(spawn <= 0){ spawn = rand(.38, .8) / (config.spawnTightness || 1); spawnThing(); }
        for(let i=items.length-1;i>=0;i--){
          const it = items[i];
          it.position.z += (config.speed || 20) * dt;
          it.rotation.y += dt*it.userData.rot;
          if(it.userData.kind === 'collect') it.position.y = .9 + Math.sin(t*5 + i)*.15;
          const hit = Math.abs(it.position.z - player.position.z) < .85 && Math.abs(it.position.x - player.position.x) < .9 && Math.abs(it.position.y - player.position.y) < 1.1;
          if(hit && alive){
            if(it.userData.kind === 'collect'){
              score += 10 + combo;
              combo = Math.min(combo+1, 20);
              if(config.sideMode === 'fuel') side = Math.max(0, side - 1.1);
              shell.setScore(score);
              shell.setSide(config.sideMode === 'fuel' ? Math.max(0, Math.floor(100 - side*8)) : combo);
              shell.audio.blip(520 + combo*12);
              fx.push(confetti(shell.scene, it.position.clone(), config.collectColor || 0xffd76b, 9));
            }else{
              crash();
            }
            shell.scene.remove(it); items.splice(i,1); continue;
          }
          if(it.position.z > 8){
            if(it.userData.kind === 'collect' && config.mustCollect){ crash(); }
            shell.scene.remove(it); items.splice(i,1); combo = Math.max(0, combo-1);
          }
        }
        fx = fx.filter(g=>updateConfetti(g, dt));
        if(alive){
          side += dt; 
          if((config.scoreByTime ?? true)){ score += dt * (config.timeScore || 4); shell.setScore(score); }
          shell.setSide(config.sideMode === 'fuel' ? Math.max(0, Math.floor(100 - side*8)) : Math.floor(side*10)/10);
          if(config.sideMode === 'fuel' && side > 12.5) crash();
        }
        lookFollow(shell.camera, player.position, new THREE.Vector3(0,4.3,8.2), 4.5, dt);
      }
    };
  },

  shooter(shell, config, meta){
    addGroundGrid(shell.scene, config.gridColor || 0xffd76b);
    const player = makePlayer(config.playerColor || 0x62f1ff);
    player.position.set(0, .6, 4.8); shell.scene.add(player);
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,.9,16), neonMaterial(0xffffff));
    muzzle.rotation.x = Math.PI/2; muzzle.position.set(0,.2,-.8); player.add(muzzle);
    const targets=[], shots=[], fx=[]; let spawn=0, score=0, timer=config.timer||45, aimX=0;
    for(let i=0;i<3;i++){
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.2+i*.9, .05, 10, 40), neonMaterial([0x62f1ff,0xffc96b,0xc18fff][i]));
      arch.rotation.x = Math.PI/2; arch.position.z = -8 - i*8; arch.position.y = 2;
      shell.scene.add(arch);
    }
    function spawnTarget(){
      const t = config.balloon ? makeGlowDisc(choice(config.colors || [0xff6f91,0x62f1ff,0xffd76b]), .45, .2) : makeBox(choice(config.colors || [0xff6f91,0x62f1ff,0xffd76b]), .8,.8,.8);
      t.position.set(rand(-4.5,4.5), rand(1.2,4.3), rand(-26,-8));
      t.userData.v = new THREE.Vector3(rand(-1.8,1.8), rand(-.5,.5), rand(6,10));
      t.userData.hp = 1;
      shell.scene.add(t); targets.push(t);
    }
    shell.setScore(0); shell.setSide(timer);
    function fire(){
      const s = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 10), new THREE.MeshBasicMaterial({ color:0xffffff }));
      s.position.copy(player.position).add(new THREE.Vector3(aimX, .25, -.6));
      s.userData.v = new THREE.Vector3(aimX*4, 0, -28);
      shell.scene.add(s); shots.push(s);
      shell.audio.shoot();
    }
    return {
      update(dt){
        if(shell.input.left) aimX = clamp(aimX - dt*2.6, -1.2, 1.2);
        if(shell.input.right) aimX = clamp(aimX + dt*2.6, -1.2, 1.2);
        if(shell.input.pressedAction || shell.input.pressedJump) fire();
        player.position.x = lerp(player.position.x, aimX*2.2, 1-Math.exp(-14*dt));
        player.rotation.z = -player.position.x*.08;
        spawn -= dt; if(spawn<=0){ spawn = rand(.35,.7); spawnTarget(); }
        for(const t of targets){
          t.position.addScaledVector(t.userData.v, dt);
          if(config.balloon){ t.rotation.z += dt*2; } else { t.rotation.x += dt*1.5; t.rotation.y += dt*2.4; }
          if(Math.abs(t.position.x)>5) t.userData.v.x *= -1;
        }
        for(let i=shots.length-1;i>=0;i--){
          const s = shots[i];
          s.position.addScaledVector(s.userData.v, dt);
          if(s.position.z < -35){ shell.scene.remove(s); shots.splice(i,1); continue; }
          for(let j=targets.length-1;j>=0;j--){
            const t = targets[j];
            if(s.position.distanceTo(t.position) < .75){
              score += 12;
              shell.setScore(score);
              shell.audio.success();
              fx.push(confetti(shell.scene, t.position.clone(), 0xffffff, 10));
              shell.scene.remove(t); targets.splice(j,1);
              shell.scene.remove(s); shots.splice(i,1); break;
            }
          }
        }
        timer -= dt;
        shell.setSide(timer);
        fx.forEach((g,i)=>{ if(!updateConfetti(g, dt)) fx.splice(i,1); });
        if(timer <= 0){
          shell.audio.fail(); shell.setBest(meta.storageKey, score); shell.overlay.style.display='flex';
          timer = 99999;
        }
        shell.camera.position.lerp(new THREE.Vector3(player.position.x*.3, 5.2, 10.5), 1-Math.exp(-6*dt));
        shell.camera.lookAt(player.position.x*.2, 1.6, -10);
      }
    };
  },

  drift(shell, config, meta){
    addGroundGrid(shell.scene, config.gridColor || 0x62f1ff);
    const craft = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2,.35,2), neonMaterial(config.playerColor || 0x62f1ff));
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.3,.4,.8), neonMaterial(0xffffff));
    fin.position.set(0,.35,.2); body.castShadow = true; fin.castShadow=true;
    craft.add(body, fin);
    craft.position.set(0,.8,3);
    shell.scene.add(craft);
    const gates=[]; let spawn=0, score=0, timer=config.timer || 35;
    function gate(){
      const g = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6,.16,12,40), neonMaterial(choice(config.colors||[0x62f1ff,0xffd76b,0xc18fff])));
      ring.rotation.y = Math.PI/2;
      g.add(ring); g.position.set(rand(-4.8,4.8), rand(1.4,4.5), -42);
      g.userData.hit = false;
      shell.scene.add(g); gates.push(g);
    }
    shell.setScore(0); shell.setSide(timer);
    return {
      update(dt){
        if(shell.input.left) craft.position.x -= dt*(config.speed||5.4);
        if(shell.input.right) craft.position.x += dt*(config.speed||5.4);
        if(shell.input.up) craft.position.y += dt*4.6;
        if(shell.input.down) craft.position.y -= dt*4.6;
        craft.position.x = clamp(craft.position.x, -5.5, 5.5);
        craft.position.y = clamp(craft.position.y, .9, 5.2);
        craft.rotation.z = lerp(craft.rotation.z, -craft.position.x*.08, 1-Math.exp(-5*dt));
        spawn -= dt; if(spawn <= 0){ spawn = rand(.7,1.1); gate(); }
        for(let i=gates.length-1;i>=0;i--){
          const g = gates[i];
          g.position.z += (config.forward || 17)*dt;
          g.rotation.z += dt*1.2;
          const d = g.position.distanceTo(craft.position);
          if(d < 1.4 && !g.userData.hit){
            g.userData.hit = true;
            score += 15; shell.setScore(score); shell.audio.success();
          }
          if(g.position.z > 7){ if(!g.userData.hit){ shell.audio.fail(); score = Math.max(0, score-10); shell.setScore(score);} shell.scene.remove(g); gates.splice(i,1); }
        }
        timer -= dt; shell.setSide(timer);
        if(timer <= 0){ shell.setBest(meta.storageKey, score); shell.overlay.style.display='flex'; timer = 99999; }
        lookFollow(shell.camera, craft.position, new THREE.Vector3(0,4.8,8.8), 4.6, dt);
      }
    };
  },

  stack(shell, config, meta){
    addGroundGrid(shell.scene, config.gridColor || 0xc18fff);
    let towerTop = 0, moving, dir=1, score=0, wobble=0;
    const settled = [];
    const base = makeBox(config.baseColor || 0x2bd0ff, 3.2,.6,3.2);
    base.position.y=.3; shell.scene.add(base); settled.push(base);
    function newBlock(){
      moving = makeBox(choice(config.colors || [0xffd76b,0x62f1ff,0xc18fff]), config.size||2.8, .55, config.depth||2.8);
      moving.position.set(-4.5, towerTop+1.0, 0);
      shell.scene.add(moving);
    }
    newBlock();
    shell.setScore(0); shell.setSide('TAP');
    return {
      update(dt){
        wobble += dt;
        moving.position.x += dir * dt * (config.moveSpeed || 4.2);
        if(moving.position.x > 4.8) dir = -1;
        if(moving.position.x < -4.8) dir = 1;
        if(shell.input.pressedAction || shell.input.pressedJump){
          const prevX = settled[settled.length-1].position.x;
          const off = Math.abs(moving.position.x - prevX);
          if(off < (config.maxOffset || 1.2)){
            moving.position.x = (moving.position.x + prevX)/2;
            settled.push(moving);
            towerTop += .58;
            score += Math.max(4, Math.floor(16 - off*10));
            shell.setScore(score);
            shell.audio.success();
            if(config.balance){
              for(const s of settled){ s.position.z = Math.sin(wobble*2 + s.position.y*.7) * .08; }
              shell.setSide((score/10).toFixed(1));
            } else {
              shell.setSide(settled.length-1);
            }
            newBlock();
          } else {
            shell.audio.fail();
            shell.setBest(meta.storageKey, score);
            shell.overlay.style.display='flex';
          }
        }
        shell.camera.position.lerp(new THREE.Vector3(0, clamp(4 + towerTop*.7, 4, 18), 10.5), 1-Math.exp(-5*dt));
        shell.camera.lookAt(0, towerTop*.65+1, 0);
      }
    };
  },

  sports(shell, config, meta){
    addGroundGrid(shell.scene, config.gridColor || 0xffd76b);
    const player = makePlayer(config.playerColor || 0x62f1ff);
    player.position.set(0,.7,4.6); shell.scene.add(player);
    const hoop = new THREE.Group();
    if(config.mode === 'golf'){
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(.65,.8,.2,24), neonMaterial(0x1b3d2a, 0x1b3d2a));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.72,.08,10,24), neonMaterial(0xffd76b));
      ring.rotation.x = Math.PI/2;
      hoop.add(cup, ring); hoop.position.set(rand(-3.5,3.5), .2, -12);
    }else{
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.95,.08,12,30), neonMaterial(0xff6f91));
      ring.rotation.x = Math.PI/2;
      const board = new THREE.Mesh(new THREE.BoxGeometry(2,.16,1.4), neonMaterial(0xffffff));
      board.position.set(0,1.1,-.8);
      hoop.add(ring, board); hoop.position.set(rand(-3.5,3.5), 3, -12);
    }
    shell.scene.add(hoop);
    let ball = null, meter = 0, dir = 1, score=0, timer=config.timer||40, fx=[];
    function spawnBall(){
      ball = new THREE.Mesh(new THREE.SphereGeometry(.28,16,16), neonMaterial(choice(config.colors||[0xffd76b,0x62f1ff,0xc18fff])));
      ball.position.set(player.position.x, 1.15, 3.6); ball.castShadow = true;
      ball.userData.v = new THREE.Vector3();
      shell.scene.add(ball);
    }
    spawnBall(); shell.setScore(0); shell.setSide(timer);
    function shoot(){
      if(!ball) return;
      const power = .55 + meter*.8;
      if(config.mode==='golf'){
        ball.userData.v.set((hoop.position.x - ball.position.x)*.55, 0, -8.5*power);
      }else{
        ball.userData.v.set((hoop.position.x - ball.position.x)*.6, 5.8*power, -9.4*power);
      }
      shell.audio.shoot();
    }
    function resetHole(){
      shell.scene.remove(hoop);
      if(config.mode==='golf'){
        hoop.position.set(rand(-3.5,3.5), .2, rand(-15,-10));
      }else{
        hoop.position.set(rand(-3.5,3.5), rand(2.6,3.5), rand(-15,-10));
      }
      shell.scene.add(hoop);
      if(ball){ shell.scene.remove(ball); }
      ball = null; spawnBall();
    }
    return {
      update(dt){
        if(ball && ball.userData.v.lengthSq()===0){
          meter += dir*dt*(config.meterSpeed || 1.6);
          if(meter>1){ meter=1; dir=-1; } if(meter<0){ meter=0; dir=1; }
          player.position.x = lerp(player.position.x, shell.input.left ? -1.8 : shell.input.right ? 1.8 : 0, 1-Math.exp(-8*dt));
          if(shell.input.pressedAction || shell.input.pressedJump) shoot();
          shell.setSide(Math.floor(timer));
        } else if(ball){
          if(config.mode==='golf'){
            ball.userData.v.z *= .995; ball.userData.v.x *= .996;
          }else{
            ball.userData.v.y -= 9.4*dt;
          }
          ball.position.addScaledVector(ball.userData.v, dt);
          if(config.mode!=='golf' && ball.position.y < .28){ ball.position.y=.28; ball.userData.v.y *= -.62; shell.audio.bounce(); }
          const success = ball.position.distanceTo(hoop.position.clone().add(new THREE.Vector3(0, config.mode==='golf'?.2:0, 0))) < (config.mode==='golf'? .88 : 1.05);
          if(success){
            score += config.mode==='golf' ? 18 : 12;
            shell.setScore(score);
            shell.audio.success();
            fx.push(confetti(shell.scene, hoop.position.clone(), 0xffd76b, 14));
            resetHole();
          } else if(ball.position.z < -24 || ball.position.y < -2){
            shell.audio.fail();
            resetHole();
          }
        }
        timer -= dt; fx = fx.filter(g=>updateConfetti(g, dt));
        if(timer <= 0){ shell.setBest(meta.storageKey, score); shell.overlay.style.display='flex'; timer=99999; }
        shell.camera.position.lerp(new THREE.Vector3(0, 5.4, 10.8), 1-Math.exp(-5*dt));
        shell.camera.lookAt(0, 2.1, -8.5);
      }
    };
  },

  memory(shell, config, meta){
    addGroundGrid(shell.scene, config.gridColor || 0x62f1ff);
    const cols = config.cols || 4, rows = config.rows || 3;
    const colors = (config.colors || [0xffd76b,0x62f1ff,0xc18fff,0x7dff9d,0xff6f91,0xffffff]).slice(0, cols*rows/2);
    const pairs = [...colors, ...colors].sort(()=>Math.random()-.5);
    const cards = []; let cursor=0, first=null, lock=0, score=0, timer=config.timer || 60;
    for(let y=0;y<rows;y++){
      for(let x=0;x<cols;x++){
        const g = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.2,.18,1.2), neonMaterial(0x10253d, 0x10253d));
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.0,.16,1.0), neonMaterial(0x26466f, 0x26466f));
        top.position.y = .18;
        g.add(base, top);
        g.position.set((x-(cols-1)/2)*1.8, .2, (y-(rows-1)/2)*1.8-2);
        g.userData.color = pairs[y*cols+x];
        g.userData.flipped = false; g.userData.done = false; g.userData.top = top;
        shell.scene.add(g); cards.push(g);
      }
    }
    shell.setScore(0); shell.setSide(timer);
    function moveCursor(dx,dy){
      const x = cursor%cols, y = Math.floor(cursor/cols);
      cursor = clamp(y+dy, 0, rows-1)*cols + clamp(x+dx, 0, cols-1);
    }
    function applyHighlight(){
      cards.forEach((c,i)=> c.scale.setScalar(i===cursor?1.07:1));
    }
    applyHighlight();
    function flip(idx){
      const c = cards[idx];
      if(c.userData.done || c.userData.flipped) return;
      c.userData.flipped = true;
      c.userData.top.material = neonMaterial(c.userData.color, c.userData.color);
      shell.audio.blip(380 + idx*20);
      if(first===null) first = idx;
      else{
        if(cards[first].userData.color === c.userData.color){
          cards[first].userData.done = c.userData.done = true;
          score += 20; shell.setScore(score); shell.audio.success(); first = null;
        }else{
          lock = .8;
        }
      }
    }
    return {
      update(dt){
        if(shell.input.pressedLeft) moveCursor(-1,0);
        if(shell.input.pressedRight) moveCursor(1,0);
        if(shell.input.pressedUp) moveCursor(0,-1);
        if(shell.input.pressedDown) moveCursor(0,1);
        if((shell.input.pressedAction || shell.input.pressedJump) && lock<=0) flip(cursor);
        applyHighlight();
        if(lock>0){
          lock -= dt;
          if(lock<=0 && first!==null){
            cards.forEach(c=>{ if(!c.userData.done){ c.userData.flipped=false; c.userData.top.material = neonMaterial(0x26466f,0x26466f); }});
            first = null;
            shell.audio.fail();
          }
        }
        timer -= dt; shell.setSide(timer);
        if(cards.every(c=>c.userData.done) || timer <= 0){
          shell.setBest(meta.storageKey, score);
          shell.overlay.style.display='flex';
          timer = 99999;
        }
        shell.camera.position.lerp(new THREE.Vector3(0, 7.5, 7.5), 1-Math.exp(-5*dt));
        shell.camera.lookAt(0, .2, -2);
      }
    };
  },

  catcher(shell, config, meta){
    addGroundGrid(shell.scene, config.gridColor || 0xffd76b);
    const player = makePlayer(config.playerColor || 0x62f1ff);
    player.position.set(0,.6,3.5); shell.scene.add(player);
    const basket = new THREE.Mesh(new THREE.TorusGeometry(.8,.14,10,24), neonMaterial(0xffffff));
    basket.rotation.x = Math.PI/2; basket.position.y=-.18; player.add(basket);
    const items=[]; let spawn=0, score=0, timer=config.timer || 40, targetColor = choice(config.colors || [0xffd76b,0x62f1ff,0xc18fff]);
    shell.setScore(0); shell.setSide(timer);
    function makeItem(){
      const c = choice(config.colors || [0xffd76b,0x62f1ff,0xc18fff,0xff6f91]);
      const it = config.shape==='box' ? makeBox(c,.55,.55,.55) : makeCrystal(c);
      it.position.set(rand(-5.2,5.2), 6.3, rand(-4,1));
      it.userData.vy = rand(2.2,3.8);
      it.userData.color = c;
      shell.scene.add(it); items.push(it);
    }
    function nextTarget(){ targetColor = choice(config.colors || [0xffd76b,0x62f1ff,0xc18fff]); shell.setSide(colorName(targetColor)); }
    nextTarget();
    return {
      update(dt){
        if(shell.input.left) player.position.x -= dt*(config.speed||5.5);
        if(shell.input.right) player.position.x += dt*(config.speed||5.5);
        if(shell.input.action && config.magnet){
          for(const it of items){
            it.position.x += (player.position.x - it.position.x) * dt * 1.6;
          }
        }
        player.position.x = clamp(player.position.x, -5.4, 5.4);
        spawn -= dt; if(spawn<=0){ spawn = rand(.35,.7); makeItem(); }
        for(let i=items.length-1;i>=0;i--){
          const it = items[i];
          it.userData.vy -= dt * (config.gravity || 5.4);
          it.position.y += it.userData.vy * dt;
          it.rotation.x += dt*2.2; it.rotation.y += dt*3;
          if(Math.abs(it.position.x - player.position.x) < .95 && Math.abs(it.position.z - player.position.z) < 1.2 && it.position.y < 1.05){
            const ok = !config.colorTarget || it.userData.color === targetColor;
            score += ok ? 10 : -6;
            shell.setScore(Math.max(0, score));
            ok ? shell.audio.success() : shell.audio.fail();
            shell.scene.remove(it); items.splice(i,1);
            if(ok && config.colorTarget) nextTarget();
            continue;
          }
          if(it.position.y < -.6){ shell.scene.remove(it); items.splice(i,1); }
        }
        timer -= dt;
        if(!config.colorTarget) shell.setSide(timer);
        if(timer <= 0){ shell.setBest(meta.storageKey, Math.max(0, score)); shell.overlay.style.display='flex'; timer=99999; }
        lookFollow(shell.camera, player.position, new THREE.Vector3(0,5,8.8), 4.2, dt);
      }
    };
  },

  colorFlip(shell, config, meta){
    addGroundGrid(shell.scene, config.gridColor || 0xc18fff);
    const player = makePlayer(config.colors[0]); player.position.set(0,.6,2.8); shell.scene.add(player);
    const pads=[]; let colorIndex=0, spawn=0, score=0, timer=config.timer||35;
    function spawnPad(){
      const cIdx = randi(0, config.colors.length-1);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(5.5,.22,2.6), neonMaterial(config.colors[cIdx], config.colors[cIdx]));
      pad.position.set(0,0,-40); pad.userData.colorIndex = cIdx;
      shell.scene.add(pad); pads.push(pad);
    }
    shell.setScore(0); shell.setSide(timer);
    return {
      update(dt){
        if(shell.input.pressedAction || shell.input.pressedJump){
          colorIndex = (colorIndex+1)%config.colors.length;
          player.children[0].material = neonMaterial(config.colors[colorIndex]);
          shell.audio.blip(430 + colorIndex*80);
        }
        spawn -= dt; if(spawn<=0){ spawn=rand(.45,.8); spawnPad(); }
        for(let i=pads.length-1;i>=0;i--){
          const p = pads[i];
          p.position.z += (config.speed||18)*dt;
          if(Math.abs(p.position.z - player.position.z) < 1.4){
            if(p.userData.colorIndex === colorIndex){
              score += 8; shell.setScore(score); shell.audio.success();
            }else{
              shell.audio.fail(); shell.setBest(meta.storageKey, score); shell.overlay.style.display='flex';
            }
            shell.scene.remove(p); pads.splice(i,1); continue;
          }
          if(p.position.z > 6){ shell.scene.remove(p); pads.splice(i,1); }
        }
        timer -= dt; shell.setSide(timer);
        if(timer <= 0){ shell.setBest(meta.storageKey, score); shell.overlay.style.display='flex'; timer=99999; }
        lookFollow(shell.camera, player.position, new THREE.Vector3(0,4.4,7.8), 4.4, dt);
      }
    };
  },

  orbital(shell, config, meta){
    addGroundGrid(shell.scene, config.gridColor || 0xffd76b);
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.1,24,24), neonMaterial(0xffffff, 0xffffff));
    core.position.y = 1.6; shell.scene.add(core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.1,.06,10,60), neonMaterial(0x335d87,0x335d87));
    ring.rotation.x = Math.PI/2; ring.position.y = 1.2; shell.scene.add(ring);
    const player = makePlayer(config.playerColor || 0x62f1ff); shell.scene.add(player);
    let angle = 0, score=0, timer=config.timer||40;
    const orbs=[]; let spawn=0;
    function spawnOrb(){
      const a = rand(0, Math.PI*2);
      const o = makeCrystal(choice(config.colors||[0xffd76b,0xc18fff,0x62f1ff]));
      o.position.set(Math.cos(a)*4.1, 1.2, Math.sin(a)*4.1);
      o.userData.a = a; shell.scene.add(o); orbs.push(o);
    }
    shell.setScore(0); shell.setSide(timer);
    return {
      update(dt){
        if(shell.input.left) angle += dt*2.5;
        if(shell.input.right) angle -= dt*2.5;
        spawn -= dt; if(spawn<=0){ spawn=rand(.4,.85); spawnOrb(); }
        player.position.set(Math.cos(angle)*4.1, 1.2, Math.sin(angle)*4.1);
        player.lookAt(core.position);
        for(let i=orbs.length-1;i>=0;i--){
          const o = orbs[i];
          o.userData.a += dt * rand(.3, .8);
          o.position.set(Math.cos(o.userData.a)*4.1, 1.2 + Math.sin(o.userData.a*2+i)*.25, Math.sin(o.userData.a)*4.1);
          if(o.position.distanceTo(player.position) < .9){
            score += 10; shell.setScore(score); shell.audio.success();
            shell.scene.remove(o); orbs.splice(i,1);
          }
        }
        timer -= dt; shell.setSide(timer);
        if(timer <= 0){ shell.setBest(meta.storageKey, score); shell.overlay.style.display='flex'; timer=99999; }
        shell.camera.position.lerp(new THREE.Vector3(0,9.2,8.8), 1-Math.exp(-5*dt));
        shell.camera.lookAt(0,1.3,0);
      }
    };
  },

  bounce(shell, config, meta){
    addGroundGrid(shell.scene, config.gridColor || 0x62f1ff);
    const lanes=[-3,0,3];
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.45,16,16), neonMaterial(0xffd76b));
    ball.position.set(0,1.8,2); ball.castShadow = true; shell.scene.add(ball);
    const pads = lanes.map((x,i)=>{ const p=makeGlowDisc(config.colors[i],1.1,.14); p.position.set(x,.08,2); shell.scene.add(p); return p; });
    let lane=1, vy=0, nextBeat=0, score=0, timer=config.timer||38;
    shell.setScore(0); shell.setSide(timer);
    return {
      update(dt){
        if(shell.input.pressedLeft) lane = Math.max(0,lane-1);
        if(shell.input.pressedRight) lane = Math.min(lanes.length-1,lane+1);
        ball.position.x = lerp(ball.position.x, lanes[lane], 1-Math.exp(-10*dt));
        vy -= 12*dt; ball.position.y += vy*dt;
        if(ball.position.y < .58){
          ball.position.y = .58;
          const beatOK = Math.abs(nextBeat) < .17;
          vy = beatOK ? 6.6 : 4.4;
          score += beatOK ? 12 : 4;
          shell.setScore(score);
          beatOK ? shell.audio.success() : shell.audio.bounce();
          nextBeat = .62;
        }
        nextBeat -= dt;
        timer -= dt; shell.setSide(timer);
        if(timer <= 0){ shell.setBest(meta.storageKey, score); shell.overlay.style.display='flex'; timer=99999; }
        shell.camera.position.lerp(new THREE.Vector3(0,5.8,9), 1-Math.exp(-5*dt));
        shell.camera.lookAt(0,1.2,1.3);
      }
    };
  },

  maze(shell, config, meta){
    addGroundGrid(shell.scene, config.gridColor || 0xc18fff);
    const map = config.map;
    const h=map.length, w=map[0].length;
    const group = new THREE.Group(); shell.scene.add(group);
    let start={x:0,y:0}, goal={x:0,y:0};
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const cell = map[y][x];
      if(cell === '#'){
        const b = makeBox(0x24456b, 1, 1.2, 1); b.position.set(x-w/2, .6, y-h/2-2); group.add(b);
      } else if(cell === 'S'){ start={x,y}; }
      else if(cell === 'G'){ goal={x,y}; const g=makeGlowDisc(0x7dff9d,.42,.12); g.position.set(x-w/2,.08,y-h/2-2); group.add(g); }
    }
    const player = makePlayer(0x62f1ff); shell.scene.add(player);
    let gx=start.x, gy=start.y, score=0, timer=config.timer||55;
    function sync(){ player.position.set(gx-w/2,.6,gy-h/2-2); }
    sync(); shell.setScore(0); shell.setSide(timer);
    function open(x,y){ return y>=0 && y<h && x>=0 && x<w && map[y][x] !== '#'; }
    function slide(dx,dy){
      let nx=gx, ny=gy;
      while(open(nx+dx,ny+dy)){ nx+=dx; ny+=dy; }
      gx=nx; gy=ny; sync(); shell.audio.bounce();
      score += 3; shell.setScore(score);
    }
    return {
      update(dt){
        if(shell.input.pressedLeft) slide(-1,0);
        if(shell.input.pressedRight) slide(1,0);
        if(shell.input.pressedUp) slide(0,-1);
        if(shell.input.pressedDown) slide(0,1);
        if(gx===goal.x && gy===goal.y){
          score += 50; shell.setScore(score); shell.audio.success(); shell.setBest(meta.storageKey, score); shell.overlay.style.display='flex';
        }
        timer -= dt; shell.setSide(timer);
        if(timer<=0){ shell.setBest(meta.storageKey, score); shell.overlay.style.display='flex'; timer=99999; }
        shell.camera.position.lerp(new THREE.Vector3(0,10,7), 1-Math.exp(-5*dt));
        shell.camera.lookAt(0,0,-2);
      }
    };
  },

  shield(shell, config, meta){
    addGroundGrid(shell.scene, config.gridColor || 0xff6f91);
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.25,24,24), neonMaterial(0xffffff,0xffffff)); core.position.y=1.2; shell.scene.add(core);
    const shield = new THREE.Mesh(new THREE.TorusGeometry(3.2,.22,10,40,Math.PI/3), neonMaterial(0x62f1ff)); shield.position.y=1.2; shell.scene.add(shield);
    let angle=0, score=0, timer=config.timer||40; const hazards=[]; let spawn=0;
    function hazard(){
      const h = makeCrystal(choice(config.colors||[0xff6f91,0xffd76b,0xc18fff]));
      const a = rand(0,Math.PI*2), r=12;
      h.position.set(Math.cos(a)*r,1.2,Math.sin(a)*r); h.userData.a=a; h.userData.r=r;
      shell.scene.add(h); hazards.push(h);
    }
    shell.setScore(0); shell.setSide(timer);
    return {
      update(dt){
        if(shell.input.left) angle += dt*2.6;
        if(shell.input.right) angle -= dt*2.6;
        shield.rotation.y = angle;
        spawn -= dt; if(spawn<=0){ spawn=rand(.38,.7); hazard(); }
        for(let i=hazards.length-1;i>=0;i--){
          const h = hazards[i];
          h.userData.r -= dt*5.8;
          h.position.set(Math.cos(h.userData.a)*h.userData.r,1.2,Math.sin(h.userData.a)*h.userData.r);
          const da = Math.atan2(Math.sin(h.userData.a-angle), Math.cos(h.userData.a-angle));
          const blocked = Math.abs(da) < Math.PI/6;
          if(h.userData.r < 3.4 && blocked){
            score += 9; shell.setScore(score); shell.audio.success(); shell.scene.remove(h); hazards.splice(i,1);
          } else if(h.userData.r < 1.4){
            shell.audio.fail(); shell.setBest(meta.storageKey, score); shell.overlay.style.display='flex'; shell.scene.remove(h); hazards.splice(i,1);
          }
        }
        timer -= dt; shell.setSide(timer);
        if(timer<=0){ shell.setBest(meta.storageKey, score); shell.overlay.style.display='flex'; timer=99999; }
        shell.camera.position.lerp(new THREE.Vector3(0,8.3,8.3), 1-Math.exp(-5*dt));
        shell.camera.lookAt(0,1.2,0);
      }
    };
  },

  pinball(shell, config, meta){
    addGroundGrid(shell.scene, config.gridColor || 0xffd76b);
    const walls = [];
    const wallGeo = new THREE.BoxGeometry(.4,1.2,12);
    for(const x of [-5.6,5.6]){
      const w = new THREE.Mesh(wallGeo, neonMaterial(0x26466f,0x26466f)); w.position.set(x,.6,-1); shell.scene.add(w); walls.push(w);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(11.6,1.2,.4), neonMaterial(0x26466f,0x26466f)); top.position.set(0,.6,-6.8); shell.scene.add(top); walls.push(top);
    const paddleL = new THREE.Mesh(new THREE.BoxGeometry(2.1,.3,.5), neonMaterial(0x62f1ff));
    const paddleR = new THREE.Mesh(new THREE.BoxGeometry(2.1,.3,.5), neonMaterial(0x62f1ff));
    paddleL.position.set(-1.5,.3,3.8); paddleR.position.set(1.5,.3,3.8);
    shell.scene.add(paddleL,paddleR);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.28,16,16), neonMaterial(0xffffff,0xffffff));
    ball.position.set(0,.7,2.6); ball.userData.v = new THREE.Vector3(rand(-2,2),0,-8);
    shell.scene.add(ball);
    const bumpers = [];
    for(let i=0;i<5;i++){
      const b = makeGlowDisc(choice(config.colors||[0xffd76b,0xff6f91,0x62f1ff]), .7,.3);
      b.position.set(rand(-3.8,3.8), .2, rand(-5.2,1.5)); shell.scene.add(b); bumpers.push(b);
    }
    let score=0,timer=config.timer||50;
    shell.setScore(0); shell.setSide(timer);
    return {
      update(dt){
        if(shell.input.left) paddleL.rotation.z = -.65; else paddleL.rotation.z = lerp(paddleL.rotation.z, -.1, 1-Math.exp(-12*dt));
        if(shell.input.right) paddleR.rotation.z = .65; else paddleR.rotation.z = lerp(paddleR.rotation.z, .1, 1-Math.exp(-12*dt));
        ball.position.addScaledVector(ball.userData.v, dt);
        if(ball.position.x < -5.1 || ball.position.x > 5.1){ ball.userData.v.x *= -1; shell.audio.bounce(); }
        if(ball.position.z < -6.2){ ball.userData.v.z *= -1; shell.audio.bounce(); }
        if(ball.position.z > 5){ shell.audio.fail(); shell.setBest(meta.storageKey, score); shell.overlay.style.display='flex'; timer=99999; }
        for(const b of bumpers){
          if(ball.position.distanceTo(b.position.clone().setY(.7)) < .95){
            const dir = ball.position.clone().sub(b.position.clone().setY(.7)).normalize();
            ball.userData.v.x = dir.x * 7;
            ball.userData.v.z = dir.z * 7;
            score += 8; shell.setScore(score); shell.audio.success();
          }
        }
        const lp = paddleL.position.clone(); const rp = paddleR.position.clone();
        if(ball.position.distanceTo(lp.clone().setY(.7)) < 1.3 && ball.userData.v.z > 0){ ball.userData.v.z = -Math.abs(ball.userData.v.z)-2; ball.userData.v.x -= 2; }
        if(ball.position.distanceTo(rp.clone().setY(.7)) < 1.3 && ball.userData.v.z > 0){ ball.userData.v.z = -Math.abs(ball.userData.v.z)-2; ball.userData.v.x += 2; }
        timer -= dt; shell.setSide(timer);
        if(timer<=0){ shell.setBest(meta.storageKey, score); shell.overlay.style.display='flex'; timer=99999; }
        shell.camera.position.lerp(new THREE.Vector3(0,8,10), 1-Math.exp(-5*dt));
        shell.camera.lookAt(0,.7,-1.5);
      }
    };
  }
};

function colorName(c){
  const map = { 0xffd76b:'GOLD', 0x62f1ff:'CYAN', 0xc18fff:'PURPLE', 0xff6f91:'PINK', 0x7dff9d:'LIME', 0xffffff:'WHITE' };
  return map[c] || 'MATCH';
}
