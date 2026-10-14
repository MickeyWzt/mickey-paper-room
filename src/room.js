import * as THREE from 'three';
import { buildObjects } from './models.js';

const PAPER = 0xfafafa;
const INK = 0x292929;
const SOFT = 0x999999;
const clamp = THREE.MathUtils.clamp;
const v = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// All structural edges are real, slightly irregular 3D pencil strokes.
export function createRoom(canvas, callbacks) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch {
    callbacks.onError('这个浏览器暂时没有开启三维显示，可以先用「全部作品」浏览。');
    return { dispose() {}, enter() {}, leave() {}, focus() {}, setSound() {}, toggleLight() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(PAPER);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAPER);
  scene.fog = new THREE.Fog(PAPER, 20, 48);
  const camera = new THREE.PerspectiveCamera(44, 1, .03, 100);
  const room = new THREE.Group();
  scene.add(room);
  let seed = 419;
  function random() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function stroke(points, { radius = .014, color = INK, jitter = .009, opacity = 1, parent = room } = {}) {
    const knots = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const steps = Math.max(3, Math.ceil(a.distanceTo(b) * 5));
      for (let j = 0; j < steps; j++) {
        const p = a.clone().lerp(b, j / steps);
        if (j) p.add(v((random() - .5) * jitter, (random() - .5) * jitter, (random() - .5) * jitter));
        knots.push(p);
      }
    }
    knots.push(points[points.length - 1]);
    const curve = new THREE.CatmullRomCurve3(knots);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, knots.length * 2), radius, 4, false), new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity }));
    parent.add(mesh);
    return mesh;
  }
  function box(w, h, d, pos, { color = PAPER, outline = true, parent = room, radius = .012 } = {}) {
    const group = new THREE.Group();
    group.position.copy(pos);
    parent.add(group);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
    group.add(body);
    if (outline) {
      const p = [v(-w/2,-h/2,-d/2),v(w/2,-h/2,-d/2),v(w/2,h/2,-d/2),v(-w/2,h/2,-d/2),v(-w/2,-h/2,d/2),v(w/2,-h/2,d/2),v(w/2,h/2,d/2),v(-w/2,h/2,d/2)];
      [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([a,b]) => stroke([p[a],p[b]], { parent: group, radius }));
    }
    return group;
  }
  function plane(w, h, pos, rotation = v(0,0,0), color = PAPER) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
    mesh.position.copy(pos); mesh.rotation.set(rotation.x,rotation.y,rotation.z); room.add(mesh); return mesh;
  }

  // A real room behind a wall with a real doorway.
  plane(50, 50, v(0,-.035,0),v(-Math.PI/2,0,0));
  plane(8,4.6,v(0,2.3,-4.5));
  plane(9,4.6,v(-4,2.3,0),v(0,Math.PI/2,0));
  plane(9,4.6,v(4,2.3,0),v(0,-Math.PI/2,0));
  plane(8,9,v(0,4.6,0),v(Math.PI/2,0,0));
  plane(20,12,v(-11.1,6,4.04));
  plane(20,12,v(11.1,6,4.04));
  plane(2.2,9,v(0,7.78,4.04));
  // The lower edge of the front wall and visible room corners.
  stroke([v(-14,.025,4.08),v(-1.14,.025,4.08)],{color:SOFT,radius:.01,jitter:.014});
  stroke([v(1.14,.025,4.08),v(14,.025,4.08)],{color:SOFT,radius:.01,jitter:.014});
  const corners = [
    [v(-4,0,4),v(-4,0,-4.5),v(4,0,-4.5),v(4,0,4)],
    [v(-4,4.6,4),v(-4,4.6,-4.5),v(4,4.6,-4.5),v(4,4.6,4)],
    [v(-4,0,-4.5),v(-4,4.6,-4.5)], [v(4,0,-4.5),v(4,4.6,-4.5)]
  ];
  corners.forEach(p => stroke(p,{color:0x64685f,radius:.018,jitter:.027}));
  stroke([v(-4,.12,4),v(-4,.12,-4.48),v(4,.12,-4.48),v(4,.12,4)],{color:SOFT,radius:.008});

  // Sparse pencil marks give the physical surfaces a sketched, not shaded, appearance.
  for (let i=0;i<15;i++) {
    const x=-3.9+i*.56;
    stroke([v(x,0.006,-4.4),v(x+.018,0.006,4)],{radius:.004,color:0xbcbeb6,jitter:.018,opacity:.65});
    for(let j=0;j<3;j++) {
      const z=-3.8+j*2.55+(i%2)*1.2;
      stroke([v(x,0.008,z),v(x+.54,0.008,z+.018)],{radius:.004,color:0xbcbeb6,opacity:.6});
    }
  }
  for(let i=0;i<80;i++) {
    const x=(random()-.5)*7.8, z=-4.3+random()*8.2;
    stroke([v(x,.01,z),v(x+.12+random()*.3,.01,z+.3)],{radius:.0025,color:0xa9aca2,opacity:.4,jitter:.004});
  }
  for(let side of [-1,1]) {
    for(let i=0;i<32;i++) {
      const y=random()*4.5,z=-4.4+random()*1.1;
      stroke([v(side*3.992,y,z),v(side*3.992,y+.22,z+.4)],{radius:.004,color:SOFT,opacity:.35});
    }
  }
  // Exterior floor hatching only around the threshold.
  for(let i=0;i<27;i++) {
    const x=(random()-.5)*4.3,z=4.1+random()*1.35;
    stroke([v(x,.013,z),v(x+.28,.013,z+.5)],{radius:.0035,color:SOFT,opacity:.4});
  }

  const frame = new THREE.Group(); scene.add(frame);
  stroke([v(-1.115,0,4.13),v(-1.12,3.27,4.13),v(1.12,3.25,4.13),v(1.115,0,4.13)],{parent:frame,radius:.027,jitter:.02});
  stroke([v(-1.2,0,4.12),v(-1.2,3.35,4.12),v(1.2,3.34,4.12),v(1.2,0,4.12)],{parent:frame,radius:.012,jitter:.017});
  const hinge = new THREE.Group(); hinge.position.set(-1.09,0,4.12); scene.add(hinge);
  box(2.18,3.24,.07,v(1.09,1.62,0),{parent:hinge,radius:.021});
  // Inset drawn panel, hinges and a dark graphite doorknob.
  stroke([v(.18,.28,.043),v(.18,3.02,.043),v(1.98,3.02,.043),v(1.98,.28,.043),v(.18,.28,.043)],{parent:hinge,radius:.004,color:0xbbbdb3,jitter:.014});
  for(let i=0;i<20;i++) {
    const y=.2+random()*2.8;
    stroke([v(.055,y,.046),v(.16,y+.14,.046)],{parent:hinge,radius:.0035,color:SOFT,opacity:.5});
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.073,16,12),new THREE.MeshBasicMaterial({color:INK}));
  knob.position.set(1.94,1.43,.095); hinge.add(knob);
  for(const y of [.45,2.65]) box(.045,.16,.13,v(.012,y,0),{parent:hinge,color:0x85887e,radius:.006});

  // Real desk geometry creates depth as the visitor walks in.
  const desk = new THREE.Group(); desk.position.set(0,0,-2.8); room.add(desk);
  box(4.7,.13,1.45,v(0,1.15,0),{parent:desk,radius:.018});
  for(const x of [-2.13,2.13]) for(const z of [-.54,.54]) box(.095,1.13,.10,v(x,.565,z),{parent:desk,radius:.012});
  box(4.24,.17,.06,v(0,.9,-.51),{parent:desk,radius:.011});
  for(let i=0;i<13;i++) {
    const x=-2.25+random()*4.4;
    stroke([v(x,1.222,-.65),v(x+.04,1.222,.62)],{parent:desk,radius:.0025,color:SOFT,opacity:.38});
  }
  box(.6,.095,.38,v(-1.54,1.267,-2.95),{color:0xe5e6df,radius:.009});
  box(.52,.09,.35,v(-1.59,1.36,-2.96),{color:0xfafaf7,radius:.009});
  // A small, deliberately sketched stool to one side of the desk.
  const stool=box(.77,.11,.6,v(-2.85,.7,-1.05),{radius:.013}); stool.rotation.y=.22;
  for(let x of [-3.12,-2.58]) for(let z of [-1.25,-.85]) stroke([v(x,.68,z),v(x+(x<-2.8?-.055:.055),0,z+.06)],{radius:.022});
  stroke([v(-3.12,.31,-.86),v(-2.59,.31,-.86)],{radius:.011});

  const {objects, anchors, screenPosition, screenSize, chair} = buildObjects(room, stroke);
  // Live screen writing is the only image plane on the modeled monitor.
  const screenCanvas=document.createElement('canvas'); screenCanvas.width=512; screenCanvas.height=330;
  const screenContext=screenCanvas.getContext('2d');
  const screenTexture=new THREE.CanvasTexture(screenCanvas); screenTexture.colorSpace=THREE.SRGBColorSpace;
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(...screenSize),new THREE.MeshBasicMaterial({map:screenTexture,transparent:true,depthWrite:false}));
  screen.renderOrder=5;
  screen.position.copy(screenPosition); room.add(screen);
  let lastScreenSecond=-1;
  function drawScreen(time) {
    const second=Math.floor(time/850); if(second===lastScreenSecond)return;lastScreenSecond=second;
    screenContext.fillStyle='#eeeeee';screenContext.fillRect(0,0,512,330);
    screenContext.fillStyle='#343434'; screenContext.font='36px monospace';
    screenContext.fillText('hello, world.',36,99);
    screenContext.font='23px monospace';screenContext.fillStyle='#727272';
    screenContext.fillText('a few things i made',36,157);
    screenContext.fillStyle='#343434'; screenContext.fillText('> explore'+(second%2?' _':''),36,235);
    screenTexture.needsUpdate=true;
  }
  const sunlight=plane(2.2,3.6,v(-1.6,.021,-.8),v(-Math.PI/2,0,-.52),0xe0e0e0);
  sunlight.material.transparent=true;sunlight.material.opacity=.0;

  const raycaster=new THREE.Raycaster();
  const mouse=new THREE.Vector2(99,99), parallax=new THREE.Vector2();
  const look=v(0,1.7,0), position=v(0,1.7,10.5);
  let phase='outside', animation=null, disposed=false, sound=false, light=false, audio=null, hovered=null, pressing=null, lastMove=0;
  let mobile=window.innerWidth<700;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const outside=()=>({pos:v(0,1.73,mobile?12.55:10.9),look:v(0,mobile?1.15:1.28,4)});
  const inside=()=>({pos:v(0,1.88,mobile?.35:-.45),look:v(0,1.77,-2.95)});
  const standing=()=>({pos:v(0,2.38,.30),look:v(0,1.78,-2.95)});
  const initial=outside(); position.copy(initial.pos);look.copy(initial.look);
  function setPhase(value) {phase=value;canvas.dataset.phase=value;callbacks.onPhase(value);}
  function tween(to,duration,done,door=null) {
    animation={start:performance.now(),duration:reduce.matches?Math.min(duration,180):duration,fromPos:position.clone(),toPos:to.pos.clone(),fromLook:look.clone(),toLook:to.look.clone(),fromDoor:hinge.rotation.y,toDoor:door,done};
  }
  function tone(freq=220,duration=.1,gain=.035,type='sine') {
    if(!sound)return;
    audio ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==='suspended')audio.resume();
    const osc=audio.createOscillator(), vol=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq*.72,audio.currentTime+duration);
    vol.gain.setValueAtTime(gain,audio.currentTime);vol.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
    osc.connect(vol).connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);
  }
  function enter() {
    if(phase!=='outside')return;
    setPhase('opening'); callbacks.onHover(null); tone(155,.35,.025,'triangle');
    tween({pos:position.clone(),look:look.clone()},1050,()=>{
      setPhase('entering');
      tween(standing(),2300,()=>{setPhase('sitting');tween(inside(),1050,()=>{setPhase('inside');tone(420,.2,.016);});},-Math.PI*.53);
    },-Math.PI*.53);
  }
  function leave() {
    if(!['inside','focused'].includes(phase))return;
    callbacks.onHover(null);setPhase('leaving');
    tween(outside(),1900,()=>tween(outside(),750,()=>{setPhase('outside');tone(120,.14,.02);},0),-Math.PI*.53);
  }
  const focusTargets={
    projects:{pos:v(0,1.97,-1.1),look:v(0,2.0,-2.72)},
    photos:{pos:v(.46,1.94,-.92),look:v(1.31,1.55,-2.60)},
    about:{pos:v(-.46,1.94,-.92),look:v(-1.24,1.35,-2.29)}
  };
  function focus(key) {
    if(phase!=='inside')return;
    if(key==='plant'){callbacks.onToast('浇一点耐心，它会慢慢长大。');tone(680,.17);return;}
    if(key==='window'){toggleLight();return;}
    if(key==='prints')key='photos';
    if(!focusTargets[key])return;
    setPhase('focusing');callbacks.onHover(null);tone(400,.08,.012);
    tween(focusTargets[key],reduce.matches?160:780,()=>{setPhase('focused');callbacks.onOpen(key);});
  }
  function resetFocus() {if(phase==='focused'){setPhase('returning');tween(inside(),700,()=>setPhase('inside'));}}
  function toggleLight(){light=!light;sunlight.material.opacity=light?.42:0;callbacks.onLight(light);tone(light?520:260,.13);}
  function pointermove(event){
    const rect=canvas.getBoundingClientRect();mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    if(event.pointerType!=='touch'&&!reduce.matches)parallax.set(mouse.x,mouse.y);
    lastMove=performance.now();
  }
  function pointerdown(event){pressing={x:event.clientX,y:event.clientY};pointermove(event);}
  function pointerup(event){
    if(!pressing||Math.hypot(event.clientX-pressing.x,event.clientY-pressing.y)>15){pressing=null;return;}
    pressing=null;pointermove(event);
    raycaster.setFromCamera(mouse,camera);
    if(phase==='outside'){
      if(raycaster.intersectObject(hinge,true).length)enter();
    } else if(phase==='inside'){
      const hit=raycaster.intersectObjects(objects,true).find(h=>h.object.visible);
      if(hit)focus(hit.object.userData.action);
    }
  }
  function pointerleave(){mouse.set(99,99);parallax.set(0,0);callbacks.onHover(null);hovered=null;}
  function resize(){
    const width=canvas.clientWidth,height=canvas.clientHeight;
    mobile=width<700;chair.position.z=mobile?.2:-.78;camera.aspect=width/height;camera.fov=mobile?(['outside','opening','leaving'].includes(phase)?49:106):(['outside','opening','leaving'].includes(phase)?44:58);camera.updateProjectionMatrix();renderer.setSize(width,height,false);
    if(!animation){if(phase==='outside'){const t=outside();position.copy(t.pos);look.copy(t.look);}else if(phase==='inside'){const t=inside();position.copy(t.pos);look.copy(t.look);}}
  }
  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
  canvas.addEventListener('pointermove',pointermove);canvas.addEventListener('pointerdown',pointerdown);canvas.addEventListener('pointerup',pointerup);canvas.addEventListener('pointerleave',pointerleave);
  const screenPoint=new THREE.Vector3();let frameId=0,lastHoverCheck=0;
  function project(point){screenPoint.copy(point).project(camera);return {x:(screenPoint.x*.5+.5)*canvas.clientWidth,y:(-.5*screenPoint.y+.5)*canvas.clientHeight,visible:screenPoint.z<1};}
  function frameLoop(now){
    if(disposed)return;
    frameId=requestAnimationFrame(frameLoop);
    if(animation){
      const t=clamp((now-animation.start)/animation.duration,0,1), e=ease(t);
      position.lerpVectors(animation.fromPos,animation.toPos,e);look.lerpVectors(animation.fromLook,animation.toLook,e);
      if(animation.toDoor!==null)hinge.rotation.y=THREE.MathUtils.lerp(animation.fromDoor,animation.toDoor,e);
      if(t===1){const done=animation.done;animation=null;done?.();}
    }
    camera.position.copy(position);
    const targetFov=mobile?(['outside','opening','leaving'].includes(phase)?49:['focusing','focused'].includes(phase)?74:106):(['outside','opening','leaving'].includes(phase)?44:58);
    if(Math.abs(camera.fov-targetFov)>.01){camera.fov=reduce.matches?targetFov:THREE.MathUtils.lerp(camera.fov,targetFov,.065);camera.updateProjectionMatrix();}
    if(['outside','inside'].includes(phase)&&!reduce.matches&&!mobile){camera.position.x+=parallax.x*.055;camera.position.y+=parallax.y*.025;}
    camera.lookAt(look);
    drawScreen(now);
    if(phase==='inside'&&now-lastHoverCheck>90){
      lastHoverCheck=now;raycaster.setFromCamera(mouse,camera);const hit=raycaster.intersectObjects(objects,true)[0];const key=hit?.object.userData.action||null;
      if(key!==hovered){hovered=key;callbacks.onHover(key);canvas.style.cursor=key?'pointer':'default';}

    }
    if(phase==='outside')canvas.style.cursor='pointer';
    if(now-lastMove>2000)parallax.multiplyScalar(.985);
    callbacks.onAnchors({door:project(v(0,2.16,4.19)),knob:project(v(.93,1.43,4.27)),projects:project(anchors.projects),photos:project(anchors.photos),about:project(anchors.about)});
    renderer.render(scene,camera);
  }
  callbacks.onReady();
  canvas.dataset.geometry='solid-mesh-pencil';
  frameId=requestAnimationFrame(frameLoop);
  return {
    enter,leave,focus,resetFocus,toggleLight,
    setSound(value){sound=value;if(value)tone(520,.14,.025);},
    dispose(){disposed=true;cancelAnimationFrame(frameId);ro.disconnect();canvas.removeEventListener('pointermove',pointermove);canvas.removeEventListener('pointerdown',pointerdown);canvas.removeEventListener('pointerup',pointerup);canvas.removeEventListener('pointerleave',pointerleave);scene.traverse(o=>{o.geometry?.dispose();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{m.map?.dispose();m.dispose();});}});renderer.dispose();audio?.close();},
  };
}
