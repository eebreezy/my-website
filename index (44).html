
const cvs=qs('#game'), ctx=cvs.getContext('2d');
let dino={x:100,y:220,vy:0,onGround:true}, rocks=[], score=0, best=+localStorage.getItem('dino_best')||0, running=false, frame=0;
setText('best',best);
function reset(){ dino={x:100,y:220,vy:0,onGround:true}; rocks=[]; score=0; frame=0; running=true; setText('score',0); setText('level',1); }
function jump(){ if(dino.onGround){ dino.vy=-12; dino.onGround=false; beep(500,.04); } }
function spawn(){ rocks.push({x:820,w:rand(20,35),h:rand(25,50)}); }
function draw(){
 ctx.fillStyle='#fffdf5'; ctx.fillRect(0,0,800,300);
 ctx.fillStyle='#9be7ff'; ctx.fillRect(0,0,800,80);
 ctx.fillStyle='#90be6d'; ctx.fillRect(0,250,800,50);
 ctx.fillStyle='#577590'; ctx.fillRect(dino.x,dino.y,40,30);
 ctx.fillStyle='#577590'; ctx.fillRect(dino.x+20,dino.y-20,20,20);
 rocks.forEach(r=>{ ctx.fillStyle='#c08457'; ctx.fillRect(r.x,250-r.h,r.w,r.h); });
 if(!running){ ctx.fillStyle='#183153'; ctx.font='bold 28px Arial'; ctx.fillText('Press Start',320,150);}
}
function hit(a,b){ return a.x < b.x+b.w && a.x+40 > b.x && a.y < 250 && a.y+30 > 250-b.h; }
function step(){
 if(running){
   frame++; if(frame%75===0) spawn();
   dino.vy += 0.7; dino.y += dino.vy;
   if(dino.y>=220){ dino.y=220; dino.vy=0; dino.onGround=true; }
   rocks.forEach(r=>r.x -= 6 + Math.floor(score/10));
   if(rocks[0] && rocks[0].x + rocks[0].w < 0){ rocks.shift(); score++; setText('score',score); if(score>best){ best=score; localStorage.setItem('dino_best',best); setText('best',best);} setText('level',1+Math.floor(score/6));}
   if(rocks.some(r=>hit(dino,r))){ running=false; beep(150,.15,'square');}
 }
 draw(); requestAnimationFrame(step);
}
window.addEventListener('keydown', e=>{ if(e.code==='Space') jump(); });
cvs.addEventListener('pointerdown', jump);
qs('#startBtn').onclick=reset; draw(); step();
