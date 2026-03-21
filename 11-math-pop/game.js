
let score=0, best=+localStorage.getItem('math_best')||0;
setText('best',best);
function newProblem(){
  const a=rand(1,10), b=rand(1,10), op=pick(['+','-']);
  let ans= op==='+' ? a+b : Math.max(a,b)-Math.min(a,b);
  const left= op==='+' ? a : Math.max(a,b), right= op==='+' ? b : Math.min(a,b);
  qs('#problem').textContent=`${left} ${op} ${right} = ?`;
  const opts=shuffle([ans, ans+1, Math.max(0,ans-1), ans+2]).slice(0,4);
  const box=qs('#choices'); box.innerHTML='';
  opts.forEach(n=>{
    const b=document.createElement('button'); b.textContent=n;
    b.onclick=()=>{
      if(n===ans){ score++; beep(680,.05); } else { score=Math.max(0,score-1); beep(180,.08,'square'); }
      setText('score',score); setText('level',1+Math.floor(score/5));
      if(score>best){ best=score; localStorage.setItem('math_best',best); setText('best',best); }
      newProblem();
    }; box.appendChild(b);
  });
}
qs('#newBtn').onclick=newProblem; newProblem();
