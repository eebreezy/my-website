
const cvs=qs('#game'), ctx=cvs.getContext('2d');
let tiles=[], score=0, best=+localStorage.getItem('tiles_best')||0, running=false, frame=0;
setText('best',best);
function reset(){ tiles=[]; score=0; running=true; frame=0; setText('score',0); setText('level',1);}
function spawn(){ tiles.push({lane:rand(0,3), y:-120}); }
function draw(){
 ctx.fillStyle='#f8fdff'; ctx.fillRect(0,0,500,600);
 for(let i=1;i<4;i++){ ctx.fillStyle='#dcefff'; ctx.fillRect(i*125,0,2,600); }
 ctx.fillStyle='#ffd166'; ctx.fillRect(0,520,500,8);
 tiles.forEach(t=>{ ctx.fillStyle='#74c0fc'; ctx.fillRect(t.lane*125+12,t.y,101,100); });
}
function step(){
 if(running){
   frame++; if(frame%28===0) spawn();
   tiles.forEach(t=>t.y += 5 + Math.floor(score/12));
   if(tiles.some(t=>t.y>600)){ running=false; beep(150,.2,'square'); }
 }
 draw(); requestAnimationFrame(step);
}
cvs.addEventListener('pointerdown', e=>{
 if(!running) return;
 const r=cvs.getBoundingClientRect(); const x=(e.clientX-r.left)*cvs.width/r.width, y=(e.clientY-r.top)*cvs.height/r.height;
 for(let i=tiles.length-1;i>=0;i--){
   const t=tiles[i], tx=t.lane*125+12;
   if(x>tx && x<tx+101 && y>t.y && y<t.y+100 && t.y>440 && t.y<545){
     score++; tiles.splice(i,1); beep(420+score*5,.05); setText('score',score); setText('level',1+Math.floor(score/8));
     if(score>best){ best=score; localStorage.setItem('tiles_best',best); setText('best',best);} break;
   }
 }
});
qs('#startBtn').onclick=reset; draw(); step();
