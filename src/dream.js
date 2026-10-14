import './dream.css';
// Lightweight dream: no extra model, video, or photograph downloads.
export function createDream(dream){
 const pages=[
  {title:'一座会呼吸的城',line:'如果建筑也能像树一样生长。',art:'M30 150V83H63V150M68 150V57H103V150M111 150V99H145V150M84 57V30M84 39Q45 14 39 42Q70 64 84 39M86 34Q109 6 132 22Q130 52 86 34M24 153H154'},
  {title:'一封寄给明天的信',line:'有些答案，晚一点到也没关系。',art:'M22 75L88 36L155 75V144H22ZM22 75L88 119L155 75M22 144L66 106M155 144L110 106M69 69H108M63 80H114M70 91H106'},
  {title:'一片没有尽头的海',line:'把多余的声音，轻轻留在岸边。',art:'M18 98Q38 83 58 98T98 98T138 98T178 98M18 119Q38 104 58 119T98 119T138 119T178 119M18 140Q38 125 58 140T98 140T138 140T178 140M88 82V37L123 78ZM88 37L53 78H88M66 84H112L103 92H75Z'}
 ];
 dream.innerHTML='<div class="dream-sky" aria-hidden="true"><span class="dream-orbit"></span>'+Array.from({length:25},(_,i)=>'<i style="--x:'+((i*37+7)%97)+'%;--y:'+((i*23+11)%91)+'%;--s:'+(i%3+1)+'px"></i>').join('')+'</div><div class="dream-intro"><small>A ROOM BEYOND / 另一页</small><h1>还没发生的地方</h1><p>把白天没写完的想法，留在夜里。</p></div><div class="dream-pages">'+pages.map((p,i)=>'<button class="dream-paper" aria-expanded="false" style="--tilt:'+[-8,3,9][i]+'deg;--delay:'+i*-.8+'s"><span class="paper-number">0'+(i+1)+'</span><svg viewBox="0 0 190 190" aria-hidden="true"><path d="'+p.art+'"/></svg><span class="dream-paper-title">'+p.title+'</span></button>').join('')+'</div><p class="dream-instruction">点一张漂浮的纸，看看它会去哪里。</p><div class="dream-reading" hidden><p></p><button class="dream-fold">收起纸页</button></div><button id="wake-up">醒来，回到房间 ↗</button>';
 const reading=dream.querySelector('.dream-reading'),cards=[...dream.querySelectorAll('.dream-paper')];
 function fold(){cards.forEach(c=>{c.classList.remove('chosen');c.setAttribute('aria-expanded','false');});reading.hidden=true;}
 cards.forEach((card,i)=>card.onclick=()=>{fold();card.classList.add('chosen');card.setAttribute('aria-expanded','true');reading.querySelector('p').textContent=pages[i].line;reading.hidden=false;});
 dream.querySelector('.dream-fold').onclick=fold;
 return{reset:fold};
}
