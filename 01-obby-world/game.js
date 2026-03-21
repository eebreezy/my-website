import { initGame } from '../shared/js/core.js';

initGame({
  id:'obby-world',
  title:'Obby World 3D',
  goalText:'Reach the goal tower',
  speed:7.2,
  jump:9.4,
  skyTop:0x7dd3fc,
  skyBottom:0xe0f2fe,
  ground:{size:180,color:0x86efac},
  winText:'You cleared the obby and reached the tower!',
  build({THREE,scene,addSolid,addCoin,addGoal}){
    const mat1=new THREE.MeshStandardMaterial({color:0x60a5fa});
    const mat2=new THREE.MeshStandardMaterial({color:0xf472b6});
    const path=[
      [0,1.5,0,8,1,8],[0,3,-10,5,1,5],[4,5,-18,5,1,5],[-4,7,-26,5,1,5],[3,9,-34,5,1,5],[10,11,-42,6,1,6],[18,13,-50,6,1,6],[26,15,-58,8,1,8]
    ];
    path.forEach((p,i)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(p[3],1,p[5]), i%2?mat1:mat2);m.position.set(p[0],p[1],p[2]);m.receiveShadow=true;m.castShadow=true;addSolid(m); if(i>0)addCoin(new THREE.Vector3(p[0],p[1]+1.3,p[2]));});
    for(let i=0;i<20;i++){ const box=new THREE.Mesh(new THREE.BoxGeometry(4,4,4), new THREE.MeshStandardMaterial({color:i%2?0xffffff:0x93c5fd})); box.position.set((i%5)*12-25,2,-70-random(i)*12); box.castShadow=true; addSolid(box); }
    const tower=new THREE.Mesh(new THREE.CylinderGeometry(2.8,3.4,8,18), new THREE.MeshStandardMaterial({color:0xfde047, emissive:0x443300}));
    tower.position.set(26,19,-58); tower.castShadow=true; addGoal(tower);
    function random(n){ return (Math.sin(n*91.17)+1)*0.5; }
  }
});