import * as T from 'three';
import { installLanguage } from './i18n.js';
installLanguage();
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createEntrance } from './entrance-v7.js';
import './room-v3.css';
import { createComputer } from './computer.js';
import { createDeskInteractions } from './desk-interactions.js';
import { surfaceFinish } from './surface-finish.js';
import { createRoomMirror } from './room-mirror.js';
import { createRoomLife } from './room-life.js';
import { createPaperReturn } from './paper-return.js';
import { preparePicking, createRoomPicker } from './room-picking.js';
import { refineRoom } from './room-refinements.js';

const $=s=>document.querySelector(s), canvas=$('#room');
const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.localClippingEnabled=true;
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;
const scene=new T.Scene();scene.background=new T.Color(0xfafaf8);
const camera=new T.PerspectiveCamera(55,1,.025,50);camera.position.set(1.45,1.48,5.65);
const target=new T.Vector3(1.45,1.1,2.30);camera.lookAt(target);
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let room,player,mixer,door,currentAction,clips={},phase='loading',view='room',yaw=0,pitch=-.06;
let elapsed=0,transition=0,sitStart=null,entryStart=null,drag=null,sitDuration=2.233333;
let eyeAnchor,entrance,sitPitchStart=-.06,computer,computerReturnPhase='walking',desk,deskReturnPhase='walking';
let lookPaused=false,lastMouse=null,edgePointer=null,mirror;
let life,lifeReturnPhase='walking',chair,chairBase,approachPoints=[],sitStarted=false;
let entryYaw=Math.PI,picker,pickClock=0,uiKey='',outlineMeshes=[];
const selfView={value:0},selfEye={value:new T.Vector3()},selfClip=new T.Plane(new T.Vector3(0,-1,0),100);
const mouseHelp=document.createElement('p');mouseHelp.className='mouse-help';$('footer').append(mouseHelp);
const seatPrompt=document.createElement('button');seatPrompt.id='seat-prompt';seatPrompt.hidden=true;
seatPrompt.innerHTML='椅子 <span>坐到桌前</span> <kbd>E</kbd>';seatPrompt.setAttribute('aria-label','按 E 或点击坐到桌前');document.body.append(seatPrompt);
seatPrompt.onclick=()=>{interact();lockLook();updateUI();};
let doorHovered=false,doorFocused=false,entryRequested=false,entryDelay=0,entryDoorAngle=0;
const doorPaint={value:0},reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const paperReturn=createPaperReturn();paperReturn.prepare();
let doorArmed=true,doorPointer=null,doorKeyboardFocus=false;
const eyePosition=new T.Vector3();
// Move the calibrated chair, feet support and actor landing together. The eye
// socket stays on the Mixamo head; no detached camera offset is needed.
const SEAT_SETBACK=.48,SEATED_PITCH=-.25;
const keys=new Set(),position=new T.Vector3(1.45,0,2.95),seat=new T.Vector3(.650598,0,-1.778077+SEAT_SETBACK),stand=new T.Vector3(.65,0,-.86+SEAT_SETBACK);
const mobile=()=>innerWidth<650;
const ease=t=>t*t*(3-2*t),clamp=T.MathUtils.clamp;
// Capsule footprint against measured furniture boxes. Coordinates are glTF Y-up.
let blockers=[];
function legal(x,z){
  const radius=.19;
  if(x<-2.15||x>2.15||z<-2.33||z>2.08)return false;
  return !blockers.some(([a,b,c,d])=>Math.hypot(x-clamp(x,a,b),z-clamp(z,c,d))<radius);
}
function play(name,once=false,reverse=false){
  if(currentAction===name&&!reverse)return;
  const old=clips[currentAction],next=clips[name];if(!next)return;
  next.reset().setEffectiveTimeScale(reverse?-1:1).setEffectiveWeight(1).setLoop(once?T.LoopOnce:T.LoopRepeat,once?1:Infinity);next.clampWhenFinished=once;
  if(reverse)next.time=next.getClip().duration;next.play();
  if(old&&old!==next)old.crossFadeTo(next,.18,false);currentAction=name;
}
function portableMaterials(root,isActor=false){
  const cache=new Map();
  root.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;
    let lit=false;for(let p=o;p&&p!==root.parent;p=p.parent)if(/^(Desk|Computer|Headphone|Pencil|Keyboard|Mouse|Notebook|Camera|Desktop)/i.test(p.name))lit=true;
    const convert=old=>{
      const key=old.uuid+String(lit);if(cache.has(key))return cache.get(key);
      let mat;
      if(isActor&&old.map){
        mat=new T.MeshBasicMaterial({map:old.map,side:T.FrontSide});
        mat.clippingPlanes=[selfClip];mat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
          float grey = dot(diffuseColor.rgb, vec3(.2126,.7152,.0722));
          diffuseColor.rgb = vec3(mix(.055,.93,clamp((grey-.12)/.53,0.0,1.0)));`);};
      }else{
        const color=old.isMeshBasicMaterial?old.color:(old.emissive?.getHex()?old.emissive:old.color);
        mat=new (lit?T.MeshLambertMaterial:T.MeshBasicMaterial)({color:color||0xffffff,side:old.side,map:old.map});
      }
      if(isActor)mat.clippingPlanes=[selfClip];
      mat.name=old.name;if(/linen woven/.test(mat.name))surfaceFinish(mat,'linen');cache.set(key,mat);return mat;
    };o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
  });
}
function positionDoorTarget(){
  if(!entrance||!['door','loading'].includes(phase))return;
  entrance.resize(innerWidth,innerHeight);const box=entrance.target();
  for(const [k,v] of Object.entries(box)){const value=`${v}px`;if($('#enter').style[k]!==value)$('#enter').style[k]=value;}
}
function syncPixelRatio(){
  // Preserve display sampling on the lightweight entrance; keep the room's
  // existing GPU budget. This does not invent detail absent from the source art.
  const ratio=Math.min(devicePixelRatio,['door','loading'].includes(phase)?2:1.6);
  if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);
}
function resize(){syncPixelRatio();renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;if(['door','loading'].includes(phase))camera.fov=mobile()?65:55;camera.updateProjectionMatrix();}
addEventListener('resize',()=>{resize();paperReturn.resize();});resize();
function updateUI(){
  const near=!!chairBase&&position.distanceTo(chairBase)<1.15;
  const key=[phase,view,near,lookPaused,$('#room-menu').hidden,mobile(),document.pointerLockElement===canvas].join('|');
  if(key===uiKey)return;uiKey=key;
  syncPixelRatio();
  document.body.dataset.phase=phase;document.body.dataset.view=view;document.body.dataset.lookPaused=String(lookPaused);
  $('#controls').hidden=!['walking','sitting','seating','rising'].includes(phase);
  $('#touch').hidden=!mobile()||phase!=='walking';
  $('#view').innerHTML=(view==='room'?'回到第一人称':'查看人物')+' <kbd>V</kbd>';
  $('#plan').textContent=view==='plan'?'返回房间':'俯视布局';
  $('#plan').setAttribute('aria-pressed',String(view==='plan'));
  seatPrompt.hidden=!(phase==='walking'&&near&&$('#room-menu').hidden&&!lookPaused);
  $('#sit').disabled=['seating','rising'].includes(phase)||(phase==='walking'&&!near);
  $('#sit').innerHTML=(phase==='sitting'?'站起来':'坐到桌前')+' <kbd>E</kbd>';
  $('#hint').textContent=phase==='sitting'?'坐在桌前了。移动鼠标环顾，按 E 起身。':phase==='entering'?'推开门，走进房间…':phase==='walking'?(near?'移动鼠标环顾，按 E 坐到桌前。':view==='first'?'移动鼠标环顾四周，W A S D 走动。':'人物检查视角 · 按 V 回到第一人称。'):'一扇门，和一些属于我的东西。';
  if(phase==='seating')$('#hint').textContent='坐到桌前…';
  if(phase==='rising')$('#hint').textContent='从椅子上起身…';
  mouseHelp.textContent=mobile()?'滑动环顾 · 对准电脑后点击提示':lookPaused?'Esc / 关闭菜单，继续环顾':'鼠标 / 环顾 · 点击 / 使用物件 · Esc / 菜单';
  $('#interaction-label').textContent=phase==='door'||phase==='loading'?'/ 开门 / 进屋':'/ 坐下 / 起身';
}
function enter(){if(phase!=='door'||entryRequested)return;entryRequested=true;entryDelay=0;lookPaused=false;lockLook();}
function beginEntry(){phase='entering';view='first';transition=0;entryStart=camera.position.clone();entryDoorAngle=door.rotation.y;$('#welcome').hidden=true;play('Walk');updateUI();}
function toggleView(){if(!['walking','sitting'].includes(phase))return;view=view==='room'?'first':'room';yaw=0;pitch=phase==='sitting'?SEATED_PITCH:-.06;updateUI();}
function togglePlan(){if(!['walking','sitting'].includes(phase))return;view=view==='plan'?'first':'plan';updateUI();}
function interact(){
  if(phase==='door'){enter();return;}
  if(phase==='sitting'){phase='rising';sitStart=position.clone();transition=0;sitStarted=false;view='first';sitPitchStart=pitch;updateUI();return;}
  if(phase!=='walking'||!chairBase||position.distanceTo(chairBase)>=1.15)return;
  const side=position.clone().sub(chairBase);side.y=0;
  entryYaw=Math.atan2(-side.x,-side.z);
  stand.copy(chairBase).addScaledVector(side.normalize(),.67);
  phase='approaching';view='first';sitPitchStart=pitch;approachPoints=[stand.clone()];play('Walk');updateUI();
}
function reset(){if(!player)return;life?.resetMusic();phase='door';view='room';yaw=0;pitch=-.06;entryRequested=false;doorHovered=false;doorFocused=false;doorPaint.value=0;position.set(1.45,0,2.95);door.rotation.set(0,0,0);camera.position.set(1.45,1.33,5.95);camera.fov=mobile()?65:55;camera.updateProjectionMatrix();target.set(1.45,1.26,2.3);camera.lookAt(target);$('#welcome').hidden=false;play('Idle');updateUI();positionDoorTarget();}
function returnToDoor(){
  if(!['walking','sitting','seating','rising'].includes(phase)||paperReturn.active)return;
  setMenu(false,false,false);releaseLook();keys.clear();drag=null;
  // Capture after a complete room render, before resetting its camera or DPR.
  renderer.render(scene,camera);
  paperReturn.start(canvas,{reduceMotion,onComplete(){
    phase='door';doorHovered=false;doorFocused=false;doorArmed=false;doorPointer=null;doorKeyboardFocus=false;
    $('#welcome').inert=false;updateUI();positionDoorTarget();
    canvas.tabIndex=-1;canvas.focus({preventScroll:true});
  }});
  document.activeElement?.blur();reset();phase='returning';doorArmed=false;
  $('#welcome').inert=true;updateUI();
}
function setMenu(open,restoreFocus=false,resumeLook=true){
  const wasOpen=!$('#room-menu').hidden;
  if(open){lookPaused=true;releaseLook();keys.clear();}
  $('#room-menu').hidden=!open;$('#menu-toggle').setAttribute('aria-expanded',String(open));
  if(resumeLook&&!open&&wasOpen&&view==='first'&&['walking','sitting','seating','rising'].includes(phase)){
    // Closing the menu resumes look even if the browser declines pointer
    // capture after Escape; normal mouse movement remains the fallback.
    lockLook();canvas.tabIndex=-1;canvas.focus({preventScroll:true});
  }else if(restoreFocus)$('#menu-toggle').focus();
  updateUI();
}
$('#menu-toggle').onclick=()=>setMenu($('#room-menu').hidden);
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#controls,#music-player,#language-toggle'))setMenu(false);});
$('#controls').addEventListener('focusout',e=>{if(!e.currentTarget.contains(e.relatedTarget))setMenu(false);});
$('#enter').onclick=enter;
// Layout changes and releasing Pointer Lock can synthesize enter/focus events.
// Only deliberate pointer movement or keyboard navigation selects the door.
$('#enter').onpointerleave=()=>doorHovered=false;
$('#enter').onfocus=()=>{if(phase==='door'&&!paperReturn.active&&doorKeyboardFocus)doorFocused=true;};$('#enter').onblur=()=>doorFocused=false;
addEventListener('keydown',e=>{if(e.code==='Tab'&&phase==='door')doorKeyboardFocus=true;},true);
addEventListener('pointerdown',()=>{doorKeyboardFocus=false;doorFocused=false;},true);
for(const [id,action] of [['view',toggleView],['plan',togglePlan],['sit',interact],['reset',returnToDoor]]){
  $('#'+id).onclick=()=>{action();setMenu(false,id!=='reset');};
}
addEventListener('pointermove',e=>{
  if(phase!=='door'||document.getElementById('boot-screen')||paperReturn.active||e.pointerType==='touch'||document.pointerLockElement)return;
  const moved=doorPointer?(e.clientX!==doorPointer.x||e.clientY!==doorPointer.y):(e.movementX!==0||e.movementY!==0);
  doorPointer={x:e.clientX,y:e.clientY};
  const b=$('#enter').getBoundingClientRect(),inside=e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom;
  // After returning, first leave the door's area before hovering it again.
  // A restored cursor sitting over the new homepage is not a new selection.
  if(!inside){doorArmed=true;doorHovered=false;}else if(doorArmed&&moved)doorHovered=true;
});
function releaseLook(){lastMouse=null;edgePointer=null;if(document.pointerLockElement===canvas)document.exitPointerLock();}
function lockLook(){
  lookPaused=false;lastMouse=null;edgePointer=null;
  if(mobile()||document.pointerLockElement===canvas||!canvas.requestPointerLock)return;
  try{canvas.requestPointerLock({unadjustedMovement:true})?.catch(()=>{if(!lookPaused)canvas.requestPointerLock()?.catch(()=>{});});}catch{try{canvas.requestPointerLock()?.catch(()=>{});}catch{}}
}
function mouseLook(dx,dy){
  if(lookPaused||view!=='first'||!['walking','sitting'].includes(phase)||!$('#room-menu').hidden)return;
  yaw-=dx*.0024;pitch=clamp(pitch-dy*.0021,-1.48,1.35);
  if(phase==='sitting')yaw=clamp(yaw,-1.5,1.5);
}
addEventListener('keydown',e=>{
  if(life?.musicKey(e))return;
  if(life?.active){if(e.code==='Escape'){e.preventDefault();life.close();}return;}
  if(desk?.active){if(e.code==='Escape'){e.preventDefault();desk.close();}return;}
  if(computer?.active){if(e.code==='Escape'){e.preventDefault();computer.close();}return;}
  if(phase==='returning'){if(['KeyE','KeyV','Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();return;}
  if(e.code==='Escape'){
    e.preventDefault();if(!$('#room-menu').hidden){setMenu(false,true);return;}
    if(['walking','sitting'].includes(phase)){setMenu(true);updateUI();}return;
  }
  if(!$('#room-menu').hidden)return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){if(!e.target.closest('button,a'))e.preventDefault();keys.add(e.code);}
  if(e.repeat)return;
  if(e.code==='KeyF'){e.preventDefault();if(!life?.open()&&!desk?.open())computer?.open();}
  if(e.code==='KeyV'){toggleView();if(view!=='first')releaseLook();}
  if(e.code==='KeyE')interact();
});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();drag=null;lastMouse=null;edgePointer=null;});document.addEventListener('visibilitychange',()=>{keys.clear();edgePointer=null;});
document.addEventListener('pointerlockchange',()=>{
  const wasLocked=document.body.dataset.mouseLocked==='true',locked=document.pointerLockElement===canvas;
  document.body.dataset.mouseLocked=String(locked);lastMouse=null;edgePointer=null;
  // Browsers can consume Escape while releasing pointer lock, before keydown
  // reaches the page. Honour that release just like the room's menu key.
  if(wasLocked&&!locked&&view==='first'&&['walking','sitting'].includes(phase))setMenu(true);
  updateUI();
});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas)mouseLook(e.movementX,e.movementY);});
canvas.addEventListener('pointerenter',()=>lastMouse=null);
canvas.addEventListener('pointerleave',()=>{lastMouse=null;edgePointer=null;});
canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'){drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}
});
canvas.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch'){
    if(drag){mouseLook((e.clientX-drag.x)*1.8,(e.clientY-drag.y)*1.8);drag={x:e.clientX,y:e.clientY};}return;
  }
  if(document.pointerLockElement===canvas)return;
  edgePointer={x:e.clientX,y:e.clientY};
  if(lastMouse)mouseLook(e.clientX-lastMouse.x,e.clientY-lastMouse.y);
  lastMouse={x:e.clientX,y:e.clientY};
});
canvas.addEventListener('click',()=>{
  if(!['walking','sitting'].includes(phase)||view!=='first')return;
  if(!lookPaused&&(life?.open()||desk?.open()||computer?.open()))return;
  setMenu(false);lockLook();updateUI();
});
canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);

document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();keys.add(b.dataset.key);b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.key);});
function frame(dt){
  elapsed+=dt;
  if(player){
    if(!['door','entering'].includes(phase))doorPaint.value=T.MathUtils.damp(doorPaint.value,0,4,dt);
    if(phase==='door'){
      const selected=doorHovered||doorFocused||entryRequested;
      doorPaint.value=reduceMotion?Number(selected):clamp(doorPaint.value+(selected?dt/.75:-dt/.35),0,1);
      door.rotation.y=T.MathUtils.damp(door.rotation.y,selected?.115:0,8,dt);
      positionDoorTarget();
      if(entryRequested){entryDelay+=dt;if(entryDelay>(reduceMotion ? .05 : .85))beginEntry();}
    }
    if(phase==='entering'){
      transition+=dt;doorPaint.value=T.MathUtils.damp(doorPaint.value,1,7,dt);door.rotation.y=T.MathUtils.lerp(entryDoorAngle,1.885,ease(clamp(transition/1.15,0,1)));
      const t=clamp((transition-.65)/1.8,0,1);
      // Stop just inside the doorway. The rest of the room is explored manually.
      position.set(1.45-.25*ease(t),0,2.95-1.4*ease(t));
      player.rotation.y=0;
      if(t===1){phase='walking';view='first';play('Idle');updateUI();}
    }else if(phase==='walking'){
      let x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
      let z=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
      let moving=false;
      if(x||z){const direction=new T.Vector3(x,0,z).normalize();if(view==='first')direction.applyAxisAngle(new T.Vector3(0,1,0),yaw);
        const nx=position.x+direction.x*dt*.95,nz=position.z+direction.z*dt*.95;
        if(legal(nx,position.z)){moving ||= Math.abs(nx-position.x)>1e-5;position.x=nx;}
        if(legal(position.x,nz)){moving ||= Math.abs(nz-position.z)>1e-5;position.z=nz;}
        if(view!=='first'){const rot=Math.atan2(-direction.x,-direction.z);player.quaternion.slerp(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),rot),1-Math.exp(-dt*12));}
      }play(moving?'Walk':'Idle');updateUI();
    }else if(phase==='approaching'){
      const next=approachPoints[0],delta=next.clone().sub(position),distance=delta.length();
      if(distance<.025){position.copy(next);approachPoints.shift();if(!approachPoints.length){phase='seating';transition=0;sitStarted=false;sitStart=position.clone();play('Idle');}}
      else{position.addScaledVector(delta.normalize(),Math.min(distance,dt*.8));yaw=T.MathUtils.damp(yaw,0,6,dt);}
    }else if(phase==='seating'){
      transition+=dt;const facing=entryYaw*ease(clamp(transition/.65,0,1));
      const swivel=ease(clamp((transition-.65-sitDuration)/.9,0,1));yaw=facing*(1-swivel);chair.rotation.y=yaw;player.rotation.y=yaw;
      const offset=seat.clone().sub(chairBase).applyAxisAngle(new T.Vector3(0,1,0),yaw),landing=chairBase.clone().add(offset);
      position.copy(sitStart).lerp(landing,ease(clamp((transition-.65)/sitDuration,0,1)));
      if(transition>=.65&&!sitStarted){play('Sit',true);sitStarted=true;}
      pitch=T.MathUtils.lerp(sitPitchStart,SEATED_PITCH,ease(clamp(transition/(sitDuration+.65),0,1)));
      if(transition>=sitDuration+1.55){phase='sitting';position.copy(seat);yaw=0;chair.rotation.y=0;updateUI();}
    }else if(phase==='rising'){
      transition+=dt;yaw=entryYaw*ease(clamp(transition/.9,0,1));chair.rotation.y=yaw;player.rotation.y=yaw;
      const rotated=chairBase.clone().add(seat.clone().sub(chairBase).applyAxisAngle(new T.Vector3(0,1,0),yaw));position.copy(rotated).lerp(stand,ease(clamp((transition-.9)/sitDuration,0,1)));
      if(transition>=.9&&!sitStarted){play('Sit',true,true);sitStarted=true;}
      pitch=T.MathUtils.lerp(sitPitchStart,-.06,ease(clamp(transition/(sitDuration+.9),0,1)));
      if(transition>=sitDuration+.9){phase='walking';play('Idle');updateUI();}
    }
    if(view==='first'&&phase==='walking')player.rotation.y=yaw;
    if(phase==='sitting')player.rotation.y=0;
    for(const o of outlineMeshes)o.visible=view!=='first';
    if(phase==='walking'&&chair)chair.rotation.y=T.MathUtils.damp(chair.rotation.y,0,5,dt);
    player.position.copy(position);player.visible=!['door','entering'].includes(phase);selfView.value=view==='first'?1:0;mixer.update(dt);
    player.updateMatrixWorld(true);eyeAnchor.getWorldPosition(eyePosition);
    if(phase==='entering'){
      camera.position.copy(entryStart).lerp(eyePosition,ease(clamp(transition/2,0,1)));
      target.copy(camera.position).add(new T.Vector3(0,-.06,-1));camera.lookAt(target);
    }
    if(['walking','approaching','seating','sitting','rising'].includes(phase)){
      let desired,look,fov;
      if(view==='first'){
        // The socket is a child of the animated head bone, sampled after the mixer.
        desired=eyePosition.clone();
        // A small neck lean lets the wearer look past their shirt down to their shoes.
        if(phase==='walking')desired.add(new T.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)).multiplyScalar(.18*ease(clamp((-pitch-.55)/.85,0,1))));
        look=desired.clone().add(new T.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)));fov=mobile()?76:65;
      }else if(view==='plan'){
        desired=new T.Vector3(0,10.0,.11);look=new T.Vector3(0,0,-.1);fov=mobile()?80:49;
      }else{
        desired=mobile()?new T.Vector3(.23,2.32,2.12):new T.Vector3(.24,1.90,2.12);
        look=mobile()?new T.Vector3(.10,.78,-.55):new T.Vector3(-.02,1.09,-1.48);fov=mobile()?91:72;
      }
      const smooth=1-Math.exp(-dt*5);if(view==='first'){camera.position.copy(desired);target.copy(look);}else{camera.position.lerp(desired,smooth);target.lerp(look,smooth);}camera.fov=T.MathUtils.lerp(camera.fov,fov,smooth);camera.updateProjectionMatrix();camera.lookAt(target);
    }
  }
  computer?.render(dt);
  desk?.render(dt);
  life?.render(dt);selfEye.value.copy(camera.position);selfClip.constant=view==='first'?camera.position.y-.22:100;
  pickClock+=dt;
  const canScan=view==='first'&&['walking','sitting'].includes(phase)&&!lookPaused&&$('#room-menu').hidden;
  if(!canScan||pickClock>=1/20){pickClock=0;const hit=canScan?picker?.sample():null;life?.scan(canScan,hit);desk?.scan(canScan,hit);computer?.scan(canScan&&phase==='sitting',hit);
    const chairInView=chairBase&&camera.getWorldDirection(new T.Vector3()).dot(chairBase.clone().add(new T.Vector3(0,.65,0)).sub(camera.position).normalize())>.45;
    seatPrompt.hidden=!(canScan&&phase==='walking'&&position.distanceTo(chairBase)<1.15&&chairInView&&!life?.state.focus&&!desk?.focused);
  }
  if(door)door.visible=!['door','loading','entering'].includes(phase);
  // The opaque entrance hides the entire room; keep its geometry off the GPU
  // until entry begins, rather than rendering it behind every hover frame.
  if(entrance&&['door','loading','returning'].includes(phase))renderer.clear();
  else if(phase!=='computer'&&life?.state.mode!=='dream')renderer.render(scene,camera);
  entrance?.render(renderer,{phase:phase==='returning'?'loading':phase,progress:doorPaint.value,angle:door?.rotation.y||0,transition});
  paperReturn.render(dt);
}
let previous=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min((now-previous)/1000,.05);previous=now;frame(dt);});
try{
  window.paperBoot?.stage('正在把物件放进房间…');
  const prepared=promise=>promise.then(value=>{window.paperBoot?.step();return value;});
  const model=file=>loader.loadAsync('/assets/'+file,event=>window.paperBoot?.resource(file,event.loaded,event.total));
  const [roomAsset,actorAsset,collisionData,entranceAsset,deskAsset,lifeAsset]=await Promise.all([model('room-v24-web.glb'),model('player-v5-web.glb'),fetch('/assets/room-v6-colliders.json').then(r=>{if(!r.ok)throw Error('Collision layout missing');return r.json();}),createEntrance(),model('details-v24.glb'),model('furnishings-v24.glb')].map(prepared));
  window.paperBoot?.stage('理好光线，留一点安静…');
  entrance=entranceAsset;
  await entrance.prepare(renderer);
  blockers=collisionData.boxes.map(b=>{
    const [x0,x1,z0,z1]=b.rect;
    if(b.name==='Heater console')return [x0-.86,x1-.86,z0+.11,z1+.11];
    return b.name==='Office chair'?[x0,x1,z0+SEAT_SETBACK,z1+SEAT_SETBACK]:b.rect;
  });
  room=roomAsset.scene;portableMaterials(room);scene.add(room);door=room.children.find(o=>o.name.startsWith('Doorhinge')||o.name.startsWith('Door_hinge')||o.name.startsWith('Door hinge'));
  if(!door)throw Error('Door pivot missing');
  for(const name of ['Mouse.001','Notebook.001','Camera prop.001','Mouse cable resting on desk.001','Keyboard USB cable.001','Window.001','Curtains.001','Bookcase.001','Photo wall.001','Entry mirror.001']){
    const key=name.replace(/[^a-z0-9]/gi,'');
    const old=room.children.find(o=>o.name.replace(/[^a-z0-9]/gi,'')===key);
    if(!old)throw Error(`Desk replacement missing: ${name}`);
    old.removeFromParent();
  }
  deskAsset.scene.traverse(o=>{if(o.name.endsWith('_V21')&&(o.name.startsWith('Desk')||o.name.startsWith('NotebookCoverHinge')))o.name=o.name.replace('_V21','_WEB');});portableMaterials(deskAsset.scene);room.add(...deskAsset.scene.children.slice());
  for(const key of ['Computer001','Headphones001','CurtainsV21','Bed001'])room.children.find(o=>o.name.replace(/[^a-z0-9]/gi,'')===key)?.removeFromParent();
  portableMaterials(lifeAsset.scene);room.add(...lifeAsset.scene.children.slice());
  refineRoom(room);
  for(const name of ['Office chair.001','Desk footrest.001']){
    const key=name.replace(/[^a-z0-9]/gi,'');
    const object=room.children.find(o=>o.name.replace(/[^a-z0-9]/gi,'')===key);
    if(!object)throw Error(`Seating furniture missing: ${name}`);
    object.position.z+=SEAT_SETBACK;
    if(name==='Office chair.001'){chair=object;chairBase=object.position.clone();}
  }
  room.updateMatrixWorld(true);
  const roomAmbient=new T.AmbientLight(0xffffff,Math.PI);roomAmbient.name='Room ambient';room.add(roomAmbient);
  desk=createDeskInteractions({room,camera,renderer,canvas,reduceMotion,
    canUse:()=>['walking','sitting'].includes(phase)&&view==='first'&&!lookPaused&&$('#room-menu').hidden,
    onEnter(leaving=false){
      if(!leaving)deskReturnPhase=phase;
      phase=leaving?'object-leaving':'object-entering';keys.clear();drag=null;
      if(leaving)lockLook();else releaseLook();setMenu(false);updateUI();
    },
    onReady(){phase='object';updateUI();},
    onReturn(){phase=deskReturnPhase;view='first';lookPaused=false;lastMouse=null;updateUI();}
  });
  computer=createComputer({room,camera,canvas,renderer,reduceMotion,
    canUse:()=>phase==='sitting'&&view==='first'&&!lookPaused&&$('#room-menu').hidden,
    onEnter(leaving=false){
      if(!leaving)computerReturnPhase=phase;
      phase=leaving?'computer-leaving':'computer-entering';
      keys.clear();drag=null;
      if(leaving)lockLook();else releaseLook();
      setMenu(false);updateUI();
    },
    onReady(){phase='computer';updateUI();},
    onReturn(){phase=computerReturnPhase;view='first';lookPaused=false;lastMouse=null;updateUI();}
  });
  player=actorAsset.scene;portableMaterials(player,true);scene.add(player);player.traverse(o=>{if(/ink_shell/.test(o.name))outlineMeshes.push(o);});mixer=new T.AnimationMixer(player);mirror=createRoomMirror({room,getPlayer:()=>player,selfView,selfClip});
  life=createRoomLife({room,camera,player,renderer,reduceMotion,isFirst:()=>view==='first',canUse:()=>['walking','sitting'].includes(phase)&&view==='first'&&!lookPaused,canRest:()=>phase==='walking'&&position.distanceTo(new T.Vector3(-1.1,0,-.85))<1.6,
    onEnter(next){lifeReturnPhase=phase;phase=next;releaseLook();keys.clear();setMenu(false,false,false);updateUI();},
    onReturn(){phase=lifeReturnPhase;view='first';player.rotation.set(0,phase==='sitting'?0:yaw,0);lookPaused=false;lockLook();updateUI();}
  });
  eyeAnchor=player.getObjectByName('Eyes');
  if(!eyeAnchor){
    const head=player.getObjectByName('Head');if(!head?.isBone)throw Error('Head bone missing');
    eyeAnchor=new T.Object3D();eyeAnchor.name='Eyes';eyeAnchor.position.set(0,.52,.24);head.add(eyeAnchor);
  }
  for(const clip of actorAsset.animations)clips[clip.name]=mixer.clipAction(clip);
  if(!clips.Idle||!clips.Walk||!clips.Sit)throw Error('Character animation missing');
  sitDuration=clips.Sit.getClip().duration;
  preparePicking(room);picker=createRoomPicker(room,camera);
  await renderer.compileAsync(scene,camera);
  reset();$('#enter').disabled=false;$('#loading').textContent='房间准备好了，进来坐坐。';
  await window.paperBoot?.finish();
  // Read-only diagnostics used by local interaction verification.
  window.roomPreview={get probes(){const r=new T.Raycaster();r.setFromCamera(new T.Vector2(),camera);return r.intersectObject(scene,true).slice(0,10).map(h=>({name:h.object.name,parent:h.object.parent?.name,distance:h.distance,point:h.point.toArray()}));},get state(){return{phase,view,yaw,pitch,lookPaused,life:life?.state,chairAngle:chair?.rotation.y,bodyVisible:player?.visible,mouseLocked:document.pointerLockElement===canvas,computer:computer?.state,desk:desk?.state,mirror:mirror?.state,lookMode:document.pointerLockElement===canvas?"locked":"pointer-fallback",fov:camera.fov,seat:seat.toArray(),stand:stand.toArray(),position:position.toArray(),camera:camera.position.toArray(),eyes:eyePosition.toArray(),eyeParent:eyeAnchor.parent.name,animation:currentAction,clipDurations:Object.fromEntries(Object.entries(clips).map(([n,a])=>[n,a.getClip().duration])),doorAngle:door.rotation.y,doorPaint:doorPaint.value,entryPassage:entrance.passageState,returnActive:paperReturn.active,returnProgress:paperReturn.progress,doorArmed,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}};
}catch(error){window.paperBoot?.fail();$('#loading').textContent='房间加载失败，请刷新后重试。';console.error(error);}


