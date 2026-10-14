import * as T from 'three';
import {t} from './i18n.js';
import './computer.css';
import { projects } from './content/projects.js';
import { BOOT_SECONDS, drawComputerScreen, computerWallpaper } from './computer-screen.js';

// The editable Blender monitor uses local Z-up coordinates converted to glTF.
// Keep the interactive glass attached to that object, including its export scale.
export function createComputer({room,camera,canvas,renderer,reduceMotion,canUse,onEnter,onReady,onReturn}){
  const monitor=room.children.find(o=>o.name.replace(/[^a-z0-9]/gi,'')==='ComputerV23');
  if(!monitor)throw Error('Interactive computer missing');
  const texCanvas=document.createElement('canvas');texCanvas.width=1536;texCanvas.height=864;texCanvas.id='computer-boot-canvas';texCanvas.setAttribute('aria-hidden','true');
  const ctx=texCanvas.getContext('2d'),texture=new T.CanvasTexture(texCanvas);texture.colorSpace=T.SRGBColorSpace;
  texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;
  const material=new T.MeshBasicMaterial({map:texture});
  const glass=new T.Mesh(new T.PlaneGeometry(.590,.332),material);glass.position.set(0,.300,.021);monitor.add(glass);room.updateMatrixWorld(true);
  const center=glass.getWorldPosition(new T.Vector3()),normal=new T.Vector3(0,0,1).transformDirection(glass.matrixWorld);
  const scale=glass.getWorldScale(new T.Vector3()),screenWidth=.590*scale.x,screenHeight=.332*scale.y;
  let focused=false,progress=0,direction=0,previous=null,active=false,power='off',powerTime=0,paintClock=0;
  const prompt=document.createElement('button');prompt.id='computer-prompt';prompt.hidden=true;document.body.append(prompt);
  const desktop=document.createElement('section');desktop.id='computer-desktop';desktop.hidden=true;desktop.inert=true;desktop.setAttribute('role','dialog');desktop.setAttribute('aria-modal','true');desktop.setAttribute('aria-label','我的电脑');
  const folderIcon='<svg viewBox="0 0 64 56" aria-hidden="true"><path fill="#d99919" d="M3 10Q3 6 7 6H24L30 12H57Q61 12 61 16V46H3Z"/><path fill="#ffe8a3" d="M8 16H55V43H8Z"/><path fill="#ffce55" d="M3 22Q3 18 7 18H27L32 22H57Q61 22 61 26V47Q61 51 57 51H7Q3 51 3 47Z"/><path fill="#ffe285" d="M4 23H60V28H4Z"/></svg>';
  const winIcon='<span class="win-logo" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  const noteIcon='<svg viewBox="0 0 64 56" aria-hidden="true"><path fill="#91c9ec" d="M12 3H53V53H12Z"/><path fill="#f4fbff" d="M9 4H48V49H9Z"/><path stroke="#80b1ca" stroke-width="2" d="M16 15H40M16 23H40M16 31H40M16 39H34"/><path stroke="#306e9c" stroke-width="3" d="M8 9H14M8 19H14M8 29H14M8 39H14"/></svg>';
  const icons=[['projects','作品',folderIcon],['about','关于我',noteIcon]];
  desktop.innerHTML=`<div class="computer-shell" inert>
    <div class="desktop-icons" aria-label="桌面">${icons.map(([id,label,icon])=>`<button class="desktop-folder" data-folder="${id}" aria-label="${label}">${icon}<span>${label}</span></button>`).join('')}</div>
    <button id="leave-computer" title="回到房间（Esc）">回到房间 <span>Esc</span></button>
    <section class="desktop-window" hidden aria-labelledby="folder-title">
      <div class="window-bar"><div class="window-tab">${folderIcon}<span id="folder-title">作品</span></div><div class="window-controls"><button id="minimize-folder" aria-label="最小化">─</button><button id="maximize-folder" aria-label="最大化">□</button><button id="close-folder" aria-label="关闭文件夹">×</button></div></div>
      <div class="explorer-toolbar"><button id="folder-home" aria-label="返回此电脑">←</button><span class="address-bar">▣ <span>此电脑</span><b>›</b><span id="folder-path">作品</span></span><label class="explorer-search">⌕ <input id="folder-search" placeholder="搜索此文件夹" aria-label="搜索此文件夹"></label></div>
      <div class="explorer-command" id="project-filters" aria-label="作品类别"></div>
      <div class="explorer-body"><nav class="explorer-sidebar" aria-label="文件夹导航"><p>快速访问</p>${icons.map(([id,label,icon])=>`<button data-open-folder="${id}">${icon}${label}</button>`).join('')}<p>此电脑</p><span>▣ 本地磁盘 (C:)</span></nav><div id="folder-content"></div></div>
      <div class="explorer-status" id="folder-status">1 个项目</div>
    </section>
    <section class="start-menu" hidden aria-label="开始菜单"><label class="start-search">⌕ <input id="desktop-search" placeholder="搜索作品和关于我" aria-label="搜索桌面"></label><h3>已固定</h3><div class="start-apps">${icons.map(([id,label,icon])=>`<button data-open-folder="${id}">${icon}<span>${label}</span></button>`).join('')}</div><p id="start-empty" hidden>没有找到相关项目</p><div class="start-footer"><span><img class="profile-avatar" src="/assets/profile/avatar.jpg" alt="Mickey"> 一间自己的房间</span><button id="shutdown-computer" aria-label="关闭房间里的电脑">⏻ <span>关机</span></button></div></section>
    <div class="desktop-taskbar"><div class="taskbar-center"><button id="start-button" aria-label="开始" aria-expanded="false">${winIcon}</button><button id="search-button" aria-label="搜索"><span>⌕</span><span>搜索</span></button><button id="explorer-button" aria-label="文件资源管理器">${folderIcon}<i></i></button><button id="about-button" aria-label="关于我">${noteIcon}</button></div><div class="system-tray"><span class="tray-symbols">⌃　 EN　 ▰　◖))</span><time id="desktop-clock"></time><button id="show-desktop" aria-label="显示桌面"></button></div></div>
  </div><div class="computer-boot" aria-label="电脑启动画面"><p class="sr-only" role="status" id="computer-power-status">电脑已关闭</p><button id="leave-boot">回到房间 <kbd>Esc</kbd></button></div>`;
  document.body.append(desktop);
  const shell=desktop.querySelector('.computer-shell'),boot=desktop.querySelector('.computer-boot');boot.prepend(texCanvas);
  shell.style.backgroundImage='url('+computerWallpaper().toDataURL('image/webp',.94)+')';
  function updatePower(){desktop.dataset.power=power;shell.inert=power!=='ready';prompt.innerHTML='电脑 <span>'+({off:'开机并使用',booting:'正在启动',ready:'继续使用','shutting-down':'正在关机'}[power])+'</span> <kbd>F</kbd>';prompt.setAttribute('aria-label',power==='off'?'打开电脑电源并使用':'使用电脑');desktop.querySelector('#computer-power-status').textContent=power==='booting'?'电脑正在启动，请稍候':power==='shutting-down'?'电脑正在关机':power==='ready'?'电脑已启动':'电脑已关闭';}
  let lastFolder=null,currentFolder='projects',selectedFile=false;
  const win=desktop.querySelector('.desktop-window'),menu=desktop.querySelector('.start-menu');
  let category='全部';
  const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function toggleStart(show=!menu.hidden){menu.hidden=show;desktop.querySelector('#start-button').setAttribute('aria-expanded',String(!show));}
  function renderFolder(){
    const query=desktop.querySelector('#folder-search').value.trim().toLowerCase(),title=currentFolder==='about'?'关于我':'作品';
    desktop.querySelector('#folder-title').textContent=title;desktop.querySelector('#folder-path').textContent=title;
    desktop.querySelectorAll('[data-open-folder]').forEach(el=>el.classList.toggle('current',el.dataset.openFolder===currentFolder));
    const panel=desktop.querySelector('#folder-content'),filters=desktop.querySelector('#project-filters');
    filters.innerHTML=currentFolder==='projects'?['全部','应用','音乐与研究','交互与游戏','小工具与 Skill'].map(x=>'<button data-category="'+x+'" aria-pressed="'+(category===x)+'">'+x+'</button>').join(''):'<span>个人介绍</span>';
    filters.querySelectorAll('button').forEach(b=>b.onclick=()=>{category=b.dataset.category;selectedFile=false;renderFolder()});
    if(currentFolder==='about'){
      panel.innerHTML='<article class="file-preview about-preview"><div class="about-avatar"><img src="/assets/profile/avatar.jpg" alt="Mickey"></div><small>MICKEY / A ROOM OF MY OWN</small><h3>你好，欢迎来坐坐。</h3><p>这里放着我做过的项目，也留着一路拍下的照片和还在生长的想法。</p><p>电脑里看作品，拿起相机看照片，翻开桌上的笔记本读随手记。</p><a href="https://github.com/MickeyWzt" target="_blank" rel="noopener noreferrer">我的 GitHub ↗</a></article>';desktop.querySelector('#folder-status').textContent='关于我';return;
    }
    const selected=projects.find(p=>p.id===selectedFile);
    if(selected){
      panel.innerHTML='<article class="project-detail"><button id="all-projects">← 返回作品</button><div class="project-detail-heading"><span class="project-thumbnail" style="--project-color:'+selected.color+'">'+selected.symbol+'</span><div><small>'+selected.category+' · '+selected.status+'</small><h3>'+selected.title+'</h3></div></div><p class="project-summary">'+selected.summary+'</p><p>'+selected.description+'</p><div class="project-tags">'+selected.tags.map(t=>'<span>'+t+'</span>').join('')+'</div><div class="project-links">'+(selected.room?'<button id="back-to-room-project">回到房间继续探索 ↗</button>':'')+selected.links.map(([label,url])=>'<a href="'+escape(url)+'" target="_blank" rel="noopener noreferrer">'+escape(label)+' ↗</a>').join('')+'</div>'+(selected.links.length?'':'<small class="project-local">这个项目还没有在这里提供公开访问入口。</small>')+'</article>';
      panel.querySelector('#all-projects').onclick=()=>{selectedFile=false;renderFolder()};panel.querySelector('#back-to-room-project')?.addEventListener('click',close);desktop.querySelector('#folder-status').textContent=selected.status;return;
    }
    const matches=projects.filter(p=>(category==='全部'||p.category===category)&&(!query||[p.title,p.summary,p.category,...p.tags].flatMap(x=>[x,t(x)]).join(' ').toLowerCase().includes(query)));
    panel.innerHTML=matches.length?'<div class="project-grid">'+matches.map(p=>'<button class="project-entry" data-project="'+p.id+'"><span class="project-thumbnail" style="--project-color:'+p.color+'">'+p.symbol+'</span><span class="project-name">'+p.title+'</span><small>'+p.status+'</small></button>').join('')+'</div>':'<div class="empty-folder">没有与搜索条件匹配的作品</div>';
    panel.querySelectorAll('[data-project]').forEach(b=>b.onclick=()=>{selectedFile=b.dataset.project;renderFolder();panel.scrollTop=0});desktop.querySelector('#folder-status').textContent=matches.length+' 个项目';
  }
  function openFolder(id){currentFolder=id;selectedFile=false;desktop.querySelector('#folder-search').value='';renderFolder();win.hidden=false;toggleStart(true);desktop.querySelector('#explorer-button').classList.add('running');desktop.querySelector('#close-folder').focus({preventScroll:true});}
  desktop.querySelectorAll('[data-folder]').forEach(button=>{
    button.onclick=()=>{desktop.querySelectorAll('[data-folder]').forEach(el=>el.classList.toggle('selected',el===button));lastFolder=button;if(matchMedia('(pointer:coarse)').matches)openFolder(button.dataset.folder)};
    button.ondblclick=()=>openFolder(button.dataset.folder);
    button.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();openFolder(button.dataset.folder)}};
  });
  desktop.querySelectorAll('[data-open-folder]').forEach(button=>button.onclick=()=>openFolder(button.dataset.openFolder));
  desktop.querySelector('#folder-search').oninput=()=>{selectedFile=false;renderFolder()};
  desktop.querySelector('#folder-home').onclick=()=>{selectedFile=false;renderFolder()};
  desktop.querySelector('#close-folder').onclick=()=>{win.hidden=true;desktop.querySelector('#explorer-button').classList.remove('running');lastFolder?.focus()};
  desktop.querySelector('#minimize-folder').onclick=()=>{win.hidden=true;desktop.querySelector('#explorer-button').focus()};
  desktop.querySelector('#maximize-folder').onclick=()=>{win.classList.toggle('maximized');win.style.left='';win.style.top='';win.style.transform=''};
  desktop.querySelector('#explorer-button').onclick=()=>openFolder(currentFolder);
  desktop.querySelector('#about-button').onclick=()=>openFolder('about');
  desktop.querySelector('#start-button').onclick=()=>toggleStart();
  desktop.querySelector('#search-button').onclick=()=>{toggleStart(false);desktop.querySelector('#desktop-search').focus()};
  desktop.querySelector('#desktop-search').oninput=e=>{let count=0;menu.querySelectorAll('[data-open-folder]').forEach(el=>{el.hidden=!el.textContent.includes(e.target.value.trim());if(!el.hidden)count++});desktop.querySelector('#start-empty').hidden=count>0};
  desktop.querySelector('#show-desktop').onclick=()=>{win.hidden=true;toggleStart(true)};
  shell.addEventListener('pointerdown',e=>{if(e.target===shell){toggleStart(true);desktop.querySelectorAll('[data-folder]').forEach(el=>el.classList.remove('selected'))}});
  const bar=desktop.querySelector('.window-bar');let drag=null;
  bar.onpointerdown=e=>{if(e.target.closest('button')||win.classList.contains('maximized')||innerWidth<650)return;const r=win.getBoundingClientRect();drag={x:e.clientX-r.left,y:e.clientY-r.top};bar.setPointerCapture(e.pointerId);};
  bar.onpointermove=e=>{if(!drag)return;win.style.transform='none';win.style.left=Math.max(0,Math.min(innerWidth-win.offsetWidth,e.clientX-drag.x))+'px';win.style.top=Math.max(0,Math.min(innerHeight-100,e.clientY-drag.y))+'px'};
  bar.onpointerup=bar.onpointercancel=()=>drag=null;
  let clockMinute=-1;function updateClock(){const now=new Date();if(clockMinute===now.getMinutes())return;clockMinute=now.getMinutes();desktop.querySelector('#desktop-clock').innerHTML=now.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})+'<br>'+now.getFullYear()+'/'+(now.getMonth()+1)+'/'+now.getDate();}updateClock();
  desktop.querySelector('#leave-computer').onclick=close;desktop.querySelector('#leave-boot').onclick=close;desktop.querySelector('#shutdown-computer').onclick=()=>{if(power!=='ready')return;power='shutting-down';powerTime=0;toggleStart(true);desktop.querySelector('.desktop-window').hidden=true;updatePower();paint();desktop.querySelector('#leave-boot').focus()};prompt.onclick=open;
  desktop.addEventListener('keydown',e=>{
    if(e.key!=='Tab')return;
    const buttons=[...desktop.querySelectorAll('button')].filter(b=>b.getClientRects().length&&!b.closest('[inert]')&&getComputedStyle(b).visibility!=='hidden');
    const first=buttons[0],last=buttons.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  });
  function paint(){drawComputerScreen(ctx,power,powerTime,reduceMotion);if(!active||direction!==0)texture.needsUpdate=true;}
  updatePower();paint();renderer.initTexture(texture);document.fonts.ready.then(paint);document.addEventListener('room-language-change',()=>{paint();if(!win.hidden)renderFolder();});document.addEventListener('room-avatar-ready',paint);
  function setFocused(value){if(focused===value)return;focused=value;prompt.hidden=!value;}
  function scan(enabled,hit){
    if(!enabled||active){setFocused(false);return}
    
    let object=hit?.distance<=2.5?hit.object:null,found=false;
    while(object){if(object===monitor){found=true;break}object=object.parent}
    // Do not activate the monitor through its back panel.
    setFocused(found&&camera.position.clone().sub(center).dot(normal)>.03);
  }
  function open(){
    if(!focused||active||!canUse())return false;
    previous={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov};
    if(power==='off'){power='booting';powerTime=0;updatePower();paint();}
    active=true;direction=1;progress=0;setFocused(false);onEnter();return true;
  }
  function close(){if(!active||direction===-1)return;toggleStart(true);direction=-1;paint();desktop.inert=true;desktop.querySelector('.desktop-window').hidden=true;onEnter(true)}
  const smooth=t=>t*t*(3-2*t),clamp=T.MathUtils.clamp;
  const end=new T.Vector3(),lookCamera=new T.PerspectiveCamera();
  function render(dt){
    if(active&&power==='ready')updateClock();
    if(power==='booting'||power==='shutting-down'){
      powerTime+=dt;paintClock+=dt;
      if(power==='booting'&&powerTime>=(reduceMotion?.8:BOOT_SECONDS)){power='ready';updatePower();paint();if(active&&direction===0)desktop.querySelector('#leave-computer').focus({preventScroll:true});}
      else if(power==='shutting-down'&&powerTime>=(reduceMotion?.25:1.25)){power='off';updatePower();paint();close();}
      else if(paintClock>=1/30){paintClock=0;paint();}
    }
    if(!active)return;
    if(direction===0)return;
    if(direction)progress=clamp(progress+direction*dt/(reduceMotion?.15:1.65),0,1);
    const t=smooth(clamp(progress/.9,0,1)),fov=previous.fov;
    const distance=Math.min(screenHeight,screenWidth/camera.aspect)/(2*Math.tan(T.MathUtils.degToRad(fov/2)))*.90;
    end.copy(center).addScaledVector(normal,distance);
    lookCamera.position.copy(end);lookCamera.lookAt(center);
    camera.position.lerpVectors(previous.position,end,t);camera.quaternion.slerpQuaternions(previous.quaternion,lookCamera.quaternion,t);camera.fov=fov;camera.updateProjectionMatrix();
    // Only replace the view once the actual 3D glass fills the viewport.
    const reveal=smooth(clamp((progress-.9)/.1,0,1));desktop.hidden=reveal===0;desktop.style.opacity=String(reveal);
    if(direction===1&&progress===1){direction=0;desktop.inert=false;onReady();desktop.querySelector(power==='ready'?'#leave-computer':'#leave-boot').focus({preventScroll:true})}
    if(direction===-1&&progress===0){active=false;direction=0;desktop.hidden=true;onReturn();canvas.focus({preventScroll:true})}
  }
  return{scan,open,close,render,get focused(){return focused},get active(){return active},get state(){return{focused,active,progress,direction,power,powerTime,center:center.toArray(),screenWidth,screenHeight}}};
}
