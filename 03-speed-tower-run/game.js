import { initGame } from '../shared/js/core.js';

initGame({
  id:'speed-tower',
  title:'Speed Tower Run',
  goalText:'Climb to the rooftop',
  speed:8.2,
  jump:10,
  jumpBoost:16,
  skyTop:0xfde68a,
  skyBottom:0xfffbeb,
  ground:{size:90,color:0x93c5fd},
  winText:'Tower conquered. That was a clean climb!',
  build({THREE,addSolid,addCoin,addGoal,addBoost,addUpdater,state}){
    const matA=new THREE.MeshStandardMaterial({color:0x38bdf8});
    const matB=new THREE.MeshStandardMaterial({color:0xf59e0b});
    for(let level=0; level<12; level++){
      const angle=level*0.72;
      const x=Math.cos(angle)*12, z=Math.sin(angle)*12, y=2+level*2.2;
      const box=new THREE.Mesh(new THREE.BoxGeometry(8,1,4), level%2?matA:matB);
      box.position.set(x,y,z); box.rotation.y=-angle; box.castShadow=true; box.receiveShadow=true; addSolid(box);
      addCoin(new THREE.Vector3(x,y+1.2,z));
    }
    for(let i=0;i<3;i++){
      const pad=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.5,.6,20), new THREE.MeshStandardMaterial({color:0x22c55e, emissive:0x14532d}));
      pad.position.set(i===0?0:(i===1?8:-8),1+i*6,-5+i*10); addBoost(pad);
    }
    const moving=new THREE.Mesh(new THREE.BoxGeometry(8,1,4), new THREE.MeshStandardMaterial({color:0xe879f9}));
    moving.position.set(0,22,0); moving.castShadow=true; addSolid(moving);
    addUpdater((dt)=>{ moving.position.x=Math.sin(state.time*1.5)*8; moving.position.z=Math.cos(state.time*1.5)*5; });
    const roof=new THREE.Mesh(new THREE.CylinderGeometry(4,4,1.4,24), new THREE.MeshStandardMaterial({color:0xfef08a, emissive:0x443300}));
    roof.position.set(-8,28,-10); addGoal(roof);
  }
});