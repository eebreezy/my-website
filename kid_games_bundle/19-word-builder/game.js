
const words=[['CAT','🐱'],['DOG','🐶'],['SUN','☀️'],['FISH','🐟'],['STAR','⭐'],['MOON','🌙']];
let current='', built='', score=0, best=+localStorage.getItem('word_best')||0;
setText('best',best);
function newWord(){
  const [w,e]=pick(words); current=w; built=''; qs('#emojiHint').textContent=e; qs('#scramble').textContent=shuffle(w.split('')).join(' ');
  qs('#built').textContent='_ '.repeat(w.length).trim();
  const box=qs('#letterBtns'); box.innerHTML='';
  shuffle(w.split('')).forEach(ch=>{ const b=document.createElement('button'); b.textContent=ch; b.onclick=()=>{ built += ch; qs('#built').textContent=built.padEnd(w.length,'_').split('').join(' '); check();}; box.appendChild(b); });
}
function check(){
  if(built.length!==current.length) return;
  if(built===current){ score++; beep(720,.06); } else { score=Math.max(0,score-1); beep(180,.08,'square'); }
  setText('score',score); setText('level',1+Math.floor(score/4)); if(score>best){best=score; localStorage.setItem('word_best',best); setText('best',best);} setTimeout(newWord,500);
}
qs('#clearBtn').onclick=()=>{ built=''; qs('#built').textContent='_ '.repeat(current.length).trim(); };
qs('#newBtn').onclick=newWord; newWord();
