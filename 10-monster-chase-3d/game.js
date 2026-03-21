import { initGame } from '../shared/js/core.js';

initGame({
  id:'monster-chase',
  title:'Monster Chase 3D',
  goalText:'Run to the finish gate',
  speed:8.8,
  jump:9.3,
  skyTop:0xfca5a5,
  skyBottom:0xffedd5,
  ground:{size:220,color:0xf9a8d4},
  failText:'The monster caught you. Sprint again!',
  winText:'You escaped the monster and made it to safety!',
  build({THREE,state,scene,player,addSolid,addCoin,addGoal,addHazard,addUpdater}){
    const track=new THREE.Mesh(new THREE.BoxGeometry(14,1,180), new THREE.MeshStandardMaterial({color:0x7c3aed})); track.position.set(0,.5,-40); addSolid(track);
    for(let i=0;i<10;i++){
      const obs=new THREE.Mesh(new THREE.BoxGeometry(4,3+(i%3),4), new THREE.MeshStandardMaterial({color:i%2?0xf472b6:0x60a5fa}));
      obs.position.set(i%2?3.5:-3.5, 1.5+(i%3)/2, -20-i*14); addSolid(obs);
      if(i<8) addCoin(new THREE.Vector3(0,2.3,-10-i*16));
    }
    const gate=new THREE.Mesh(new THREE.TorusGeometry(5,.8,16,40), new THREE.MeshStandardMaterial({color:0x4ade80, emissive:0x14532d})); gate.position.set(0,6,-160); gate.rotation.x=Math.PI/2; addGoal(gate);
    const monster=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(5,5,5), new THREE.MeshStandardMaterial({color:0x991b1b})); body.position.y=4; body.castShadow=true; monster.add(body);
    const head=new THREE.Mesh(new THREE.BoxGeometry(4,4,4), new THREE.MeshStandardMaterial({color:0xef4444})); head.position.set(0,8,1); head.castShadow=true; monster.add(head);
    const hazardBox=new THREE.Mesh(new THREE.BoxGeometry(6,8,6), new THREE.MeshBasicMaterial({visible:false}));
    monster.position.set(0,0,18); scene.add(monster); scene.add(hazardBox); addHazard(hazardBox);
    addUpdater((dt)=>{ monster.position.z += (player.position.z + 8 - monster.position.z)*dt*0.7; if(monster.position.z < player.position.z+6) monster.position.z = player.position.z+6; hazardBox.position.copy(monster.position).add(new THREE.Vector3(0,4,0)); });
  }
});