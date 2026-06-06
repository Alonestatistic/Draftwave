/* ============================================================
   Draftwave — transport bar (top, always visible)
   ============================================================ */

function DragNum({ value, onChange, min, max, step=1, fmt, w=54, big }) {
  const drag = React.useRef(null);
  const start = (e) => { e.preventDefault();
    drag.current = { y:e.clientY, v:value };
    const move = (ev) => { const dv = Math.round((drag.current.y - ev.clientY)/4)*step;
      onChange(clamp(+(drag.current.v+dv).toFixed(3), min, max)); };
    const up = () => { window.removeEventListener("pointermove",move); window.removeEventListener("pointerup",up); };
    window.addEventListener("pointermove",move); window.addEventListener("pointerup",up);
  };
  return <span className="mono no-sel" onPointerDown={start}
    style={{cursor:"ns-resize",width:w,textAlign:"center",fontSize:big?20:13,fontWeight:600,color:"var(--tx)",
      display:"inline-block",letterSpacing:big?"0":".02em"}}>{fmt?fmt(value):value}</span>;
}

/* BPM: click number to type, drag number vertically, or drag the slider */
function BpmControl({ value, onChange }) {
  const [editing,setEditing]=React.useState(false);
  const [draft,setDraft]=React.useState("");
  const sliderRef=React.useRef(null), dragging=React.useRef(false);
  const MIN=40,MAX=250;
  const commit=(raw)=>{ const n=parseInt((raw||"").replace(/[^0-9]/g,""),10);
    if(!isNaN(n)) onChange(clamp(n,MIN,MAX)); setEditing(false); };
  const startNumDrag=(e)=>{ if(editing)return; e.preventDefault();
    let moved=false; const y0=e.clientY,v0=value;
    const mv=(ev)=>{ if(Math.abs(ev.clientY-y0)>2)moved=true;
      onChange(clamp(Math.round(v0+(y0-ev.clientY)/3),MIN,MAX)); };
    const up=()=>{ window.removeEventListener("pointermove",mv);window.removeEventListener("pointerup",up);
      if(!moved){ setDraft(String(value)); setEditing(true); } };
    window.addEventListener("pointermove",mv); window.addEventListener("pointerup",up);
  };
  const slideTo=(clientX)=>{ const r=sliderRef.current.getBoundingClientRect();
    onChange(clamp(Math.round(MIN+((clientX-r.left)/r.width)*(MAX-MIN)),MIN,MAX)); };
  const startSlide=(e)=>{ e.preventDefault(); dragging.current=true; slideTo(e.clientX);
    const mv=(ev)=>dragging.current&&slideTo(ev.clientX);
    const up=()=>{ dragging.current=false; window.removeEventListener("pointermove",mv);window.removeEventListener("pointerup",up); };
    window.addEventListener("pointermove",mv); window.addEventListener("pointerup",up); };
  const pct=((value-MIN)/(MAX-MIN))*100;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,width:62}}>
      {editing
        ? <input autoFocus value={draft} onChange={e=>setDraft(e.target.value)}
            onBlur={()=>commit(draft)} onKeyDown={e=>{ if(e.key==="Enter")commit(draft); if(e.key==="Escape")setEditing(false); }}
            className="mono" style={{width:46,textAlign:"center",fontSize:20,fontWeight:600,background:"var(--bg-3)",
              border:"1px solid var(--cyan)",borderRadius:5,color:"var(--tx)",outline:"none",padding:"0 2px"}}/>
        : <span className="mono no-sel" onPointerDown={startNumDrag} title="Drag to change · click to type"
            style={{cursor:"ns-resize",fontSize:20,fontWeight:600,color:"var(--tx)",lineHeight:1}}>{value.toFixed(0)}</span>}
      <div ref={sliderRef} onPointerDown={startSlide} title="Drag to set tempo"
        style={{width:52,height:8,position:"relative",cursor:"ew-resize",display:"flex",alignItems:"center"}}>
        <div style={{position:"absolute",left:0,right:0,height:3,borderRadius:99,background:"var(--bg-4)"}}/>
        <div style={{position:"absolute",left:0,width:`${pct}%`,height:3,borderRadius:99,background:"var(--cyan)",boxShadow:"0 0 6px var(--cyan)"}}/>
        <div style={{position:"absolute",left:`calc(${pct}% - 5px)`,width:10,height:10,borderRadius:99,
          background:"var(--cyan)",boxShadow:"0 0 8px var(--cyan)",border:"2px solid var(--bg-1)"}}/>
      </div>
      <span className="faint" style={{fontSize:8.5,letterSpacing:".12em"}}>BPM</span>
    </div>
  );
}

function TransportButton({icon,on,onClick,color="var(--cyan)",glow,title}) {
  return (
    <button title={title} onClick={onClick} className="no-sel"
      style={{width:38,height:38,borderRadius:"var(--r-2)",display:"grid",placeItems:"center",transition:"all .14s",
        color: on?(color):"var(--tx-2)", background:on?`color-mix(in srgb,${color} 16%,transparent)`:"var(--bg-3)",
        border:`1px solid ${on?color:"var(--line)"}`,
        boxShadow: on&&glow?`0 0 16px ${color}55`:"var(--sh-1)"}}>
      {React.cloneElement(I[icon],{style:{width:18,height:18}})}
    </button>
  );
}

function ToolButton({icon,label,onClick,title,disabled,active,color="var(--cyan)"}) {
  return (
    <button title={title||label} onPointerDown={e=>e.stopPropagation()} onClick={onClick} disabled={disabled} className="no-sel"
      style={{height:30,minWidth:30,padding:"0 8px",borderRadius:"var(--r-2)",display:"inline-flex",alignItems:"center",gap:6,
        color:disabled?"var(--tx-4)":active?"#04121a":"var(--tx-2)",background:active?color:"var(--bg-3)",
        border:`1px solid ${active?color:"var(--line)"}`,
        fontSize:11,fontWeight:700,boxShadow:"var(--sh-1)",position:"relative",zIndex:3,pointerEvents:"auto"}}>
      {React.cloneElement(I[icon]||I.spark,{style:{width:14,height:14}})}
      {label && <span style={{whiteSpace:"nowrap"}}>{label}</span>}
    </button>
  );
}

function Transport(p) {
  const beatsPerBar = p.sig[0];
  const bar = Math.floor(p.position / beatsPerBar) + 1;
  const beat = Math.floor(p.position % beatsPerBar) + 1;
  const tick = Math.floor((p.position % 1) * 4) + 1;
  const secs = p.position * 60 / p.bpm;
  const mm = String(Math.floor(secs/60)).padStart(2,"0");
  const ss = String(Math.floor(secs%60)).padStart(2,"0");
  const ms = String(Math.floor((secs%1)*100)).padStart(2,"0");

  return (
    <header className="no-sel" style={{height:"var(--transport-h)",flex:"0 0 auto",display:"flex",alignItems:"flex-start",
      gap:14,padding:"8px 14px 0",background:"linear-gradient(var(--bg-3),var(--bg-2))",borderBottom:"1px solid var(--line-2)",
      position:"relative",zIndex:20}}>

      {/* logo + app menu */}
      <div style={{display:"flex",alignItems:"center",gap:9,paddingRight:6}}>
        <button className="iconbtn" onClick={(e)=>p.onAppMenu(e)} onContextMenu={(e)=>p.onAppMenu(e)} title="Project menu"
          style={{width:30,height:30}}>
          <BrandMark size={24} className="brand-mark"/>
        </button>
        <span className="brand-word">Draftwave</span>
      </div>

      <div style={{width:1,height:30,background:"var(--line)"}}/>

      {/* transport */}
      <div style={{display:"flex",gap:7,alignItems:"center"}}>
        <TransportButton icon={p.playing?"pause":"play"}  on={p.playing}   onClick={p.onPlay}  color="var(--emerald)" glow title={p.playing?"Pause (Space)":"Play (Space)"}/>
        <TransportButton icon="stop"  onClick={p.onStop} title="Stop"/>
        <TransportButton icon="rec"   on={p.recording} onClick={p.onRec}   color="var(--red)" glow title="Record"/>
        <TransportButton icon="loop"  on={p.loop.on}   onClick={p.onLoop}  title="Loop"/>
      </div>

      {/* readouts */}
      <div style={{display:"flex",alignItems:"center",gap:14,padding:"5px 14px",borderRadius:"var(--r-2)",
        background:"var(--bg-1)",border:"1px solid var(--line)",boxShadow:"inset 0 1px 6px rgba(0,0,0,.5)"}}>
        <div style={{display:"flex",flexDirection:"column",lineHeight:1}}>
          <span className="mono glow-text" style={{fontSize:20,fontWeight:600,color:"var(--cyan)"}}>
            {String(bar).padStart(2,"0")}<span style={{color:"var(--tx-3)"}}>.</span>{beat}<span style={{color:"var(--tx-3)"}}>.</span>{tick}
          </span>
          <span className="mono faint" style={{fontSize:9,marginTop:3,letterSpacing:".1em"}}>{mm}:{ss}:{ms}</span>
        </div>
        <div style={{width:1,height:26,background:"var(--line)"}}/>
        <BpmControl value={p.bpm} onChange={p.setBpm}/>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
          <span className="mono" style={{fontSize:14,fontWeight:600}}>{p.sig[0]}/{p.sig[1]}</span>
          <span className="faint" style={{fontSize:8.5,letterSpacing:".12em"}}>SIG</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
          <span className="mono" style={{fontSize:14,fontWeight:600,color:"var(--purple)"}}>{p.scale.root} {p.scale.name.slice(0,3)}</span>
          <span className="faint" style={{fontSize:8.5,letterSpacing:".12em"}}>KEY</span>
        </div>
      </div>

      {/* tools */}
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <Toggle on={p.metro} onClick={p.onMetro} title="Metronome">{React.cloneElement(I.metro,{style:{width:13,height:13}})}</Toggle>
        <Toggle on={p.snap} onClick={p.onSnap} color="var(--blue)" title="Snap to grid">{React.cloneElement(I.magnet,{style:{width:13,height:13}})}Snap</Toggle>
      </div>

      <div style={{flex:1}}/>

      {/* desktop / project status */}
      <div title={p.projectNotice||"Ready"} style={{display:"flex",alignItems:"center",gap:7,maxWidth:260,minWidth:130,
        padding:"6px 10px",borderRadius:"var(--r-pill)",background:"var(--bg-1)",border:"1px solid var(--line)",
        boxShadow:"inset 0 1px 5px rgba(0,0,0,.35)"}}>
        <span style={{width:7,height:7,borderRadius:99,background:p.recording?"var(--red)":p.playing?"var(--emerald)":"var(--cyan)",
          boxShadow:`0 0 8px ${p.recording?"var(--red)":p.playing?"var(--emerald)":"var(--cyan)"}`}}/>
        <span className="mono" style={{fontSize:10,color:"var(--tx-2)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
          {p.recording?"REC ":p.playing?"PLAY ":""}{p.projectNotice||"Ready"}{p.nativeMode?" - Desktop":" - Browser"}
        </span>
      </div>

      {/* cpu */}
      <div style={{display:"flex",alignItems:"center",gap:7}}>
        <span className="faint" style={{fontSize:9,letterSpacing:".1em"}}>CPU</span>
        <div style={{width:54,height:6,background:"var(--bg-1)",borderRadius:99,overflow:"hidden",border:"1px solid var(--line)"}}>
          <div style={{height:"100%",width:`${p.cpu}%`,background:p.cpu>75?"var(--amber)":"var(--emerald)",
            transition:"width .25s",borderRadius:99}}/>
        </div>
      </div>

      <div style={{width:1,height:30,background:"var(--line)"}}/>

      {/* views */}
      <div style={{display:"flex",gap:5}}>
        <button className={"iconbtn"+(p.showBrowser?" active":"")} onClick={p.onBrowser} title="Browser">{I.search}</button>
        <button className={"iconbtn"+(p.bottom==="piano"?" active":"")} onClick={()=>p.onBottom("piano")} title="Piano Roll">{I.piano}</button>
        <button className={"iconbtn"+(p.bottom==="mixer"?" active":"")} onClick={()=>p.onBottom("mixer")} title="Mixer">{I.mixer}</button>
        <button className="no-sel" onClick={p.onAssistant} title="The Assistant Producer"
          style={{display:"flex",alignItems:"center",gap:7,height:34,padding:"0 13px",borderRadius:"var(--r-pill)",fontSize:12,fontWeight:600,
            color: p.showAssistant?"#04121a":"var(--cyan)",
            background: p.showAssistant?"var(--cyan)":"color-mix(in srgb,var(--cyan) 12%,transparent)",
            border:`1px solid ${p.showAssistant?"var(--cyan)":"color-mix(in srgb,var(--cyan) 40%,transparent)"}`,
            boxShadow:p.showAssistant?"0 0 18px var(--cyan-glow)":"none",transition:"all .16s"}}>
          {React.cloneElement(I.spark,{style:{width:15,height:15}})}Assistant
        </button>
      </div>

      <div style={{position:"absolute",left:14,right:14,bottom:7,height:30,display:"flex",gap:6,alignItems:"center",
        borderTop:"1px solid var(--line)",paddingTop:6}}>
        <span className="faint" style={{fontSize:9,fontWeight:800,letterSpacing:".12em",marginRight:2}}>TOOLS</span>
        <ToolButton icon="pointer" label="Select" onClick={p.onSelectTool}/>
        <ToolButton icon="scissors" label="Split" onClick={p.onSplitClip} disabled={!p.hasClip}/>
        <ToolButton icon="duplicate" label="Duplicate" onClick={p.onDuplicateClip} disabled={!p.hasClip}/>
        <ToolButton icon="magnet" label="Quantize" onClick={p.onQuantizeClip} disabled={!p.hasMidiClip}/>
        <ToolButton icon="dice" label="Humanize" onClick={p.onHumanizeClip} disabled={!p.hasMidiClip}/>
        <ToolButton icon="zoomin" label="Wheel Zoom" active={p.wheelZoom} onClick={p.onToggleWheelZoom} title="Toggle mouse-wheel zoom in the arrangement and piano roll"/>
        <ToolButton icon="pointer" label="V Scroll" active={p.verticalWheelScroll} color="var(--blue)" onClick={p.onToggleVerticalWheelScroll} title="Toggle vertical mouse-wheel scrolling in the arrangement and piano roll"/>
        <ToolButton icon="wave" label="Import" onClick={p.onImportAudio}/>
        <ToolButton icon="newfile" label="Export" onClick={p.onExportWav}/>
        <ToolButton icon="fx" label="Settings" onClick={p.onSettings}/>
      </div>
    </header>
  );
}

Object.assign(window, { Transport, DragNum, TransportButton, ToolButton });
