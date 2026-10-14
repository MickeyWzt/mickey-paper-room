import photos from './content/photos.json';
import './photo-album.css';

// The catalogue is tiny; image requests start only when the camera is picked up.
export function createPhotoAlbum(onChange){
 let index=0,started=false,generation=0;const cache=new Map(),pending=new Map();
 const dialog=document.createElement('dialog');dialog.id='photo-viewer';dialog.setAttribute('aria-label','摄影相册');
 dialog.innerHTML='<div class="album-top"><span>相机里的片刻</span><div><button id="album-grid-toggle">全部照片</button><button id="album-close" aria-label="返回相机">返回相机 <kbd>Esc</kbd></button></div></div><div class="album-stage"><button id="album-prev" aria-label="上一张">←</button><figure><img id="album-image" alt=""><figcaption><span id="album-date"></span><span id="album-count"></span></figcaption></figure><button id="album-next" aria-label="下一张">→</button></div><div class="album-grid" hidden></div><p id="album-message" role="status"></p>';
 document.body.append(dialog);const $=s=>dialog.querySelector(s),grid=$('.album-grid');
 function trim(){for(const [key,image] of cache){const keep=[index,(index+1)%photos.length,(index-1+photos.length)%photos.length];if(!keep.includes(key)){image.close();cache.delete(key)}}}
 async function load(n){if(cache.has(n))return cache.get(n);if(pending.has(n))return pending.get(n);
  const p=(async()=>{try{const response=await fetch(photos[n].preview);if(!response.ok)throw Error('照片加载失败');const image=await createImageBitmap(await response.blob());cache.set(n,image);trim();return cache.get(n);}finally{pending.delete(n)}})();pending.set(n,p);return p;
 }
 function paintViewer(){if(!dialog.open)return;const p=photos[index];$('#album-image').alt='摄影作品 '+p.label;$('#album-image').src=p.full;$('#album-date').textContent=p.label;$('#album-count').textContent=(index+1)+' / '+photos.length;$('#album-message').textContent='正在载入清晰照片…';grid.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));}
 async function select(n){index=(n+photos.length)%photos.length;const token=++generation;onChange();paintViewer();try{await load(index);if(token!==generation)return;onChange();void load((index+1)%photos.length).catch(()=>{});}catch{if(token===generation){$('#album-message').textContent='这张照片暂时未能加载，请切换后重试。';onChange();}}}
 $('#album-image').onload=()=>$('#album-message').textContent='';$('#album-image').onerror=()=>$('#album-message').textContent='照片加载失败，请切换后重试。';
 function step(delta){void select(index+delta)}
 function showGrid(show){grid.hidden=!show;$('.album-stage').hidden=show;$('#album-grid-toggle').textContent=show?'返回单张':'全部照片';if(show&&!grid.childElementCount){photos.forEach((p,i)=>{const b=document.createElement('button');b.setAttribute('aria-label','查看第 '+(i+1)+' 张照片');b.innerHTML='<img loading="lazy" decoding="async" src="'+p.thumb+'" alt="'+p.label+'"><span>'+String(i+1).padStart(2,'0')+' · '+p.label+'</span>';b.onclick=()=>{showGrid(false);void select(i)};grid.append(b)})}}
 function open(){dialog.showModal();showGrid(false);paintViewer();$('#album-close').focus();}
 function close(){dialog.close();document.querySelector('#view-photo')?.focus()}
 $('#album-close').onclick=close;$('#album-grid-toggle').onclick=()=>showGrid(grid.hidden);$('#album-prev').onclick=()=>step(-1);$('#album-next').onclick=()=>step(1);
 dialog.addEventListener('cancel',e=>{e.preventDefault();close()});dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}if(e.key==='ArrowRight'){e.preventDefault();step(1)}});
 return{start(){if(!started){started=true;void select(index)}},step,open,close,get visible(){return dialog.open},get count(){return photos.length},get index(){return index},get current(){return {...photos[index],image:cache.get(index)}},get cacheSize(){return cache.size}};
}
