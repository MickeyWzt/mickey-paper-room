import {t} from './i18n.js';
const avatar=new Image();avatar.src='/assets/profile/avatar.jpg';avatar.onload=()=>document.dispatchEvent(new Event('room-avatar-ready'));
// Canvas artwork is shared by the physical monitor and the fullscreen boot
// view. Logo placement follows Microsoft's boot-screen proportions (38.2%).
export const BOOT_SECONDS=6.2;
let background;
export function computerWallpaper(){
 if(background)return background;
 background=document.createElement('canvas');background.width=1920;background.height=1080;
 const c=background.getContext('2d');
 const bg=c.createLinearGradient(0,0,1600,1080);bg.addColorStop(0,'#071733');bg.addColorStop(.48,'#072c66');bg.addColorStop(1,'#07162f');c.fillStyle=bg;c.fillRect(0,0,1920,1080);
 const glow=c.createRadialGradient(1050,460,0,1050,460,870);glow.addColorStop(0,'#1477d97a');glow.addColorStop(1,'#08204600');c.fillStyle=glow;c.fillRect(0,0,1920,1080);
 // Layered folded ribbons give the desktop a blue fabric wallpaper, generated
 // once and shared verbatim by the physical monitor and the HTML desktop.
 c.save();c.translate(1030,590);c.rotate(-.17);
 for(let i=22;i>=0;i--){
  const t=i/22,dx=t*260,dy=t*15;
  const g=c.createLinearGradient(-470+dx,-330,200+dx,340);g.addColorStop(0,'#67caff');g.addColorStop(.19,'#1c8ff0');g.addColorStop(.39,'#094aac');g.addColorStop(.57,'#032967');g.addColorStop(.73,'#258be1');g.addColorStop(.91,'#5cbeff');g.addColorStop(1,'#0c4ca5');
  c.beginPath();c.moveTo(-480+dx,-315+dy);c.bezierCurveTo(-180+dx,-565,-40+dx,-130,245+dx,-255);c.bezierCurveTo(560+dx,-410,365+dx,130,65+dx,178);c.bezierCurveTo(-120+dx,215,-210+dx,480,-420+dx,265);c.bezierCurveTo(-600+dx,95,-265+dx,-165,-480+dx,-315+dy);c.fillStyle=g;c.fill();c.strokeStyle='#81d0ff3b';c.lineWidth=1.2;c.stroke();
 }
 c.restore();return background;
}
export function drawComputerScreen(ctx,power,time=0,reduced=false){
 const w=ctx.canvas.width,h=ctx.canvas.height,unit=h/864;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#030406';ctx.fillRect(0,0,w,h);
 function logo(x,y,size,color='#0078d4'){ctx.fillStyle=color;const gap=size*.065,tile=(size-gap)/2;for(let a=0;a<2;a++)for(let b=0;b<2;b++)ctx.fillRect(x-size/2+a*(tile+gap),y-size/2+b*(tile+gap),tile,tile);}
 function wallpaper(){ctx.drawImage(computerWallpaper(),0,0,w,h);}
 function spinner(y,clock){ctx.save();ctx.translate(w/2,y);ctx.strokeStyle='#f2f5f9';ctx.lineWidth=2.3*unit;ctx.lineCap='round';const turn=reduced?0:clock*Math.PI*1.7,sweep=reduced?Math.PI*1.35:(.28+(Math.sin(clock*2.6)*.5+.5)*1.30)*Math.PI;ctx.beginPath();ctx.arc(0,0,12*unit,turn,turn+sweep);ctx.stroke();ctx.restore();}
 if(power==='off'){
  const reflection=ctx.createLinearGradient(0,0,w,h);reflection.addColorStop(0,'#11161c');reflection.addColorStop(.48,'#070a0e');reflection.addColorStop(1,'#030507');ctx.fillStyle=reflection;ctx.fillRect(0,0,w,h);return;
 }
 if(power==='booting'){
  if(time<.32)return;
  if(time<5.05){ctx.globalAlpha=Math.min(1,(time-.32)/.24,Math.max(0,(5.05-time)/.35));logo(w/2,h*.382,88*unit);if(time>1)spinner(h*.67,time-1);ctx.globalAlpha=1;return;}
  wallpaper();ctx.fillStyle='#3977b5';ctx.beginPath();ctx.arc(w/2,h*.41,40*unit,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e8f4ff';ctx.lineWidth=2*unit;ctx.beginPath();ctx.arc(w/2,h*.397,11*unit,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(w/2,h*.445,20*unit,Math.PI,0);ctx.stroke();ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font=`${22*unit}px "Segoe UI","Microsoft YaHei",sans-serif`;if(avatar.complete&&avatar.naturalWidth){ctx.save();ctx.beginPath();ctx.arc(w/2,h*.41,40*unit,0,Math.PI*2);ctx.clip();ctx.drawImage(avatar,w/2-40*unit,h*.41-40*unit,80*unit,80*unit);ctx.restore();}ctx.fillText(t('欢迎'),w/2,h*.53);spinner(h*.6,time);return;
 }
 if(power==='shutting-down'){spinner(h*.48,time);ctx.fillStyle='#f1f1f1';ctx.textAlign='center';ctx.font=`${20*unit}px "Segoe UI","Microsoft YaHei",sans-serif`;ctx.fillText(t('正在关机'),w/2,h*.55);return;}
 wallpaper();
 ['作品','关于我'].forEach((label,i)=>{const x=24*unit,y=(22+i*90)*unit;ctx.fillStyle=i===1?'#a2d5f7':'#d99919';ctx.fillRect(x,y,20*unit,10*unit);ctx.fillStyle=i===2?'#effaff':'#ffce55';ctx.fillRect(x,y+7*unit,40*unit,29*unit);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font=`${12*unit}px "Segoe UI","Microsoft YaHei",sans-serif`;ctx.fillText(t(label),x+20*unit,y+53*unit);});
 ctx.fillStyle='#e1eaf5';ctx.fillRect(0,h-48*unit,w,48*unit);logo(w/2-110*unit,h-24*unit,23*unit);ctx.fillStyle='#f8faff';ctx.beginPath();ctx.roundRect(w/2-85*unit,h-39*unit,150*unit,30*unit,15*unit);ctx.fill();ctx.fillStyle='#5d6670';ctx.textAlign='left';ctx.font=`${12*unit}px "Segoe UI","Microsoft YaHei",sans-serif`;ctx.fillText(t('⌕  搜索'),w/2-73*unit,h-20*unit);ctx.fillStyle='#ffce55';ctx.fillRect(w/2+84*unit,h-34*unit,27*unit,22*unit);ctx.fillStyle='#a2d5f7';ctx.fillRect(w/2+126*unit,h-35*unit,21*unit,25*unit);
}
