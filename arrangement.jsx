/* ============================================================
   THE DAW — arrangement (timeline + tracks + clips)
   ============================================================ */

function clipInner(clip, kind, color, h, mediaById) {
  if (clip.notes && clip.notes.length) {
    const ps = clip.notes.map(n=>n.p), lo=Math.min(...ps)-1, hi=Math.max(...ps)+1, span=Math.max(hi-lo,6);
    const beats = clip.len * 4;
    return clip.notes.map(n=>{
      const top = (1-(n.p-lo)/span)*(h-10)+3;
      return <div key={n.id||n.p+"_"+n.s} style={{position:"absolute",height:2.5,borderRadius:2,
        left:`${(n.s/beats)*100}%`, width:`${(n.l/beats)*100}%`, top, background:color, opacity:n.muted?.3:.92,
        boxShadow:`0 0 4px ${color}`}}/>;
    });
  }
  if (kind==="drum") {
    const cells = clip.len*4*2;
    return <div style={{position:"absolute",inset:"6px 4px",display:"grid",
      gridTemplateColumns:`repeat(${cells},1fr)`,gridTemplateRows:"repeat(3,1fr)",gap:1.5,alignItems:"center"}}>
      {Array.from({length:cells*3}).map((_,i)=>{ const row=Math.floor(i/cells), col=i%cells;
        const on = (row===0&&col%8===0)||(row===1&&col%8===4)||(row===2&&col%2===0);
        return <div key={i} style={{height:on?"100%":2,borderRadius:1,
          background:on?color:"var(--line)",opacity:on?.85:1,boxShadow:on?`0 0 3px ${color}`:"none"}}/>; })}
    </div>;
  }
  const waveform = clip.audio && clip.mediaId ? mediaById?.get(clip.mediaId)?.waveform : null;
  if (Array.isArray(waveform) && waveform.length) {
    return <div style={{position:"absolute",inset:"4px 5px",display:"flex",alignItems:"center",gap:1}}>
      {waveform.map((v,i)=><div key={i} style={{flex:1,height:`${Math.max(5, v*100)}%`,background:color,opacity:.7,borderRadius:1,
        boxShadow:v>.65?`0 0 3px ${color}`:"none"}}/>)}
    </div>;
  }
  const bars=Math.floor(clip.len*14); let seed=clip.id?clip.id.charCodeAt(0):7;
  const rnd=()=>{ seed=(seed*9301+49297)%233280; return seed/233280; };
  return <div style={{position:"absolute",inset:"4px 5px",display:"flex",alignItems:"center",gap:1}}>
    {Array.from({length:bars}).map((_,i)=>{ const v=0.2+rnd()*0.8;
      return <div key={i} style={{flex:1,height:`${v*100}%`,background:color,opacity:.55,borderRadius:1}}/>; })}
  </div>;
}

function Arrangement(p) {
  const { tracks, pxPerBar, beatsPerBar, timelineBars, position, selClip, playing } = p;
  const mediaById = p.mediaById || new Map();
  const bodyRef = React.useRef(null), rulerRef = React.useRef(null), headRef = React.useRef(null);
  const [dropHover, setDropHover] = React.useState(false);
  const HH = 78;
  const tlW = timelineBars * pxPerBar;

  const onScroll = () => { if(rulerRef.current) rulerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    if(headRef.current) headRef.current.scrollTop = bodyRef.current.scrollTop; };

  const rulerToBeat = (clientX) => {
    const r = bodyRef.current.getBoundingClientRect();
    const x = clientX - r.left + bodyRef.current.scrollLeft;
    return clamp(x/pxPerBar*beatsPerBar, 0, timelineBars*beatsPerBar);
  };
  const xToBar = (clientX, ref) => { const r=ref.getBoundingClientRect();
    return (clientX-r.left+ref.scrollLeft)/pxPerBar; };

  // Plain wheel zooms the arrangement; Shift+wheel keeps a panning escape hatch.
  const onWheel = (e) => {
    if(e.shiftKey) return;
    if(p.wheelZoom!==false || e.ctrlKey || e.metaKey){
      e.preventDefault();
      p.setZoom(z=>clamp(z + (e.deltaY<0?12:-12), 28, 220));
    }
  };

  const dragClip = (e, tIdx, clip) => {
    if(e.button!==0) return;
    e.stopPropagation();
    p.selectClip(tracks[tIdx].id, clip.id);
    const r=bodyRef.current.getBoundingClientRect();
    const localX=e.clientX-r.left+bodyRef.current.scrollLeft;
    const onEdge = localX > (clip.start+clip.len)*pxPerBar - 9;
    p.recordHistory&&p.recordHistory(onEdge?"Resize clip":"Move clip");
    const startX=e.clientX, origStart=clip.start, origLen=clip.len;
    const move=(ev)=>{
      if(onEdge){ let nl=origLen+(ev.clientX-startX)/pxPerBar; if(p.snap)nl=Math.max(1,Math.round(nl)); nl=Math.max(0.25,nl);
        p.resizeClip(tracks[tIdx].id,clip.id,nl); }
      else { let nb=origStart+(ev.clientX-startX)/pxPerBar; if(p.snap)nb=Math.round(nb*beatsPerBar)/beatsPerBar; nb=Math.max(0,nb);
        p.moveClip(tracks[tIdx].id,clip.id,nb); }
    };
    const up=()=>{ window.removeEventListener("pointermove",move); window.removeEventListener("pointerup",up); };
    window.addEventListener("pointermove",move); window.addEventListener("pointerup",up);
  };

  // clip context menu
  const clipMenu=(e,t,clip)=>{ const atBar=xToBar(e.clientX,bodyRef.current);
    openMenu(e,[
      { header:clip.name },
      { label:"Edit in Piano Roll", icon:"piano", disabled:t.kind==="drum"||clip.audio,
        onClick:()=>{ p.selectClip(t.id,clip.id); p.openPiano(); } },
      { label:"Duplicate Clip", icon:"duplicate", shortcut:"Ctrl+D", onClick:()=>p.duplicateClip(t.id,clip.id) },
      { label:"Split at Cursor", icon:"scissors", disabled:atBar<=clip.start||atBar>=clip.start+clip.len, onClick:()=>p.splitClip(t.id,clip.id,atBar) },
      { label:"Rename Clip", icon:"pencil", onClick:()=>{ const n=prompt("Clip name",clip.name); if(n!=null)p.renameClip(t.id,clip.id,n); } },
      { sep:true },
      { header:"Audio Edit" },
      { label:clip.reverse?"Unreverse Audio":"Reverse Audio", icon:"wave", disabled:!clip.audio, checked:clip.reverse, onClick:()=>p.updateClip(t.id,clip.id,{reverse:!clip.reverse},"Reverse audio") },
      { label:"Normalize Audio", icon:"vel", disabled:!clip.audio, onClick:()=>p.updateClip(t.id,clip.id,{gain:1.15,normalized:true},"Normalize audio") },
      { label:"Fade In", icon:"wave", disabled:!clip.audio, onClick:()=>p.updateClip(t.id,clip.id,{fadeIn:0.08},"Fade in") },
      { label:"Fade Out", icon:"wave", disabled:!clip.audio, onClick:()=>p.updateClip(t.id,clip.id,{fadeOut:0.08},"Fade out") },
      { label:"Stretch 2x Slower", icon:"slice", disabled:!clip.audio, onClick:()=>p.updateClip(t.id,clip.id,{playbackRate:0.5,len:clip.len*2},"Stretch audio") },
      { label:"Pitch +1 Semitone", icon:"piano", disabled:!clip.audio, onClick:()=>p.updateClip(t.id,clip.id,{playbackRate:Math.pow(2,1/12),pitchShift:1},"Pitch shift") },
      { sep:true },
      { label:"Set Loop to Clip", icon:"loop", onClick:()=>p.setLoopRange(Math.round(clip.start),Math.round(clip.start+clip.len)) },
      { sep:true },
      { label:"Delete Clip", icon:"trash", danger:true, shortcut:"Del", onClick:()=>p.deleteClip(t.id,clip.id) },
    ]); };

  // empty-lane context menu
  const laneMenu=(e,t)=>{ const bar=Math.floor(rulerToBeat(e.clientX)/beatsPerBar);
    openMenu(e,[
      { header:t.name },
      { label:"Add Empty Clip Here", icon:"plus", disabled:t.kind==="drum",
        onClick:()=>p.dropItemAt&&p.dropItemAt(t.id,bar) },
      { label:"Set Playhead Here", icon:"pointer", onClick:()=>p.setPosition(rulerToBeat(e.clientX)) },
      { sep:true },
      { label:"Duplicate Track", icon:"duplicate", onClick:()=>p.duplicateTrack(t.id) },
      { label:"Delete Track", icon:"trash", danger:true, onClick:()=>p.deleteTrack(t.id) },
    ]); };

  // loop region drag in ruler
  const dragLoop = (e, mode) => { e.stopPropagation();
    p.recordHistory&&p.recordHistory("Loop edit");
    const startBar = xToBar(e.clientX, rulerRef.current);
    const o={...p.loop};
    const move=(ev)=>{ let b=xToBar(ev.clientX,rulerRef.current); if(p.snap)b=Math.round(b); b=Math.max(0,b);
      if(mode==="move"){ const d=Math.round(b-startBar); p.setLoop(l=>({...l,on:true,start:Math.max(0,o.start+d),end:o.end+d})); }
      else if(mode==="start"){ p.setLoop(l=>({...l,on:true,start:clamp(b,0,o.end-1)})); }
      else { p.setLoop(l=>({...l,on:true,end:Math.max(o.start+1,b)})); } };
    const up=()=>{ window.removeEventListener("pointermove",move); window.removeEventListener("pointerup",up); };
    window.addEventListener("pointermove",move); window.addEventListener("pointerup",up);
  };
  const rulerMenu=(e)=>{ const bar=Math.round(xToBar(e.clientX,rulerRef.current));
    openMenu(e,[
      { header:"Loop region" },
      ...[1,2,4,8,16].map(n=>({ label:`${n} bar${n>1?"s":""} from bar ${bar+1}`, icon:"loop",
        onClick:()=>p.setLoopRange(bar,bar+n) })),
      { sep:true },
      { label:p.loop.on?"Disable Loop":"Enable Loop", icon:"loop", checked:p.loop.on,
        onClick:()=>p.setLoop(l=>({...l,on:!l.on})) },
    ]); };

  return (
    <div className="no-sel" style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,background:"var(--bg-1)",overflow:"hidden"}}>
      {/* ruler */}
      <div style={{display:"flex",height:"var(--ruler-h)",flex:"0 0 auto",borderBottom:"1px solid var(--line-2)",background:"var(--bg-2)"}}>
        <div style={{width:220,flex:"0 0 auto",borderRight:"1px solid var(--line-2)",display:"flex",alignItems:"center",
          padding:"0 10px 0 12px",gap:6}}>
          <span style={{fontSize:10,fontWeight:700,letterSpacing:".14em",color:"var(--tx-3)"}}>ARRANGEMENT</span>
          <span style={{flex:1}}/>
          <button className="iconbtn" style={{width:22,height:22}} title="Zoom out timeline"
            onClick={()=>p.setZoom(z=>clamp(z-16,28,220))}>{React.cloneElement(I.zoomout,{style:{width:13,height:13}})}</button>
          <button className="iconbtn" style={{width:22,height:22}} title="Zoom in timeline"
            onClick={()=>p.setZoom(z=>clamp(z+16,28,220))}>{React.cloneElement(I.zoomin,{style:{width:13,height:13}})}</button>
        </div>
        <div ref={rulerRef} style={{flex:1,overflow:"hidden",position:"relative"}}>
          <div onPointerDown={(e)=>{ if(e.button===0) p.setPosition(rulerToBeat(e.clientX)); }}
            onContextMenu={rulerMenu}
            style={{position:"relative",width:tlW,height:"100%",cursor:"text"}}>
            {Array.from({length:timelineBars}).map((_,i)=>(
              <div key={i} style={{position:"absolute",left:i*pxPerBar,top:0,bottom:0,paddingLeft:6,
                borderLeft:`1px solid ${i%4===0?"var(--line-3)":"var(--line)"}`,display:"flex",alignItems:"center"}}>
                <span className="mono" style={{fontSize:10,color:i%4===0?"var(--tx-2)":"var(--tx-4)",fontWeight:i%4===0?600:400}}>{i+1}</span>
              </div>
            ))}
            {p.loop.on && <div onPointerDown={(e)=>dragLoop(e,"move")} title="Drag to move loop"
              style={{position:"absolute",top:0,bottom:0,left:p.loop.start*pxPerBar,
                width:(p.loop.end-p.loop.start)*pxPerBar,background:"color-mix(in srgb,var(--cyan) 16%,transparent)",
                borderLeft:"2px solid var(--cyan)",borderRight:"2px solid var(--cyan)",cursor:"grab"}}>
              <div onPointerDown={(e)=>dragLoop(e,"start")} style={{position:"absolute",left:-4,top:0,bottom:0,width:9,cursor:"ew-resize"}}/>
              <div onPointerDown={(e)=>dragLoop(e,"end")} style={{position:"absolute",right:-4,top:0,bottom:0,width:9,cursor:"ew-resize"}}/>
            </div>}
            <div style={{position:"absolute",top:0,left:position/beatsPerBar*pxPerBar,transform:"translateX(-50%)"}}>
              <div style={{width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",
                borderTop:"8px solid var(--cyan)",filter:"drop-shadow(0 0 4px var(--cyan))"}}/>
            </div>
          </div>
        </div>
      </div>

      {/* body */}
      <div style={{display:"flex",flex:1,minHeight:0}}>
        <div ref={headRef} style={{width:220,flex:"0 0 auto",overflow:"hidden",borderRight:"1px solid var(--line-2)",background:"var(--bg-2)"}}>
          {tracks.map((t,i)=>(<TrackHead key={t.id} t={t} idx={i} HH={HH} {...p}/>))}
          <button onClick={p.addTrack} className="no-sel no-press"
            style={{display:"flex",alignItems:"center",gap:9,width:"100%",height:46,padding:"0 14px",color:"var(--tx-2)",
              borderBottom:"1px solid var(--line)",transition:"all .14s",background:"transparent"}}
            onMouseEnter={e=>e.currentTarget.style.background="var(--bg-3)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span style={{width:24,height:24,display:"grid",placeItems:"center",borderRadius:6,border:"1px dashed var(--line-3)"}}>
              {React.cloneElement(I.plus,{style:{width:14,height:14}})}</span>
            <span style={{fontSize:12,fontWeight:600}}>Add Track</span>
          </button>
          {tracks.length===0 && <div className="faint" style={{padding:"24px 16px",fontSize:11.5,lineHeight:1.6,textAlign:"center"}}>
            Clean slate. Drag sounds from the browser, hit <b>Add Track</b>, or ask the Assistant to build something.</div>}
        </div>

        <div ref={bodyRef} onScroll={onScroll} onWheel={onWheel}
          onDragOver={(e)=>{e.preventDefault();setDropHover(true);}}
          onDragLeave={()=>setDropHover(false)}
          onDrop={(e)=>{ e.preventDefault(); setDropHover(false);
            const raw=e.dataTransfer.getData("text/daw-item"); if(!raw) return;
            const bar=Math.floor(rulerToBeat(e.clientX)/beatsPerBar);
            p.dropItem(JSON.parse(raw), bar); }}
          style={{flex:1,overflow:"auto",position:"relative",background: dropHover?"color-mix(in srgb,var(--cyan) 5%,var(--bg-1))":"var(--bg-1)",transition:"background .15s"}}>
          <div style={{position:"relative",width:tlW,minHeight:"100%"}}>
            <div style={{position:"absolute",inset:0,pointerEvents:"none",
              backgroundImage:`repeating-linear-gradient(90deg,var(--line) 0 1px,transparent 1px ${pxPerBar}px)`}}/>
            <div style={{position:"absolute",inset:0,pointerEvents:"none",opacity:.6,
              backgroundImage:`repeating-linear-gradient(90deg,var(--line-2) 0 1px,transparent 1px ${pxPerBar*4}px)`}}/>
            {p.loop.on && <div style={{position:"absolute",top:0,bottom:0,left:p.loop.start*pxPerBar,
              width:(p.loop.end-p.loop.start)*pxPerBar,background:"color-mix(in srgb,var(--cyan) 4%,transparent)",
              borderLeft:"1px solid color-mix(in srgb,var(--cyan) 40%,transparent)",
              borderRight:"1px solid color-mix(in srgb,var(--cyan) 40%,transparent)",pointerEvents:"none"}}/>}

            {tracks.map((t,ti)=>(
              <div key={t.id} onContextMenu={(e)=>{ if(e.target===e.currentTarget) laneMenu(e,t); }}
                onPointerDown={(e)=>{ if(e.target===e.currentTarget && e.button===0) p.setPosition(rulerToBeat(e.clientX)); }}
                style={{position:"relative",height:HH,borderBottom:"1px solid var(--line)",
                  background: p.selTrack===t.id?"color-mix(in srgb,#fff 2.5%,transparent)":"transparent"}}>
                {(t.clips||[]).map(clip=>{ const sel = selClip&&selClip.trackId===t.id&&selClip.clipId===clip.id; const cc=t.color;
                  const missingMedia = !!clip.audio && (!clip.mediaId || !p.mediaIds?.has(clip.mediaId));
                  return (
                    <div key={clip.id} onPointerDown={(e)=>dragClip(e,ti,clip)}
                      onContextMenu={(e)=>clipMenu(e,t,clip)}
                      onDoubleClick={()=>{ p.selectClip(t.id,clip.id); if(clip.audio===undefined && t.kind!=="audio" && t.kind!=="drum") p.openPiano(); }}
                      className="clip-el"
                      style={{position:"absolute",top:5,height:HH-12,left:clip.start*pxPerBar,width:clip.len*pxPerBar-2,
                        borderRadius:7,overflow:"hidden",cursor:"grab",
                        background:`color-mix(in srgb,${cc} 20%,var(--bg-3))`,
                        border:`1.5px solid ${missingMedia?"var(--amber)":sel?cc:`color-mix(in srgb,${cc} 45%,transparent)`}`,
                        boxShadow: sel?`0 0 0 1px ${cc},0 6px 18px rgba(0,0,0,.4)`:"0 2px 6px rgba(0,0,0,.3)"}}>
                      <div style={{height:15,display:"flex",alignItems:"center",padding:"0 7px",
                        background:`color-mix(in srgb,${cc} 34%,transparent)`,gap:5}}>
                        <span style={{fontSize:9.5,fontWeight:600,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",
                          textOverflow:"ellipsis",textShadow:"0 1px 2px rgba(0,0,0,.5)"}}>{clip.name}</span>
                        {missingMedia && <span className="mono" title="This audio clip has no available media asset"
                          style={{marginLeft:"auto",fontSize:8,color:"var(--amber)",fontWeight:800,whiteSpace:"nowrap"}}>MISSING</span>}
                      </div>
                      <div style={{position:"absolute",top:15,left:0,right:0,bottom:0}}>{clipInner(clip,t.kind,cc,HH-27,mediaById)}</div>
                      <div style={{position:"absolute",right:0,top:0,bottom:0,width:8,cursor:"ew-resize"}}/>
                    </div>
                  );
                })}
              </div>
            ))}
            <div style={{position:"absolute",top:0,bottom:0,left:position/beatsPerBar*pxPerBar,width:1.5,
              background:"var(--cyan)",boxShadow:"0 0 8px var(--cyan)",pointerEvents:"none",zIndex:5}}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackHead(p) {
  const { t, HH } = p;
  const [editing,setEditing]=React.useState(false);
  const sel = p.selTrack===t.id;
  const anySolo = p.tracks.some(x=>x.solo);
  const dimmed = (anySolo && !t.solo) || t.mute;

  const menu=(e)=>openMenu(e,[
    { header:t.name },
    { label:"Rename", icon:"pencil", onClick:()=>setEditing(true) },
    { label:"Duplicate Track", icon:"duplicate", onClick:()=>p.duplicateTrack(t.id) },
    { label:t.fav?"Unfavorite":"Favorite", icon:"star", checked:t.fav, onClick:()=>p.toggleFav(t.id) },
    { sep:true },
    { label:t.mute?"Unmute":"Mute", icon:"mute", checked:t.mute, onClick:()=>p.toggleMute(t.id) },
    { label:t.solo?"Unsolo":"Solo", checked:t.solo, onClick:()=>p.toggleSolo(t.id) },
    { label:"Silence (clear clips)", icon:"eraser", onClick:()=>p.silenceTrack(t.id) },
    { sep:true },
    { label:"Delete Track", icon:"trash", danger:true, onClick:()=>p.deleteTrack(t.id) },
  ]);

  return (
    <div onPointerDown={(e)=>{ if(e.button===0) p.selectTrack(t.id); }} onContextMenu={menu}
      style={{height:HH,borderBottom:"1px solid var(--line)",display:"flex",alignItems:"stretch",
        background: sel?"color-mix(in srgb,var(--cyan) 7%,var(--bg-3))":"transparent",
        opacity:dimmed?.5:1,transition:"opacity .15s, background .15s",cursor:"pointer",position:"relative"}}>
      <div style={{width:4,background:t.color,boxShadow:`0 0 8px ${t.color}`}}/>
      <div style={{flex:1,padding:"8px 8px 8px 10px",display:"flex",flexDirection:"column",justifyContent:"space-between",minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{width:22,height:22,display:"grid",placeItems:"center",borderRadius:5,flex:"0 0 auto",
            background:`color-mix(in srgb,${t.color} 18%,var(--bg-4))`,color:t.color}}>
            {React.cloneElement(I[TRACK_KINDS[t.kind]?.icon||"wave"],{style:{width:13,height:13}})}</span>
          {editing
            ? <input autoFocus defaultValue={t.name} onBlur={e=>{p.renameTrack(t.id,e.target.value);setEditing(false);}}
                onKeyDown={e=>{if(e.key==="Enter")e.target.blur(); if(e.key==="Escape")setEditing(false);}}
                style={{flex:1,minWidth:0,background:"var(--bg-1)",border:"1px solid var(--line-3)",borderRadius:4,
                  color:"var(--tx)",fontSize:12,fontWeight:600,padding:"2px 5px",outline:"none"}}/>
            : <span onDoubleClick={()=>setEditing(true)} style={{flex:1,fontSize:12.5,fontWeight:600,whiteSpace:"nowrap",
                overflow:"hidden",textOverflow:"ellipsis"}}>{t.name}</span>}
          {t.fav && React.cloneElement(I.star,{style:{width:12,height:12,color:"var(--amber)",flex:"0 0 auto"}})}
          <button className="iconbtn no-press" style={{width:20,height:20,flex:"0 0 auto"}}
            onPointerDown={e=>e.stopPropagation()} onClick={(e)=>{e.stopPropagation();menu(e);}} title="Track options">
            {React.cloneElement(I.dots,{style:{width:14,height:14}})}</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <button onPointerDown={e=>{e.stopPropagation();p.toggleMute(t.id);}} className="mono" title="Mute"
            style={{width:22,height:18,borderRadius:4,fontSize:9.5,fontWeight:700,
              background:t.mute?"var(--amber)":"var(--bg-4)",color:t.mute?"#1a1205":"var(--tx-2)"}}>M</button>
          <button onPointerDown={e=>{e.stopPropagation();p.toggleSolo(t.id);}} className="mono" title="Solo"
            style={{width:22,height:18,borderRadius:4,fontSize:9.5,fontWeight:700,
              background:t.solo?"var(--cyan)":"var(--bg-4)",color:t.solo?"#04121a":"var(--tx-2)"}}>S</button>
          <span className="faint" style={{fontSize:9.5,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textAlign:"right"}}>
            {TRACK_KINDS[t.kind]?.label}</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Arrangement });
