/* ============================================================
   THE DAW - full settings scaffold
   ============================================================ */

const SETTINGS_TABS = [
  { id:"audio", label:"Audio" },
  { id:"midi", label:"MIDI" },
  { id:"project", label:"Project" },
  { id:"editing", label:"Editing" },
  { id:"appearance", label:"Appearance" },
  { id:"keybinds", label:"Keybinds" },
  { id:"rendering", label:"Rendering" },
  { id:"plugins", label:"Plugins" },
  { id:"ai", label:"AI/Remastering" },
  { id:"experimental", label:"Experimental" },
];

function SettingsModal({ settings, onChange, onClose }) {
  const [tab, setTab] = React.useState("audio");
  const [draft, setDraft] = React.useState(() => ProjectIO.mergeSettings(settings));
  const [notice, setNotice] = React.useState(null);

  const set = (section, key, value) => setDraft(s => ({ ...s, [section]:{ ...s[section], [key]:value } }));
  const save = () => {
    const next = ProjectIO.saveSettings(draft);
    onChange(next);
    setNotice("Settings saved.");
    setTimeout(() => onClose(), 300);
  };
  const unsupported = async (id) => {
    const res = await CapabilityRegistry.request(id);
    setNotice(res.message || "Capability is not available yet.");
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
    <select value={value} onChange={e=>onChange(e.target.value)} style={input}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
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
      onChange={e=>set(section, key, clamp(+e.target.value, min, max))} style={input}/>
  );

  const pane = {
    audio: <Panel title="Audio Engine">
      <Field label="Sample rate">{select(String(draft.audio.sampleRate), v=>set("audio","sampleRate",+v), ["44100","48000","88200","96000"])}</Field>
      <Field label="Buffer size">{select(String(draft.audio.bufferSize), v=>set("audio","bufferSize",+v), ["64","128","256","512","1024"])}</Field>
      <Field label="Input device"><input value={draft.audio.inputDevice} onChange={e=>set("audio","inputDevice",e.target.value)} style={input}/></Field>
      <Field label="Output device"><input value={draft.audio.outputDevice} onChange={e=>set("audio","outputDevice",e.target.value)} style={input}/></Field>
      <FeatureButton id="audio-recording" onClick={unsupported}/>
    </Panel>,
    midi: <Panel title="MIDI">
      <Field label="Input">{select(draft.midi.input, v=>set("midi","input",v), ["All inputs","None","Controller 1","Virtual MIDI"])}</Field>
      <Field label="Clock">{select(draft.midi.clock, v=>set("midi","clock",v), ["internal","external","send clock"])}</Field>
      <Field label="Chase notes">{toggle("midi","chaseNotes")}</Field>
      <Field label="MPE / aftertouch">{toggle("midi","enableMpe")}</Field>
      <FeatureButton id="midi-input" onClick={unsupported}/>
      <FeatureButton id="midi-cc-editing" onClick={unsupported}/>
    </Panel>,
    project: <Panel title="Project">
      <Field label="Autosave">{toggle("project","autosave")}</Field>
      <Field label="Autosave interval seconds">{num("project","autosaveSeconds",5,120)}</Field>
      <Field label="Copy imported media">{toggle("project","copyImportedMedia")}</Field>
      <Field label="Default template">{select(draft.project.template, v=>set("project","template",v), ["Empty","Writing","Mixing","Mastering","Live Recording"])}</Field>
    </Panel>,
    editing: <Panel title="Editing">
      <Field label="Plain wheel zoom">{toggle("editing","wheelZoom")}</Field>
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
      {Object.keys(draft.keybinds).map(k => <Field key={k} label={k}><input value={draft.keybinds[k]} onChange={e=>set("keybinds",k,e.target.value)} style={input}/></Field>)}
    </Panel>,
    rendering: <Panel title="Rendering">
      <Field label="Format">{select(draft.rendering.format, v=>set("rendering","format",v), ["wav","mp3","ogg","flac"])}</Field>
      <Field label="Bit depth">{select(String(draft.rendering.bitDepth), v=>set("rendering","bitDepth",+v), ["16","24","32"])}</Field>
      <Field label="Normalize render">{toggle("rendering","normalize")}</Field>
      <Field label="Realtime render">{toggle("rendering","realtime")}</Field>
      <FeatureButton id="offline-render" onClick={unsupported}/>
      <FeatureButton id="stem-export" onClick={unsupported}/>
    </Panel>,
    plugins: <Panel title="Plugins and Extensions">
      <Field label="Scan on startup">{toggle("plugins","scanOnStartup")}</Field>
      <Field label="Enable extensions">{toggle("plugins","enableExtensions")}</Field>
      <FeatureButton id="extensions" onClick={unsupported}/>
      <FeatureButton id="vst" onClick={unsupported}/>
      <FeatureButton id="soundfont" onClick={unsupported}/>
    </Panel>,
    ai: <Panel title="AI, Remastering, Stems">
      <Field label="Remaster provider"><input value={draft.ai.remasterProvider} onChange={e=>set("ai","remasterProvider",e.target.value)} style={input}/></Field>
      <Field label="Stem split provider"><input value={draft.ai.stemSplitProvider} onChange={e=>set("ai","stemSplitProvider",e.target.value)} style={input}/></Field>
      <Field label="Allow cloud audio">{toggle("ai","allowCloudAudio")}</Field>
      <FeatureButton id="ai-remaster" onClick={unsupported}/>
      <FeatureButton id="stem-split" onClick={unsupported}/>
    </Panel>,
    experimental: <Panel title="Experimental">
      <Field label="Native VST host">{toggle("experimental","nativeVstHost")}</Field>
      <Field label="Detachable windows">{toggle("experimental","detachableWindows")}</Field>
      <Field label="Web MIDI">{toggle("experimental","webMidi")}</Field>
      <FeatureButton id="multi-monitor" onClick={unsupported}/>
    </Panel>,
  };

  return (
    <div onPointerDown={onClose} style={{position:"fixed",inset:0,zIndex:1200,display:"grid",placeItems:"center",
      background:"rgba(3,4,8,.68)",backdropFilter:"blur(9px)",animation:"popIn .16s ease"}}>
      <div onPointerDown={e=>e.stopPropagation()} style={{width:"min(980px,94vw)",height:"min(760px,90vh)",display:"flex",
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
              <div className="faint" style={{fontSize:11.5}}>Renderer settings now, native backends as capabilities come online.</div>
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
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div>
      <h2 style={{margin:"0 0 16px",fontSize:20,letterSpacing:"-.02em"}}>{title}</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:"4px 18px"}}>{children}</div>
      <CapabilityMatrix/>
    </div>
  );
}

function FeatureButton({ id, onClick }) {
  const cap = CapabilityRegistry.byId(id);
  if (!cap) return null;
  return (
    <button onClick={()=>onClick(id)} style={{display:"flex",alignItems:"center",gap:10,minHeight:42,padding:"8px 10px",
      borderRadius:10,background:"var(--bg-3)",border:"1px solid var(--line)",color:"var(--tx)",textAlign:"left"}}>
      <span style={{flex:1}}>
        <span style={{display:"block",fontSize:12.5,fontWeight:800}}>{cap.title}</span>
        <span className="faint" style={{display:"block",fontSize:10.5,lineHeight:1.35}}>{cap.detail}</span>
      </span>
      <CapabilityBadge status={cap.status}/>
    </button>
  );
}

function CapabilityMatrix() {
  const caps = CapabilityRegistry.all();
  return (
    <div style={{marginTop:22,paddingTop:16,borderTop:"1px solid var(--line)"}}>
      <div style={{fontSize:11,fontWeight:800,letterSpacing:".12em",color:"var(--tx-3)",marginBottom:10}}>CAPABILITY REGISTRY</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:8}}>
        {caps.slice(0, 12).map(c => (
          <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 9px",borderRadius:9,
            background:"var(--bg-1)",border:"1px solid var(--line)"}}>
            <span style={{flex:1,minWidth:0,fontSize:11.5,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.title}</span>
            <CapabilityBadge status={c.status}/>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { SettingsModal, SETTINGS_TABS });
