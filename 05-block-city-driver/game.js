import { initGame } from '../shared/js/core.js';

initGame({
  id:'block-city',
  title:'Block City Driver',
  goalText:'Collect 60 and reach garage',
  speed:10,
  jump:7.8,
  skyTop:0x93c5fd,
  skyBottom:0xe0f2fe,
  ground:{size:220,color:0x9ca3af},
  winText:'You cruised through Block City and made it to the garage!',
  failText:'Traffic hazard hit you. Restart the route.',
  build({THREE,scene,state,player,addSolid,addCoin,addGoal,addHazard,addUpdater}){
    const road=new THREE.Mesh(new THREE.BoxGeometry(28,1,180), new THREE.MeshStandardMaterial({color:0x374151})); road.position.set(0,.02,-10); addSolid(road);
    for(let side of [-1,1]){
      for(let i=0;i<9;i++){
        const b=new THREE.Mesh(new THREE.BoxGeometry(12,6+((i*3)%8),12), new THREE.MeshStandardMaterial({color:side<0?0xfbbf24:0x60a5fa}));
        b.position.set(side*22,3+i%4,-70+i*18); b.castShadow=true; addSolid(b);
      }
    }
    const car=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.1,4), new THREE.MeshStandardMaterial({color:0xef4444}));
    car.position.set(0,1.9,0); car.castShadow=true; scene.add(car);
    addUpdater(()=>{ car.position.copy(player.position); car.position.y=1.9; car.rotation.y=player.rotation.y; player.visible=false; });
    for(let i=0;i<6;i++) addCoin(new THREE.Vector3(0,2,-15-i*24));
    for(let i=0;i<4;i++){
      const traffic=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.1,4.2), new THREE.MeshStandardMaterial({color:0x22c55e}));
      traffic.position.set(i%2?4:-4,1.9,-30-i*28); traffic.castShadow=true; addHazard(traffic);
      addUpdater((dt)=>{ traffic.position.x = Math.sin(state.time*1.8+i)*8; });
    }
    const garage=new THREE.Mesh(new THREE.BoxGeometry(14,8,12), new THREE.MeshStandardMaterial({color:0x1d4ed8, emissive:0x0f172a}));
    garage.position.set(0,4,-150); addGoal(garage);
    addUpdater(()=>{ garage.visible = state.score >= 60; });
  }
});