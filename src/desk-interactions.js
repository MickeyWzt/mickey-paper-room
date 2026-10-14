import {t as translate} from './i18n.js';
import * as T from 'three';
import './desk-interactions.css';
import { createPhotoAlbum } from './photo-album.js';
import { surfaceFinish } from './surface-finish.js';
const clamp=T.MathUtils.clamp,ease=t=>t*t*(3-2*t);
export function createDeskInteractions({room,camera,renderer,canvas,reduceMotion,canUse,onEnter,onReady,onReturn}){
 const find=name=>room.getObjectByName(name)||room.children.find(o=>o.name.replace(/[^a-z0-9]/gi,'')===name.replace(/[^a-z0-9]/gi,''));
 const book=find('DeskNotebook_WEB'),photoCamera=find('DeskCamera_WEB'),hinge=book?.getObjectByName('NotebookCoverHinge_WEB');
 if(!book||!photoCamera||!hinge)throw Error('Desk interaction model missing');
 const objects=[{id:'notebook',name:'笔记本',root:book},{id:'camera',name:'照相机',root:photoCamera}];
 const ray=new T.Raycaster();let focus=null,active=null,progress=0,direction=0,page=0,turn=null,cameraFront=false;
 const saved=new Map(objects.map(o=>[o.id,{position:o.root.position.clone(),quaternion:o.root.quaternion.clone(),scale:o.root.scale.clone()}]));
 const colours=new Map();
 for(const entry of objects){
  const mats=[];entry.root.traverse(o=>{if(!o.isMesh)return;const multiple=Array.isArray(o.material),converted=(multiple?o.material:[o.material]).map(old=>{
   const mat=old.clone(),base=mat.color.clone();let colour=base.clone();
   if(/cover/.test(mat.name))colour.set('#a88962');else if(/pages/.test(mat.name))colour.set('#f6efdb');
   else if(/camera_metal/.test(mat.name))colour.set('#b8b2a5');else if(/camera_leather/.test(mat.name))colour.set('#443b34');
   const finish=/cover/.test(mat.name)?'cover':/pages/.test(mat.name)?'paper':/camera_metal/.test(mat.name)?'metal':/camera_leather/.test(mat.name)?'leather':null;
   if(finish)surfaceFinish(mat,finish);
   mats.push({mat,base,colour});return mat;
  });o.material=multiple?converted:converted[0];});colours.set(entry.id,{progress:0,mats});
 }
 const prompt=document.createElement('button');prompt.id='object-prompt';prompt.hidden=true;document.body.append(prompt);prompt.onclick=open;
 const toolbar=document.createElement('section');toolbar.id='object-toolbar';toolbar.hidden=true;toolbar.setAttribute('aria-label','物件操作');
 toolbar.innerHTML='<div class="object-heading"><span id="object-title"></span><small id="object-instruction"></small></div><div class="object-buttons"><button id="object-prev" aria-label="上一页">←</button><span id="object-counter"></span><button id="object-next" aria-label="下一页">→</button><button id="camera-flip">看正面</button><button id="view-photo">放大查看</button><button id="object-close">放回桌上 <kbd>Esc</kbd></button></div>';
 document.body.append(toolbar);
 const $=id=>toolbar.querySelector(id);
 $('#object-prev').onclick=()=>step(-1);$('#object-next').onclick=()=>step(1);$('#object-close').onclick=close;
 $('#camera-flip').onclick=()=>{cameraFront=!cameraFront;$('#camera-flip').textContent=cameraFront?'看后屏':'看正面'};
 const album=createPhotoAlbum(()=>{drawPhoto();updateToolbar()});
 $('#view-photo').onclick=()=>album.open();
 const lcdCanvas=document.createElement('canvas');lcdCanvas.width=1200;lcdCanvas.height=720;const lcdCtx=lcdCanvas.getContext('2d');
 const lcdTexture=new T.CanvasTexture(lcdCanvas);lcdTexture.colorSpace=T.SRGBColorSpace;
 const lcd=new T.Mesh(new T.PlaneGeometry(.211,.124),new T.MeshBasicMaterial({map:lcdTexture}));lcd.name='CameraPhotoLCD';lcd.position.set(-.017,.118,-.084);lcd.rotation.y=Math.PI;photoCamera.add(lcd);
 function drawPhoto(){
  const photo=album.current;lcdCtx.fillStyle='#181c1a';lcdCtx.fillRect(0,0,1200,720);
  if(photo?.image){const img=photo.image,w=img.width,h=img.height,s=Math.min(1140/w,605/h);lcdCtx.drawImage(img,(1200-w*s)/2,36+(605-h*s)/2,w*s,h*s);}
  else{lcdCtx.fillStyle='#aaa';lcdCtx.textAlign='center';lcdCtx.font='25px Microsoft YaHei,sans-serif';lcdCtx.fillText(translate('正在读取照片…'),600,350);}
  lcdCtx.fillStyle='#d8dacc';lcdCtx.font='24px Microsoft YaHei,sans-serif';lcdCtx.textAlign='left';lcdCtx.fillText(photo?.label||translate('摄影'),30,695);lcdCtx.textAlign='right';lcdCtx.fillText((album.index+1)+' / '+album.count,1160,695);lcdCtx.textAlign='left';lcdTexture.needsUpdate=true;
 }
 drawPhoto();
 const paperTexts=[
  ['一间自己的房间','A ROOM OF MY OWN','从一扇门开始。','这里留给做过的东西，','也留给还没有成形的想法。'],
  ['关于这本随手记','FIELD NOTES / 01','这是用来试翻页的样页。','以后的笔记、手稿和草图，','都可以慢慢写进来。'],
  ['把想法留在纸上','SMALL IDEAS','一张桌子，一盏灯。','留一点空白，','等下一个想法自己出现。'],
  ['房间里的物件','OBJECTS & STORIES','电脑放作品，','相机留风景，','纸页收起片刻的灵感。'],
  ['今天先到这里','TAKE YOUR TIME','有些事不用急着完成。','翻到下一页，','也可以暂时合上。'],
  ['留白','TO BE CONTINUED','这一页还空着。','','下一笔，留给你。']
 ];
 function pageTexture(n){const c=document.createElement('canvas');c.width=1000;c.height=1400;const ctx=c.getContext('2d');ctx.fillStyle='#f5efdc';ctx.fillRect(0,0,1000,1400);
  const gutter=ctx.createLinearGradient(0,0,1000,0);gutter.addColorStop(0,'#8b765520');gutter.addColorStop(.08,'#8b765500');gutter.addColorStop(.92,'#8b765500');gutter.addColorStop(1,'#8b765524');ctx.fillStyle=gutter;ctx.fillRect(0,0,1000,1400);
  ctx.strokeStyle='#746b5666';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(4,7);ctx.lineTo(996,4);ctx.lineTo(997,1395);ctx.lineTo(5,1397);ctx.closePath();ctx.stroke();
  ctx.fillStyle='#8f8878';ctx.font='18px monospace';ctx.fillText('FIELD NOTES',95,100);ctx.fillText(String(n+1).padStart(2,'0'),860,1300);
  const [title,subtitle,...lines]=paperTexts[n].map(translate);ctx.fillStyle='#383b32';ctx.font='52px KaiTi, STKaiti, serif';ctx.fillText(title,95,265,820);ctx.fillStyle='#89816b';ctx.font='20px monospace';ctx.fillText(subtitle,95,330);
  ctx.strokeStyle='#d2c8ad';ctx.lineWidth=1;for(let y=460;y<1190;y+=90){ctx.beginPath();ctx.moveTo(90,y);ctx.lineTo(910,y+1);ctx.stroke();}
  ctx.fillStyle='#66604e';ctx.font='31px KaiTi, STKaiti, serif';lines.forEach((line,i)=>ctx.fillText(line,98,450+i*90,800));
  ctx.strokeStyle='#aca18c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(100,1000);ctx.lineTo(130,984);ctx.lineTo(147,993);ctx.lineTo(177,958);ctx.lineTo(204,998);ctx.lineTo(242,972);ctx.stroke();
  let seed=412+n;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<52000;i++){ctx.fillStyle=rand()>.5?'#786b4a0c':'#ffffff16';ctx.fillRect(rand()*1000,rand()*1400,1+rand()*2,1+rand()*3);}
  ctx.strokeStyle='#8e806522';ctx.lineWidth=.6;for(let i=0;i<1700;i++){const x=rand()*1000,y=rand()*1400;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rand()*2,y+2+rand()*7);ctx.stroke();}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return t;
 }
 let pageMaps=paperTexts.map((_,n)=>pageTexture(n));
 let pagesNeedTranslation=false;
 function translatePages(){if(!pagesNeedTranslation||turn)return;const old=pageMaps;pageMaps=paperTexts.map((_,n)=>pageTexture(n));settlePages();old.forEach(m=>m.dispose());pagesNeedTranslation=false;}
 document.addEventListener('room-language-change',()=>{pagesNeedTranslation=true;drawPhoto();});
 function paperMesh(x){const geo=new T.PlaneGeometry(.163,.221);geo.rotateX(-Math.PI/2);const o=new T.Mesh(geo,new T.MeshBasicMaterial({map:pageMaps[0],side:T.DoubleSide}));o.position.set(x,.0225,0);o.visible=false;book.add(o);return o;}
 const leftPage=paperMesh(-.166),rightPage=paperMesh(-.004);
 function settlePages(){leftPage.material.map=pageMaps[page*2];rightPage.material.map=pageMaps[page*2+1];}
 settlePages();
 function startTurn(delta,holding=false){
  const target=page+delta;if(turn||target<0||target>=paperTexts.length/2)return;
  const geo=new T.PlaneGeometry(.163,.221,30,1);geo.rotateX(-Math.PI/2);geo.translate(.0815,0,0);
  const front=pageMaps[(delta>0?page:target)*2+1],back=pageMaps[(delta>0?target:page)*2];
  const pivot=new T.Group();pivot.position.set(-.085,.027,0);book.add(pivot);
  const backMap=back.clone();backMap.repeat.x=-1;backMap.offset.x=1;backMap.needsUpdate=true;
  const frontMat=new T.MeshBasicMaterial({map:front,side:T.FrontSide});const backMat=new T.MeshBasicMaterial({map:backMap,side:T.BackSide});
  pivot.add(new T.Mesh(geo,frontMat),new T.Mesh(geo,backMat));turn={progress:0,delta,target,geo,pivot,frontMat,backMat,holding,goal:1};
  if(delta>0)rightPage.material.map=pageMaps[target*2+1];else leftPage.material.map=pageMaps[target*2];
  updateToolbar();return true;
 }
 function step(delta){if(!active||direction!==0)return;if(active.id==='notebook')startTurn(delta);else{album.step(delta);}}
 function updateToolbar(){if(!active)return;const isBook=active.id==='notebook';$('#object-title').textContent=isBook?'随手记':'相机里的片刻';$('#object-instruction').textContent=isBook?'按住纸页拖动 · 松手翻过或回弹':'← / → 浏览 · 放大查看清晰照片';$('#object-counter').textContent=isBook?`${page*2+1}—${page*2+2} / ${paperTexts.length}`:`${album.index+1} / ${album.count}`;
  $('#object-prev').disabled=isBook&&(page===0||!!turn);$('#object-next').disabled=isBook&&(page===paperTexts.length/2-1||!!turn);$('#camera-flip').hidden=isBook;$('#view-photo').hidden=isBook;
 }
 function scan(enabled,hit){
  let next=null;if(enabled&&!active&&hit?.distance<=1.85){let o=hit.object;while(o&&!next){next=objects.find(entry=>entry.root===o)||null;o=o.parent;}}
  if(next===focus)return;focus=next;prompt.hidden=!focus;if(focus)prompt.innerHTML=`${focus.name} <span>拿起来看看</span> <kbd>F</kbd>`;
 }
 function open(){if(!focus||active||!canUse())return false;active=focus;focus=null;prompt.hidden=true;progress=0;direction=1;cameraFront=false;if(active.id==='camera')album.start();onEnter();updateToolbar();return true;}
 function close(){if(!active||direction===-1)return;if(album.visible){album.close();return}releasePage(null,true);if(turn){turn.pivot.removeFromParent();turn.geo.dispose();turn.frontMat.dispose();turn.backMat.map.dispose();turn.backMat.dispose();turn=null;settlePages();}direction=-1;toolbar.hidden=true;onEnter(true);}
 function render(dt){
  if(pagesNeedTranslation&&active?.id==='notebook'&&!turn)translatePages();
  for(const item of objects){const state=colours.get(item.id),wanted=focus===item||active===item;state.progress=clamp(state.progress+dt*(wanted?1/.2:-1/.12),0,1);for(const {mat,base,colour} of state.mats)mat.color.lerpColors(base,colour,ease(state.progress));}
  if(!active)return;progress=clamp(progress+direction*dt/(reduceMotion?.18:1.05),0,1);
  const isBook=active.id==='notebook',original=saved.get(active.id),lift=ease(clamp(progress/.65,0,1)),unfold=ease(clamp((progress-.45)/.55,0,1));
  const distance=.62,worldWidth=2*.62*Math.tan(T.MathUtils.degToRad(camera.fov/2))*camera.aspect;
  const size=isBook?Math.min(2.25,worldWidth/.42):Math.min(1.72,worldWidth/.46);
  const localCenter=isBook?new T.Vector3(-.085*unfold,.016,0):new T.Vector3(0,.13,0);
  const orient=new T.Quaternion().setFromEuler(new T.Euler(isBook?Math.PI/2:0,isBook?0:Math.PI*unfold,0));
  if(!isBook&&direction===0){const goal=cameraFront?0:Math.PI;active.flipAngle=T.MathUtils.damp(active.flipAngle??Math.PI,goal,9,dt);orient.setFromEuler(new T.Euler(0,active.flipAngle,0));}else active.flipAngle=Math.PI*unfold;
  const q=camera.quaternion.clone().multiply(orient),pos=new T.Vector3(0,isBook?.02:.03,-distance).applyQuaternion(camera.quaternion).add(camera.position).sub(localCenter.multiplyScalar(size).applyQuaternion(q));
  active.root.position.lerpVectors(original.position,pos,lift);active.root.quaternion.slerpQuaternions(original.quaternion,q,lift);active.root.scale.copy(original.scale).lerp(new T.Vector3(size,size,size),lift);
  if(isBook){hinge.rotation.z=Math.PI*unfold;leftPage.visible=unfold>.97;rightPage.visible=unfold>.4;}
  if(turn){const t=turn;if(!t.holding){const speed=dt/(reduceMotion?.08:.5);t.progress=t.goal===1?Math.min(1,t.progress+speed):Math.max(0,t.progress-speed);}const a=ease(t.progress),angle=Math.PI*(t.delta>0?a:1-a);t.pivot.rotation.z=angle;
   const position=t.geo.attributes.position;for(let i=0;i<position.count;i++){const x=position.getX(i);position.setY(i,Math.sin(x/.163*Math.PI)*.020*Math.sin(a*Math.PI));}position.needsUpdate=true;t.geo.computeVertexNormals();
   if(!t.holding&&t.progress===t.goal){if(t.goal===1)page=t.target;t.pivot.removeFromParent();t.geo.dispose();t.frontMat.dispose();t.backMat.map.dispose();t.backMat.dispose();turn=null;settlePages();updateToolbar();}
  }
  if(direction===1&&progress===1){direction=0;toolbar.hidden=false;onReady();$('#object-close').focus({preventScroll:true});}
  if(direction===-1&&progress===0){active.root.position.copy(original.position);active.root.quaternion.copy(original.quaternion);active.root.scale.copy(original.scale);hinge.rotation.z=0;leftPage.visible=false;rightPage.visible=false;active=null;direction=0;onReturn();canvas.focus({preventScroll:true});}
 }
 let down=null;
 canvas.addEventListener('pointerdown',e=>{
  if(active?.id!=='notebook'||direction!==0||turn||e.button!==0)return;
  const rect=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);ray.far=4;
  const hit=ray.intersectObjects([leftPage,rightPage])[0];if(!hit)return;
  const delta=hit.object===rightPage?1:-1;
  const a=book.localToWorld(new T.Vector3(-.248,.0225,0)).project(camera),b=book.localToWorld(new T.Vector3(.078,.0225,0)).project(camera);
  if(!startTurn(delta,true))return;
  down={x:e.clientX,span:Math.max(130,Math.abs(b.x-a.x)*rect.width/2),id:e.pointerId};canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';e.preventDefault();
 });
 canvas.addEventListener('pointermove',e=>{if(!down||!turn?.holding)return;turn.progress=clamp((down.x-e.clientX)*turn.delta/down.span,0,1);e.preventDefault();});
 function releasePage(e,cancel=false){if(!down)return;if(turn){turn.holding=false;turn.goal=!cancel&&turn.progress>.45?1:0;}if(canvas.hasPointerCapture(down.id))canvas.releasePointerCapture(down.id);down=null;canvas.style.cursor='';}
 canvas.addEventListener('pointerup',e=>releasePage(e));canvas.addEventListener('pointercancel',e=>releasePage(e,true));
 addEventListener('blur',()=>releasePage(null,true));
 addEventListener('keydown',e=>{if(!active)return;if(e.code==='ArrowLeft'){e.preventDefault();step(-1)}if(e.code==='ArrowRight'){e.preventDefault();step(1)}if(e.code==='Tab'&&!toolbar.hidden){const buttons=[...toolbar.querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled);const n=buttons.indexOf(document.activeElement),next=(n+(e.shiftKey?-1:1)+buttons.length)%buttons.length;e.preventDefault();buttons[next]?.focus();}});
 return{scan,open,close,render,get active(){return !!active},get focused(){return !!focus},get state(){return{focused:focus?.id||null,active:active?.id||null,progress,page,turn:turn?.progress??null,holding:turn?.holding??false,bookPosition:book.position.toArray(),photo:album.index,photos:album.count,photoLoaded:!!album.current.image,photoCache:album.cacheSize,targets:objects.map(o=>({id:o.id,position:saved.get(o.id).position.toArray()}))}}};
}


