
const cvs=qs('#game'), ctx=cvs.getContext('2d'), letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
let bubbles=[], score=0, best=+localStorage.getItem('letter_best')||0, running=false, target='A', frame=0;
setText('best',best);
function newTarget(){ target=pick(letters.slice(0,12)); qs('#targetLetter').textContent=target; }
function reset(){ bubbles=[]; score=0; running=true; frame=0; setText('score',0); newTarget(); }
function spawn(){ const l=pick(letters.slice(0,12)); bubbles.push({x:rand(40,760),y:560,r:26,l,sp:rand(1,3)}); }
function draw(){
  ctx.fillStyle='#eefcff'; ctx.fillRect(0,0,800,500);
  bubbles.forEach(b=>{
    ctx.fillStyle=b.l===target?'#ffe066':'#a0c4ff'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,7); ctx.fill();
    ctx.fillStyle='#183153'; ctx.font='bold 24px Arial'; ctx.fillText(b.l,b.x-8,b.y+8);
  });
  ctx.fillStyle='#183153'; ctx.fillText('Target '+target,20,30);
}
function step(){
  if(running){
    frame++;
    if(frame%28===0) spawn();
    bubbles.forEach(b=>b.y -= b.sp + Math.floor(score/10));
    bubbles = bubbles.filter(b=> b.y>-40);
  }
  draw(); requestAnimationFrame(step);
}
cvs.addEventListener('pointerdown', e=>{
  if(!running) return;
  const r=cvs.getBoundingClientRect(), x=(e.clientX-r.left)*cvs.width/r.width, y=(e.clientY-r.top)*cvs.height/r.height;
  for(let i=bubbles.length-1;i>=0;i--){
    const b=bubbles[i];
    if(Math.hypot(x-b.x,y-b.y)<b.r){
      if(b.l===target){ score++; beep(740,.06); if(score%4===0) newTarget(); }
      else { score=Math.max(0,score-1); beep(180,.08,'square'); }
      setText('score',score); setText('level',1+Math.floor(score/6));
      if(score>best){ best=score; localStorage.setItem('letter_best',best); setText('best',best); }
      bubbles.splice(i,1); break;
    }
  }
});
qs('#startBtn').onclick=reset; draw(); step();
