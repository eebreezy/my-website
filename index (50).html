
const cols=['🔴','🟢','🔵','🟡'];
let seq=[], input=[], canPlay=false, score=0, best=+localStorage.getItem('pattern_best')||0;
setText('best',best);
const pads=qs('#pads');
cols.forEach((c,i)=>{ const b=document.createElement('button'); b.textContent=c; b.style.fontSize='2rem'; b.dataset.i=i; pads.appendChild(b); 
  b.onclick=()=>tap(i,b);
});
function flash(i){
  const b=qsa('#pads button')[i];
  b.animate([{transform:'scale(1)'},{transform:'scale(1.2)'},{transform:'scale(1)'}],{duration:300});
  beep(400+i*120,.12);
}
async function showSeq(){
  canPlay=false;
  for(const i of seq){ flash(i); await new Promise(r=>setTimeout(r,500)); }
  canPlay=true;
}
function nextRound(){ seq.push(rand(0,3)); input=[]; setText('level', seq.length); showSeq(); }
function tap(i,b){
  if(!canPlay) return;
  input.push(i); flash(i);
  if(seq[input.length-1]!==i){ score=0; setText('score',0); beep(150,.2,'square'); seq=[]; canPlay=false; return; }
  if(input.length===seq.length){ score++; setText('score',score); if(score>best){ best=score; localStorage.setItem('pattern_best',best); setText('best',best);} setTimeout(nextRound,500); }
}
qs('#startBtn').onclick=()=>{ seq=[]; score=0; setText('score',0); nextRound(); };
