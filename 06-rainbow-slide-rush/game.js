import { initGame } from '../shared/js/core.js';

initGame({
  id:'rainbow-slide',
  title:'Rainbow Slide Rush',
  goalText:'Slide to the finish pad',
  speed:11,
  jump:8.4,
  skyTop:0xc4b5fd,
  skyBottom:0xf5f3ff,
  ground:{size:200,color:0x67e8f9},
  winText:'Rainbow slide complete. Nice rush!',
  build({THREE,state,player,addSolid,addCoin,addGoal,addUpdater}){
    const colors=[0xef4444,0xf97316,0xfacc15,0x22c55e,0x3b82f6,0x8b5cf6];
    for(let i=0;i<6;i++){
      const lane=new THREE.Mesh(new THREE.BoxGeometry(4,.6,120), new THREE.MeshStandardMaterial({color:colors[i]}));
      lane.position.set((i-2.5)*4.2,18,-40); lane.rotation.x=-0.55; lane.castShadow=true; addSolid(lane);
    }
    for(let i=0;i<12;i++){ addCoin(new THREE.Vector3(((i%6)-2.5)*4.2, 20-(i*1.1), -10-i*8)); }
    const finish=new THREE.Mesh(new THREE.CylinderGeometry(8,8,.8,24), new THREE.MeshStandardMaterial({color:0xffffff, emissive:0x8b5cf6})); finish.position.set(0,-14,-92); addGoal(finish);
    addUpdater((dt)=>{ if(player.position.z<5) player.position.z -= dt*10; if(player.position.y> -14) player.position.y -= dt*2; });
  }
});