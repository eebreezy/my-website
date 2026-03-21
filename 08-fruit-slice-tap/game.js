
const cvs=qs('#game'), ctx=cvs.getContext('2d');
let items=[], score=0, best=+localStorage.getItem('fruit_best')||0, running=false, frame=0;
setText('best',best);
const goods=['🍎','🍌','🍉','🍓','🍊'], bads=['🥦','🪨'];
function reset(){ items=[]; score=0; running=true; frame=0; setText('score',0); setText('level',1);}
function spawn(){ const bad=Math.random()<0.25; items.push({x:rand(50,750),y:550,vy:-rand(9,14),vx:rand(-2,2),emoji:pick(bad?bads:goods),good:!bad,size:36}); }
function draw(){ ctx.fillStyle='#f3fff1'; ctx.fillRect(0,0,800,500); items.forEach(i=>{ ctx.font='36px Arial'; ctx.fillText(i.emoji,i.x,i.y);}); }
function step(){
 if(running){
   frame++; if(frame%22===0) spawn();
   items.forEach(i=>{ i.vy += .35; i.y += i.vy; i.x += i.vx; });
   items = items.filter(i=> i.y < 560);
 }
 draw(); requestAnimationFrame(step);
}
cvs.addEventListener('pointerdown', e=>{
 if(!running) return;
 const r=cvs.getBoundingClientRect(), x=(e.clientX-r.left)*cvs.width/r.width, y=(e.clientY-r.top)*cvs.height/r.height;
 for(let i=items.length-1;i>=0;i--){
   const it=items[i];
   if(Math.abs(x-it.x)<24 && Math.abs(y-it.y)<24){
     if(it.good){ score++; beep(700,.06); } else { score=Math.max(0,score-2); beep(180,.08,'square'); }
     setText('score',score); setText('level',1+Math.floor(score/8));
     if(score>best){ best=score; localStorage.setItem('fruit_best',best); setText('best',best); }
     items.splice(i,1); break;
   }
 }
});
qs('#startBtn').onclick=reset; draw(); step();
