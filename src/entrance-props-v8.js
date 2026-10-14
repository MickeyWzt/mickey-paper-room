import * as T from 'three';

// Each object owns an original-resolution image and a separate scene node.
// crop is a UV window into the original file; it does not resample the image.
export const entranceProps=[
  {id:'plaque',file:'plaque.png',size:[1902,827],crop:[40,214,1858,602],rect:[750,133,178,38],density:2.1},
  {id:'botanical-card',file:'botanical-card.png',size:[1024,1536],crop:[184,286,881,1258],rect:[606,299,60,84],density:3.7},
  {id:'wooden-stool',file:'wooden-stool.png',size:[1254,1254],crop:[266,199,975,1098],rect:[999,624,70,84],density:3.6},
  {id:'potted-plant',file:'potted-plant.png',size:[1054,1492],crop:[151,52,955,1377],rect:[1002,525,65,101],density:3.4},
];

export async function addEntranceProps(scene,opacity){
  const loader=new T.TextureLoader();
  const textures=await Promise.all(entranceProps.map(p=>loader.loadAsync(`/assets/entrance-v8/${p.file}`)));
  entranceProps.forEach((prop,index)=>{
    const texture=textures[index];texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
    const [iw,ih]=prop.size,[x0,y0,x1,y1]=prop.crop,[x,y,w,h]=prop.rect;
    const material=new T.ShaderMaterial({
      uniforms:{drawing:{value:texture},opacity,density:{value:prop.density},crop:{value:new T.Vector4(x0/iw,1-y1/ih,(x1-x0)/iw,(y1-y0)/ih)}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`uniform sampler2D drawing;uniform vec4 crop;uniform float opacity,density;varying vec2 vUv;
        void main(){
          vec3 ink=texture2D(drawing,crop.xy+vUv*crop.zw).rgb;
          // Fine source strokes need stronger graphite density at homepage size
          // to match the approved door. The original PNG remains untouched.
          ink=pow(ink,vec3(density));
          // White-backed graphite artwork uses multiply compositing; the white
          // canvas disappears without painting a fake alpha/checkerboard mask.
          gl_FragColor=vec4(mix(vec3(1.0),ink,opacity),1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent:true,premultipliedAlpha:true,depthWrite:false,depthTest:false,blending:T.MultiplyBlending,
    });
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),material);
    mesh.name=`Entrance_${prop.id}`;
    mesh.position.set(x+w/2-836,470.5-y-h/2,0);
    mesh.renderOrder=3+index;
    scene.add(mesh);
  });
}
