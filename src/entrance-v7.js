import * as T from 'three';
import { createEntranceProps } from './entrance-props-v9.js';

// All door layers share reference-space bounds; the source is an independent HD drawing.
const W=1672,H=941,LEAF={x:719,y:199,w:233,h:498},DISTANCE=2000;
const doorSample=`uniform sampler2D doorDrawing;
vec3 doorInk(vec2 p){
  vec2 q=(p-vec2(696,174))/vec2(280,526);
  vec2 source=vec2(90,66)+q*vec2(738,1560);
  return texture2D(doorDrawing,vec2(source.x/917.0,1.0-source.y/1715.0)).rgb;
}`;
const leafBounds=`vec4(${LEAF.x}.0,${LEAF.y}.0,${LEAF.w}.0,${LEAF.h}.0)`;
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const output=`#include <tonemapping_fragment>\n#include <colorspace_fragment>`;
const hash=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}`;

export async function createEntrance(){
  const loader=new T.TextureLoader();
  const [drawing,wood,doorDrawing]=await Promise.all([
    loader.loadAsync('/assets/entrance-v7/reference.png'),
    loader.loadAsync('/assets/entrance-v7/oak-pencil.png'),
    loader.loadAsync('/assets/entrance-v11/door-pencil-hd.png'),
  ]);
  drawing.colorSpace=wood.colorSpace=doorDrawing.colorSpace=T.SRGBColorSpace;
  drawing.generateMipmaps=false;drawing.minFilter=T.LinearFilter;
  doorDrawing.generateMipmaps=false;doorDrawing.minFilter=T.LinearFilter;doorDrawing.anisotropy=4;
  wood.wrapS=wood.wrapT=T.RepeatWrapping;wood.anisotropy=4;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,1,1,5000);
  camera.position.set(0,0,DISTANCE);
  const opacity={value:1},paint={value:0},travel={value:0},mobile={value:false},cut={value:false},nativeSize={value:false};
  const background=new T.ShaderMaterial({
    uniforms:{drawing:{value:drawing},doorDrawing:{value:doorDrawing},opacity,travel,mobile,cut,nativeSize},vertexShader:vertex,
    transparent:true,depthWrite:false,
    fragmentShader:`uniform sampler2D drawing;uniform float opacity,travel;uniform bool mobile,cut,nativeSize;varying vec2 vUv;
      ${doorSample}
      void main(){vec2 p=vec2((vUv.x-.5)*10000.0+836.0,470.5-(vUv.y-.5)*10000.0);
        vec2 sourceP=p;
        vec4 bounds=${leafBounds};
        if(cut&&all(greaterThanEqual(p,bounds.xy))&&all(lessThanEqual(p,bounds.xy+bounds.zw)))discard;
        float a=opacity;
        vec3 color=vec3(1.0);
        if(nativeSize&&travel==0.0)p=floor(p)+.5;
        if(p.x>=0.0&&p.x<=1672.0&&p.y>=0.0&&p.y<=941.0)color=texture2D(drawing,vec2(p.x/1672.0,1.0-p.y/941.0)).rgb;
        // These drawings now have their own high-resolution DOM image layers.
        // Keep the approved door/frame, paper note and original camera unchanged.
        bool oldPlaque=p.x>746.0&&p.x<934.0&&p.y>128.0&&p.y<174.0;
        bool oldCard=p.x>600.0&&p.x<673.0&&p.y>294.0&&p.y<386.0;
        bool oldPlantAndStool=p.x>988.0&&p.x<1081.0&&p.y>518.0&&p.y<715.0;
        bool oldDoor=p.x>690.0&&p.x<984.0&&p.y>=174.0&&p.y<705.0;
        bool oldStar=p.x>1018.0&&p.x<1043.0&&p.y>472.0&&p.y<501.0;
        color=mix(color,vec3(1.0),smoothstep(790.0,835.0,p.y));
        if(oldPlaque||oldCard||oldPlantAndStool||oldDoor||oldStar)color=vec3(1.0);
        if(sourceP.x>=696.0&&sourceP.x<=976.0&&sourceP.y>=174.0&&sourceP.y<=700.0)color=doorInk(sourceP);
        gl_FragColor=vec4(color,a);
        ${output}
      }`,
  });
  const sheet=new T.Mesh(new T.PlaneGeometry(10000,10000),background);sheet.renderOrder=1;scene.add(sheet);
  const props=await createEntranceProps();
  const front=new T.ShaderMaterial({
    uniforms:{doorDrawing:{value:doorDrawing},wood:{value:wood},opacity,paint},vertexShader:vertex,
    transparent:true,depthWrite:true,
    fragmentShader:`uniform sampler2D wood;uniform float opacity,paint;varying vec2 vUv;
      ${doorSample}
      ${hash}
      void main(){
        vec4 bounds=${leafBounds};
        vec2 p=bounds.xy+vec2(vUv.x,1.0-vUv.y)*bounds.zw;
        vec3 ink=doorInk(p);
        // Stiles and panels follow the vertical grain; structural rails run across it.
        bool rail=p.y<229.0||(p.y>429.0&&p.y<462.0)||p.y>654.0;
        vec2 grainUV=rail?vec2(p.y/178.0,p.x/290.0):vec2((p.x-720.0)/280.0,(p.y-197.0)/660.0);
        vec3 oak=mix(texture2D(wood,grainUV).rgb,vec3(1.0),.15);
        vec3 color=ink*oak;
        // The round handle has warm, dark brass pigment rather than wood grain.
        vec2 d=(p-vec2(934.65,445.8))/10.0;float radius=length(d);
        if(radius<1.0){float pigment=.52+.28*clamp(dot(d,vec2(-.5,-.8)),0.0,1.0)+.08*noise(p*2.0);
          vec3 brass=vec3(.58,.34,.105)*pigment;
          brass*=.35+1.1*sqrt(max(.01,dot(ink,vec3(.333))));
          color=mix(brass,ink,smoothstep(.72,.96,radius));
        }
        // Top-to-bottom reveal with broad scallops, finer pencil flecks and paper tooth.
        float edge=.043*(noise(vec2(p.x*.050,2.7))-.5)+.021*(noise(vec2(p.x*.13,5.3))-.5)+.004*noise(p*.65);
        float y=(p.y-bounds.y)/bounds.w;
        float reveal=1.0-smoothstep(paint*1.12-.065+edge-.004,paint*1.12-.065+edge+.004,y);
        gl_FragColor=vec4(mix(ink,color,reveal),opacity);
        ${output}
      }`,
  });
  const edgeMaterial=new T.MeshBasicMaterial({color:0x827154,transparent:true});
  const backMaterial=new T.MeshBasicMaterial({map:wood,color:0xd9c8a8,transparent:true});
  const hinge=new T.Group();hinge.position.set(LEAF.x-W/2,H/2-LEAF.y-LEAF.h/2,0);scene.add(hinge);
  const leaf=new T.Mesh(new T.BoxGeometry(LEAF.w,LEAF.h,8),[edgeMaterial,edgeMaterial,edgeMaterial,edgeMaterial,front,backMaterial]);
  leaf.position.set(LEAF.w/2,0,-4);leaf.renderOrder=2;hinge.add(leaf);
  // Paper and tape are separately clipped surfaces fixed to the hinged leaf.
  // Their ink never passes through the oak pigment or reveal shader.
  const stickerMaterial=new T.ShaderMaterial({
    uniforms:{doorDrawing:{value:doorDrawing},opacity},vertexShader:vertex,
    transparent:true,depthWrite:false,depthTest:false,
    fragmentShader:`uniform sampler2D doorDrawing;uniform float opacity;varying vec2 vUv;
      void main(){gl_FragColor=vec4(texture2D(doorDrawing,vUv).rgb,opacity);
      ${output}
      }`,
  });
  function sticker(name,points,z){
    const positions=[],uvs=[];
    for(const [x,y] of points){
      const px=696+(x-90)/738*280,py=174+(y-66)/1560*526;
      positions.push(px-LEAF.x-LEAF.w/2,LEAF.y+LEAF.h/2-py,z);
      uvs.push(x/917,1-y/1715);
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
    geometry.setIndex([0,2,1,0,3,2]);
    const mesh=new T.Mesh(geometry,stickerMaterial);mesh.name=name;mesh.renderOrder=name==='Paper tape'?4:3;
    leaf.add(mesh);
  }
  sticker('Welcome paper',[[346,392],[561,369],[576,508],[356,531]],4.15);
  sticker('Paper tape',[[425,369],[480,353],[488,391],[433,404]],4.2);
  let width=0,height=0,baseHeight=H;
  let passage={cameraZ:DISTANCE,opacity:1,surroundingsOutside:false,passed:false};
  function resize(w,h){
    if(width===w&&height===h)return;
    width=w;height=h;const aspect=w/h;
    mobile.value=w<650;
    nativeSize.value=w===W&&h===H;
    baseHeight=w<650?1100:Math.max(H,W/aspect);
    camera.aspect=aspect;camera.fov=2*Math.atan(baseHeight/(2*DISTANCE))*180/Math.PI;
    camera.updateProjectionMatrix();camera.updateMatrixWorld();
  }
  function target(){
    const s=height/baseHeight;
    return {left:width/2+(LEAF.x-W/2)*s,top:height/2+(LEAF.y-H/2)*s,width:LEAF.w*s,height:LEAF.h*s};
  }
  function render(renderer,{phase,progress,angle,transition}){
    if(width!==innerWidth||height!==innerHeight)resize(innerWidth,innerHeight);
    if(!['door','loading','entering'].includes(phase)){props.render({phase});return;}
    const t=phase==='entering'?transition:0;
    cut.value=progress>0||Math.abs(angle)>.00001||t>0;leaf.visible=cut.value;
    // Move the camera through the entrance plane, then past the opened leaf.
    // All entrance surfaces stay opaque; perspective and near clipping remove
    // them only as they leave the field of view / pass behind the camera.
    const advance=T.MathUtils.smoothstep(t,.42,2.20);
    camera.zoom=1;
    camera.position.set((LEAF.x+LEAF.w/2-W/2)*advance,(H/2-LEAF.y-LEAF.h/2)*advance,T.MathUtils.lerp(DISTANCE,-LEAF.w-80,advance));
    camera.updateProjectionMatrix();
    opacity.value=1;travel.value=t;paint.value=progress;
    hinge.rotation.y=angle;
    edgeMaterial.opacity=backMaterial.opacity=1;
    const magnification=DISTANCE/Math.max(camera.position.z,1);
    const screenScale=height/baseHeight*magnification;
    const left=width/2+(LEAF.x-W/2-camera.position.x)*screenScale;
    const right=left+LEAF.w*screenScale;
    const top=height/2+(LEAF.y-H/2+camera.position.y)*screenScale;
    const bottom=top+LEAF.h*screenScale;
    // Once the opening extends beyond every viewport edge, exterior props are
    // already outside the screen. Avoid asking CSS to rasterize enormous images.
    const surroundingsOutside=camera.position.z<=1||(left<-width*.08&&right>width*1.08&&top<-height*.08&&bottom>height*1.08);
    passage={cameraZ:camera.position.z,opacity:1,surroundingsOutside,passed:camera.position.z<-LEAF.w-12,opening:{left,right,top,bottom}};
    renderer.autoClear=false;renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=true;
    if(surroundingsOutside)props.render({phase:'walking'});
    else props.render({width,height,baseHeight,zoom:magnification,panX:camera.position.x,panY:camera.position.y,opacity:1,phase});
  }
  async function prepare(renderer){
    for(const texture of [drawing,wood,doorDrawing])renderer.initTexture(texture);
    const visible=leaf.visible;leaf.visible=true;
    await renderer.compileAsync(scene,camera);
    leaf.visible=visible;
  }
  resize(innerWidth,innerHeight);
  return {prepare,render,target,resize,get passageState(){return passage;},resetProps:props.reset,get propsState(){return props.state;}};
}
