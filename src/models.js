import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Solid meshes, with pencil shading evaluated on their actual 3D surfaces.
// No sprites, billboard planes or image textures are used for these objects.
export function buildObjects(room, stroke) {
  const V = (x,y,z) => new THREE.Vector3(x,y,z);
  const ink = new THREE.MeshBasicMaterial({color:0x292929,side:THREE.BackSide});
  const paper = new THREE.MeshBasicMaterial({color:0xfafafa});
  paper.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 pencilPosition; varying vec3 pencilNormal;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\npencilPosition=(modelMatrix*vec4(position,1.)).xyz; pencilNormal=normalize(mat3(modelMatrix)*normal);');
    shader.fragmentShader = 'varying vec3 pencilPosition; varying vec3 pencilNormal;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float shade = 1. - smoothstep(-.4,.8,dot(normalize(pencilNormal),normalize(vec3(-1.,2.,3.))));
      float coord = (pencilPosition.x + pencilPosition.y*.83 + pencilPosition.z*.71)*150.;
      float wav = sin(coord + sin(pencilPosition.y*48.)*.5);
      float hatch = smoothstep(.64,.94,wav);
      diffuseColor.rgb *= 1. - shade*.055 - hatch*shade*.29;
    `);
  };
  function group(pos,parent=room) {const g=new THREE.Group();g.position.copy(pos);parent.add(g);return g;}
  function solid(geo,pos,parent,{color,rotation,outline=.012}={}) {
    const mesh=new THREE.Mesh(geo,color?new THREE.MeshBasicMaterial({color}):paper);
    mesh.position.copy(pos); if(rotation)mesh.rotation.set(...rotation);parent.add(mesh);
    if(outline){const edge=new THREE.Mesh(geo,ink);const a=geo.boundingBox||(geo.computeBoundingBox(),geo.boundingBox);const s=a.getSize(new THREE.Vector3());edge.scale.set(1+outline/Math.max(s.x,.02),1+outline/Math.max(s.y,.02),1+outline/Math.max(s.z,.02));mesh.add(edge);}
    return mesh;
  }
  function block(w,h,d,pos,parent,opts={}) {return solid(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.13),pos,parent,opts);}
  function cyl(r1,r2,h,pos,parent,opts={}) {return solid(new THREE.CylinderGeometry(r1,r2,h,40),pos,parent,opts);}
  function line(points,parent,width=.004,color=0x686868) {return stroke(points.map(p=>V(...p)),{parent,radius:width,color,jitter:.005});}
  function ring(radius,pos,parent,rotation=[Math.PI/2,0,0],width=.009) {return solid(new THREE.TorusGeometry(radius,width,6,48),pos,parent,{color:0x393939,rotation,outline:0});}
  const objects=[],anchors={};
  function action(g,key,anchor){g.name=key;g.traverse(o=>{if(o.isMesh)o.userData.action=key;});objects.push(g);anchors[key]=anchor;return g;}

  const computer=group(V(0,1.23,-3.03));
  block(.64,.075,.43,V(0,.04,.02),computer);
  block(.22,.21,.24,V(0,.16,-.02),computer);
  block(1.34,.98,.68,V(0,.72,-.09),computer);
  block(1.20,.84,.055,V(0,.74,.275),computer);
  block(1.03,.65,.024,V(-.025,.785,.311),computer,{color:0x363636});
  for(let i=0;i<6;i++)line([[.688,.57+i*.043,-.26],[.688,.57+i*.043,.1]],computer,.0035);
  cyl(.027,.027,.015,V(.50,.425,.316),computer,{rotation:[Math.PI/2,0,0],color:0x444444,outline:0});
  line([[-.47,.407,.309],[-.27,.406,.309]],computer,.005);
  const keyboard=group(V(0,1.26,-2.15));keyboard.rotation.x=.06;
  block(1.27,.075,.40,V(0,0,0),keyboard);
  for(let row=0;row<4;row++)for(let col=0;col<12;col++){
    if(row===3&&col>2&&col<9)continue;
    block(.080,.025,.066,V(-.54+col*.098,.05,-.14+row*.087),keyboard,{outline:.004});
  }
  block(.56,.025,.066,V(.01,.05,.121),keyboard,{outline:.004});
  const mouse=solid(new THREE.SphereGeometry(1,20,16),V(.88,1.31,-2.13),room);mouse.scale.set(.10,.067,.17);
  line([[.88,1.355,-2.30],[.93,1.25,-2.54],[.69,1.235,-2.71],[.5,1.235,-2.8]],room,.004);
  action(computer,'projects',V(0,2.41,-2.75));
  keyboard.traverse(o=>{if(o.isMesh)o.userData.action='projects';});objects.push(keyboard);

  const camera=group(V(1.31,1.24,-2.60));camera.rotation.y=-.19;
  block(.62,.35,.25,V(0,.21,0),camera);
  block(.18,.12,.21,V(.03,.405,-.012),camera);
  block(.13,.29,.28,V(-.265,.21,.013),camera,{color:0x545454});
  cyl(.14,.14,.23,V(.055,.215,.185),camera,{rotation:[Math.PI/2,0,0]});
  ring(.135,V(.055,.215,.306),camera,[0,0,0],.008);
  cyl(.107,.107,.011,V(.055,.215,.311),camera,{rotation:[Math.PI/2,0,0],color:0x3f3f3f});
  ring(.071,V(.055,.215,.322),camera,[0,0,0],.004);
  cyl(.061,.061,.046,V(-.205,.409,0),camera);
  cyl(.04,.04,.033,V(.232,.412,.018),camera);
  block(.08,.043,.011,V(.242,.299,.132),camera,{color:0x696969});
  line([[-.33,.22,0],[-.50,.09,.03],[-.48,.005,.29],[-.20,.007,.45],[.28,.005,.40],[.38,.15,.03]],camera,.007);
  action(camera,'photos',V(1.32,1.80,-2.49));

  const notebook=group(V(-1.24,1.27,-2.29));notebook.rotation.y=-.24;
  block(.78,.052,.60,V(0,0,0),notebook,{color:0x555555});
  block(.74,.049,.57,V(0,.047,0),notebook);
  block(.78,.022,.60,V(0,.084,0),notebook);
  for(let j=0;j<3;j++)line([[-.34,.035+j*.012,.29],[.34,.035+j*.012,.29]],notebook,.0018);
  line([[-.3,.097,-.26],[-.3,.097,.26]],notebook,.004);
  line([[-.14,.098,-.12],[.19,.098,-.12],[.19,.098,.075],[-.14,.098,.075],[-.14,.098,-.12]],notebook,.003);
  for(let i=0;i<3;i++)line([[-.08,.099,-.067+i*.04],[.13-i*.025,.099,-.067+i*.04]],notebook,.002);
  const pen=cyl(.014,.014,.53,V(.32,.13,.01),notebook,{rotation:[Math.PI/2,0,-.23],color:0x494949,outline:.004});
  action(notebook,'about',V(-1.28,1.49,-2.21));

  const plant=group(V(-2.02,1.24,-3.02));
  cyl(.20,.14,.35,V(0,.18,0),plant);ring(.2,V(0,.352,0),plant);
  cyl(.177,.177,.007,V(0,.342,0),plant,{color:0x7b7b7b,outline:0});
  for(let i=0;i<7;i++){
    const a=i*2.4, tip=V(Math.sin(a)*.23,.57+(i%3)*.14,Math.cos(a)*.18);
    line([[0,.34,0],[tip.x*.6,tip.y-.11,tip.z*.6],[tip.x,tip.y,tip.z]],plant,.007);
    const leaf=solid(new THREE.SphereGeometry(1,12,8),tip,plant,{outline:.027});leaf.scale.set(.087,.21,.025);leaf.rotation.set(.3,a,-Math.sin(a)*.8);
  }
  action(plant,'plant',V(-2.02,2.3,-3.02));

  const chair=group(V(0,0,-.78));
  block(.91,.13,.80,V(0,.68,0),chair);
  block(.87,.68,.105,V(0,1.10,.36),chair);
  for(const x of [-.34,.34])for(const z of [-.27,.27])cyl(.026,.022,.64,V(x,.32,z),chair);
  for(const x of [-.44,.44]){
    line([[x,.70,-.2],[x,.99,-.2],[x,.99,.29],[x,.7,.29]],chair,.018);
    for(let i=0;i<4;i++)line([[x<0?-.36:.30,.84+i*.13,.421],[x<0?-.29:.37,.90+i*.13,.421]],chair,.003);
  }
  chair.name='chair';

  const windowFrame=group(V(-2.55,2.8,-4.42));
  block(1.7,1.72,.07,V(0,0,0),windowFrame);
  block(1.52,1.52,.025,V(0,0,.055),windowFrame,{color:0xf0f0f0});
  for(const x of [-.81,0,.81])block(.037,1.65,.085,V(x,0,.085),windowFrame);
  for(const y of [-.8,0,.8])block(1.67,.037,.085,V(0,y,.085),windowFrame);
  block(1.88,.09,.28,V(0,-.89,.08),windowFrame);
  // Distant hills are strokes behind the solid window mullions.
  line([[-.72,-.32,.074],[-.48,-.12,.074],[-.25,-.33,.074],[.1,-.10,.074],[.42,-.34,.074],[.73,-.19,.074]],windowFrame,.005,0xb0b0b0);
  action(windowFrame,'window',V(-2.55,3.7,-4.42));
  const prints=group(V(1.56,3.0,-4.44));
  for(let i=0;i<2;i++){
    const print=group(V((i-.5)*.88,i*.16,0),prints);print.rotation.z=i?-.06:.045;
    block(.69,.83,.046,V(0,0,0),print);
    line([[-.26,-.18,.026],[-.09,.07,.026],[.08,-.12,.026],[.16,-.04,.026],[.26,-.18,.026]],print,.004);
    block(.22,.075,.016,V(0,.416,.02),print,{color:0xe2e2e2,outline:.004});
  }
  action(prints,'prints',V(1.56,3.6,-4.4));
  return {objects,anchors,screenPosition:V(-.025,2.015,-2.70),screenSize:[.985,.607],chair};
}
