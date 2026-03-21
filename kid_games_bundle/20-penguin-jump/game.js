
const cvs=qs('#game'), ctx=cvs.getContext('2d');
let peng={x:120,y:180,vy:0,on:false}, gaps=[], score=0, best=+localStorage.getItem('peng_best')||0, running=false, frame=0;
setText('best',best);
function reset(){ peng={x:120,y:180,vy:0,on:false}; gaps=[]; score=0; running=true; frame=0; setText('score',0); setText('level',1);}
function jump(){ if(peng.y>=180){ peng.vy=-11; beep(500,.04);} }
function spawn(){ gaps.push({x:800,w:rand(70,120)}); }
function draw(){
 ctx.fillStyle='#dff6ff'; ctx.fillRect(0,0,800,350); ctx.fillStyle='#a8dadc';
 let x=0;
 gaps.forEach(g=>{ ctx.fillRect(x,240,g.x-x,40); x=g.x+g.w; });
 ctx.fillRect(x,240,800-x,40);
 ctx.font='42px Arial'; ctx.fillText('🐧', peng.x, peng.y+40);
}
function onIce(){
  let overGap=false;
  for(const g of gaps){ if(peng.x+20>g.x && peng.x<g.x+g.w && peng.y>=180) overGap=true; }
  return !overGap;
}
function step(){
 if(running){
   frame++; if(frame%90===0) spawn();
   gaps.forEach(g=>g.x -= 5 + Math.floor(score/8));
   gaps = gaps.filter(g=>{ if(g.x+g.w<0){ score++; setText('score',score); if(score>best){best=score; localStorage.setItem('peng_best',best); setText('best',best);} setText('level',1+Math.floor(score/5)); return false;} return true; });
   peng.vy += 0.6; peng.y += peng.vy;
   if(onIce() && peng.y>=180){ peng.y=180; peng.vy=0; }
   if(!onIce() && peng.y>260){ running=false; beep(150,.2,'square'); }
 }
 draw(); requestAnimationFrame(step);
}
window.addEventListener('keydown', e=>{ if(e.code==='Space') jump();});
cvs.addEventListener('pointerdown', jump);
qs('#startBtn').onclick=reset; draw(); step();
