/* ============================================================
   Draftwave — mixer console
   ============================================================ */

function formatFxParam(value, def) {
  if (def.percent) return `${Math.round((value || 0) * 100)}%`;
  if (def.suffix) return `${Number(value || 0).toFixed(def.step < 1 ? 1 : 0)}${def.suffix}`;
  if (def.unit) return `${Number(value || 0).toFixed(def.step < 1 ? 1 : 0)}${def.unit}`;
  return String(value);
}

function FxBadge({ status }) {
  const isPreview = status === "preview";
  return (
    <span className="mono" title={isPreview ? "Audible in the built-in preview engine" : "Saved in the project; full DSP rendering is not modeled yet"}
      style={{fontSize:8.5,fontWeight:800,padding:"2px 5px",borderRadius:99,whiteSpace:"nowrap",
        color:isPreview?"var(--emerald)":"var(--amber)",
        background:isPreview?"color-mix(in srgb,var(--emerald) 12%,transparent)":"color-mix(in srgb,var(--amber) 12%,transparent)",
        border:`1px solid ${isPreview?"color-mix(in srgb,var(--emerald) 32%,transparent)":"color-mix(in srgb,var(--amber) 32%,transparent)"}`}}>
      {isPreview ? "PREVIEW" : "SAVED"}
    </span>
  );
}

function FxParamControl({ name, value, color, onChange }) {
  const def = getFxParamDef(name);
  if (def.options) {
    return (
      <label style={{display:"flex",flexDirection:"column",gap:4,minWidth:0,width:"100%"}}>
        <span className="faint" style={{fontSize:8.5,textTransform:"uppercase",letterSpacing:".08em"}}>{def.label}</span>
        <select value={value} onChange={e=>onChange(e.target.value)}
          style={{height:24,background:"var(--bg-1)",border:"1px solid var(--line-2)",borderRadius:5,
            color:"var(--tx)",fontSize:10.5,padding:"0 5px",outline:"none"}}>
          {def.options.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      </label>
    );
  }
  return (
    <Knob value={Number(value ?? 0)} min={def.min ?? 0} max={def.max ?? 1}
      onChange={v=>onChange(def.step >= 1 ? Math.round(v) : +v.toFixed(3))}
      size={28} color={color} label={def.label} fmt={v=>formatFxParam(v, def)}/>
  );
}

function FxEditor({ trackId, fx, color, onToggleFx, onRemoveFx, onUpdateFxParam }) {
  const meta = getFxMeta(fx.effectId);
  const params = fx.params || {};
  return (
    <div style={{marginTop:4,padding:"7px 6px",borderRadius:6,background:"var(--bg-1)",border:"1px solid var(--line)"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
        <FxBadge status={meta.status}/>
        <span className="faint" style={{fontSize:9.5,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{meta.category}</span>
        <button onClick={(e)=>{e.stopPropagation();onToggleFx&&onToggleFx(trackId,fx.id);}}
          title={fx.enabled===false?"Enable effect":"Bypass effect"}
          style={{width:22,height:20,borderRadius:4,fontSize:9,fontWeight:800,
            background:fx.enabled===false?"var(--amber)":"var(--bg-4)",
            color:fx.enabled===false?"#1a1205":"var(--tx-2)"}}>B</button>
        <button onClick={(e)=>{e.stopPropagation();onRemoveFx&&onRemoveFx(trackId,fx.id);}}
          title="Remove effect" style={{width:22,height:20,borderRadius:4,display:"grid",placeItems:"center",color:"var(--tx-2)",background:"var(--bg-4)"}}>
          {React.cloneElement(I.trash,{style:{width:11,height:11}})}
        </button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"8px 5px",justifyItems:"center"}}>
        {Object.keys(params).map(name=>(
          <FxParamControl key={name} name={name} value={params[name]} color={color}
            onChange={value=>onUpdateFxParam&&onUpdateFxParam(trackId,fx.id,name,value)}/>
        ))}
      </div>
    </div>
  );
}

function ChannelStrip({ t, level, master, onVol, onPan, onMute, onSolo, sel, onSelect, anySolo, onAddFx, onToggleFx, onRemoveFx, onUpdateFxParam }) {
  const [openFx, setOpenFx] = React.useState(null);
  const dimmed = !master && ((anySolo && !t.solo) || t.mute);
  const db = t.vol<=0?"-∞":(20*Math.log10(t.vol)).toFixed(1);
  const cc = master?"var(--cyan)":t.color;
  const fx = master?[makeFx("limiter"),makeFx("compressor")]:(t.fxChain||[]);
  const fxMenu=(e)=>openMenu(e,[
    { header:"Add Effect" },
    ...EFFECT_LIBRARY.map(f=>({ label:f.name, icon:"fx", shortcut:f.category, onClick:()=>onAddFx&&onAddFx(t.id,f.id) })),
  ]);
  return (
    <div onPointerDown={()=>!master&&onSelect(t.id)} className="no-sel mixer-strip"
      style={{width:master?112:132,flex:"0 0 auto",display:"flex",flexDirection:"column",
        background: master?"linear-gradient(var(--bg-3),var(--bg-2))":(sel?"color-mix(in srgb,var(--cyan) 6%,var(--bg-2))":"var(--bg-2)"),
        borderRight:"1px solid var(--line)",opacity:dimmed ? .45 : 1,transition:"opacity .15s,background .15s,filter .15s",
        borderTop:`2px solid ${master?"var(--cyan)":t.color}`,boxShadow:sel&&!master?`inset 0 0 0 1px color-mix(in srgb,${cc} 38%,transparent)`:"none"}}>
      {/* name */}
      <div style={{padding:"7px 8px",borderBottom:"1px solid var(--line)",display:"flex",alignItems:"center",gap:6}}>
        {!master && <span style={{width:8,height:8,borderRadius:2,background:cc,boxShadow:`0 0 6px ${cc}`,flex:"0 0 auto"}}/>}
        <span style={{fontSize:11,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
          color:master?"var(--cyan)":"var(--tx)"}}>{master?"MASTER":t.name}</span>
      </div>
      {/* fx chain */}
      <div style={{padding:"7px 7px",display:"flex",flexDirection:"column",gap:4,borderBottom:"1px solid var(--line)"}}>
        {fx.map((f,i)=>(
          <div key={f.id||i}>
          <div className="hardware-control" onClick={()=>!master&&setOpenFx(openFx===f.id?null:f.id)} onContextMenu={(e)=>!master&&openMenu(e,[
              { header:f.name },
              { label:f.enabled===false?"Enable":"Disable", checked:f.enabled!==false, onClick:()=>onToggleFx&&onToggleFx(t.id,f.id) },
              { label:"Remove Effect", icon:"trash", danger:true, onClick:()=>onRemoveFx&&onRemoveFx(t.id,f.id) },
            ])}
            style={{display:"flex",alignItems:"center",gap:5,height:19,padding:"0 6px",borderRadius:4,
            background:openFx===f.id?"color-mix(in srgb,var(--cyan) 9%,var(--bg-4))":"var(--bg-4)",fontSize:9.5,color:"var(--tx-2)",cursor:master?"default":"pointer"}}>
            <span style={{width:4,height:4,borderRadius:99,background:f.enabled===false?"var(--tx-4)":cc,boxShadow:f.enabled===false?"none":`0 0 4px ${cc}`}}/>
            <span style={{flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",opacity:f.enabled===false?0.45:1}}>{f.name}</span>
            {!master && <FxBadge status={getFxMeta(f.effectId).status}/>}
          </div>
          {!master && openFx===f.id && <FxEditor trackId={t.id} fx={f} color={cc}
            onToggleFx={onToggleFx} onRemoveFx={onRemoveFx} onUpdateFxParam={onUpdateFxParam}/>}
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
        borderBottom:"1px solid var(--line)",background:"var(--metal), var(--bg-3)",boxShadow:"0 1px 0 rgba(255,255,255,.05) inset"}}>
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
            onAddFx={p.onAddFx} onToggleFx={p.onToggleFx} onRemoveFx={p.onRemoveFx} onUpdateFxParam={p.onUpdateFxParam}/>
        ))}
        <div style={{flex:1,minWidth:14}}/>
        <ChannelStrip t={{name:"MASTER",vol:p.masterVol,pan:0}} master level={masterLvl}
          onVol={(_,v)=>p.setMasterVol(v)} onPan={()=>{}}/>
      </div>
    </div>
  );
}

Object.assign(window, { Mixer, ChannelStrip });
