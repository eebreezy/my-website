
const cvs=qs('#game'), ctx=cvs.getContext('2d');
const grid=10, size=50;
let walls=[], player={x:0,y:0}, goal={x:9,y:9}, score=0, best=+localStorage.getItem('maze_best')||0;
setText('best',best);
function newMaze(){
  walls=[];
  for(let y=0;y<grid;y++) for(let x=0;x<grid;x++){
    if((x||y) && (x!==9 || y!==9) && Math.random()<0.20) walls.push(x+','+y);
  }
  // ensure simple path
  for(let i=0;i<10;i++) walls = walls.filter(w=>w!==i+',0' && w!=='9,'+i);
  player={x:0,y:0};
}
function draw(){
  ctx.fillStyle='#f8fdff'; ctx.fillRect(0,0,500,500);
  for(let y=0;y<grid;y++) for(let x=0;x<grid;x++){
    ctx.strokeStyle='#d7ecff'; ctx.strokeRect(x*size,y*size,size,size);
    if(walls.includes(x+','+y)){ ctx.fillStyle='#9aa9b8'; ctx.fillRect(x*size+4,y*size+4,size-8,size-8); }
  }
  ctx.font='28px Arial'; ctx.fillText('⭐', goal.x*size+10, goal.y*size+35);
  ctx.font='28px Arial'; ctx.fillText('😀', player.x*size+10, player.y*size+35);
}
function move(dx,dy){
  const nx=player.x+dx, ny=player.y+dy;
  if(nx<0||ny<0||nx>=grid||ny>=grid||walls.includes(nx+','+ny)) return beep(180,.05,'square');
  player.x=nx; player.y=ny; beep(450,.03);
  if(player.x===goal.x && player.y===goal.y){ score++; setText('score',score); if(score>best){best=score; localStorage.setItem('maze_best',best); setText('best',best);} setText('level',1+score); newMaze(); }
  draw();
}
window.addEventListener('keydown', e=>({ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]})[e.key] && move(...({ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]})[e.key]));
qs('#resetBtn').onclick=()=>{newMaze();draw();}
newMaze(); draw();
