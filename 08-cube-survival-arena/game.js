import { initGame } from '../shared/js/core.js';

initGame({
  id:'cube-survival',
  title:'Cube Survival Arena',
  goalText:'Survive for 20 seconds',
  speed:8,
  jump:9,
  skyTop:0x86efac,
  skyBottom:0xf0fdf4,
  ground:{size:110,color:0x14532d},
  failText:'A hazard cube got you. Keep moving.',
  winText:'You survived the arena and opened the portal!',
  build({THREE,state,addSolid,addCoin,addGoal,addHazard,addUpdater}){
    const arena=new THREE.Mesh(new THREE.CylinderGeometry(26,26,1,32), new THREE.MeshStandardMaterial({color:0x166534})); arena.position.y=.5; addSolid(arena);
    for(let i=0;i<8;i++) addCoin(new THREE.Vector3(Math.cos(i*.78)*14,2,Math.sin(i*.78)*14));
    for(let i=0;i<6;i++){
      const h=new THREE.Mesh(new THREE.BoxGeometry(3,3,3), new THREE.MeshStandardMaterial({color:0xef4444, emissive:0x450a0a}));
      h.position.set(Math.cos(i)*10,1.5,Math.sin(i)*10); h.castShadow=true; addHazard(h);
      addUpdater((dt)=>{ h.position.x=Math.cos(state.time*(1.4+i*.15)+i)*18; h.position.z=Math.sin(state.time*(1.9+i*.12)+i)*18; h.rotation.x+=dt*2; h.rotation.y+=dt*1.6; });
    }
    const portal=new THREE.Mesh(new THREE.TorusGeometry(5,.8,16,40), new THREE.MeshStandardMaterial({color:0x60a5fa, emissive:0x1e3a8a}));
    portal.position.set(0,7,0); portal.rotation.x=Math.PI/2; addGoal(portal);
    addUpdater(()=>{ portal.visible = state.time > 20; });
  }
});