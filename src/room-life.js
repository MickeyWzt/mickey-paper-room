import * as T from 'three';
import './room-life.css';
import { createDream } from './dream.js';
import { createWearableMusic } from './wearable-music.js';
import { createDeskLight } from './desk-light.js';
import { surfaceFinish } from './surface-finish.js';
const clamp=T.MathUtils.clamp,smooth=t=>t*t*(3-2*t);
export function createRoomLife({room,camera,player,canUse,canRest,onEnter,onReturn,reduceMotion,renderer,isFirst}){
 const find=n=>room.children.find(o=>o.name.replace(/[^a-z0-9]/gi,'')===n);
 const lamp=find('Desktasklamp001'),headphones=find('HeadphonesV23'),curtains=find('CurtainsV23'),bed=find('BedV23');
 if(!lamp||!headphones||!curtains||!bed)throw Error('Interactive furnishings missing');
 const left=curtains.getObjectByName('CurtainLeft_V23'),right=curtains.getObjectByName('CurtainRight_V23'),duvet=bed.getObjectByName('BedDuvet_V23');
 const panels=[left,right].map(o=>{const meshes=[];o.traverse(m=>{if(m.isMesh)meshes.push({mesh:m,base:m.geometry.attributes.position.array.slice()})});return meshes});
 const covers=[];duvet.traverse(m=>{if(m.isMesh)covers.push({mesh:m,base:m.geometry.attributes.position.array.slice()})});
 let focus=null,lightOn=false,closed=false,curtainAmount=0,mode=null,time=0,sleepFrom,sleepLook,sleepQuat,wakeQuat,restored;
 const prompt=document.createElement('button');prompt.id='life-prompt';prompt.hidden=true;document.body.append(prompt);
 const music=createWearableMusic({root:headphones,room,player,camera,isFirst,onEnter,onReturn,reduceMotion});
 const lids=document.createElement('div');lids.id='sleep-eyelids';lids.hidden=true;lids.innerHTML='<i></i><i></i>';document.body.append(lids);
 const dream=document.createElement('section');dream.id='dream-page';dream.hidden=true;document.body.append(dream);const dreamView=createDream(dream);
 const lighting=createDeskLight(room,renderer);
 const items=[{id:'lamp',root:lamp,label:()=>lightOn?'台灯 · 关灯':'台灯 · 开灯'},{id:'headphones',root:headphones,label:()=>music.worn?'耳机架 · 摘下放回':'耳机 · 拿起戴上'},{id:'curtains',root:curtains,label:()=>closed?'窗帘 · 拉开':'窗帘 · 合上'},{id:'bed',root:bed,label:()=> '床 · 躺下休息'}];
 const pigments=items.filter(i=>['lamp','bed','curtains'].includes(i.id)).map(item=>{const mats=[];item.root.traverse(o=>{if(!o.isMesh||o.name==='Desk bulb')return;const convert=old=>{const mat=old.clone(),base=mat.color.clone(),color=base.clone();const bright=Math.max(base.r,base.g,base.b);if(bright>.28&&!/ink|pencil|faint/i.test(mat.name)){if(item.id==='lamp')color.set(mat.name.includes('enamel')?'#839382':'#b5ac91');else if(item.id==='bed'){let cloth=false;for(let p=o;p&&p!==bed;p=p.parent)if(p===duvet)cloth=true;color.set(cloth?'#b6c2cf':'#ece0c8');}else color.set('#d5ccb7');surfaceFinish(mat,item.id==='lamp'?'metal':'linen');}mats.push({mat,base,color});return mat;};o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);});return {...item,mats,amount:0};});
 let promptLabel='';
 function scan(enabled,hit){focus=null;if(enabled&&!mode&&!music.active){let o=hit?.object;while(o&&!focus){focus=items.find(i=>i.root===o||(i.id==='headphones'&&o===music.root));o=o.parent;}if(focus?.id==='bed'&&!canRest())focus=null;}prompt.hidden=!focus;const label=focus?.label()||'';if(label!==promptLabel){promptLabel=label;prompt.innerHTML=label+' <kbd>F</kbd>';}}
 function open(){if(!focus||mode||!canUse())return false;const id=focus.id;
  if(id==='lamp')lightOn=!lightOn;
  if(id==='curtains')closed=!closed;
  if(id==='headphones')music.begin();
  if(id==='bed'){dreamView.reset();mode='sleep';time=reduceMotion?4:0;sleepFrom=camera.position.clone();sleepQuat=camera.quaternion.clone();sleepLook=new T.Vector3(0,0,-1).applyQuaternion(camera.quaternion).add(sleepFrom);restored={position:player.position.clone(),rotation:player.rotation.clone()};onEnter('sleeping');lids.style.setProperty('--closed','0');lids.hidden=false;}
  prompt.hidden=true;focus=null;return true;
 }
 function restore(){dream.hidden=true;lids.hidden=true;if(restored){player.position.copy(restored.position);player.rotation.copy(restored.rotation);player.updateMatrixWorld(true);restored=null;}for(const {mesh,base} of covers){mesh.geometry.attributes.position.array.set(base);mesh.geometry.attributes.position.needsUpdate=true;}mode=null;onReturn();}
 function close(){if(!mode||mode==='waking'||music.active)return;wakeQuat=camera.quaternion.clone();mode='waking';time=0;dream.style.animation='none';dream.style.opacity='1';lids.hidden=false;lids.style.setProperty('--closed','1');}
 prompt.onclick=open;dream.querySelector('#wake-up').onclick=close;
 function render(dt){music.render(dt);lighting.render(dt,lightOn);
  for(const item of pigments){const selected=focus?.id===item.id||(item.id==='lamp'&&lightOn)||(item.id==='bed'&&!!mode)||(item.id==='curtains'&&closed);item.amount=T.MathUtils.damp(item.amount,selected?1:0,selected?15:9,dt);for(const p of item.mats)p.mat.color.lerpColors(p.base,p.color,item.amount);}
  const next=T.MathUtils.damp(curtainAmount,closed?1:0,5,dt);if(Math.abs(next-curtainAmount)>.00001){curtainAmount=next;[left,right].forEach((panel,k)=>{const edge=(k?1:-1)*.97;panel.scale.x=1+curtainAmount*1.45;panel.position.x=edge*(1-panel.scale.x);});}
  if(mode==='waking'){
   time+=dt;const t=time,sit=smooth(clamp((t-1.2)/1.2,0,1)),rise=smooth(clamp((t-2.4)/1.1,0,1));
   dream.style.opacity=String(1-smooth(clamp(t/.35,0,1)));if(t>.35)dream.hidden=true;
   lids.style.setProperty('--closed',String(1-smooth(clamp((t-.35)/.8,0,1))));
   camera.position.set(-1.55,.75,-1.99).lerp(new T.Vector3(-.66,1.03,-1.12),sit).lerp(sleepFrom,rise);
   const edgeCamera=new T.PerspectiveCamera();edgeCamera.position.set(-.66,1.03,-1.12);edgeCamera.lookAt(-1.55,.48,-1.4);camera.quaternion.copy(wakeQuat).slerp(edgeCamera.quaternion,sit).slerp(sleepQuat,rise);
   player.position.set(-1.55,.39,-.48);player.rotation.set(-Math.PI/2,0,0);player.visible=false;
   for(const {mesh,base} of covers){const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){const x=base[i*3],y=base[i*3+1],z=base[i*3+2];a.setXYZ(i,x,y+.14*(1-sit)*Math.max(0,1-(x/.65)**2),z*(1-.65*sit*(1-rise))+.63*sit*(1-rise));}a.needsUpdate=true;}
   if(reduceMotion){camera.position.copy(sleepFrom);camera.lookAt(sleepLook);if(t>1.2)restore();}else if(t>3.5)restore();
  }
  if(mode==='sleep'){time+=dt;const t=time;const lift=smooth(clamp(t/1.1,0,1)),lie=smooth(clamp((t-1.1)/2,0,1)),cover=smooth(clamp((t-3.1)/.8,0,1));
   for(const {mesh,base} of covers){const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){const x=base[i*3],y=base[i*3+1],z=base[i*3+2];a.setXYZ(i,x,y+.12*lift*(1-cover)*Math.sin((z+1)*2)+.14*cover*lie*Math.max(0,1-(x/.65)**2),z*(1-.65*lift*(1-cover))+.63*lift*(1-cover));}a.needsUpdate=true;mesh.geometry.computeVertexNormals();}
   const edge=new T.Vector3(-.66,1.03,-1.12),pillow=new T.Vector3(-1.55,.75,-1.99);
   camera.position.copy(sleepFrom).lerp(edge,lift);camera.position.lerp(pillow,lie);const target=sleepLook.clone().lerp(new T.Vector3(-1.55,.48,-1.4),lift).lerp(new T.Vector3(-1.55,.58,-.65),lie).lerp(new T.Vector3(-1.55,2.3,-1.98),smooth(clamp((t-3.8)/1.1,0,1)));camera.lookAt(target);
   if(reduceMotion){camera.position.copy(sleepFrom);camera.lookAt(sleepLook);}
   if(lie>.05){player.position.set(-1.55,.39,-.48);player.rotation.set(-Math.PI/2,0,0);player.visible=lie>.8;player.updateMatrixWorld(true);}else player.visible=false;
   const shut=smooth(clamp((t-4)/1.6,0,1));lids.style.setProperty('--closed',String(shut));
   if(t>5.9){mode='dream';dream.style.animation='';dream.style.opacity='1';dream.hidden=false;dream.querySelector('#wake-up').focus();}
  }
 }
 return{scan,open,close,render,musicKey:music.keys,resetMusic:music.reset,get active(){return !!mode||music.active},get state(){return{focus:focus?.id||null,pigments:Object.fromEntries(pigments.map(p=>[p.id,p.amount])),mode,lightOn,light:lighting.state,closed,curtainAmount,sleepTime:time,musicPlaying:music.state.playing,music:music.state}}};
}


