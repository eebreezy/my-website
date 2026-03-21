
const cvs=qs('#game'), ctx=cvs.getContext('2d');
let basketX=360, items=[], score=0, best=+localStorage.getItem('numcatch_best')||0, running=false, target=5, frame=0;
setText('best',best);
function reset(){ basketX=360; items=[]; score=0; target=rand(1,9); frame=0; running=true; setText('score',0); qs('#targetNum').textContent=target; }
function spawn(){ items.push({x:rand(30,770), y:-20, n:rand(1,9), sp:rand(2,5)}); }
function draw(){
  ctx.fillStyle='#f8fdff'; ctx.fillRect(0,0,800,500);
  ctx.fillStyle='#bde0fe'; ctx.fillRect(0,0,800,70);
  ctx.fillStyle='#90dbf4'; ctx.fillRect(0,430,800,70);
  items.forEach(it=>{
    ctx.beginPath(); ctx.fillStyle=it.n===target?'#ffd166':'#cdb4db'; ctx.arc(it.x,it.y,22,0,7); ctx.fill();
    ctx.fillStyle='#183153'; ctx.font='bold 22px Arial'; ctx.fillText(it.n, it.x-6, it.y+8);
  });
  ctx.fillStyle='#ffafcc'; ctx.fillRect(basketX, 445, 90, 20);
  ctx.fillStyle='#183153'; ctx.fillText('Target: '+target, 20, 30);
}
function step(){
  if(running){
    frame++;
    if(frame%35===0) spawn();
    items.forEach(it=>it.y += it.sp + Math.floor(score/8));
    items = items.filter(it=>{
      if(it.y>440 && it.x > basketX-10 && it.x < basketX+100){
        if(it.n===target){ score++; beep(650,.06); if(score && score%5===0){ target=rand(1,9); qs('#targetNum').textContent=target; } }
        else { score=Math.max(0,score-1); beep(180,.09,'square'); }
        setText('score',score); if(score>best){ best=score; localStorage.setItem('numcatch_best',best); setText('best',best); }
        setText('level',1+Math.floor(score/7));
        return false;
      }
      return it.y < 540;
    });
  }
  draw(); requestAnimationFrame(step);
}
window.addEventListener('keydown', e=>{ if(e.key==='ArrowLeft') basketX=Math.max(0,basketX-30); if(e.key==='ArrowRight') basketX=Math.min(710,basketX+30); });
cvs.addEventListener('pointermove', e=>{ const r=cvs.getBoundingClientRect(); basketX=((e.clientX-r.left)/r.width)*cvs.width-45; basketX=Math.max(0,Math.min(710,basketX));});
qs('#startBtn').onclick=reset; draw(); step();
