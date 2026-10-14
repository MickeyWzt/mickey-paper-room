import * as T from 'three';
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh';
T.Mesh.prototype.raycast=acceleratedRaycast;
export function preparePicking(room){
 const seen=new Set();let trees=0;
 room.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh)return;
  let deform=false;for(let p=o;p;p=p.parent)if(p.name==='BedDuvet_V23')deform=true;
  o.frustumCulled=!deform;
  if(!deform&&!seen.has(o.geometry)&&o.geometry.attributes.position.count>300){computeBoundsTree.call(o.geometry,{maxLeafSize:12});seen.add(o.geometry);trees++;}
 });return trees;
}
export function createRoomPicker(room,camera){
 const ray=new T.Raycaster();ray.firstHitOnly=true;ray.far=2.8;const center=new T.Vector2();let hit=null,count=0,ms=0;
 return {sample(){camera.updateMatrixWorld();const start=performance.now();ray.setFromCamera(center,camera);hit=ray.intersectObject(room,true).find(h=>{for(let p=h.object;p;p=p.parent)if(!p.visible||p.userData.noPick)return false;return true})||null;ms=performance.now()-start;count++;return hit;},get state(){return{count,ms}}};
}
