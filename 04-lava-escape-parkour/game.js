import { initGame } from '../shared/js/core.js';

initGame({
  id:'lava-escape',
  title:'Lava Escape Parkour',
  goalText:'Escape the lava route',
  speed:7.8,
  jump:9.6,
  skyTop:0xfb7185,
  skyBottom:0xfee2e2,
  ground:{size:220,color:0x1f2937},
  floorY:-100,
  failText:'You touched lava. Try the route again.',
  winText:'You escaped the lava parkour!',
  build({THREE,addSolid,addCoin,addGoal,addHazard}){
    const lava=new THREE.Mesh(new THREE.BoxGeometry(220,2,220), new THREE.MeshStandardMaterial({color:0xff5a36, emissive:0x7f1d1d}));
    lava.position.y=-1.2; addHazard(lava);
    const steps=[];
    for(let i=0;i<14;i++){
      const s=new THREE.Mesh(new THREE.BoxGeometry(5,1,5), new THREE.MeshStandardMaterial({color:i%2?0xf59e0b:0xfcd34d}));
      s.position.set((i%2?1:-1)*(5+i*1.8), .5+i*.75, -i*8); s.castShadow=true; s.receiveShadow=true; addSolid(s); steps.push(s);
      addCoin(new THREE.Vector3(s.position.x,s.position.y+1.2,s.position.z));
    }
    const bridges=[[-8,13,-80,12,1,4],[10,14,-92,12,1,4],[-6,15,-104,14,1,4],[8,16,-116,16,1,4]];
    bridges.forEach((p,i)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(p[3],1,p[5]), new THREE.MeshStandardMaterial({color:i%2?0x60a5fa:0xa78bfa})); b.position.set(p[0],p[1],p[2]); b.castShadow=true; addSolid(b);});
    const goal=new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.4,1,24), new THREE.MeshStandardMaterial({color:0x4ade80, emissive:0x14532d}));
    goal.position.set(8,17,-116); addGoal(goal);
  }
});