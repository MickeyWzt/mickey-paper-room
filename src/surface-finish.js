// Object-space texture stays attached to the model as it turns or is picked up.
// Fine fibers/grain and broad normal shading retain the room's pencil rendering.
export function surfaceFinish(material,kind){
 const types={paper:0,cover:1,leather:2,metal:3,linen:4};
 const type=types[kind];if(type===undefined)return;
 material.customProgramCacheKey=()=>`pencil-surface-v21-${kind}`;
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPaperPos; varying vec3 vPaperNormal; varying vec3 vPaperView;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPaperPos=position; vPaperNormal=normalize(normalMatrix*normal);');
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvPaperView=normalize(-mvPosition.xyz);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vPaperPos; varying vec3 vPaperNormal; varying vec3 vPaperView;
   float paperHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
   float paperNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(paperHash(i),paperHash(i+vec3(1,0,0)),f.x),mix(paperHash(i+vec3(0,1,0)),paperHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(paperHash(i+vec3(0,0,1)),paperHash(i+vec3(1,0,1)),f.x),mix(paperHash(i+vec3(0,1,1)),paperHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 p=vPaperPos;vec3 n=normalize(vPaperNormal);
   float fine=mix(paperNoise(p*2100.),.5,smoothstep(.5,2.,length(fwidth(p*2100.))));float broad=paperNoise(p*75.);
   float grain=.94+.07*fine;float light=.89+.11*max(0.,dot(n,normalize(vec3(-.4,.65,.8))));
   ${type===0?'grain=.91+.10*fine+.025*broad;':''}
   ${type===1?'float weave=sin(p.x*4000.)*sin(p.z*4000.)*(1.-smoothstep(.6,2.,length(fwidth(p*4000.))));grain=.82+.15*fine+.06*weave+.055*broad;':''}
   ${type===2?'float pores=smoothstep(.58,.82,paperNoise(p*1500.));grain=.68+.25*fine-.15*pores+.10*broad;':''}
   ${type===3?'float brush=paperNoise(p*vec3(80.,6200.,6200.));grain=.83+.16*brush+.035*fine;float sheen=pow(max(dot(reflect(-normalize(vec3(-.6,.8,.9)),n),normalize(vPaperView)),0.),22.);light=.91+.09*abs(n.z)+.17*sheen;':''}
   ${type===4?'float weaveVisibility=1.-smoothstep(.6,2.,length(fwidth(p.xy*2800.)));float warp=.5+.5*sin(p.x*2800.+sin(p.y*60.))*weaveVisibility;float weft=.5+.5*sin(p.y*2800.+sin(p.x*60.))*weaveVisibility;grain=.82+.07*warp+.065*weft+.04*fine+.035*broad;light=.85+.15*max(0.,dot(n,normalize(vec3(-.45,.65,.7))));':''}
   diffuseColor.rgb*=grain*light;
  `);
 };material.needsUpdate=true;
}

