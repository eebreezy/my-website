import { initGame } from '../shared/js/core.js';

initGame({
  id:'pet-park',
  title:'Pet Park Collector',
  goalText:'Collect 80 score',
  speed:7.3,
  jump:8.8,
  skyTop:0xf9a8d4,
  skyBottom:0xfff1f2,
  ground:{size:150,color:0x86efac},
  winText:'Pet park complete! You collected enough stars.',
  failText:'A slime cube bumped you. Restart and dodge it.',
  build({THREE,state,addSolid,addCoin,addHazard,addGoal,addUpdater,makeStar}){
    const colors=[0xa7f3d0,0x93c5fd,0xfde68a,0xf9a8d4];
    for(let x=-24;x<=24;x+=12){
      for(let z=-24;z<=24;z+=12){
        const p=new THREE.Mesh(new THREE.CylinderGeometry(5,5,1,20), new THREE.MeshStandardMaterial({color:colors[(x+z+48)%4]}));
        p.position.set(x,.5,z); p.castShadow=true; p.receiveShadow=true; addSolid(p);
        const pet=new THREE.Mesh(new THREE.BoxGeometry(2.5,2.5,2.5), new THREE.MeshStandardMaterial({color:colors[(x*z+99)%4]}));
        pet.position.set(x,2.1,z); pet.castShadow=true; addSolid(pet);
        const star=makeStar(0xfacc15); star.position.set(x,4.1,z); addCoin(star.position.clone());
      }
    }
    for(let i=0;i<5;i++){
      const slime=new THREE.Mesh(new THREE.BoxGeometry(3,3,3), new THREE.MeshStandardMaterial({color:0x22c55e, emissive:0x052e16}));
      slime.position.set(-20+i*10,1.5,-30+i*3); slime.castShadow=true; addHazard(slime);
      addUpdater((dt)=>{ slime.position.x += Math.sin(state.time*1.4+i)*dt*6; slime.position.z += Math.cos(state.time*1.7+i)*dt*3; });
    }
    const gate=new THREE.Mesh(new THREE.TorusGeometry(4.5,.65,14,40), new THREE.MeshStandardMaterial({color:0xffffff, emissive:0xff66aa}));
    gate.position.set(0,6,-38); gate.rotation.x=Math.PI/2; addGoal(gate);
    addUpdater(()=>{ if(state.score<80) gate.visible=false; else gate.visible=true; });
  }
});