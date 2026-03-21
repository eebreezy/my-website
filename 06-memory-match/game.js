
const icons=['🐶','🐱','🦊','🐸','🐼','🦁','🐵','🐰'];
let first=null, lock=false, found=0, score=0, best=+localStorage.getItem('memory_best')||0;
setText('best', best);
function render(){
  const cards=shuffle(icons.concat(icons)).map((icon,i)=>({icon,open:false,done:false,id:i}));
  const board=qs('#board'); board.style.gridTemplateColumns='repeat(auto-fit,minmax(110px,1fr))';
  board.innerHTML='';
  first=null; lock=false; found=0; score=0; setText('score',0); setText('level',1);
  cards.forEach(card=>{
    const div=document.createElement('button');
    div.className='ghost'; div.style.height='100px'; div.style.fontSize='2rem'; div.textContent='?';
    div.onclick=()=>{
      if(lock || card.done || card.open) return;
      card.open=true; div.textContent=card.icon; beep(500,.04);
      if(!first){ first={card,div}; return; }
      score++; setText('score',score);
      if(first.card.icon===card.icon){
        card.done=first.card.done=true; found+=2; first=null; beep(760,.07);
        if(found===cards.length){ const final=Math.max(1,100-score); setText('score', final); if(final>best){ best=final; localStorage.setItem('memory_best',best); setText('best',best);} }
      }else{
        lock=true;
        setTimeout(()=>{ card.open=false; first.card.open=false; div.textContent='?'; first.div.textContent='?'; first=null; lock=false; beep(200,.08,'square'); }, 700);
      }
    };
    board.appendChild(div); card.div=div;
  });
}
qs('#resetBtn').onclick=render; render();
