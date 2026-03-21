
const colors = [
  ['RED','#ff6b6b'],['BLUE','#4d96ff'],['GREEN','#2ecc71'],['YELLOW','#f1c40f'],['PURPLE','#9b59b6']
];
let score=0,best=+localStorage.getItem('color_best')||0;
setText('best',best);
function newRound(){
  const word = pick(colors), ink = pick(colors);
  const wordEl=qs('#word'); wordEl.textContent=word[0]; wordEl.style.color=ink[1];
  const correct = ink[0];
  const opts = shuffle([correct, ...shuffle(colors.map(c=>c[0]).filter(n=>n!==correct)).slice(0,3)]);
  const box=qs('#choices'); box.innerHTML='';
  opts.forEach(name=>{
    const b=document.createElement('button'); b.className='secondary'; b.textContent=name;
    b.onclick=()=>{
      if(name===correct){ score++; beep(660,.06); confettiBurst(wordEl); }
      else { score=Math.max(0,score-1); beep(180,.09,'square'); }
      setText('score',score); setText('level',1+Math.floor(score/5));
      if(score>best){ best=score; localStorage.setItem('color_best',best); setText('best',best); }
      newRound();
    };
    box.appendChild(b);
  });
}
qs('#startBtn').onclick=newRound; newRound();
