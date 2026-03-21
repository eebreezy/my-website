
const shapes = ['Circle','Square','Triangle','Star'];
let score=0,best=+localStorage.getItem('shape_best')||0;
setText('best',best);
function icon(s){
  return {Circle:'⚪',Square:'🟦',Triangle:'🔺',Star:'⭐'}[s];
}
function render(){
  const bins=qs('#binArea'), area=qs('#shapeArea'); bins.innerHTML=''; area.innerHTML='';
  shapes.forEach(name=>{
    const slot=document.createElement('div');
    slot.className='panel slot'; slot.dataset.shape=name;
    slot.style.width='160px'; slot.style.minHeight='110px'; slot.style.textAlign='center';
    slot.innerHTML=`<div class="big" style="font-size:2rem">${icon(name)}</div><div>${name}</div>`;
    slot.ondragover=e=>e.preventDefault();
    slot.ondrop=e=>{
      e.preventDefault(); const shape=e.dataTransfer.getData('text/plain');
      if(shape===name){ 
        const chip=qs(`[data-chip="${shape}"]`); if(chip){ chip.remove(); score++; setText('score',score); beep(600,.05); }
        if(score>best){ best=score; localStorage.setItem('shape_best',best); setText('best',best); }
      } else { beep(180,.08,'square'); }
    };
    bins.appendChild(slot);
  });
  shuffle(shapes.concat(shapes)).slice(0,6).forEach((name,idx)=>{
    const chip=document.createElement('div');
    chip.className='badge chip'; chip.draggable=true; chip.dataset.chip=name;
    chip.style.fontSize='1.3rem'; chip.innerHTML=`${icon(name)} ${name}`;
    chip.ondragstart=e=>e.dataTransfer.setData('text/plain', name);
    area.appendChild(chip);
  });
  score=0; setText('score',0); setText('level',1);
}
qs('#resetBtn').onclick=render; render();
