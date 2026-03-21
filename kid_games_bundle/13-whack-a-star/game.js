
let score=0,best=+localStorage.getItem('whack_best')||0, running=false, timer=null;
setText('best',best);
const board=qs('#board'); board.style.gridTemplateColumns='repeat(3,1fr)';
for(let i=0;i<9;i++){ const b=document.createElement('button'); b.style.height='100px'; b.className='ghost'; board.appendChild(b); }
function tick(){
 qsa('#board button').forEach(b=>{ b.textContent=''; b.onclick=null; });
 const idx=rand(0,8), bad=Math.random()<0.25;
 const b=qsa('#board button')[idx]; b.textContent=bad?'☁️':'⭐'; b.style.fontSize='2rem';
 b.onclick=()=>{ if(bad){ score=Math.max(0,score-1); beep(180,.08,'square'); } else { score++; beep(700,.05); } setText('score',score); setText('level',1+Math.floor(score/5)); if(score>best){best=score; localStorage.setItem('whack_best',best); setText('best',best);} };
}
qs('#startBtn').onclick=()=>{ if(timer) clearInterval(timer); score=0; setText('score',0); running=true; tick(); timer=setInterval(tick, 650); };
