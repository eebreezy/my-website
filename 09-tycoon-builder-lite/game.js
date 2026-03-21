import { initGame } from '../shared/js/core.js';

initGame({
  id:'tycoon-builder',
  title:'Tycoon Builder Lite',
  goalText:'Build the base and enter HQ',
  speed:7.4,
  jump:8.8,
  skyTop:0x67e8f9,
  skyBottom:0xecfeff,
  ground:{size:180,color:0x4ade80},
  winText:'HQ complete. Your tiny tycoon is running!',
  build({THREE,state,addSolid,addCoin,addGoal,addUpdater}){
    const pad=new THREE.Mesh(new THREE.BoxGeometry(22,1,22), new THREE.MeshStandardMaterial({color:0xe5e7eb})); pad.position.set(0,.5,-26); addSolid(pad);
    const parts=[];
    for(let i=0;i<8;i++) addCoin(new THREE.Vector3(-24 + (i%4)*16, 2, -4 - Math.floor(i/4)*16));
    for(let i=0;i<5;i++){
      const wall=new THREE.Mesh(new THREE.BoxGeometry(i<4?8:16, i<4?6:1, i<4?1:16), new THREE.MeshStandardMaterial({color:0x3b82f6}));
      wall.visible=false; parts.push(wall); addSolid(wall);
    }
    parts[0].position.set(-8,3,-18); parts[1].position.set(8,3,-18); parts[2].position.set(0,3,-10); parts[2].rotation.y=Math.PI/2; parts[3].position.set(0,3,-26); parts[3].rotation.y=Math.PI/2; parts[4].position.set(0,6.5,-18);
    const hq=new THREE.Mesh(new THREE.BoxGeometry(10,7,10), new THREE.MeshStandardMaterial({color:0x1d4ed8, emissive:0x0f172a})); hq.position.set(0,3.5,-18); hq.visible=false; addGoal(hq);
    addUpdater(()=>{ const stage=Math.min(5, Math.floor(state.score/20)); parts.forEach((p,i)=>p.visible=i<stage); hq.visible = state.score >= 80; });
  }
});