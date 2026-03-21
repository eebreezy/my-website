
const cvs = qs('#game'), ctx = cvs.getContext('2d');
let balloons=[], score=0, misses=0, best=+localStorage.getItem('balloon_best')||0, running=false, frame=0;
setText('best', best);
function spawn(){ balloons.push({x:rand(50,750),y:560,r:rand(22,34),speed:rand(1,3),color:pick(['#ff6b6b','#ffd166','#4ecdc4','#74b9ff','#ff9ff3'])}); }
function reset(){ balloons=[]; score=0; misses=0; frame=0; running=true; setText('score',score); setText('level',1); }
function drawSky(){
  ctx.fillStyle='#dff7ff'; ctx.fillRect(0,0,800,500);
  ctx.fillStyle='#fff'; [[80,90],[240,70],[450,100],[680,60]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,28,0,7);ctx.arc(x+25,y+10,24,0,7);ctx.arc(x-25,y+10,24,0,7);ctx.fill();});
  ctx.fillStyle='#7bd389'; ctx.fillRect(0,450,800,50);
}
function draw(){ drawSky();
  for(const b of balloons){
    ctx.strokeStyle='#777'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(b.x,b.y+b.r); ctx.lineTo(b.x,b.y+b.r+35); ctx.stroke();
    ctx.fillStyle=b.color; ctx.beginPath(); ctx.ellipse(b.x,b.y,b.r*0.85,b.r,0,0,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(b.x-8,b.y-8,6,10,0,0,7); ctx.fill();
  }
  ctx.fillStyle='#183153'; ctx.font='20px Arial'; ctx.fillText('Misses: '+misses+'/8', 20, 30);
  if(!running){ ctx.font='bold 36px Arial'; ctx.fillText('Press Start', 310, 250); }
}
function step(){
  if(running){
    frame++;
    if(frame%30===0) spawn();
    balloons.forEach(b=>b.y-=b.speed);
    balloons = balloons.filter(b=>{
      if(b.y+b.r < 0){ misses++; beep(180,.08,'sawtooth'); return false; }
      return true;
    });
    if(misses>=8){ running=false; if(score>best){ best=score; localStorage.setItem('balloon_best', best); setText('best', best);} }
    setText('level', 1 + Math.floor(score/10));
  }
  draw(); requestAnimationFrame(step);
}
cvs.addEventListener('pointerdown', e=>{
  if(!running) return;
  const r=cvs.getBoundingClientRect(), x=(e.clientX-r.left)*cvs.width/r.width, y=(e.clientY-r.top)*cvs.height/r.height;
  for(let i=balloons.length-1;i>=0;i--){
    const b=balloons[i];
    if(Math.hypot(x-b.x,y-b.y)<b.r){ balloons.splice(i,1); score++; setText('score',score); beep(700,.06); return; }
  }
});
qs('#startBtn').onclick=()=>reset();
draw(); step();
