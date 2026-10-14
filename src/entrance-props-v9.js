import './entrance-props-v9.css';
import { createPlaqueSimulation } from './plaque-physics.js';

// Browser-native images bypass WebGL mip levels. UV cropping is expressed as
// a CSS viewport over the unchanged, full-resolution source image.
const props=[
  {id:'plaque',file:'plaque.png',size:[1902,827],crop:[40,214,1858,602],rect:[696,105,280,60],density:1.6},
  {id:'botanical-card',file:'botanical-card.png',size:[1024,1536],crop:[184,286,881,1258],rect:[606,299,60,84],density:3.7},
  {id:'wooden-stool',file:'wooden-stool.png',size:[1254,1254],crop:[266,199,975,1098],rect:[999,624,70,84],density:3.6},
  {id:'potted-plant',file:'../entrance-v13/potted-plant-alpha.png',size:[1054,1492],crop:[135,32,978,1410],rect:[1002,526,65,105],density:3.4},
];

export async function createEntranceProps(){
  const stage=document.createElement('div');stage.id='entrance-props';stage.hidden=true;
  document.body.append(stage);
  const star=document.createElementNS('http://www.w3.org/2000/svg','svg');
  star.classList.add('entrance-star');star.setAttribute('viewBox','0 0 20 24');star.setAttribute('aria-hidden','true');
  star.innerHTML='<path d="M10 2.2L11.7 9.8L17 12L11.7 13.7L10 21.5L8.2 13.8L3 12L8.3 10Z" fill="white" stroke="#72716b" stroke-width="1" stroke-linejoin="round"/><path d="M9.8 3.4L9.5 11.8L4.3 12.2M10 12L10.4 20" fill="none" stroke="#99978d" stroke-width=".55"/>';
  stage.append(star);
  let board;
  await Promise.all(props.map(async prop=>{
    const [iw,ih]=prop.size,[x0,y0,x1,y1]=prop.crop,[x,y,w,h]=prop.rect;
    const node=document.createElement(prop.id==='plaque'?'button':'div');
    node.className=`entrance-prop ${prop.id}`;node.dataset.prop=prop.id;
    node.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
    const crop=document.createElement('span');crop.className='prop-crop';
    const img=new Image();img.alt='';img.draggable=false;
    img.src=`/assets/entrance-v8/${prop.file}`;
    img.style.cssText=`width:${iw/(x1-x0)*100}%;height:${ih/(y1-y0)*100}%;left:${-x0/(x1-x0)*100}%;top:${-y0/(y1-y0)*100}%`;
    crop.append(img);node.append(crop);stage.append(node);
    if(prop.id==='plaque'){board=node;node.id='portfolio-plaque';node.type='button';}
    await img.decode();
  }));
  // The original drawing's screw heads are covered by paper-coloured patches;
  // separate pencil nails occupy their exact positions and can physically leave.
  const mounts=[[3.52,17.8],[96.54,17.8],[3.52,83.0],[96.54,83.0]];
  const nails=mounts.map(([x,y])=>{
    const mount=document.createElement('span');mount.className='plaque-mount';
    mount.style.cssText=`left:${x}%;top:${y}%`;
    const nail=document.createElement('span');nail.className='plaque-nail';mount.append(nail);board.append(mount);
    return nail;
  });
  const hint=document.createElement('span');hint.className='plaque-hint';hint.textContent='敲一敲';board.append(hint);
  const status=document.createElement('span');status.className='sr-only';status.setAttribute('role','status');stage.append(status);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let hits=0,fallen=false,falling=false,repairing=false,enabled=false,shake,fall;
  let repairAnimations=[];
  let simulation,fragmentNodes=[],impactMarks=[];
  const collected=new Set(),collecting=new Set(),pickups=new Map();
  stage.dataset.collected='0';
  const fragments=document.createElement('div');fragments.id='plaque-fragments';fragments.hidden=true;stage.append(fragments);
  const nailOrder=[2,3,0,1];
  const label=()=>{
    board.dataset.hits=String(hits);board.dataset.state=falling?'falling':fallen?'fallen':'mounted';
    board.setAttribute('aria-label',fallen?'把 PORTFOLIO 门牌挂回去':`敲一下 PORTFOLIO 门牌，还剩 ${4-hits} 颗钉子`);
    hint.textContent=fallen?'挂回去':hits?`再敲 ${4-hits} 下`:'敲一敲';
  };
  function restore(){
    shake?.cancel();fall?.cancel();repairAnimations.forEach(a=>a.cancel());repairAnimations=[];repairing=false;board.style.opacity='';hits=0;fallen=false;falling=false;
    pickups.forEach(a=>a.cancel());pickups.clear();collected.clear();collecting.clear();stage.dataset.collected='0';
    simulation=null;fragmentNodes.forEach(n=>n.remove());fragmentNodes=[];fragments.hidden=true;
    impactMarks.forEach(n=>{n.getAnimations().forEach(a=>a.cancel());n.remove();});impactMarks=[];
    board.hidden=false;delete stage.dataset.impactTime;delete stage.dataset.impactY;
    board.style.transform='';board.style.transformOrigin='50% 50%';board.disabled=!enabled;
    nails.forEach(n=>{n.getAnimations().forEach(a=>a.cancel());n.style.opacity='';n.style.transform='';});
    status.textContent='门牌挂回去了。';label();
  }
  function finishRepair(){
    repairing=true;board.dataset.state='repairing';
    board.hidden=false;board.disabled=true;board.style.transform='';board.style.transformOrigin='50% 50%';
    board.style.opacity='0';
    const duration=reduced?100:720;
    const fade=board.animate([{opacity:0},{opacity:1}],{duration,fill:'forwards',easing:'ease-in-out'});
    repairAnimations.push(fade);
    fragmentNodes.forEach(piece=>repairAnimations.push(piece.animate([{opacity:1},{opacity:0}],{duration,fill:'forwards',easing:'ease-in-out'})));
    // Nails reseat after the seams have begun to fade, rather than popping in.
    nails.forEach((n,i)=>{
      n.getAnimations().forEach(a=>a.cancel());
      repairAnimations.push(n.animate([{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'translateY(0)'}],{delay:reduced?0:210+i*85,duration:reduced?80:240,fill:'both',easing:'ease-out'}));
    });
    status.textContent='碎片已经拼齐，裂缝正在慢慢消失。';
    fade.onfinish=()=>{restore();if(enabled)board.focus({preventScroll:true});};
  }
  function collectPiece(piece,body,index){
    if(!enabled||falling||repairing||collected.has(index)||collecting.has(index))return;
    const hadFocus=document.activeElement===piece;
    collecting.add(index);piece.disabled=true;piece.dataset.pickup='picking';
    const start=piece.style.transform,target=`translate(${696+body.minX}px,${105+body.minY}px) rotate(0rad)`;
    piece.style.transform=target;
    const motion=piece.animate([{transform:start},{transform:target}],{duration:reduced?80:650,easing:'cubic-bezier(.22,.65,.28,1)'});
    pickups.set(index,motion);
    motion.onfinish=()=>{
      pickups.delete(index);collecting.delete(index);collected.add(index);
      piece.dataset.pickup='placed';stage.dataset.collected=String(collected.size);
      status.textContent=`已经拼回 ${collected.size} 块，还剩 ${3-collected.size} 块在地上。`;
      if(collected.size===3)finishRepair();
      else if(enabled&&hadFocus&&(document.activeElement===document.body||document.activeElement===piece)){
        fragmentNodes.find((_,i)=>!collected.has(i)&&!collecting.has(i))?.focus({preventScroll:true});
      }
    };
  }
  function breakOnImpact(state){
    board.hidden=true;fragments.hidden=false;
    stage.dataset.impactTime=String(state.impact.time);stage.dataset.impactY=String(state.impact.y);
    fragmentNodes=state.shards.map((body,index)=>{
      const piece=document.createElement('button');piece.type='button';piece.className='entrance-prop plaque-fragment';
      piece.dataset.piece=String(index);piece.disabled=true;
      piece.dataset.pickup='ground';piece.setAttribute('aria-label',`捡起第 ${index+1} 块门牌碎片`);piece.title='捡起这一块';
      piece.style.width=`${body.width}px`;piece.style.height=`${body.height}px`;
      piece.style.clipPath=`polygon(${body.points.map(([x,y])=>`${x-body.minX}px ${y-body.minY}px`).join(',')})`;
      piece.style.transformOrigin=`${body.cx-body.minX}px ${body.cy-body.minY}px`;
      const art=document.createElement('span');art.className='fragment-art';art.style.left=`${-body.minX}px`;art.style.top=`${-body.minY}px`;
      art.append(board.querySelector('.prop-crop').cloneNode(true));
      board.querySelectorAll('.plaque-mount').forEach(mount=>{const cover=mount.cloneNode(false);art.append(cover);});
      const edge=document.createElementNS('http://www.w3.org/2000/svg','svg');edge.setAttribute('viewBox','0 0 280 60');edge.classList.add('fracture-edge');edge.setAttribute('aria-hidden','true');
      edge.innerHTML=`<polygon points="${body.points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#79766e" stroke-width="1.1" stroke-linejoin="round"/>`;
      art.append(edge);piece.append(art);fragments.append(piece);
      piece.addEventListener('click',event=>{event.stopPropagation();collectPiece(piece,body,index);});
      return piece;
    });
    if(!reduced){
      for(let i=0;i<5;i++){
        const mark=document.createElement('span');mark.className='plaque-impact-mark';mark.style.left=`${state.impact.x}px`;mark.style.top=`${state.impact.y}px`;stage.append(mark);impactMarks.push(mark);
        const motion=mark.animate([{transform:'translate(0,0) rotate(-30deg)',opacity:.6},{transform:`translate(${(i-2)*12}px,${-12-Math.abs(i-2)*5}px) rotate(${i*43}deg)`,opacity:0}],{duration:350+i*30,easing:'ease-out'});
        motion.onfinish=()=>mark.remove();
      }
    }
    status.textContent='门牌碰到地面，裂成了三段。';
  }
  function startFall(){
    falling=true;board.disabled=true;
    const hadFocus=document.activeElement===board;
    const style=getComputedStyle(board),matrix=new DOMMatrix(style.transform);
    const [ox,oy]=style.transformOrigin.split(' ').map(parseFloat),angle=Math.atan2(matrix.b,matrix.a);
    const dx=140-ox,dy=30-oy,c=Math.cos(angle),s=Math.sin(angle);
    simulation=createPlaqueSimulation({x:696+ox+dx*c-dy*s,y:105+oy+dx*s+dy*c,angle});
    board.style.transformOrigin='50% 50%';
    let raf=0,previous=performance.now(),cancelled=false;
    function paintPhysics(){
      const state=simulation.state;
      if(state.shards.length){
        if(!fragmentNodes.length)breakOnImpact(state);
        state.shards.forEach((b,i)=>{fragmentNodes[i].style.transform=`translate(${b.x-b.cx+b.minX}px,${b.y-b.cy+b.minY}px) rotate(${b.angle}rad)`;});
      }else{
        const b=state.whole;board.style.transform=`translate(${b.x-836}px,${b.y-135}px) rotate(${b.angle}rad)`;
      }
      if(state.settled){
        falling=false;fallen=true;fragmentNodes.forEach(n=>n.disabled=!enabled);
        status.textContent='三块碎片停下来了。逐块捡起来，拼回完整的门牌。';label();
        if(enabled&&hadFocus&&document.activeElement===document.body)fragmentNodes[0].focus({preventScroll:true});
      }
    }
    function tick(now){
      if(cancelled)return;
      simulation.advance(Math.min((now-previous)/1000,.05));previous=now;paintPhysics();
      if(!simulation.state.settled)raf=requestAnimationFrame(tick);
    }
    fall={cancel(){cancelled=true;cancelAnimationFrame(raf);}};
    if(reduced){simulation.advance(8);paintPhysics();}
    else raf=requestAnimationFrame(tick);
  }
  board.addEventListener('click',event=>{
    event.stopPropagation();if(!enabled||falling||repairing)return;
    if(fallen){restore();return;}
    hits++;
    const nail=nails[nailOrder[hits-1]];
    nail.animate([
      {transform:'translate(0,0) rotate(0)',opacity:1},
      {transform:`translate(${hits%2?-15:15}px,-18px) rotate(95deg)`,opacity:1,offset:.2},
      {transform:`translate(${hits%2?-35:35}px,130px) rotate(380deg)`,opacity:0},
    ],{duration:reduced?80:620,easing:'cubic-bezier(.35,0,.75,.5)',fill:'forwards'});
    shake?.cancel();
    if(hits<4){
      const tilt=hits===3?-9:hits===2?2:0;
      board.style.transformOrigin=hits===3?'96.54% 17.8%':'50% 50%';
      board.style.transform=`rotate(${tilt}deg)`;
      shake=board.animate([
        {transform:`rotate(${tilt}deg) translateY(0)`},
        {transform:`rotate(${tilt+3}deg) translateY(2px)`,offset:.12},
        {transform:`rotate(${tilt-2}deg) translateY(-1px)`,offset:.3},
        {transform:`rotate(${tilt+1}deg)`,offset:.55},
        {transform:`rotate(${tilt}deg)`},
      ],{duration:reduced?80:480,easing:'ease-out'});
      status.textContent=`掉了一颗钉子，还剩 ${4-hits} 颗。`;
    }else{
      startFall();
    }
    label();
  });
  label();
  return {
    reset:restore,
    get state(){return {hits,fallen,falling,collected:collected.size,fragments:fragmentNodes.length,impact:simulation?.state.impact||null};},
    render({width,height,baseHeight,zoom,panX=0,panY,opacity,phase}){
      const visible=['door','loading','entering'].includes(phase);
      if(stage.hidden===visible)stage.hidden=!visible;if(!visible)return;
      enabled=phase==='door';board.disabled=!enabled||falling||repairing;
      fragmentNodes.forEach((n,i)=>n.disabled=!enabled||falling||collected.has(i)||collecting.has(i));
      const s=height/baseHeight*zoom;
      // Layout zoom sizes images at their actual display resolution, without
      // a scaled/filter-backed compositor snapshot of the whole prop layer.
      const layoutKey=`${width},${height},${s},${panX},${panY}`;
      if(stage.dataset.layout!==layoutKey){
        stage.dataset.layout=layoutKey;stage.style.zoom=String(s);
        stage.style.left=`${width/(2*s)-836-panX}px`;stage.style.top=`${height/(2*s)-470.5+panY}px`;
      }
      if(stage.style.opacity!==String(opacity))stage.style.opacity=opacity;
      if(stage.inert===enabled)stage.inert=!enabled;
    },
  };
}
