
let score=0,best=+localStorage.getItem('count_best')||0;
setText('best',best);
function round(){
 const n=rand(3,12), emoji=pick(['💎','🪙','⭐','🍪']);
 qs('#treasures').textContent=Array(n).fill(emoji).join(' ');
 const opts=shuffle([n, n+1, Math.max(1,n-1), n+2]).slice(0,4);
 const box=qs('#choices'); box.innerHTML='';
 opts.forEach(v=>{ const b=document.createElement('button'); b.textContent=v; b.onclick=()=>{ if(v===n){ score++; beep(700,.05);} else { score=Math.max(0,score-1); beep(180,.08,'square'); } setText('score',score); setText('level',1+Math.floor(score/5)); if(score>best){best=score; localStorage.setItem('count_best',best); setText('best',best);} round();}; box.appendChild(b); });
}
qs('#newBtn').onclick=round; round();
