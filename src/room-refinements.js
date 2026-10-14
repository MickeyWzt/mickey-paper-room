import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { surfaceFinish } from './surface-finish.js';

// Small furnishings are rebuilt as clean surfaces, without inverted ink shells.
const ink=new T.MeshBasicMaterial({color:0x393a35}),paper=new T.MeshBasicMaterial({color:0xf8f7f1,side:T.DoubleSide}),leafMat=new T.MeshBasicMaterial({color:0xe5e8df,side:T.DoubleSide});
const v=(x,y,z)=>new T.Vector3(x,y,z);
function mesh(g,geo,mat,pos=[0,0,0]){const o=new T.Mesh(geo,mat);o.position.set(...pos);g.add(o);return o;}
function rod(g,a,b,r=.001,mat=ink){a=new T.Vector3(...a);b=new T.Vector3(...b);const o=mesh(g,new T.CylinderGeometry(r,r,a.distanceTo(b),8),mat);o.position.copy(a).lerp(b,.5);o.quaternion.setFromUnitVectors(v(0,1,0),b.sub(a).normalize());return o;}
function curve(g,points,r=.00065,mat=ink){return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,r,5,false),mat);}
function batch(g){g.updateMatrixWorld(true);const grouped=new Map();g.traverse(o=>{if(o.isMesh){let geo=o.geometry.clone().applyMatrix4(new T.Matrix4().copy(g.matrixWorld).invert().multiply(o.matrixWorld));if(geo.index)geo=geo.toNonIndexed();if(!o.material.map)geo.deleteAttribute('uv');const list=grouped.get(o.material)||[];list.push(geo);grouped.set(o.material,list);}});g.clear();for(const [mat,list] of grouped){g.add(new T.Mesh(mergeGeometries(list),mat));list.forEach(x=>x.dispose());}}
function removeRegion(root,test){if(!root)return;root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert();root.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.clone(),pos=geo.attributes.position,idx=geo.index,array=[],matrix=inverse.clone().multiply(o.matrixWorld),p=new T.Vector3(),groups=[];for(const group of geo.groups.length?geo.groups:[{start:0,count:idx?idx.count:pos.count,materialIndex:0}]){const start=array.length;for(let i=group.start;i<group.start+group.count;i+=3){const ids=[0,1,2].map(k=>idx?idx.getX(i+k):i+k);p.set(0,0,0);ids.forEach(n=>p.add(v(pos.getX(n),pos.getY(n),pos.getZ(n))));p.multiplyScalar(1/3).applyMatrix4(matrix);if(!test(p))array.push(...ids);}if(array.length>start)groups.push({start,count:array.length-start,materialIndex:group.materialIndex});}geo.setIndex(array);geo.clearGroups();groups.forEach(x=>geo.addGroup(x.start,x.count,x.materialIndex));o.geometry=geo;});}
function plant(parent,pos,scale=1){const g=new T.Group();g.position.set(...pos);g.scale.setScalar(scale);parent.add(g);
 mesh(g,new T.CylinderGeometry(.054,.04,.082,32),paper,[0,.043,0]);mesh(g,new T.CylinderGeometry(.052,.052,.002,32),ink,[0,.085,0]);const rim=mesh(g,new T.TorusGeometry(.054,.002,6,40),ink,[0,.085,0]);rim.rotation.x=Math.PI/2;
 for(let k=0;k<4;k++){const angle=k*2.1,end=v(Math.cos(angle)*.053,.24+(k%2)*.033,Math.sin(angle)*.05);curve(g,[[0,.083,0],[end.x*.35,.15,end.z*.35],end.toArray()],.00085);
  for(let j=0;j<3;j++){const base=v(0,.085,0).lerp(end,.38+j*.25),a=angle+(j%2?1.1:-1.1),direction=v(Math.cos(a)*.062,.024,Math.sin(a)*.062),side=v(-Math.sin(a),0,Math.cos(a)),verts=[],faces=[],edge=[],mid=[];
   for(let i=0;i<=12;i++){const t=i/12,c=base.clone().addScaledVector(direction,t);c.y+=.011*Math.sin(t*Math.PI);mid.push(c.clone().add(v(0,.0007,0)).toArray());for(const s of [-1,1]){const p=c.clone().addScaledVector(side,s*.016*Math.sin(t*Math.PI));p.y-=.004*Math.sin(t*Math.PI);verts.push(...p.toArray());}if(i<12){const n=i*2;faces.push(n,n+1,n+2,n+1,n+3,n+2);}}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(faces);geo.computeVertexNormals();mesh(g,geo,leafMat);
   for(let i=0;i<=12;i++)edge.push(verts.slice(i*6,i*6+3));for(let i=12;i>=0;i--)edge.push(verts.slice(i*6+3,i*6+6));curve(g,edge,.00045);curve(g,mid,.0004);
  }
 }batch(g);g.name='Clean botanical plant';return g;}
function artwork(kind){const c=document.createElement('canvas');c.width=768;c.height=1024;const x=c.getContext('2d');x.fillStyle='#f7f6ef';x.fillRect(0,0,768,1024);x.strokeStyle='#5d6259';x.lineWidth=2;
 const line=(points)=>{x.beginPath();points.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.stroke();};
 if(kind==='botanical'){x.beginPath();x.moveTo(378,820);x.bezierCurveTo(410,640,347,417,405,200);x.stroke();for(let i=0;i<9;i++){const y=744-i*59,s=i%2?1:-1,bx=385+Math.sin(i)*9,tx=bx+s*(105+(i%3)*16),ty=y-88;x.beginPath();x.moveTo(bx,y);x.bezierCurveTo(bx+s*6,y-58,tx-s*19,ty-18,tx,ty);x.bezierCurveTo(tx-s*3,ty+58,bx+s*45,y+4,bx,y);x.fillStyle=i%2?'#e2e5d9':'#edf0e6';x.fill();x.stroke();line([[bx,y],[tx,ty]]);for(let j=1;j<5;j++){let t=j/5;line([[bx+(tx-bx)*t,y+(ty-y)*t],[bx+(tx-bx)*t+s*16,y+(ty-y)*t-20]]);}}}
 else{for(let layer=0;layer<5;layer++){x.strokeStyle=['#b1b6aa','#9ca799','#819383','#657963','#465e50'][layer];x.beginPath();for(let i=0;i<=50;i++){let xx=85+i*12,yy=510+layer*53+Math.sin(i*.17+layer)*90+Math.sin(i*.41)*19;x.lineTo(xx,yy);}x.stroke();}x.strokeStyle='#9a9e8e';x.beginPath();x.arc(516,275,51,0,Math.PI*2);x.stroke();for(let i=0;i<18;i++)line([[95,805+i*3],[675,805+i*3]]);}
 x.fillStyle='#6b6c60';x.textAlign='center';x.font='19px Georgia';x.fillText(kind==='botanical'?'BOTANICAL STUDY':'STILL, SOMEWHERE',384,916);x.font='12px Georgia';x.fillText(kind==='botanical'?'A small study of leaves and light':'Quiet lines, distant hills',384,945);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;}
const artMaps=new Map();
function frame(parent,pos,w,h,kind='botanical'){const g=new T.Group();g.position.set(...pos);parent.add(g);mesh(g,new T.BoxGeometry(w,h,.018),ink,[0,h/2,0]);mesh(g,new T.BoxGeometry(w-.01,h-.01,.02),paper,[0,h/2,.002]);
 if(!artMaps.has(kind))artMaps.set(kind,artwork(kind));mesh(g,new T.PlaneGeometry(w-.033,h-.033),new T.MeshBasicMaterial({map:artMaps.get(kind)}),[0,h/2,.014]);return g;}
function lamp(parent,old){const g=new T.Group();g.name=old.name;g.position.copy(old.position);old.removeFromParent();parent.add(g);
 const body=new T.MeshLambertMaterial({color:0xf4f3ed}),metal=new T.MeshLambertMaterial({color:0x777b74});body.name='Lamp enamel';metal.name='Lamp brushed metal';surfaceFinish(metal,'metal');
 mesh(g,new T.CylinderGeometry(.078,.082,.019,40),body,[0,.014,0]);for(const z of [-.011,.011]){rod(g,[0,.029,z],[.025,.295,z],.004,metal);rod(g,[.025,.295,z],[-.18,.46,.035+z],.004,metal);}for(const p of [[0,.038,0],[.025,.295,0],[-.18,.46,.035]]){const o=mesh(g,new T.CylinderGeometry(.013,.013,.038,24),metal,p);o.rotation.x=Math.PI/2;}
 const shade=new T.Group();shade.position.set(-.18,.46,.035);shade.quaternion.setFromUnitVectors(v(0,-1,0),v(-.26,-1,.6).normalize());g.add(shade);
 const shadeGeo=new T.CylinderGeometry(.027,.076,.095,48,1,true),normals=shadeGeo.attributes.normal,colors=[];for(let i=0;i<normals.count;i++){const light=.87+.13*(normals.getX(i)*-.4+normals.getZ(i)*.6);colors.push(light,light,light);}shadeGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));const enamel=body.clone();enamel.vertexColors=true;enamel.side=T.DoubleSide;mesh(shade,shadeGeo,enamel,[0,-.027,0]);
 const topRing=mesh(shade,new T.TorusGeometry(.027,.0006,5,36),ink,[0,.0205,0]);topRing.rotation.x=Math.PI/2;
 const rim=mesh(shade,new T.TorusGeometry(.076,.0012,6,48),metal,[0,-.0745,0]);rim.rotation.x=Math.PI/2;
 const bulb=mesh(shade,new T.CircleGeometry(.063,40),new T.MeshBasicMaterial({color:0xfff0cb}),[0,-.067,0]);bulb.rotation.x=Math.PI/2;bulb.name='Desk bulb';bulb.visible=false;
 const point=new T.Object3D();point.name='Desk light origin';point.position.set(0,-.079,0);shade.add(point);const aim=new T.Object3D();aim.name='Desk light aim';aim.position.set(0,-.5,0);shade.add(aim);return g;}
function refineDuvet(bed){
 const quilt=bed.getObjectByName('BedDuvet_V23');if(!quilt)return;quilt.clear();
 const fabric=new T.MeshBasicMaterial({color:0xf8f7f2,side:T.DoubleSide});fabric.name='PR / paper';
 const stitches=new T.MeshBasicMaterial({color:0x999c97});stitches.name='PR / faint';
 const seam=new T.MeshBasicMaterial({color:0x74786e});seam.name='PR / pencil';
 const cloth=(x,z)=>[x,.492-.08*(Math.abs(x)/.71)**16-.065*(Math.max(0,z)/.99)**20+.004*Math.sin(x*22-z*5)+.003*Math.cos(z*20)*Math.sin(x*8),z];
 const geo=new T.PlaneGeometry(1.42,1.59,48,56);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position;
 for(let i=0;i<pos.count;i++)pos.setXYZ(i,...cloth(pos.getX(i),pos.getZ(i)+.195));geo.computeVertexNormals();mesh(quilt,geo,fabric);
 for(const x of [-.70,-.5,-.3,-.1,.1,.3,.5,.70])curve(quilt,Array.from({length:45},(_,j)=>{const p=cloth(x,-.60+1.59*j/44);p[1]+=.0012;return p;}),.00065,stitches);
 for(const z of [-.59,-.4,-.2,0,.2,.4,.6,.8,.98])curve(quilt,Array.from({length:41},(_,i)=>{const p=cloth(-.7+1.4*i/40,z);p[1]+=.0012;return p;}),.00065,stitches);
 for(const x of [-.709,.709])curve(quilt,Array.from({length:45},(_,j)=>cloth(x,-.60+1.59*j/44)),.001,seam);
 for(const z of [-.60,.99])curve(quilt,Array.from({length:41},(_,i)=>cloth(-.71+1.42*i/40,z)),.001,seam);
 batch(quilt);
}
export function refineRoom(room){const find=s=>room.children.find(o=>o.name.replace(/[^a-z0-9]/gi,'')===s);const oldlamp=find('Desktasklamp001');lamp(room,oldlamp);refineDuvet(find('BedV23'));
 const oldcup=find('Pencilcup001');const cup=new T.Group();cup.position.copy(oldcup.position);cup.name=oldcup.name;oldcup.removeFromParent();room.add(cup);mesh(cup,new T.CylinderGeometry(.046,.041,.105,40,1,true),paper,[0,.055,0]);mesh(cup,new T.CircleGeometry(.043,32),ink,[0,.02,0]).rotation.x=-Math.PI/2;const lip=mesh(cup,new T.TorusGeometry(.046,.0008,5,40),ink,[0,.108,0]);lip.rotation.x=Math.PI/2;
 for(const x of [-.043,.043])rod(cup,[x,.016,0],[x,.105,0],.0006);
 for(let i=0;i<4;i++){const g=new T.Group();g.position.set((i-1.5)*.016,.055,(i%2?-.009:.008));g.rotation.z=(i-1.5)*.065;cup.add(g);mesh(g,new T.CylinderGeometry(.003,.003,.17+i*.01,6),i===3?ink:new T.MeshBasicMaterial({color:0x929684}),[0,.095,0]);mesh(g,new T.ConeGeometry(.003,.019,6),new T.MeshBasicMaterial({color:0xc3b18c}),[0,.19+i*.005,0]);mesh(g,new T.ConeGeometry(.001,.006,6),ink,[0,.2+i*.005,0]);rod(g,[.002,.045,0],[.002,.18,0],.0003);}batch(cup);
 const ep=find('Entryplant001');const p=ep.position.clone();ep.removeFromParent();plant(room,p.toArray(),.8);
 const night=find('Bedsidecabinet001');removeRegion(night,p=>p.x>-.005&&p.x<.2&&p.y>.419);plant(night,[.085,.422,.005],.65);
 const shelf=find('BookcaseV21');removeRegion(shelf,p=>p.x>.12&&p.x<.36&&((p.y>1.67&&p.y<1.98)||(p.y>1.47&&p.z>.15)||(p.y>1.008&&p.y<1.255&&p.z>0)));plant(shelf,[.225,1.675,.075],.8);frame(shelf,[.24,1.01,.062],.18,.24);
 const win=find('WindowV21');removeRegion(win,p=>p.x>-.54&&p.x<-.22&&p.y>1.9&&p.y<2.42&&p.z>.25);plant(win,[-.38,2.12,.38],.86);for(const dx of [-.046,.046])rod(win,[-.38+dx,2.19,.38],[-.38,2.56,.38],.00065);
 
 const botanical=find('Botanicalwallprint001');botanical.clear();frame(botanical,[0,0,0],.43,.64);
 const ws=find('Wallshelf0001');if(ws){removeRegion(ws,p=>p.x>.27&&p.y>.021);frame(ws,[.39,.02,.016],.20,.27);}
 const landscape=find('Bedwalllandscape001');if(landscape){landscape.clear();frame(landscape,[0,0,0],.49,.65,'landscape');}
 const gallery=find('PhotowallV21');if(gallery){gallery.clear();curve(gallery,[[ -.76,.445,.035],[0,.35,.035],[.76,.445,.035]],.0011);for(let i=0;i<3;i++){const x=(i-1)*.49,y=.35+.095*(x/.79)**2;const f=frame(gallery,[x,y-.40,.04],.34,.40,i===2?'botanical':'landscape');f.rotation.z=[-.025,.015,.035][i];mesh(gallery,new T.BoxGeometry(.015,.049,.014),paper,[x,y,.065]);mesh(gallery,new T.BoxGeometry(.003,.018,.016),ink,[x,y+.005,.066]);}}
 const peg=find('Pegboard001');if(peg){peg.clear();mesh(peg,new T.BoxGeometry(.71,.60,.025),paper);for(let i=0;i<10;i++)for(let j=0;j<8;j++)mesh(peg,new T.CircleGeometry(.0028,8),ink,[-.31+i*.069,-.25+j*.071,.013]);for(let i=0;i<3;i++){const g=new T.Group();g.position.set(-.22+i*.21,.05+(i%2)*.05,.025);g.rotation.z=(i-1)*.055;peg.add(g);frame(g,[0,-.09,0],.16,.20,i===2?'botanical':'landscape');mesh(g,new T.BoxGeometry(.025,.015,.014),ink,[0,.11,.02]);} }
 if(peg)batch(peg);
 // The heater was in the door's swing. Keep it against the entry cabinet.
 const heater=find('Heaterconsole001');if(heater)heater.position.set(-.48,0,1.62);
 room.updateMatrixWorld(true);
 return{lamp:oldlamp.name,plants:4};
}

