import React, { useEffect, useRef, useState } from 'react';
import { createRoom } from './room.js';

function Icon({name,...props}) {
  const paths={
    door:<><path d="M5 21V3l12-1v20M2 21h19M13 12h1"/><path d="M7 5l8-1v15" opacity=".3"/></>,
    arrow:<path d="M3 12h17m-6-6 6 6-6 6"/>,
    close:<path d="m5 5 14 14M19 5 5 19"/>,
    sound:<><path d="M4 9h4l5-4v14l-5-4H4zM17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></>,
    mute:<><path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6m0-6-5 6"/></>,
    sun:<><circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></>,
    grid:<><rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><rect x="15" y="15" width="6" height="6"/></>,
    plant:<><path d="M12 22V11C4 13 2 7 3 4c7 0 10 2 9 8 0-6 4-9 9-8 0 6-3 10-9 9M7 21h10M5 6l7 6m7-6-7 7"/></>,
    chevron:<path d="m9 5 7 7-7 7"/>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]||paths.arrow}</svg>;
}

const sections={projects:'作品',photos:'摄影',about:'关于我'};
function AtlasArt({cell,className='',...props}) {
  return <div className={`atlas-art cell-${cell} ${className}`} role="img" {...props}/>;
}
function PostcardArt({index}) {
  const regions=['1090 643 144 167','1324 641 122 150','1231 797 84 122'];
  return <svg className="postcard-image" viewBox={regions[index]} preserveAspectRatio="xMidYMid slice" role="img" aria-label={['生成的海景线稿','生成的山景线稿','生成的植物线稿'][index]}><image href="/assets/sketch-atlas.png" width="1536" height="1024"/></svg>;
}

function SoundSketch() {
  const context=useRef(null);
  const [played,setPlayed]=useState([]);
  const notes=[['C',261.63],['D',293.66],['E',329.63],['G',392],['A',440]];
  useEffect(()=>()=>{context.current?.close();},[]);
  async function play(i){
    const audio=context.current ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==='suspended')await audio.resume();
    const osc=audio.createOscillator(),gain=audio.createGain();
    osc.type='sine';osc.frequency.value=notes[i][1];
    gain.gain.setValueAtTime(.0001,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.15,audio.currentTime+.015);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+1.2);
    osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+1.3);
    setPlayed(old=>[...old.slice(-11),notes[i][0]]);
  }
  return <div className="sound-sketch">
    <div className="sound-caption"><span>五个音，随手写一句。</span><small>可体验的原型示例</small></div>
    <div className="keys">{notes.map(([name],i)=><button key={name} onClick={()=>play(i)} aria-label={`弹奏 ${name} 音`}><span>{name}</span><small>{i+1}</small></button>)}</div>
    <div className="melody" aria-live="polite">{played.length?played.join(' · '):'你的旋律会留在这里。'}</div>
  </div>;
}

function Notebook() {
  const [note,setNote]=useState(()=>{try{return localStorage.getItem('paper-room-note')||'';}catch{return '';}});
  const [saved,setSaved]=useState(false);
  function save(){try{localStorage.setItem('paper-room-note',note);setSaved(true);}catch{setSaved(false);}}
  return <div className="notepad">
    <label htmlFor="little-note">先给这间房留一句话。</label>
    <textarea id="little-note" maxLength={350} value={note} placeholder="比如：希望这里以后有一整面照片墙……" onChange={e=>{setNote(e.target.value);setSaved(false);}}/>
    <div className="note-bottom"><small>仅保存在这台浏览器，不会发送。</small><button className="text-button" onClick={save}>{saved?'已经记下了':'收进笔记本'}<Icon name="arrow"/></button></div>
  </div>;
}

function Projects({openDemo,onDemo}) {
  return <>
    <div className="panel-heading"><span className="page-no">01 / WORKS</span><h2>一些想法，<br/>一些小小的实现。</h2><p>这里将放你的真实项目。先用一个能玩的声音实验，试试作品的打开方式。</p></div>
    <button className={`project-row ${openDemo?'selected':''}`} onClick={()=>onDemo(!openDemo)} aria-expanded={openDemo}>
      <span className="project-num">01</span><div className="project-text"><h3>给今天写一小段旋律</h3><p>交互实验 · 为这个原型制作的示例</p></div><span className="project-action">{openDemo?'收起':'试试看'}<Icon name="arrow"/></span>
    </button>
    {openDemo&&<SoundSketch/>}
    <div className="future-page"><Icon name="plant"/><p>下一件作品，还在生长。<small>你的程序、游戏、研究，都可以住进这里。</small></p></div>
  </>;
}

function Photos(){
  const [selected,setSelected]=useState(null);
  return <>
    <div className="panel-heading"><span className="page-no">02 / MOMENTS</span><h2>把路过的瞬间，<br/>留在这里。</h2><p>以后这里会放你拍摄的照片。现在用三张生成的手绘明信片，预览相册的感觉。</p></div>
    <div className="postcards">{['看海','山间','一片叶子'].map((name,i)=><button className={`postcard postcard-${i}`} key={name} onClick={()=>setSelected(i)} aria-label={`放大示例插画：${name}`}><PostcardArt index={i}/><span>{name}</span><small>生成插画 · 示例</small></button>)}</div>
    <p className="gallery-note">点击一张，慢慢看。<span>真实照片尚未导入</span></p>
    {selected!==null&&<div className="photo-enlarged"><button className="lightbox-close" onClick={()=>setSelected(null)} aria-label="关闭放大插画"><Icon name="close"/></button><PostcardArt index={selected}/><span>{['看海','山间','一片叶子'][selected]}</span><small>生成插画 · 相册交互示例</small><div className="photo-arrows"><button onClick={()=>setSelected((selected+2)%3)}>上一张</button><button onClick={()=>setSelected((selected+1)%3)}>下一张</button></div></div>}
  </>;
}

function About(){return <>
  <div className="panel-heading"><span className="page-no">03 / A LITTLE ABOUT ME</span><h2>这间房，<br/>慢慢变成我的样子。</h2><p>做过的东西、拍下的照片，还有那些没有完成的小念头，都可以在这里有一个位置。</p></div>
  <div className="about-line"><AtlasArt cell={3} aria-label="手绘盆栽"/><div><h3>介绍先留白，故事等你来写。</h3><p>这一版先搭好空间。姓名、经历和联系方式，等真实内容整理好后再放进来。</p></div></div>
  <Notebook/>
</>;}

function Index({onSelect}) {
  const [filter,setFilter]=useState('all');
  const items=[{key:'projects',number:'01',title:'作品与实验',description:'程序、游戏，还有从想法到实现的过程。',cell:0},{key:'photos',number:'02',title:'摄影与片刻',description:'走过的路，遇见的光，想留住的瞬间。',cell:1},{key:'about',number:'03',title:'关于我',description:'一页介绍，和一本还在写的笔记。',cell:2}];
  return <>
    <div className="panel-heading"><span className="page-no">THE INDEX</span><h2>房间里的东西，<br/>都在这里。</h2><p>不着急探索，也可以直接翻目录。</p></div>
    <div className="index-tabs" role="tablist" aria-label="内容分类">{[['all','全部'],['projects','作品'],['photos','摄影'],['about','关于']].map(([key,label])=><button key={key} role="tab" aria-selected={filter===key} onClick={()=>setFilter(key)}>{label}</button>)}</div>
    <div className="index-list">{items.filter(item=>filter==='all'||filter===item.key).map(item=><button key={item.key} onClick={()=>onSelect(item.key)}><span className="index-number">{item.number}</span><AtlasArt cell={item.cell} aria-label={item.title}/><div><h3>{item.title}</h3><p>{item.description}</p></div><Icon name="arrow"/></button>)}</div>
    <p className="prototype-note">空间体验原型 · 内容暂为示例，尚未导入个人资料。</p>
  </>;
}

function PaperDialog({section,onClose,onSelect}) {
  const dialog=useRef(null);
  const [demo,setDemo]=useState(false);
  useEffect(()=>{const d=dialog.current;d.showModal();return()=>d.close();},[]);
  useEffect(()=>setDemo(false),[section]);
  return <dialog ref={dialog} className={`paper-dialog ${section==='photos'?'gallery-dialog':''}`} aria-label={section==='index'?'全部内容目录':sections[section]} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="paper-sheet"><div className="sheet-top"><span>一间自己的房间 / {section==='index'?'目录':sections[section]}</span><button className="close-button" onClick={onClose} aria-label="合上这一页"><span>合上</span><Icon name="close"/></button></div>
      <div className="sheet-body">{section==='index'?<Index onSelect={onSelect}/>:section==='projects'?<Projects openDemo={demo} onDemo={setDemo}/>:section==='photos'?<Photos/>:<About/>}</div>
      <div className="sheet-bottom"><Icon name="plant"/><span>不赶路，慢慢来。</span><span>{section==='projects'?'01':section==='photos'?'02':section==='about'?'03':'00'}</span></div>
    </div>
  </dialog>;
}

export default function App(){
  const canvas=useRef(null),engine=useRef(null),anchorElements=useRef({});
  const [phase,setPhase]=useState('outside'),[ready,setReady]=useState(false),[error,setError]=useState(''),[hover,setHover]=useState(null),[panel,setPanel]=useState(null),[sound,setSound]=useState(false),[light,setLight]=useState(false),[toast,setToast]=useState('');
  const [help,setHelp]=useState(false);
  useEffect(()=>{
    engine.current=createRoom(canvas.current,{
      onPhase:setPhase,onReady:()=>setReady(true),onError:setError,onHover:setHover,onOpen:setPanel,onLight:setLight,onToast:setToast,
      onAnchors:points=>{for(const [key,p] of Object.entries(points)){const el=anchorElements.current[key];if(el){el.style.left=`${innerWidth<700&&['projects','photos','about'].includes(key)?Math.max(el.offsetWidth/2+10,Math.min(innerWidth-el.offsetWidth/2-10,p.x)):p.x}px`;el.style.top=`${p.y}px`;}}},
    });
    return()=>engine.current?.dispose();
  },[]);
  useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),3600);return()=>clearTimeout(id);},[toast]);
  useEffect(()=>{
    function key(e){if(panel||e.target.tagName==='BUTTON')return;if(e.key==='Enter'&&phase==='outside'&&ready)engine.current?.enter();if(e.key==='Escape'&&phase==='inside')engine.current?.leave();}
    document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);
  },[panel,phase,ready]);
  const outside=phase==='outside';
  const inside=['inside','focusing','focused','returning'].includes(phase);
  const traveling=['opening','entering','sitting','leaving'].includes(phase);
  function openSection(key){if(phase==='inside')engine.current?.focus(key);else setPanel(key);}
  function closePanel(){setPanel(null);engine.current?.resetFocus();}
  function toggleSound(){const value=!sound;setSound(value);engine.current?.setSound(value);}
  return <div className={`app phase-${phase} ${light?'sun-is-in':''}`}>
    <canvas ref={canvas} className="room-canvas" aria-label="手绘三维工作室，可通过页面按钮进入并浏览作品"/>
    <div className="paper-grain" aria-hidden="true"/>
    <header className="site-header">
      <button className="wordmark" aria-label={inside?'回到门外':'一间自己的房间'} onClick={()=>{if(inside)engine.current?.leave();else setHelp(!help);}}><Icon name="door"/><div><h1>一间自己的房间</h1><span>A ROOM OF MY OWN</span></div></button>
      <div className="header-actions"><button className="sound-button" onClick={toggleSound} aria-label={sound?'关闭交互音效':'开启交互音效'} aria-pressed={sound}><Icon name={sound?'sound':'mute'}/><span>声音{sound?'开':'关'}</span></button><span className="header-rule"/><button className="index-button" onClick={()=>setPanel('index')}><Icon name="grid"/><span>全部作品</span></button></div>
    </header>
    {outside&&!error&&<>
      <div className="door-sign" ref={el=>anchorElements.current.door=el}><span className="tape"/><Icon name="plant"/><span>进来坐坐</span><small>MAKE YOURSELF AT HOME</small></div>
      <button className="door-knock" ref={el=>anchorElements.current.knob=el} disabled={!ready} onClick={()=>engine.current?.enter()} aria-label="打开门，进入工作室"><span className="knock-circle"/><span className="knock-note">{ready?'轻轻推开这扇门':'正在整理房间…'}<svg viewBox="0 0 100 38" aria-hidden="true"><path d="M94 8C65 36 29 24 7 13m9-4L7 13l7 10"/></svg></span></button>
      <div className="entrance-caption"><p>门后，是一些我喜欢的事。</p><button className="enter-button" disabled={!ready} onClick={()=>engine.current?.enter()}>{ready?'推门看看':'正在整理房间'}<Icon name="arrow"/></button><small>点击门把手，或按 Enter 进入</small></div>
    </>}
    {traveling&&<div className="journey-caption" aria-live="polite">{phase==='opening'?'咔哒。':phase==='leaving'?'下次再来坐坐。':phase==='sitting'?'拉开椅子，坐一会儿。':'欢迎来到，我的小小世界。'}</div>}
    {inside&&<>
      <div className="room-intro"><span className="tiny-line"/><p>坐下了，随手翻翻桌上的东西。</p></div>
      <div className={`object-labels ${phase!=='inside'?'hide-labels':''}`}>
        {Object.entries(sections).map(([key,label],i)=><button key={key} ref={el=>anchorElements.current[key]=el} className={`object-label ${hover===key?'is-hovered':''}`} disabled={phase!=='inside'} onClick={()=>openSection(key)}><small>0{i+1}</small><span>{label}</span><Icon name="arrow"/></button>)}
      </div>
      <nav className="room-nav" aria-label="房间里的物件">{Object.entries(sections).map(([key,label],i)=><button key={key} disabled={phase!=='inside'} onClick={()=>openSection(key)}><span>0{i+1}</span>{label}</button>)}</nav>
      <div className="room-tools"><button onClick={()=>engine.current?.toggleLight()} aria-pressed={light}><Icon name="sun"/><span>{light?'收起一点阳光':'让阳光进来'}</span></button><button onClick={()=>engine.current?.leave()} disabled={phase!=='inside'}><Icon name="door"/><span>回到门外</span></button></div>
    </>}
    <footer className="site-footer"><span className="location"><i/>{outside?'此刻，在门外':traveling?'正在靠近…':'此刻，在工作室'}</span><span className="footer-center">作品 · 摄影 · 日常</span><button className="help-button" onClick={()=>setHelp(!help)} aria-expanded={help}>怎么玩 <span>?</span></button></footer>
    {help&&<aside className="help-panel"><button aria-label="关闭提示" onClick={()=>setHelp(false)}><Icon name="close"/></button><h2>这里没有标准路线。</h2><p>点击门，走进房间。<br/>电脑里是作品，相机里是摄影，<br/>笔记本里是关于我的故事。</p><p>也可以直接打开「全部作品」。<br/>按 Esc 合上页面或回到门外。</p><small>这是空间原型，内容暂为示例。</small></aside>}
    {error&&<div className="error-state"><p>{error}</p><button className="enter-button" onClick={()=>setPanel('index')}>打开内容目录<Icon name="arrow"/></button></div>}
    {toast&&<div className="toast" role="status"><Icon name="plant"/>{toast}</div>}
    {panel&&<PaperDialog section={panel} onClose={closePanel} onSelect={setPanel}/>}
  </div>;
}
