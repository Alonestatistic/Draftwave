/* ============================================================
   Draftwave — universal browser (left)
   ============================================================ */

function Browser({ onAdd, onClose, media=[], onImportAudio }) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState({Instruments:true,Drums:true,Audio:true,Effects:false});
  const [favs, setFavs] = React.useState(()=>new Set(["FM Rhodes","Sub Bass 808"]));
  const [tab, setTab] = React.useState("all"); // all | fav

  const toggleFav = (name) => setFavs(s=>{ const n=new Set(s); n.has(name)?n.delete(name):n.add(name); return n; });
  const match = (it) => !q || (it.name+" "+it.tag).toLowerCase().includes(q.toLowerCase());

  const Item = ({it}) => (
    <div draggable className="brow-item no-sel"
      onDragStart={(e)=>{ const payload=it.mediaId?{name:it.name,kind:it.kind,tag:it.tag,mediaId:it.mediaId}:it;
        e.dataTransfer.setData("text/daw-item", JSON.stringify(payload)); e.dataTransfer.effectAllowed="copy"; }}
      onDoubleClick={()=>onAdd(it)}
      title={`Double-click or drag to add · ${it.name}`}
      style={{display:"flex",alignItems:"center",gap:9,padding:"7px 9px",borderRadius:"var(--r-2)",cursor:"grab",
        transition:"background .12s"}}>
      <span style={{width:24,height:24,display:"grid",placeItems:"center",borderRadius:6,flex:"0 0 auto",
        background:"var(--bg-4)",color:"var(--tx-2)"}}>
        {React.cloneElement(I[TRACK_KINDS[it.kind]?.icon||"fx"],{style:{width:14,height:14}})}
      </span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it.name}</div>
        <div className="faint" style={{fontSize:9.5,letterSpacing:".04em"}}>{it.tag}</div>
      </div>
      <button onClick={(e)=>{e.stopPropagation();toggleFav(it.name);}} className="fav-star"
        style={{color:favs.has(it.name)?"var(--amber)":"var(--tx-4)",fontSize:13,lineHeight:1,padding:2}}>★</button>
    </div>
  );

  const allItems = BROWSER_TREE.flatMap(c=>c.items);
  const mediaItems = media.map(m=>({name:m.name,kind:"audio",tag:`${m.format?.toUpperCase()||"AUDIO"} - ${Math.round((m.duration||0)*10)/10}s`, mediaId:m.id, media:m}));
  const phase3Tree = [
    { cat:"Phase 3 Instruments", icon:"piano", items:INSTRUMENT_LIBRARY },
  ];
  const browserTree = mediaItems.length ? [
    ...BROWSER_TREE,
    ...phase3Tree,
    { cat:"Imported Media", icon:"wave", items:mediaItems },
  ] : [...BROWSER_TREE,...phase3Tree];
  const favItems = [...allItems,...mediaItems].filter(it=>favs.has(it.name) && match(it));

  return (
    <aside className="no-sel" style={{width:248,flex:"0 0 auto",display:"flex",flexDirection:"column",
      background:"var(--bg-2)",borderRight:"1px solid var(--line-2)",overflow:"hidden"}}>
      <style>{`
        .brow-item:hover{background:var(--bg-3);}
        .brow-item:hover .fav-star{opacity:1;}
        .cat-hd:hover{color:var(--tx);}
      `}</style>

      <div style={{padding:"12px 12px 10px",borderBottom:"1px solid var(--line)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <span style={{fontSize:11,fontWeight:700,letterSpacing:".16em",color:"var(--tx-2)"}}>BROWSER</span>
          <button className="iconbtn" style={{width:24,height:24}} onClick={onClose} title="Hide browser">{I.close}</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,height:34,padding:"0 11px",borderRadius:"var(--r-2)",
          background:"var(--bg-1)",border:"1px solid var(--line-2)"}}>
          {React.cloneElement(I.search,{style:{width:15,height:15,color:"var(--tx-3)",flex:"0 0 auto"}})}
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search everything…"
            style={{flex:1,background:"none",border:"none",outline:"none",color:"var(--tx)",fontSize:12.5}}/>
          {q && <button onClick={()=>setQ("")} className="faint" style={{fontSize:11}}>clear</button>}
        </div>
        <div style={{marginTop:10}}>
          <Segmented options={[{value:"all",label:"All"},{value:"fav",label:"★ Favorites"}]} value={tab} onChange={setTab} color="var(--cyan)"/>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"8px 8px 16px"}}>
        <button onClick={onImportAudio} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 10px",marginBottom:8,
          borderRadius:"var(--r-2)",background:"color-mix(in srgb,var(--cyan) 12%,var(--bg-3))",
          border:"1px solid color-mix(in srgb,var(--cyan) 35%,transparent)",color:"var(--cyan)",fontWeight:700,fontSize:12}}>
          {React.cloneElement(I.wave,{style:{width:15,height:15}})}
          <span>Upload Sounds</span>
        </button>
        {tab==="fav" ? (
          favItems.length ? favItems.map(it=><Item key={it.name} it={it}/>)
          : <div className="faint" style={{textAlign:"center",fontSize:11,padding:"30px 10px"}}>No favorites match.</div>
        ) : (
          browserTree.map(cat=>{
            const items = cat.items.filter(match);
            if(q && !items.length) return null;
            return (
              <div key={cat.cat} style={{marginBottom:4}}>
                <button className="cat-hd" onClick={()=>setOpen(o=>({...o,[cat.cat]:!o[cat.cat]}))}
                  style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 9px",color:"var(--tx-2)",
                    fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase"}}>
                  {React.cloneElement(I.chevron,{style:{width:13,height:13,transform:(open[cat.cat]||q)?"rotate(90deg)":"none",
                    transition:"transform .16s"}})}
                  {React.cloneElement(I[cat.icon],{style:{width:14,height:14,color:"var(--tx-3)"}})}
                  {cat.cat}
                  <span style={{flex:1}}/>
                  <span className="faint mono" style={{fontSize:10}}>{items.length}</span>
                </button>
                {(open[cat.cat]||q) && <div style={{paddingLeft:2}}>{items.map(it=><Item key={it.name} it={it}/>)}</div>}
              </div>
            );
          })
        )}
      </div>

      <div style={{padding:"9px 12px",borderTop:"1px solid var(--line)",display:"flex",alignItems:"center",gap:8}}>
        {React.cloneElement(I.spark,{style:{width:13,height:13,color:"var(--cyan)"}})}
        <span className="faint" style={{fontSize:10.5}}>Upload, drag onto the timeline, or double-click to add</span>
      </div>
    </aside>
  );
}

Object.assign(window, { Browser });
