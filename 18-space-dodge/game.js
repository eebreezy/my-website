
const cvs=qs('#game'), ctx=cvs.getContext('2d');
let ship={x:330,y:430}, rocks=[], score=0, best=+localStorage.getItem('space_best')||0, running=false, frame=0;
setText('best',best);
function reset(){ ship={x:330,y:430}; rocks=[]; score=0; running=true; frame=0; setText('score',0); setText('level',1);}
function spawn(){ rocks.push({x:rand(10,690), y:-20, r:rand(10,20), sp:rand(3,6)}); }
function draw(){
 ctx.fillStyle='#0d1b2a'; ctx.fillRect(0,0,700,500);
 ctx.fillStyle='#fff'; for(let i=0;i<40;i++) ctx.fillRect(rand(0,700), rand(0,500), 2, 2);
 ctx.fillStyle='#4cc9f0'; ctx.beginPath(); ctx.moveTo(ship.x+20,ship.y); ctx.lineTo(ship.x,ship.y+40); ctx.lineTo(ship.x+40,ship.y+40); ctx.closePath(); ctx.fill();
 rocks.forEach(r=>{ ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.arc(r.x,r.y,r.r,0,7); ctx.fill(); });
}
function step(){
 if(running){
   frame++; if(frame%22===0) spawn();
   rocks.forEach(r=>r.y += r.sp + Math.floor(score/12));
   rocks=rocks.filter(r=>{ if(r.y>520){ score++; setText('score',score); if(score>best){best=score; localStorage.setItem('space_best',best); setText('best',best);} setText('level',1+Math.floor(score/10)); return false; } return true; });
   if(rocks.some(r=> Math.hypot((ship.x+20)-r.x,(ship.y+20)-r.y) < r.r+18)){ running=false; beep(140,.2,'square'); }
 }
 draw(); requestAnimationFrame(step);
}
window.addEventListener('keydown', e=>{ if(e.key==='ArrowLeft') ship.x=Math.max(0,ship.x-25); if(e.key==='ArrowRight') ship.x=Math.min(660,ship.x+25); });
cvs.addEventListener('pointermove', e=>{ const r=cvs.getBoundingClientRect(); ship.x=((e.clientX-r.left)/r.width)*cvs.width-20; ship.x=Math.max(0,Math.min(660,ship.x));});
qs('#startBtn').onclick=reset; draw(); step();
