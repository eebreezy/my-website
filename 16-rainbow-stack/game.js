
const order=['🔴','🟠','🟡','🟢','🔵','🟣'];
let chosen=[], score=0, best=+localStorage.getItem('rainbow_best')||0;
setText('best',best);
qs('#targetRow').innerHTML=order.map(c=>`<div class="badge">${c}</div>`).join('');
function render(){
 qs('#chips').innerHTML=''; qs('#stack').innerHTML=chosen.map(c=>`<div class="badge">${c}</div>`).join('');
 shuffle(order).forEach(c=>{
   const b=document.createElement('button'); b.textContent=c; b.onclick=()=>{ chosen.push(c); qs('#stack').innerHTML=chosen.map(cc=>`<div class="badge">${cc}</div>`).join(''); check(); };
   qs('#chips').appendChild(b);
 });
 score=0; setText('score',0); setText('level',1);
}
function check(){
 if(chosen.length<6) return;
 if(chosen.join('')===order.join('')){ score++; setText('score',score); beep(720,.08); if(score>best){best=score; localStorage.setItem('rainbow_best',best); setText('best',best);} }
 else { beep(180,.08,'square'); }
 chosen=[]; setText('level',1+score); render();
}
qs('#resetBtn').onclick=()=>{ chosen=[]; render(); };
render();
