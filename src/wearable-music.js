import * as T from 'three';
import {musicTracks,playlistUrl} from './content/music.js';
const ease=t=>t*t*(3-2*t),clamp=T.MathUtils.clamp;
export function createWearableMusic({root,room,player,camera,isFirst,onEnter,onReturn,reduceMotion}){
 let wear;root.traverse(o=>{if(o.name.replace(/[^a-z0-9]/gi,'')==='XM5wearableV23')wear=o;});
 if(!wear)throw Error('XM5 wearable missing');room.attach(wear);
 // Keep the empty stand easy to aim at after the headphones leave it.
 const standTarget=new T.Mesh(new T.CylinderGeometry(.065,.065,.23,12),new T.MeshBasicMaterial({visible:false}));standTarget.name='Headphone stand interaction';standTarget.position.y=.12;root.add(standTarget);
 const saved={p:wear.position.clone(),q:wear.quaternion.clone(),s:wear.scale.clone()};
 const head=player.getObjectByName('mixamorigHead')||player.getObjectByName('Head');
 let worn=false,motion=null,time=0,from,context,analyser,playing=false,loading=false,message='',index=0,waveTime=0,playRequest=0,loadTimer;
 const tracks=[...musicTracks];
 const panel=document.createElement('section');panel.id='music-player';panel.hidden=true;panel.setAttribute('aria-label','随身音乐播放器');
 panel.innerHTML='<div class="music-now"><div class="music-wave" aria-hidden="true">'+Array.from({length:12},()=>'<i></i>').join('')+'</div><div><small>WH-1000XM5</small><p id="track-title"></p></div></div><div class="music-buttons"><button id="music-prev" aria-label="上一首">‹</button><button id="music-toggle" aria-label="播放或暂停">暂停</button><button id="music-next" aria-label="下一首">›</button><label class="music-file" title="选择本地音乐，不会上传">＋ 音乐<input type="file" accept="audio/*" multiple hidden></label></div><small class="music-help">M 暂停 · [ / ] 切歌 · Esc 显示鼠标</small><audio hidden></audio>';
 panel.insertAdjacentHTML('beforeend',`<p class="music-status" role="status"></p><div class="music-links"><a id="music-source" target="_blank" rel="noopener noreferrer">网易云原曲 ↗</a><a href="${playlistUrl}" target="_blank" rel="noopener noreferrer">我的歌单 ↗</a></div>`);
 document.body.append(panel);const audio=panel.querySelector('audio'),localAudio=new Audio(),bars=[...panel.querySelectorAll('.music-wave i')],samples=new Uint8Array(128);
 audio.preload='none';localAudio.preload='none';
 // NetEase public audio has no CORS permission for Web Audio analysis.
 // Keep remote playback on the native media path; local files can use the analyser.
 const currentAudio=()=>tracks[index].remote?audio:localAudio;
 function ready(){if(tracks[index].remote)return Promise.resolve();if(!context){context=new AudioContext();analyser=context.createAnalyser();analyser.fftSize=256;analyser.smoothingTimeConstant=.75;analyser.connect(context.destination);context.createMediaElementSource(localAudio).connect(analyser);}return context.resume();}
 function label(){const t=tracks[index];panel.querySelector('#track-title').textContent=t.name;panel.querySelector('#track-title').title=t.name+(t.artist?' · '+t.artist:'');panel.querySelector('.music-status').textContent=message||(loading?'正在连接网易云…':t.artist||'本地音乐');panel.querySelector('#music-toggle').textContent=loading?'取消':playing?'暂停':'播放';panel.dataset.playing=String(playing);const link=panel.querySelector('#music-source');link.hidden=!t.link;if(t.link)link.href=t.link;}
 function pause(){playRequest++;clearTimeout(loadTimer);audio.pause();localAudio.pause();playing=false;loading=false;message='';context?.suspend();label();}
 function failed(request){if(request!==playRequest)return;pause();message='暂时无法播放，请重试或到网易云收听';label();}
 async function play(){const request=++playRequest;clearTimeout(loadTimer);loading=true;playing=false;message='';label();const t=tracks[index],media=currentAudio();loadTimer=setTimeout(()=>failed(request),18000);try{await ready();if(request!==playRequest)return;if(media.getAttribute('src')!==t.url)media.src=t.url;media.volume=.6;await media.play();if(request!==playRequest)return;clearTimeout(loadTimer);loading=false;playing=true;label();}catch{failed(request);}}
 function step(delta){pause();index=(index+delta+tracks.length)%tracks.length;void play();}
 panel.querySelector('#music-toggle').onclick=()=>playing||loading?pause():void play();panel.querySelector('#music-prev').onclick=()=>step(-1);panel.querySelector('#music-next').onclick=()=>step(1);
 for(const media of [audio,localAudio]){media.onended=()=>{if(media===currentAudio()&&playing)step(1)};media.onerror=()=>{if(media===currentAudio()&&(playing||loading))failed(playRequest)};media.onwaiting=()=>{if(media===currentAudio()&&playing){playing=false;loading=true;label();loadTimer=setTimeout(()=>failed(playRequest),18000)}};media.onplaying=()=>{if(media===currentAudio()&&(loading||playing)){clearTimeout(loadTimer);loading=false;playing=true;label()}};}
 panel.querySelector('input').onchange=e=>{const files=[...e.target.files];if(!files.length)return;pause();index=tracks.length;for(const file of files)tracks.push({name:file.name,url:URL.createObjectURL(file)});e.target.value='';void play();};
 function headPose(){const p=head.getWorldPosition(new T.Vector3());p.y+=.028;return{p,q:player.getWorldQuaternion(new T.Quaternion()),s:new T.Vector3(2.25,2.05,2)}}
 function begin(){if(motion)return;ready().catch(()=>{});motion=worn?'off':'on';time=0;from={p:wear.position.clone(),q:wear.quaternion.clone(),s:wear.scale.clone()};wear.userData.firstPersonHidden=false;wear.visible=true;onEnter('headphones-changing');if(worn)pause();}
 function reset(){pause();worn=false;motion=null;panel.hidden=true;wear.position.copy(saved.p);wear.quaternion.copy(saved.q);wear.scale.copy(saved.s);wear.userData.firstPersonHidden=false;wear.visible=true;}
 function render(dt){
  if(motion){time+=dt;const t=clamp(time/(reduceMotion?.15:1.1),0,1),middle={p:new T.Vector3(0,-.21,-.43).applyQuaternion(camera.quaternion).add(camera.position),q:camera.quaternion.clone(),s:new T.Vector3(1.1,1.1,1.1)},end=motion==='on'?headPose():saved;
   const a=t<.48?from:middle,b=t<.48?middle:end,f=ease(t<.48?t/.48:(t-.48)/.52);wear.position.lerpVectors(a.p,b.p,f);wear.quaternion.slerpQuaternions(a.q,b.q,f);wear.scale.lerpVectors(a.s,b.s,f);
   if(t===1){worn=motion==='on';motion=null;panel.hidden=!worn;if(worn)void play();onReturn();}
  }else if(worn){const pose=headPose();wear.position.copy(pose.p);wear.quaternion.copy(pose.q);wear.scale.copy(pose.s);}
  wear.userData.firstPersonHidden=worn&&!motion;wear.visible=!(wear.userData.firstPersonHidden&&isFirst());
  waveTime+=dt;if(worn&&waveTime>.05){waveTime=0;if(!tracks[index].remote)analyser?.getByteFrequencyData(samples);bars.forEach((b,i)=>{const level=tracks[index].remote?.25+.55*Math.abs(Math.sin(audio.currentTime*3+i*.8)):Math.max(.1,(samples[i+1]||0)/180);b.style.transform=`scaleY(${playing&&!reduceMotion?level:.1})`});}
 }
 function keys(e){if(!worn||motion||e.repeat||e.target.matches('input,textarea'))return false;if(e.code==='KeyM'){playing||loading?pause():void play()}else if(e.code==='BracketRight')step(1);else if(e.code==='BracketLeft')step(-1);else return false;e.preventDefault();return true;}
 label();return{begin,render,reset,keys,get root(){return wear},get active(){return !!motion},get worn(){return worn},get state(){return{worn,motion,playing,loading,message,currentTime:currentAudio().currentTime,track:index,title:tracks[index].name,count:tracks.length,position:wear.position.toArray()}}};
}
