import { initGame } from '../shared/js/core.js';

initGame({
  id:'treasure-dig',
  title:'Treasure Dig Simulator',
  goalText:'Collect 100 and bank it',
  speed:7,
  jump:8.8,
  skyTop:0xfcd34d,
  skyBottom:0xfef3c7,
  ground:{size:160,color:0xa16207},
  winText:'Treasure banked. Dig site cleared!',
  build({THREE,state,addSolid,addCoin,addGoal,addUpdater}){
    const pit=new THREE.Mesh(new THREE.BoxGeometry(60,8,60), new THREE.MeshStandardMaterial({color:0x854d0e})); pit.position.set(0,-3,0); addSolid(pit);
    for(let i=0;i<16;i++){
      const x=((i%4)-1.5)*10; const z=(Math.floor(i/4)-1.5)*10;
      const cube=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.4,2.4), new THREE.MeshStandardMaterial({color:i%3?0xfde047:0x93c5fd, emissive:0x3f2a00}));
      cube.position.set(x,1.2,z); cube.castShadow=true; addSolid(cube); addCoin(new THREE.Vector3(x,3.3,z));
    }
    const bank=new THREE.Mesh(new THREE.BoxGeometry(10,7,10), new THREE.MeshStandardMaterial({color:0x1d4ed8, emissive:0x0f172a}));
    bank.position.set(0,3,-38); addGoal(bank);
    addUpdater(()=>{ bank.visible = state.score >= 100; });
  }
});