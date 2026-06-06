/* ============================================================
   THE DAW — piano roll  (multi-tool, multi-select, beat-builder)
   ============================================================ */

const SNAPS = [
  { label:"1 bar", beats:4 }, { label:"1/2", beats:2 }, { label:"1/3", beats:4/3 },
  { label:"1/4", beats:1 }, { label:"1/6", beats:2/3 }, { label:"1/8", beats:0.5 },
  { label:"1/16", beats:0.25 }, { label:"1/32", beats:0.125 },
];
const PR_TOOLS = [
  { id:"draw",   icon:"pencil",  title:"Draw — click to add, drag to size, drag note to move (P)" },
  { id:"paint",  icon:"brush",   title:"Paint — drag to lay a run of notes (B)" },
  { id:"select", icon:"marquee", title:"Select — marquee-select notes (S)" },
  { id:"slice",  icon:"slice",   title:"Slice — click a note to cut it in two (C)" },
  { id:"erase",  icon:"eraser",  title:"Erase — click or drag over notes to delete (E)" },
  { id:"mute",   icon:"mute",    title:"Mute — click a note to silence it (M)" },
];
let PR_CLIPBOARD = [];   // survives re-renders

function PianoRoll(p) {
  const { clip, track, scale, snap, height } = p;
  const gridRef = React.useRef(null), keysRef = React.useRef(null), velRef = React.useRef(null);
  const [tool, setTool] = React.useState("draw");
  const [selIds, setSelIds] = React.useState([]);
  const [snapIdx, setSnapIdx] = React.useState(5); // 1/8
  const [pxPerBeat, setPpb] = React.useState(46);
  const [NH, setNH] = React.useState(15);
  const [marquee, setMarquee] = React.useState(null);
  const [lane, setLane] = React.useState("velocity");
  const lastLen = React.useRef(0.5);
  const LO = 24, HI = 99;

  const snapBeats = SNAPS[snapIdx].beats;
  const rootPc = ROOTS.indexOf(scale.root);
  const allRows = [];
  for (let m=HI;m>=LO;m--) if(!p.fold || inScale(m,rootPc,scale.name)) allRows.push(m);
  const rowIndex = (m) => { let i=allRows.indexOf(m); if(i>=0)return i;
    let best=0,bd=1e9; allRows.forEach((r,idx)=>{const d=Math.abs(r-m);if(d<bd){bd=d;best=idx;}}); return best; };
  const gridH = allRows.length*NH;
  const beats = (clip?clip.len:4)*4;
  const gridW = beats*pxPerBeat;
  const notes = (clip&&clip.notes)||[];
  const controllers = (clip&&clip.controllers)||{};
  const snapV = (b)=> snap ? Math.round(b/snapBeats)*snapBeats : b;
  const isSel = (id)=>selIds.includes(id);

  React.useEffect(()=>{
    if(gridRef.current && clip){ const ps=notes.map(n=>n.p);
      const mid = ps.length?Math.round(ps.reduce((a,b)=>a+b,0)/ps.length):60;
      const top = clamp(rowIndex(mid)*NH - (gridRef.current.clientHeight||height)/2, 0, gridH);
      gridRef.current.scrollTop = top; if(keysRef.current) keysRef.current.scrollTop = top; }
    setSelIds([]);
  },[clip&&clip.id]);

  const onScroll=()=>{ if(keysRef.current)keysRef.current.scrollTop=gridRef.current.scrollTop;
    if(velRef.current)velRef.current.scrollLeft=gridRef.current.scrollLeft; };

  const xToBeat=(clientX,doSnap=true)=>{ const r=gridRef.current.getBoundingClientRect();
    let b=(clientX-r.left+gridRef.current.scrollLeft)/pxPerBeat; if(doSnap)b=snapV(b); return clamp(b,0,beats); };
  const xToBeatRaw=(clientX)=>{ const r=gridRef.current.getBoundingClientRect();
    return clamp((clientX-r.left+gridRef.current.scrollLeft)/pxPerBeat,0,beats); };
  const yToPitch=(clientY)=>{ const r=gridRef.current.getBoundingClientRect();
    const idx=clamp(Math.floor((clientY-r.top+gridRef.current.scrollTop)/NH),0,allRows.length-1); return allRows[idx]; };
  const noteAt=(clientX,clientY)=>{ const b=xToBeatRaw(clientX), pch=yToPitch(clientY);
    return notes.find(n=>n.p===pch && b>=n.s-0.02 && b<=n.s+n.l+0.02); };

  const mark=(label)=>p.recordHistory&&p.recordHistory(label);
  const commit=(ns)=>{ if(p.growClip){ const maxE=ns.reduce((a,n)=>Math.max(a,n.s+n.l),0); if(maxE>beats) p.growClip(maxE); }
    p.updateNotes(ns); };
  const commitControllers=(next)=>p.updateControllers&&p.updateControllers(next);
  const preview=(midi,vel=0.85)=>{ Audio.ensure(); Audio.note(midi,0,0.4,TRACK_KINDS[track.kind]?.voice||"keys",vel,p.trackGain); };

  /* ---------- draw ---------- */
  const addNote=(e)=>{
    mark("Add note");
    const s=xToBeat(e.clientX), pch=yToPitch(e.clientY);
    const len=lastLen.current||snapBeats;
    const note={id:uid(),p:pch,s:Math.min(s,beats-0.05),l:len,v:0.85};
    let cur=[...notes,note]; commit(cur); setSelIds([note.id]); preview(pch);
    const move=(ev)=>{ let l=Math.max(snap?snapBeats:0.0625,xToBeat(ev.clientX,true)-note.s);
      cur=[...notes,{...note,l}]; commit(cur); lastLen.current=l; };
    const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);};
    window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
  };

  /* ---------- paint (drag a run) ---------- */
  const startPaint=(e)=>{
    mark("Paint notes");
    const placed=new Map(); const len=snapBeats;
    const put=(cx,cy)=>{ const s=Math.round(xToBeatRaw(cx)/snapBeats)*snapBeats, pch=yToPitch(cy);
      const key=pch+":"+s.toFixed(3); if(placed.has(key)||s>=beats) return;
      placed.set(key,true); preview(pch); };
    const collect=()=>Array.from(placed.keys()).map(k=>{ const [pch,s]=k.split(":");
      return {id:uid(),p:+pch,s:+s,l:len,v:0.85}; });
    put(e.clientX,e.clientY); commit([...notes,...collect()]);
    const move=(ev)=>{ put(ev.clientX,ev.clientY); commit([...notes,...collect()]); };
    const up=()=>{ const made=collect(); setSelIds(made.map(n=>n.id)); lastLen.current=len;
      window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);};
    window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
  };

  /* ---------- erase drag ---------- */
  const startErase=(e)=>{ e.stopPropagation();
    mark("Erase notes");
    let cur=[...notes]; const del=(cx,cy)=>{ const n=cur.find(nn=>{ const b=xToBeatRaw(cx),pch=yToPitch(cy);
        return nn.p===pch && b>=nn.s-0.02 && b<=nn.s+nn.l+0.02; });
      if(n){ cur=cur.filter(x=>x.id!==n.id); commit(cur); } };
    del(e.clientX,e.clientY);
    const move=(ev)=>del(ev.clientX,ev.clientY);
    const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);};
    window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
  };

  /* ---------- marquee select ---------- */
  const startMarquee=(e)=>{
    const r=gridRef.current.getBoundingClientRect(); const sx=e.clientX-r.left+gridRef.current.scrollLeft, sy=e.clientY-r.top+gridRef.current.scrollTop;
    const add=e.shiftKey; const base=add?[...selIds]:[];
    const move=(ev)=>{ const cx=ev.clientX-r.left+gridRef.current.scrollLeft, cy=ev.clientY-r.top+gridRef.current.scrollTop;
      const x0=Math.min(sx,cx),x1=Math.max(sx,cx),y0=Math.min(sy,cy),y1=Math.max(sy,cy);
      setMarquee({x:x0,y:y0,w:x1-x0,h:y1-y0});
      const hits=notes.filter(n=>{ const nx=n.s*pxPerBeat, nx1=(n.s+n.l)*pxPerBeat, ny=rowIndex(n.p)*NH, ny1=ny+NH;
        return nx1>=x0 && nx<=x1 && ny1>=y0 && ny<=y1; }).map(n=>n.id);
      setSelIds([...new Set([...base,...hits])]); };
    const up=()=>{ setMarquee(null); window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);};
    window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
  };

  /* ---------- grid pointerdown router ---------- */
  const gridDown=(e)=>{ if(e.button!==0) return;
    if(tool==="draw") addNote(e);
    else if(tool==="paint") startPaint(e);
    else if(tool==="select") startMarquee(e);
    else if(tool==="erase") startErase(e);
    else setSelIds([]);
  };

  /* ---------- note interactions ---------- */
  const noteDown=(e,note)=>{
    e.stopPropagation();
    if(tool==="erase"){ startErase(e); return; }
    if(tool==="mute"){ mark("Mute note"); commit(notes.map(n=>n.id===note.id?{...n,muted:!n.muted}:n)); return; }
    if(tool==="slice"){ const at=xToBeatRaw(e.clientX); const l1=clamp(at-note.s,0.0625,note.l-0.0625);
      mark("Slice note");
      commit([...notes.filter(n=>n.id!==note.id),{...note,l:l1},{...note,id:uid(),s:note.s+l1,l:note.l-l1}]); return; }
    // draw / paint / select → move or resize
    const r=gridRef.current.getBoundingClientRect();
    const localX=e.clientX-r.left+gridRef.current.scrollLeft;
    const onEdge = localX > (note.s+note.l)*pxPerBeat - 7;
    // selection handling
    let workSel;
    if(e.shiftKey){ workSel = isSel(note.id)? selIds.filter(id=>id!==note.id) : [...selIds,note.id]; setSelIds(workSel); }
    else if(!isSel(note.id)){ workSel=[note.id]; setSelIds(workSel); }
    else workSel=selIds;
    const movingIds = workSel.length?workSel:[note.id];
    preview(note.p, note.v);
    mark(onEdge?"Resize notes":"Move notes");
    const startX=e.clientX, startY=e.clientY;
    const orig=Object.fromEntries(notes.filter(n=>movingIds.includes(n.id)).map(n=>[n.id,{s:n.s,p:n.p,l:n.l}]));
    const baseRow=rowIndex(note.p);
    const move=(ev)=>{
      if(onEdge){ const dl=(ev.clientX-startX)/pxPerBeat;
        commit(notes.map(n=>{ if(!movingIds.includes(n.id))return n; let l=orig[n.id].l+dl;
          l = snap?Math.max(snapBeats,Math.round(l/snapBeats)*snapBeats):Math.max(0.0625,l); return {...n,l}; }));
        lastLen.current=orig[note.id].l+dl;
      } else {
        let ds=(ev.clientX-startX)/pxPerBeat; if(snap)ds=Math.round(ds/snapBeats)*snapBeats;
        const dRow=Math.round((ev.clientY-startY)/NH);
        commit(notes.map(n=>{ if(!movingIds.includes(n.id))return n; const o=orig[n.id];
          const s=clamp(o.s+ds,0,beats-0.05); const ni=clamp(rowIndex(o.p)+dRow,0,allRows.length-1);
          return {...n,s,p:allRows[ni]}; }));
      }
    };
    const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);};
    window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
  };

  /* ---------- ops ---------- */
  const selNotes=()=>notes.filter(n=>isSel(n.id));
  const deleteSel=()=>{ if(!selIds.length)return; mark("Delete notes"); commit(notes.filter(n=>!isSel(n.id))); setSelIds([]); };
  const duplicateSel=()=>{ const sel=selNotes(); if(!sel.length)return;
    mark("Duplicate notes");
    const minS=Math.min(...sel.map(n=>n.s)), maxE=Math.max(...sel.map(n=>n.s+n.l));
    const span=Math.max(snapBeats, maxE-minS);
    const copies=sel.map(n=>({...n,id:uid(),s:n.s+span}));
    commit([...notes,...copies]); setSelIds(copies.map(n=>n.id)); };
  const copySel=()=>{ const sel=selNotes(); if(!sel.length)return;
    const minS=Math.min(...sel.map(n=>n.s)); PR_CLIPBOARD=sel.map(n=>({...n,s:n.s-minS})); };
  const paste=(atBeat=null)=>{ if(!PR_CLIPBOARD.length)return;
    mark("Paste notes");
    const at = atBeat!=null ? snapV(atBeat)
      : (p.playBeatInClip!=null && p.playBeatInClip>=0 && p.playBeatInClip<beats) ? snapV(p.playBeatInClip)
      : (notes.length?Math.max(...notes.map(n=>n.s+n.l)):0);
    const copies=PR_CLIPBOARD.map(n=>({...n,id:uid(),s:at+n.s}));
    commit([...notes,...copies]); setSelIds(copies.map(n=>n.id)); };
  const selectAll=()=>setSelIds(notes.map(n=>n.id));
  const quantizeSel=()=>{ const ids=selIds.length?selIds:notes.map(n=>n.id); if(!ids.length)return;
    mark("Quantize notes");
    commit(notes.map(n=>ids.includes(n.id)?{...n,s:snapV(n.s),l:Math.max(snapBeats,snapV(n.l)||snapBeats)}:n)); };
  const humanizeSel=()=>{ const ids=selIds.length?selIds:notes.map(n=>n.id); if(!ids.length)return;
    mark("Humanize notes");
    const timing=(p.settings?.editing?.humanizeTimingMs??12)/1000;
    const velAmt=(p.settings?.editing?.humanizeVelocity??8)/100;
    commit(notes.map(n=>ids.includes(n.id)?{...n,
      s:clamp(n.s+(Math.random()*2-1)*timing,0,beats-0.05),
      v:clamp((n.v??0.85)+(Math.random()*2-1)*velAmt,0.05,1)}:n)); };
  const velocitySel=(delta)=>{ const ids=selIds.length?selIds:notes.map(n=>n.id); if(!ids.length)return;
    mark("Velocity edit");
    commit(notes.map(n=>ids.includes(n.id)?{...n,v:clamp((n.v??0.85)+delta,0.05,1)}:n)); };
  const copyNote=(note)=>{ PR_CLIPBOARD=[{...note,s:0}]; setSelIds([note.id]); };
  const duplicateNote=(note)=>{ mark("Duplicate note"); const copy={...note,id:uid(),s:note.s+note.l}; commit([...notes,copy]); setSelIds([copy.id]); };
  const deleteNote=(note)=>{ mark("Delete note"); commit(notes.filter(n=>n.id!==note.id)); setSelIds(ids=>ids.filter(id=>id!==note.id)); };

  const gridMenu=(e)=>{ const at=xToBeatRaw(e.clientX), pch=yToPitch(e.clientY);
    openMenu(e,[
      { header:`Piano Roll - ${snapV(at).toFixed(2)} beats` },
      { label:"Add Note Here", icon:"pencil", onClick:()=>{ mark("Add note"); const n={id:uid(),p:pch,s:snapV(at),l:lastLen.current||snapBeats,v:0.85}; commit([...notes,n]); setSelIds([n.id]); preview(pch); } },
      { label:"Paste Here", icon:"paste", disabled:!PR_CLIPBOARD.length, shortcut:"Ctrl+V", onClick:()=>paste(at) },
      { label:"Select All", icon:"selectall", shortcut:"Ctrl+A", onClick:selectAll },
      { sep:true },
      { label:"Quantize Selection", icon:"magnet", disabled:!notes.length, onClick:quantizeSel },
      { label:"Humanize Selection", icon:"dice", disabled:!notes.length, onClick:humanizeSel },
      { label:"Velocity +10%", icon:"vel", disabled:!notes.length, onClick:()=>velocitySel(0.1) },
      { label:"Velocity -10%", icon:"vel", disabled:!notes.length, onClick:()=>velocitySel(-0.1) },
      { sep:true },
      { label:"Close Piano Roll", icon:"close", onClick:()=>p.onClose&&p.onClose() },
    ]); };

  const noteMenu=(e,note)=>{ setSelIds(ids=>ids.includes(note.id)?ids:[note.id]);
    openMenu(e,[
      { header:`${noteName(note.p)} note` },
      { label:"Copy", icon:"copy", shortcut:"Ctrl+C", onClick:()=>copyNote(note) },
      { label:"Paste Here", icon:"paste", disabled:!PR_CLIPBOARD.length, shortcut:"Ctrl+V", onClick:()=>paste(note.s+note.l) },
      { label:"Duplicate", icon:"duplicate", shortcut:"Ctrl+D", onClick:()=>duplicateNote(note) },
      { sep:true },
      { label:"Quantize Selection", icon:"magnet", onClick:quantizeSel },
      { label:"Humanize Selection", icon:"dice", onClick:humanizeSel },
      { label:"Velocity +10%", icon:"vel", onClick:()=>velocitySel(0.1) },
      { label:"Velocity -10%", icon:"vel", onClick:()=>velocitySel(-0.1) },
      { sep:true },
      { label:note.muted?"Unmute Note":"Mute Note", icon:"mute", checked:note.muted, onClick:()=>{ mark("Mute note"); commit(notes.map(n=>n.id===note.id?{...n,muted:!n.muted}:n)); } },
      { label:"Delete", icon:"trash", danger:true, shortcut:"Del", onClick:()=>deleteNote(note) },
    ]); };

  /* ---------- velocity ---------- */
  const dragVel=(e,note)=>{ e.stopPropagation(); if(!isSel(note.id)) setSelIds([note.id]);
    mark("Velocity edit");
    const set=(cy)=>{ const r=e.currentTarget.closest(".vellane").getBoundingClientRect();
      const v=clamp(1-(cy-r.top)/r.height,0.05,1); commit(notes.map(n=>n.id===note.id?{...n,v}:n)); };
    set(e.clientY); const move=(ev)=>set(ev.clientY);
    const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);};
    window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
  };

  const lanePoints=()=>controllers[lane]||[];
  const setLanePoint=(clientX,clientY)=>{
    const r=velRef.current.getBoundingClientRect();
    const beat=snapV(clamp((clientX-r.left+velRef.current.scrollLeft)/pxPerBeat,0,beats));
    const value=clamp(1-(clientY-r.top)/r.height,0,1);
    const key=beat.toFixed(3);
    const existing=lanePoints().filter(pt=>pt.s.toFixed(3)!==key);
    const next=[...existing,{id:uid(),s:beat,v:value}].sort((a,b)=>a.s-b.s);
    commitControllers({...controllers,[lane]:next});
  };
  const dragControllerLane=(e)=>{ if(lane==="velocity") return;
    e.stopPropagation(); mark("MIDI controller edit"); setLanePoint(e.clientX,e.clientY);
    const move=(ev)=>setLanePoint(ev.clientX,ev.clientY);
    const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);};
    window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
  };

  /* ---------- keyboard ---------- */
  React.useEffect(()=>{ const k=(e)=>{ const tag=e.target.tagName;
    if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT") return;
    const mod=e.ctrlKey||e.metaKey;
    if(mod && e.key.toLowerCase()==="a"){ e.preventDefault(); selectAll(); }
    else if(mod && e.key.toLowerCase()==="d"){ e.preventDefault(); duplicateSel(); }
    else if(mod && e.key.toLowerCase()==="c"){ copySel(); }
    else if(mod && e.key.toLowerCase()==="v"){ e.preventDefault(); paste(); }
    else if(e.key==="Delete"||e.key==="Backspace"){ if(selIds.length){e.preventDefault();deleteSel();} }
    else if(e.key==="ArrowLeft"||e.key==="ArrowRight"){ if(!selIds.length)return; e.preventDefault();
      const d=(e.key==="ArrowRight"?1:-1)*snapBeats;
      commit(notes.map(n=>isSel(n.id)?{...n,s:clamp(n.s+d,0,beats-0.05)}:n)); }
    else if(e.key==="ArrowUp"||e.key==="ArrowDown"){ if(!selIds.length)return; e.preventDefault();
      const d=(e.key==="ArrowUp"?1:-1)*(e.shiftKey?12:1);
      commit(notes.map(n=>isSel(n.id)?{...n,p:clamp(n.p+d,LO,HI)}:n)); }
    else if(!mod){ const map={p:"draw",b:"paint",s:"select",c:"slice",e:"erase",m:"mute"};
      if(map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]); }
  };
    window.addEventListener("keydown",k); return ()=>window.removeEventListener("keydown",k);
  },[notes,selIds,snapIdx,pxPerBeat,NH,clip]);

  const onWheel=(e)=>{
    if(e.shiftKey) return;
    if(p.wheelZoom!==false || e.ctrlKey || e.metaKey){
      e.preventDefault();
      if(e.altKey) setNH(h=>clamp(h+(e.deltaY<0?2:-2),9,30));
      else setPpb(z=>clamp(z+(e.deltaY<0?8:-8),16,140));
    }
  };

  if(!clip) return (
    <div style={{height,display:"grid",placeItems:"center",background:"var(--bg-2)"}}>
      <div style={{textAlign:"center",color:"var(--tx-3)"}}>
        {React.cloneElement(I.piano,{style:{width:34,height:34,opacity:.5,marginBottom:10}})}
        <div style={{fontSize:13}}>Double-click a MIDI clip to edit it here</div>
      </div>
    </div>
  );

  const cc = track.color;
  const TbBtn = ({icon,active,onClick,title,danger}) => (
    <button onClick={onClick} title={title}
      style={{width:30,height:30,borderRadius:7,display:"grid",placeItems:"center",
        color: active?"#04121a":(danger?"var(--tx-2)":"var(--tx-2)"),
        background: active?cc:"var(--bg-4)", border:`1px solid ${active?cc:"var(--line-2)"}`,
        boxShadow: active?`0 0 12px ${cc}66`:"none"}}>
      {React.cloneElement(I[icon],{style:{width:15,height:15}})}
    </button>
  );

  return (
    <div className="no-sel" style={{height,display:"flex",flexDirection:"column",background:"var(--bg-2)",overflow:"hidden"}}>
      <style>{`.daw-sel{height:28px;background:var(--bg-4);color:var(--tx);border:1px solid var(--line-2);
        border-radius:6px;font-size:11.5px;font-family:var(--ui);padding:0 7px;outline:none;cursor:pointer;}
        .daw-sel:hover{border-color:var(--line-3);}`}</style>

      {/* TOOLBAR */}
      <div onContextMenu={(e)=>{e.preventDefault();p.onClose&&p.onClose();}}
        style={{flex:"0 0 auto",display:"flex",alignItems:"center",gap:10,padding:"7px 12px",
          borderBottom:"1px solid var(--line-2)",background:"linear-gradient(var(--bg-3),var(--bg-2))",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
          <span style={{width:10,height:10,borderRadius:3,background:cc,boxShadow:`0 0 8px ${cc}`,flex:"0 0 auto"}}/>
          <span style={{fontWeight:600,fontSize:12.5,whiteSpace:"nowrap"}}>{track.name}</span>
          <span className="faint" style={{fontSize:11,whiteSpace:"nowrap"}}>· {clip.name}</span>
        </div>
        <div style={{width:1,height:24,background:"var(--line)"}}/>
        {/* tools */}
        <div style={{display:"flex",gap:4}}>
          {PR_TOOLS.map(t=><TbBtn key={t.id} icon={t.icon} active={tool===t.id} onClick={()=>setTool(t.id)} title={t.title}/>)}
        </div>
        <div style={{width:1,height:24,background:"var(--line)"}}/>
        {/* clipboard ops */}
        <div style={{display:"flex",gap:4}}>
          <TbBtn icon="selectall" onClick={selectAll} title="Select all (⌘A)"/>
          <TbBtn icon="duplicate" onClick={duplicateSel} title="Duplicate selection → builds your beat (⌘D)"/>
          <TbBtn icon="copy" onClick={copySel} title="Copy (⌘C)"/>
          <TbBtn icon="paste" onClick={paste} title="Paste at playhead (⌘V)"/>
          <TbBtn icon="trash" onClick={deleteSel} title="Delete selection (Del)" danger/>
        </div>
        <div style={{width:1,height:24,background:"var(--line)"}}/>
        <select value={lane} onChange={e=>setLane(e.target.value)} className="daw-sel" title="MIDI edit lane">
          <option value="velocity">Velocity</option>
          <option value="cc1">CC 1 Mod Wheel</option>
          <option value="pitchbend">Pitch Bend</option>
          <option value="aftertouch">Aftertouch</option>
        </select>
        <div style={{flex:1,minWidth:8}}/>
        {/* snap */}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <button onClick={p.setSnap?()=>p.setSnap(s=>!s):undefined} title="Snap to grid"
            style={{width:30,height:28,borderRadius:6,display:"grid",placeItems:"center",
              color:snap?"#04121a":"var(--tx-2)",background:snap?"var(--blue)":"var(--bg-4)",
              border:`1px solid ${snap?"var(--blue)":"var(--line-2)"}`}}>
            {React.cloneElement(I.magnet,{style:{width:14,height:14}})}</button>
          <select value={snapIdx} onChange={e=>setSnapIdx(+e.target.value)} className="daw-sel" title="Snap / grid value">
            {SNAPS.map((s,i)=><option key={i} value={i}>{s.label}</option>)}</select>
        </div>
        {/* scale */}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <select value={scale.root} onChange={e=>p.setScale({...scale,root:e.target.value})} className="mono daw-sel">
            {ROOTS.map(r=><option key={r}>{r}</option>)}</select>
          <select value={scale.name} onChange={e=>p.setScale({...scale,name:e.target.value})} className="daw-sel">
            {Object.keys(SCALES).map(s=><option key={s}>{s}</option>)}</select>
          <button onClick={p.onFold} title="Fold to scale"
            style={{height:28,padding:"0 10px",borderRadius:6,fontSize:11,fontWeight:600,
              color:p.fold?"#04121a":"var(--tx-2)",background:p.fold?"var(--purple)":"var(--bg-4)",
              border:`1px solid ${p.fold?"var(--purple)":"var(--line-2)"}`}}>Fold</button>
        </div>
        {/* zoom */}
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <TbBtn icon="zoomout" onClick={()=>setPpb(z=>clamp(z-12,16,140))} title="Zoom out"/>
          <span className="mono faint" style={{fontSize:10,width:34,textAlign:"center"}}>{Math.round(pxPerBeat/46*100)}%</span>
          <TbBtn icon="zoomin" onClick={()=>setPpb(z=>clamp(z+12,16,140))} title="Zoom in"/>
        </div>
        <button className="iconbtn" onClick={p.onClose} title="Close piano roll">{I.close}</button>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",minHeight:0}}>
        <div ref={keysRef} style={{width:62,flex:"0 0 auto",overflow:"hidden",borderRight:"1px solid var(--line-2)",background:"var(--bg-1)"}}>
          <div style={{position:"relative",height:gridH}}>
            {allRows.map((m,i)=>{ const blk=isBlack(m), inSc=inScale(m,rootPc,scale.name), root=(((m-rootPc)%12)+12)%12===0;
              return <div key={m} onPointerDown={()=>preview(m)}
                style={{position:"absolute",top:i*NH,left:0,right:0,height:NH,display:"flex",alignItems:"center",
                  justifyContent:"flex-end",paddingRight:6,cursor:"pointer",fontSize:8.5,
                  background:blk?"#0a0c11":"#161a22",color:root?"var(--cyan)":"var(--tx-3)",
                  borderBottom:"1px solid rgba(0,0,0,.4)",
                  boxShadow:root?"inset 2px 0 0 var(--cyan)":(inSc&&!p.fold?"inset 2px 0 0 var(--purple)":"none")}}
                className="mono">{(m%12===0)?noteName(m):(root?noteName(m):"")}</div>; })}
          </div>
        </div>
        <div ref={gridRef} onScroll={onScroll} onWheel={onWheel} onPointerDown={gridDown} onContextMenu={gridMenu}
          style={{flex:1,overflow:"auto",position:"relative",
            cursor:tool==="draw"?"crosshair":tool==="erase"?"not-allowed":tool==="slice"?"col-resize":"default"}}>
          <div style={{position:"relative",width:gridW,height:gridH}}>
            {allRows.map((m,i)=>{ const blk=isBlack(m), inSc=inScale(m,rootPc,scale.name);
              return <div key={m} style={{position:"absolute",top:i*NH,left:0,width:gridW,height:NH,
                background: !inSc?"rgba(0,0,0,.34)":(blk?"rgba(0,0,0,.16)":"transparent"),
                borderBottom:`1px solid ${m%12===0?"var(--line-2)":"rgba(255,255,255,.025)"}`}}/>; })}
            {Array.from({length:beats+1}).map((_,b)=>(
              <div key={b} style={{position:"absolute",top:0,bottom:0,left:b*pxPerBeat,width:1,
                background:b%4===0?"var(--line-3)":"var(--line)"}}/>
            ))}
            {snapBeats<1 && Array.from({length:Math.ceil(beats/snapBeats)}).map((_,s)=>{ const x=s*snapBeats;
              return x%1!==0 && <div key={"s"+s} style={{position:"absolute",top:0,bottom:0,left:x*pxPerBeat,width:1,background:"rgba(255,255,255,.025)"}}/>; })}
            {/* notes */}
            {notes.map(n=>{ const i=rowIndex(n.p), s=isSel(n.id);
              return <div key={n.id} onPointerDown={(e)=>noteDown(e,n)}
                onContextMenu={(e)=>noteMenu(e,n)}
                style={{position:"absolute",top:i*NH+1,left:n.s*pxPerBeat,height:NH-2,width:Math.max(n.l*pxPerBeat-1,4),
                  borderRadius:3,background: n.muted?"var(--bg-5)":`linear-gradient(${cc},color-mix(in srgb,${cc} 75%,#000))`,
                  border:`1px solid ${s?"#fff":(n.muted?"var(--line-3)":"color-mix(in srgb,#000 25%,"+cc+")")}`,
                  opacity:n.muted?.45:(0.55+n.v*0.45),
                  boxShadow:s?`0 0 0 1px #fff,0 0 10px ${cc}`:`0 1px 3px rgba(0,0,0,.4)`,
                  cursor:tool==="erase"?"not-allowed":tool==="slice"?"col-resize":"grab"}}>
                <span style={{position:"absolute",right:0,top:0,bottom:0,width:6,cursor:"ew-resize"}}/>
              </div>; })}
            {/* marquee */}
            {marquee && <div style={{position:"absolute",left:marquee.x,top:marquee.y,width:marquee.w,height:marquee.h,
              background:"color-mix(in srgb,var(--cyan) 14%,transparent)",border:"1px solid var(--cyan)",borderRadius:2,pointerEvents:"none"}}/>}
            {/* playhead */}
            {p.playing && p.playBeatInClip!=null && p.playBeatInClip>=0 && p.playBeatInClip<=beats &&
              <div style={{position:"absolute",top:0,bottom:0,left:p.playBeatInClip*pxPerBeat,width:1.5,background:"var(--cyan)",
                boxShadow:"0 0 8px var(--cyan)",pointerEvents:"none",zIndex:5}}/>}
          </div>
        </div>
      </div>

      {/* VELOCITY */}
      <div style={{height:62,flex:"0 0 auto",display:"flex",borderTop:"1px solid var(--line-2)",background:"var(--bg-1)"}}>
        <div style={{width:62,flex:"0 0 auto",borderRight:"1px solid var(--line-2)",display:"flex",alignItems:"center",
          justifyContent:"center",gap:5,color:"var(--tx-3)"}}>
          {React.cloneElement(I.vel,{style:{width:13,height:13}})}<span style={{fontSize:9,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase"}}>{lane==="velocity"?"VEL":lane}</span>
        </div>
        <div ref={velRef} onPointerDown={dragControllerLane} style={{flex:1,overflow:"hidden",position:"relative",cursor:lane==="velocity"?"default":"crosshair"}}>
          <div className="vellane" style={{position:"relative",width:gridW,height:"100%"}}>
            {lane==="velocity" ? notes.map(n=>(
              <div key={n.id} onPointerDown={(e)=>dragVel(e,n)}
                style={{position:"absolute",bottom:0,left:n.s*pxPerBeat,width:Math.max(n.l*pxPerBeat-1,4),
                  height:`${n.v*100}%`,background:isSel(n.id)?"#fff":cc,opacity:isSel(n.id)?.95:.65,
                  borderRadius:"2px 2px 0 0",cursor:"ns-resize",boxShadow:`0 0 4px ${cc}`}}>
                <div style={{position:"absolute",top:-2,left:0,right:0,height:3,borderRadius:2,background:isSel(n.id)?"#fff":cc}}/>
              </div>
            )) : <>
              <div style={{position:"absolute",left:0,right:0,top:"50%",height:1,background:"var(--line-2)"}}/>
              {lanePoints().map(pt=>(
                <div key={pt.id} style={{position:"absolute",left:pt.s*pxPerBeat-3,bottom:`calc(${pt.v*100}% - 3px)`,
                  width:7,height:7,borderRadius:99,background:cc,boxShadow:`0 0 8px ${cc}`}}/>
              ))}
              {lanePoints().map((pt,i,arr)=>i>0 && <div key={"l"+pt.id} style={{position:"absolute",
                left:arr[i-1].s*pxPerBeat, bottom:`${arr[i-1].v*100}%`,
                width:(pt.s-arr[i-1].s)*pxPerBeat, height:1, transformOrigin:"left center",
                transform:`rotate(${Math.atan2((arr[i-1].v-pt.v)*62,(pt.s-arr[i-1].s)*pxPerBeat)}rad)`,
                background:cc,opacity:.8}}/> )}
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PianoRoll });
