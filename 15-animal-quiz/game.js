
const data=[
 ['I say moo.','🐮 Cow'],['I hop and like carrots.','🐰 Rabbit'],['I roar in the jungle.','🦁 Lion'],
 ['I waddle on ice.','🐧 Penguin'],['I swing in trees.','🐵 Monkey'],['I bark.','🐶 Dog']
];
let score=0,best=+localStorage.getItem('animal_best')||0;
setText('best',best);
function ask(){
 const q=pick(data), answer=q[1];
 qs('#clue').textContent=q[0];
 const opts=shuffle([answer, ...shuffle(data.map(d=>d[1]).filter(a=>a!==answer)).slice(0,3)]);
 const box=qs('#choices'); box.innerHTML='';
 opts.forEach(o=>{ const b=document.createElement('button'); b.textContent=o; b.onclick=()=>{ if(o===answer){ score++; beep(700,.05);} else { score=Math.max(0,score-1); beep(180,.08,'square'); } setText('score',score); setText('level',1+Math.floor(score/4)); if(score>best){best=score; localStorage.setItem('animal_best',best); setText('best',best);} ask(); }; box.appendChild(b);});
}
qs('#newBtn').onclick=ask; ask();
