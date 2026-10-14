import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
export function createRoomMirror({room,getPlayer,selfView,selfClip}){
 const frame=room.getObjectByName('Entry mirror_V21')||room.children.find(o=>o.name.replace(/[^a-z0-9]/gi,'')==='EntrymirrorV21');
 if(!frame)throw Error('Mirror frame missing');
 frame.scale.x*=1.45;
 const mobile=innerWidth<650;
 const mirror=new Reflector(new T.PlaneGeometry(.377,1.577),{textureWidth:mobile?512:1024,textureHeight:mobile?1024:2048,clipBias:.001,multisample:2,color:0x80807e});
 mirror.name='Live mirror glass';mirror.position.set(0,1.24,.030);frame.add(mirror);
 const reflect=mirror.onBeforeRender;let renders=0;
 mirror.onBeforeRender=function(renderer,scene,camera){
  const actor=getPlayer(),visible=actor?.visible;
  const outlines=[];actor?.traverse(o=>{if(/ink_shell/.test(o.name)){outlines.push([o,o.visible]);o.visible=true;}});
  room.traverse(o=>{if(o.userData.firstPersonHidden){outlines.push([o,o.visible]);o.visible=true;}});
  // The owner's body is hidden only from their own eyes, not from the mirror.
  if(actor)actor.visible=true;const cut=selfView?.value,clip=selfClip?.constant;if(selfView)selfView.value=0;if(selfClip)selfClip.constant=100;
  try{reflect.call(this,renderer,scene,camera);renders++;}finally{if(actor)actor.visible=visible;for(const [o,v] of outlines)o.visible=v;if(selfView)selfView.value=cut;if(selfClip)selfClip.constant=clip;}
 };
 return {get state(){return{renders,center:mirror.getWorldPosition(new T.Vector3()).toArray(),resolution:[mirror.getRenderTarget().width,mirror.getRenderTarget().height]}}};
}
