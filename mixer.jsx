/* ============================================================
   THE DAW — mixer console
   ============================================================ */

function ChannelStrip({ t, level, master, onVol, onPan, onMute, onSolo, sel, onSelect, anySolo, onAddFx, onToggleFx, onRemoveFx }) {
  const dimmed = !master && ((anySolo && !t.solo) || t.mute);
  const db = t.vol<=0?"-∞":(20*Math.log10(t.vol)).toFixed(1);
  const cc = master?"var(--cyan)":t.color;
  const fx = master?[makeFx("limiter"),makeFx("compressor")]:(t.fxChain||[]);
  const fxMenu=(e)=>openMenu(e,[
    { header:"Add Effect" },
    ...EFFECT_LIBRARY.map(f=>({ label:f.name, icon:"fx", shortcut:f.category, onClick:()=>onAddFx&&onAddFx(t.id,f.id) })),
  ]);
  return (
    <div onPointerDown={()=>!master&&onSelect(t.id)} className="no-sel"
      style={{width:master?108:92,flex:"0 0 auto",display:"flex",flexDirection:"column",
        background: master?"linear-gradient(var(--bg-3),var(--bg-2))":(sel?"color-mix(in srgb,var(--cyan) 6%,var(--bg-2))":"var(--bg-2)"),
        borderRight:"1px solid var(--line)",opacity:dimmed?.45:1,transition:"opacity .15s,background .15s",
        borderTop:`2px solid ${master?"var(--cyan)":t.color}`}}>
      {/* name */}
      <div style={{padding:"7px 8px",borderBottom:"1px solid var(--line)",display:"flex",alignItems:"center",gap:6}}>
        {!master && <span style={{width:8,height:8,borderRadius:2,background:cc,boxShadow:`0 0 6px ${cc}`,flex:"0 0 auto"}}/>}
        <span style={{fontSize:11,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
          color:master?"var(--cyan)":"var(--tx)"}}>{master?"MASTER":t.name}</span>
      </div>
      {/* fx chain */}
      <div style={{padding:"7px 7px",display:"flex",flexDirection:"column",gap:4,borderBottom:"1px solid var(--line)"}}>
        {fx.map((f,i)=>(
          <div key={f.id||i} onContextMenu={(e)=>!master&&openMenu(e,[
              { header:f.name },
              { label:f.enabled===false?"Enable":"Disable", checked:f.enabled!==false, onClick:()=>onToggleFx&&onToggleFx(t.id,f.id) },
              { label:"Remove Effect", icon:"trash", danger:true, onClick:()=>onRemoveFx&&onRemoveFx(t.id,f.id) },
            ])}
            style={{display:"flex",alignItems:"center",gap:5,height:19,padding:"0 6px",borderRadius:4,
            background:"var(--bg-4)",fontSize:9.5,color:"var(--tx-2)"}}>
            <span style={{width:4,height:4,borderRadius:99,background:f.enabled===false?"var(--tx-4)":cc,boxShadow:f.enabled===false?"none":`0 0 4px ${cc}`}}/>
            <span style={{flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",opacity:f.enabled===false?0.45:1}}>{f.name}</span>
          </div>
        ))}
        {!master && <button onClick={fxMenu} style={{height:18,borderRadius:4,border:"1px dashed var(--line-3)",color:"var(--tx-3)",fontSize:9.5,
          display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
          {React.cloneElement(I.plus,{style:{width:10,height:10}})}Add FX</button>}
      </div>
      {/* pan */}
      <div style={{display:"flex",justifyContent:"center",padding:"8px 0 6px"}}>
        <Knob value={t.pan} min={-1} max={1} onChange={v=>onPan(t.id,v)} size={30} color={cc}
          label="Pan" fmt={v=>Math.abs(v)<0.02?"C":(v<0?"L":"R")+Math.round(Math.abs(v)*100)}/>
      </div>
      {/* fader + meter */}
      <div style={{flex:1,display:"flex",justifyContent:"center",gap:7,padding:"6px 8px 4px",minHeight:130}}>
        <Fader value={t.vol} onChange={v=>onVol(t.id,v)} height={150} color={cc}/>
        <div style={{display:"flex",gap:2}}>
          <VuMeter level={level} height={150} w={6}/>
          <VuMeter level={level*0.86} height={150} w={6}/>
        </div>
      </div>
      {/* db + M/S */}
      <div style={{padding:"5px 8px 9px",display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
        <span className="mono" style={{fontSize:10,color:"var(--tx-2)"}}>{db} dB</span>
        {!master && <div style={{display:"flex",gap:5}}>
          <button onPointerDown={e=>{e.stopPropagation();onMute(t.id);}} className="mono"
            style={{width:26,height:20,borderRadius:4,fontSize:10,fontWeight:700,
              background:t.mute?"var(--amber)":"var(--bg-4)",color:t.mute?"#1a1205":"var(--tx-2)"}}>M</button>
          <button onPointerDown={e=>{e.stopPropagation();onSolo(t.id);}} className="mono"
            style={{width:26,height:20,borderRadius:4,fontSize:10,fontWeight:700,
              background:t.solo?"var(--cyan)":"var(--bg-4)",color:t.solo?"#04121a":"var(--tx-2)"}}>S</button>
        </div>}
      </div>
    </div>
  );
}

function Mixer(p) {
  const masterLvl = Math.min(1, p.tracks.reduce((a,t,i)=> a + (p.levels[t.id]||0)*t.vol, 0) / Math.max(1,p.tracks.length*0.5));
  const anySolo = p.tracks.some(t=>t.solo);
  return (
    <div className="no-sel" style={{height:p.height,display:"flex",flexDirection:"column",background:"var(--bg-1)",overflow:"hidden"}}>
      <div onContextMenu={(e)=>{e.preventDefault();p.onClose&&p.onClose();}}
        style={{height:42,flex:"0 0 auto",display:"flex",alignItems:"center",gap:10,padding:"0 12px",
        borderBottom:"1px solid var(--line)",background:"var(--bg-3)"}}>
        {React.cloneElement(I.mixer,{style:{width:15,height:15,color:"var(--cyan)"}})}
        <span style={{fontWeight:600,fontSize:12.5}}>Mixer</span>
        <span className="faint" style={{fontSize:11}}>· {p.tracks.length} channels</span>
        <span style={{flex:1}}/>
        <button className="iconbtn" onClick={p.onClose} title="Close mixer">{I.close}</button>
      </div>
      <div style={{flex:1,display:"flex",overflowX:"auto",minHeight:0}}>
        {p.tracks.map(t=>(
          <ChannelStrip key={t.id} t={t} level={p.levels[t.id]||0} anySolo={anySolo} sel={p.selTrack===t.id}
            onSelect={p.selectTrack} onVol={p.setVol} onPan={p.setPan} onMute={p.toggleMute} onSolo={p.toggleSolo}
            onAddFx={p.onAddFx} onToggleFx={p.onToggleFx} onRemoveFx={p.onRemoveFx}/>
        ))}
        <div style={{flex:1,minWidth:14}}/>
        <ChannelStrip t={{name:"MASTER",vol:p.masterVol,pan:0}} master level={masterLvl}
          onVol={(_,v)=>p.setMasterVol(v)} onPan={()=>{}}/>
      </div>
    </div>
  );
}

Object.assign(window, { Mixer, ChannelStrip });
