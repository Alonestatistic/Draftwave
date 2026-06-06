/* ============================================================
   Draftwave - full settings scaffold
   ============================================================ */

const SETTINGS_TABS = [
  { id:"project", label:"Project" },
  { id:"editing", label:"Editing" },
  { id:"appearance", label:"Appearance" },
  { id:"keybinds", label:"Keybinds" },
  { id:"rendering", label:"Export" },
];

const KEYBIND_LABELS = {
  transport:"Play / pause",
  save:"Save project",
  saveAs:"Save project as",
  open:"Open project",
  newProject:"New project",
  undo:"Undo",
  redo:"Redo",
  split:"Split clip",
};

function SettingsModal({ settings, onChange, onClose }) {
  const [tab, setTab] = React.useState("project");
  const [draft, setDraft] = React.useState(() => ProjectIO.mergeSettings(settings));
  const [notice, setNotice] = React.useState(null);
  const [menu, setMenu] = React.useState(null);
  const zoom = Math.max(0.6, Number(document.documentElement.style.zoom || settings?.appearance?.uiScale || 1) || 1);
  const modalW = Math.max(340, Math.min(880, (window.innerWidth - 32) / zoom));
  const modalH = Math.max(380, Math.min(640, (window.innerHeight - 32) / zoom));

  const set = (section, key, value) => setDraft(s => ({ ...s, [section]:{ ...s[section], [key]:value } }));
  const save = () => {
    const next = ProjectIO.saveSettings(draft);
    onChange(next);
    setNotice("Settings saved.");
    setTimeout(() => onClose(), 300);
  };
  const Field = ({ label, hint, children }) => (
    <label style={{display:"flex",flexDirection:"column",gap:7,marginBottom:15}}>
      <span style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"var(--tx-2)"}}>{label}</span>
      {children}
      {hint && <span className="faint" style={{fontSize:11,lineHeight:1.45}}>{hint}</span>}
    </label>
  );
  const input = {height:36,background:"var(--bg-1)",border:"1px solid var(--line-2)",borderRadius:8,
    color:"var(--tx)",padding:"0 10px",outline:"none",fontFamily:"var(--ui)",fontSize:12.5};
  const select = (value, onChange, options) => (
    <div style={{position:"relative"}}>
      <button type="button" onClick={(e)=>{ e.stopPropagation(); const r=e.currentTarget.getBoundingClientRect();
          setMenu({ value:String(value), options, onChange, x:r.left, y:r.bottom+5, w:r.width }); }}
        style={{...input,width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",textAlign:"left"}}>
        <span>{String(value)}</span>
        {React.cloneElement(I.chevron,{style:{width:14,height:14,transform:"rotate(90deg)",color:"var(--tx-3)"}})}
      </button>
    </div>
  );
  const toggle = (section, key) => (
    <button onClick={()=>set(section, key, !draft[section][key])}
      style={{height:32,padding:"0 12px",borderRadius:99,fontSize:12,fontWeight:700,
        color:draft[section][key]?"#04121a":"var(--tx-2)",background:draft[section][key]?"var(--cyan)":"var(--bg-4)",
        border:`1px solid ${draft[section][key]?"var(--cyan)":"var(--line-2)"}`}}>
      {draft[section][key] ? "On" : "Off"}
    </button>
  );
  const num = (section, key, min, max, step=1) => (
    <input type="number" value={draft[section][key]} min={min} max={max} step={step}
      onChange={e=>{
        const value = Number(e.target.value);
        set(section, key, Number.isFinite(value) ? clamp(value, min, max) : min);
      }} style={input}/>
  );

  const pane = {
    project: <Panel title="Project">
      <Field label="Autosave">{toggle("project","autosave")}</Field>
      <Field label="Autosave interval seconds">{num("project","autosaveSeconds",5,120)}</Field>
      <Field label="Copy imported media">{toggle("project","copyImportedMedia")}</Field>
      <Field label="Default template" hint="Used for new-project defaults as templates mature.">{select(draft.project.template, v=>set("project","template",v), ["Empty","Writing","Mixing","Mastering","Live Recording"])}</Field>
    </Panel>,
    editing: <Panel title="Editing">
      <Field label="Wheel zoom">{toggle("editing","wheelZoom")}</Field>
      <Field label="Vertical wheel scroll">{toggle("editing","verticalWheelScroll")}</Field>
      <Field label="Snap by default">{toggle("editing","snapDefault")}</Field>
      <Field label="Humanize timing ms">{num("editing","humanizeTimingMs",0,80)}</Field>
      <Field label="Humanize velocity">{num("editing","humanizeVelocity",0,40)}</Field>
    </Panel>,
    appearance: <Panel title="Appearance">
      <Field label="Theme">{select(draft.appearance.theme, v=>set("appearance","theme",v), ["Neon Studio","Midnight Console","Tape Room","Minimal Dark"])}</Field>
      <Field label="UI scale">{num("appearance","uiScale",0.6,1.6,0.05)}</Field>
      <Field label="Show CPU">{toggle("appearance","showCpu")}</Field>
    </Panel>,
    keybinds: <Panel title="Custom Keybinds">
      {Object.keys(draft.keybinds).map(k => <Field key={k} label={KEYBIND_LABELS[k] || k}><input value={draft.keybinds[k]} onChange={e=>set("keybinds",k,e.target.value)} style={input}/></Field>)}
    </Panel>,
    rendering: <Panel title="Rendering">
      <Field label="Format" hint="Alpha export currently renders WAV. Other formats are kept out of the UI until implemented.">{select(draft.rendering.format, v=>set("rendering","format",v), ["wav"])}</Field>
      <Field label="Bit depth">{select(String(draft.rendering.bitDepth), v=>set("rendering","bitDepth",+v), ["16","24","32"])}</Field>
      <Field label="Normalize render">{toggle("rendering","normalize")}</Field>
      <Field label="Realtime render">{toggle("rendering","realtime")}</Field>
    </Panel>,
  };

  return (
    <div onPointerDown={()=>{ setMenu(null); onClose(); }} style={{position:"fixed",inset:0,zIndex:1200,display:"grid",placeItems:"center",
      background:"rgba(3,4,8,.68)",backdropFilter:"blur(9px)",animation:"popIn .16s ease"}}>
      <div onPointerDown={e=>e.stopPropagation()} style={{width:modalW,height:modalH,display:"flex",
        background:"var(--bg-2)",border:"1px solid var(--line-3)",borderRadius:"var(--r-4)",boxShadow:"var(--sh-pop)",overflow:"hidden"}}>
        <aside style={{width:210,background:"var(--bg-1)",borderRight:"1px solid var(--line)",padding:10,overflowY:"auto"}}>
          <div style={{fontSize:11,fontWeight:800,letterSpacing:".16em",color:"var(--tx-2)",padding:"8px 8px 12px"}}>SETTINGS</div>
          {SETTINGS_TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{width:"100%",height:34,display:"flex",alignItems:"center",padding:"0 10px",borderRadius:8,
                marginBottom:4,fontSize:12.5,fontWeight:700,textAlign:"left",
                color:tab===t.id?"#04121a":"var(--tx-2)",background:tab===t.id?"var(--cyan)":"transparent"}}>
              {t.label}
            </button>
          ))}
        </aside>
        <section style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
          <header style={{height:58,display:"flex",alignItems:"center",gap:12,padding:"0 18px",borderBottom:"1px solid var(--line)"}}>
            {React.cloneElement(I.fx,{style:{width:17,height:17,color:"var(--cyan)"}})}
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:800}}>Full DAW Settings</div>
              <div className="faint" style={{fontSize:11.5}}>Only current working app preferences live here.</div>
            </div>
            <button className="iconbtn" onClick={onClose}>{I.close}</button>
          </header>
          <div style={{flex:1,overflowY:"auto",padding:20}}>{pane[tab]}</div>
          <footer style={{height:58,display:"flex",alignItems:"center",gap:10,padding:"0 18px",borderTop:"1px solid var(--line)"}}>
            {notice && <span style={{fontSize:12,color:"var(--amber)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{notice}</span>}
            <span style={{flex:1}}/>
            <button onClick={onClose} style={{height:36,padding:"0 16px",borderRadius:8,color:"var(--tx-2)",fontWeight:700}}>Cancel</button>
            <button onClick={save} style={{height:36,padding:"0 20px",borderRadius:8,background:"var(--cyan)",color:"#04121a",
              fontWeight:800,boxShadow:"0 0 14px var(--cyan-glow)"}}>Save Settings</button>
          </footer>
        </section>
      </div>
      {menu && <div onPointerDown={e=>e.stopPropagation()} style={{position:"fixed",left:Math.max(8,Math.min(menu.x,window.innerWidth-menu.w-8)),
          top:Math.max(8,Math.min(menu.y,window.innerHeight-(menu.options.length*32+12)-8)),width:menu.w,zIndex:1300,
          padding:5,borderRadius:8,background:"var(--bg-3)",border:"1px solid var(--line-3)",boxShadow:"var(--sh-pop)"}}>
        {menu.options.map(o => <button key={o} type="button" onClick={()=>{ menu.onChange(String(o)); setMenu(null); }}
          style={{width:"100%",height:30,borderRadius:6,padding:"0 9px",display:"flex",alignItems:"center",justifyContent:"space-between",
            color:String(o)===menu.value?"#04121a":"var(--tx)",background:String(o)===menu.value?"var(--cyan)":"transparent",
            fontSize:12.5,fontWeight:700,textAlign:"left"}}>
          <span>{o}</span>{String(o)===menu.value && <span>✓</span>}
        </button>)}
      </div>}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div>
      <h2 style={{margin:"0 0 16px",fontSize:20,letterSpacing:"-.02em"}}>{title}</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:"4px 18px"}}>{children}</div>
    </div>
  );
}

Object.assign(window, { SettingsModal, SETTINGS_TABS, KEYBIND_LABELS });
