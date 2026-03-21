
let arr=[1,2,3,4,5,6,7,8,''], score=0, best=+localStorage.getItem('slide_best')||0;
setText('best',best);
function render(){
 const g=qs('#grid'); g.innerHTML='';
 arr.forEach((n,i)=>{
   const b=document.createElement('button'); b.style.height='90px'; b.textContent=n;
   b.className=n===''?'ghost':'secondary'; b.onclick=()=>move(i); g.appendChild(b);
 });
}
function move(i){
 const empty=arr.indexOf(''); const ok=[empty-1, empty+1, empty-3, empty+3].includes(i) && !(empty%3===0 && i===empty-1) && !(empty%3===2 && i===empty+1);
 if(!ok) return beep(160,.05,'square');
 [arr[i],arr[empty]]=[arr[empty],arr[i]]; score++; setText('score',score); render(); beep(420,.04);
 if(arr.join(',')==='1,2,3,4,5,6,7,8,'){ const final=Math.max(1,200-score); setText('score',final); if(final>best){ best=final; localStorage.setItem('slide_best',best); setText('best',best);} }
}
qs('#shuffleBtn').onclick=()=>{ arr=shuffle([1,2,3,4,5,6,7,8,'']); score=0; setText('score',0); render(); };
render();
