import * as T from 'three';

// A frozen view of the current room becomes the front of an actual folded mesh.
// The live, untouched homepage remains underneath this separate transparent canvas.
export function createPaperReturn(){
  const canvas=document.createElement('canvas');canvas.id='paper-return';canvas.hidden=true;
  canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
  const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xffffff,0);
  renderer.outputColorSpace=T.SRGBColorSpace;
  const snapshot=document.createElement('canvas');snapshot.width=snapshot.height=1;
  const context=snapshot.getContext('2d');
  const texture=new T.CanvasTexture(snapshot);texture.colorSpace=T.SRGBColorSpace;
  texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,30);camera.position.z=8;
  const cols=42,rows=28,uv=[],positions=[],indices=[];
  const noise=(x,y)=>Math.sin(x*127.1+y*311.7)*.5+Math.sin(x*47.3-y*79.9)*.5;
  for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
    const u=(x+(x>0&&x<cols?noise(x,y)*.27:0))/cols;
    const v=(y+(y>0&&y<rows?noise(y,x)*.27:0))/rows;
    uv.push(u,v);positions.push(0,0,0);
  }
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const a=y*(cols+1)+x,b=a+1,c=a+cols+1,d=c+1;
    if((x+y)%2)indices.push(a,b,c,b,d,c);else indices.push(a,b,d,a,d,c);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  const uniforms={snapshot:{value:texture},fold:{value:0},alpha:{value:1}};
  const material=new T.ShaderMaterial({uniforms,side:T.DoubleSide,transparent:true,
    vertexShader:`varying vec2 vUv;varying vec3 vPosition;
      void main(){vUv=uv;vPosition=(modelViewMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*vec4(vPosition,1.);}`,
    fragmentShader:`uniform sampler2D snapshot;uniform float fold,alpha;varying vec2 vUv;varying vec3 vPosition;
      void main(){
        vec3 n=normalize(cross(dFdx(vPosition),dFdy(vPosition)));if(!gl_FrontFacing)n=-n;
        vec3 ink=gl_FrontFacing?texture2D(snapshot,vUv).rgb:vec3(.965,.96,.945);
        float light=.53+.47*abs(dot(n,normalize(vec3(-.35,.5,1.))));
        float shade=mix(1.,light,fold);
        gl_FragColor=vec4(ink*shade,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const group=new T.Group();scene.add(group);
  const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;group.add(mesh);
  const creases=new T.Mesh(geometry,new T.MeshBasicMaterial({color:0x625e52,wireframe:true,transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
  creases.frustumCulled=false;group.add(creases);
  const shadow=new T.Mesh(geometry,new T.MeshBasicMaterial({color:0x292723,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));
  shadow.frustumCulled=false;shadow.position.set(.025,-.035,-.45);scene.add(shadow);
  let active=false,time=0,reduced=false,done,aspect=1,foldSeed=0;
  const smooth=(a,b,t)=>T.MathUtils.smoothstep(t,a,b);
  function size(){
    aspect=innerWidth/innerHeight;renderer.setSize(innerWidth,innerHeight,false);
    camera.left=-aspect;camera.right=aspect;camera.updateProjectionMatrix();
  }
  function shape(fold,toss){
    const a=geometry.attributes.position;
    for(let i=0;i<a.count;i++){
      const u=uv[i*2]-.5,v=uv[i*2+1]-.5;
      const r=Math.hypot(u,v),phi=Math.atan2(v,u)+.4*Math.sin(u*15+v*11);
      const theta=r*7.8;
      const ridge=Math.sin(u*51+v*13)*Math.sin(v*43-u*9);
      const nx=Math.sin(theta)*Math.cos(phi),ny=Math.sin(theta)*Math.sin(phi),nz=Math.cos(theta);
      // Broad dents and uneven lobes change the silhouette, while the small
      // ridges retain folded paper facets. One seed per toss avoids flickering.
      const lobes=.18*Math.sin(phi*3+foldSeed)*Math.sin(theta)**2+.13*Math.cos(theta*2-phi+foldSeed*.7);
      const dent=.27*Math.exp(-((nx+.65)**2+(ny-.38)**2+(nz-.45)**2)/.22);
      const radius=.235*(1+lobes-dent)+.026*ridge+.012*Math.sin(phi*7+foldSeed);
      const corner=Math.exp(-((u-.44)**2+(v+.33)**2)/.007);
      const bx=radius*nx*1.13+.025*ny*nz+.047*corner;
      const by=radius*ny*.88+.022*Math.sin(theta*2+foldSeed)*nx-.033*corner;
      const bz=radius*nz+.026*nx*ny+.056*corner;
      const buckle=Math.sin(u*19+v*8)*Math.cos(v*17-u*5);
      a.setXYZ(i,T.MathUtils.lerp(u*2*aspect,bx,fold),T.MathUtils.lerp(v*2,by,fold),bz*fold+.15*Math.sin(fold*Math.PI)*buckle);
    }
    a.needsUpdate=true;
    group.position.set(-.14*fold+(aspect+1.3)*toss*toss,.08*fold+1.3*toss-.28*toss*toss,.12*fold);
    group.rotation.set(.28*fold+1.8*toss,-.35*fold+1.1*toss,-.12*fold-2.7*toss);
    shadow.position.set(group.position.x+.025,group.position.y-.035,-.45);shadow.rotation.copy(group.rotation);
    uniforms.fold.value=fold;creases.material.opacity=.035*smooth(.25,.7,fold)*(1-toss);
    shadow.material.opacity=.13*smooth(0,.22,fold)*(1-toss);
  }
  function finish(){active=false;canvas.hidden=true;done?.();done=null;}
  function render(dt){
    if(!active)return;
    time+=dt;canvas.dataset.progress=String(time);
    if(reduced){uniforms.alpha.value=1-smooth(0,.24,time);shape(0,0);}
    else {uniforms.alpha.value=1-smooth(1.85,2.05,time);shape(smooth(.10,1.25,time),smooth(1.30,2.05,time));}
    renderer.render(scene,camera);
    if(time>=(reduced?.24:2.05))finish();
  }
  return {
    get active(){return active;},get progress(){return time;},
    start(source,{reduceMotion=false,onComplete}={}){
      if(active)return false;
      snapshot.width=source.width;snapshot.height=source.height;context.drawImage(source,0,0);texture.needsUpdate=true;
      reduced=reduceMotion;done=onComplete;time=0;foldSeed=Math.random()*Math.PI*2;active=true;size();canvas.hidden=false;
      uniforms.alpha.value=1;shape(0,0);renderer.render(scene,camera);return true;
    },
    render,resize(){if(active)size();},
    prepare(){size();shape(0,0);renderer.compile(scene,camera);},
  };
}
