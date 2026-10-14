import * as T from 'three';
export function createDeskLight(room,renderer){
 const ambient=room.getObjectByName('Room ambient');
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 room.updateMatrixWorld(true);
 const origin=room.getObjectByName('Desk light origin'),aim=room.getObjectByName('Desk light aim');
 const spot=new T.SpotLight(0xffe8c4,0,1.8,.56,.7,2);origin.getWorldPosition(spot.position);aim.getWorldPosition(spot.target.position);room.add(spot,spot.target);
 spot.visible=false;spot.castShadow=true;spot.shadow.mapSize.set(512,512);spot.shadow.camera.near=.025;spot.shadow.camera.far=2.1;spot.shadow.bias=-.0004;spot.shadow.normalBias=.003;spot.shadow.autoUpdate=false;spot.shadow.needsUpdate=true;
 const bulb=room.getObjectByName('Desk bulb');bulb.userData.noPick=true;
 const casters=[];room.traverse(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];if(mats.some(m=>m.isMeshLambertMaterial)){o.receiveShadow=true;o.castShadow=!/Desk[ _](surfaces|web)/i.test(o.name);if(o.castShadow)casters.push(o);}});
 const transforms=casters.map(()=>new T.Matrix4());let amount=0,clock=0,wasOn=false;
 return {render(dt,on){amount=T.MathUtils.damp(amount,on?1:0,12,dt);ambient.intensity=Math.PI*(1-.07*amount);spot.intensity=.34*amount;spot.visible=amount>.002;bulb.visible=amount>.03;clock+=dt;if(on&&(clock>.15||!wasOn)){clock=0;let changed=!wasOn;casters.forEach((o,i)=>{if(!transforms[i].equals(o.matrixWorld)){changed=true;transforms[i].copy(o.matrixWorld)}});if(changed)spot.shadow.needsUpdate=true;}wasOn=on;},get state(){return{intensity:spot.intensity,shadowSize:512,origin:spot.position.toArray(),target:spot.target.position.toArray()}}};
}
