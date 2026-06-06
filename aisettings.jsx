/* ============================================================
   Draftwave - AI engine settings modal
   ============================================================ */

function AISettingsModal({ onClose, onSaved, embedded=false }) {
  const [c, setC] = React.useState(AI.load());
  const [tab, setTab] = React.useState(c.provider);
  const [showKey, setShowKey] = React.useState(false);
  const [test, setTest] = React.useState(null);
  const [installed, setInstalled] = React.useState(null);
  const [copied, setCopied] = React.useState(null);
  const [pull, setPull] = React.useState(null);
  const P = PROVIDERS[tab];

  const setKey = (prov, v) => setC(s => ({ ...s, keys:{ ...s.keys, [prov]:v } }));
  const setModel = (prov, v) => setC(s => ({ ...s, models:{ ...s.models, [prov]:v } }));
  const persist = (extra={}) => {
    const next = { ...c, provider:tab, ...extra };
    AI.save(next);
    return next;
  };

  const runTest = async () => {
    persist();
    setTest("run");
    try {
      const r = await AI.ask({ system:"You are a connection test. Reply with the single word READY.", user:"ping" });
      setTest({ ok:true, msg:(r || "").trim().slice(0, 40) || "Connected" });
    } catch(e) {
      setTest({ ok:false, msg:String(e.message || e).slice(0, 120) });
    }
  };

  const detect = async () => {
    setInstalled("load");
    try {
      const list = await AI.listOllama(c.ollamaUrl);
      setInstalled(list.length ? list : []);
    } catch(e) {
      setInstalled({ err:String(e.message || e) });
    }
  };

  const copy = (cmd) => {
    try { navigator.clipboard.writeText(cmd); } catch(_) {}
    setCopied(cmd);
    setTimeout(() => setCopied(x => x === cmd ? null : x), 1400);
  };

  React.useEffect(() => {
    window.dawNative?.listOllamaPulls?.().then(list => {
      const active = [...(list || [])].reverse().find(item => item && !item.done) || [...(list || [])].reverse()[0];
      if (active) setPull(active);
    }).catch(() => {});
    if (!window.dawNative?.onOllamaPullProgress) return;
    return window.dawNative.onOllamaPullProgress((msg) => {
      setPull(p => p && msg.model === p.model ? { ...p, ...msg } : p);
    });
  }, []);

  const pullViaFetch = async (model) => {
    const url = (c.ollamaUrl || "http://localhost:11434").replace(/\/$/, "");
    const r = await fetch(url + "/api/pull", {
      method:"POST",
      headers:{ "content-type":"application/json" },
      body:JSON.stringify({ model, stream:true }),
    });
    if (!r.ok || !r.body) throw new Error("Ollama " + r.status + " - is it running?");

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream:true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const msg = JSON.parse(line);
        const total = +msg.total || 0;
        const completed = +msg.completed || 0;
        setPull(p => p && p.model === model ? {
          ...p,
          status:msg.status || "Downloading",
          digest:msg.digest,
          total,
          completed,
          percent:total ? Math.round((completed / total) * 100) : p.percent,
        } : p);
      }
    }
  };

  const downloadModel = async (model) => {
    setPull({ model, status:"Starting download", percent:0 });
    try {
      const res = window.dawNative?.pullOllamaModel
        ? await window.dawNative.pullOllamaModel({ model, url:c.ollamaUrl })
        : (await pullViaFetch(model), { ok:true });
      if (!res?.ok) throw new Error(res?.message || "Download failed");
      setModel("ollama", model);
      setPull(p => p && p.model === model ? { ...p, status:"Ready", percent:100, done:true } : p);
      try {
        const list = await AI.listOllama(c.ollamaUrl);
        setInstalled(list.length ? list : []);
      } catch(_) {}
    } catch(e) {
      setPull(p => p && p.model === model ? {
        ...p,
        status:"Download failed",
        error:String(e.message || e),
        done:true,
      } : p);
    }
  };

  const save = () => {
    persist();
    onSaved && onSaved();
    onClose();
  };

  const Field = ({ label, children, hint }) => (
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:"var(--tx-2)",marginBottom:7}}>{label}</div>
      {children}
      {hint && <div className="faint" style={{fontSize:11,marginTop:6,lineHeight:1.5}}>{hint}</div>}
    </div>
  );

  const inputStyle = {
    width:"100%",
    height:38,
    background:"var(--bg-1)",
    border:"1px solid var(--line-2)",
    borderRadius:"var(--r-2)",
    color:"var(--tx)",
    fontSize:13,
    padding:"0 12px",
    outline:"none",
    fontFamily:"var(--mono)",
  };

  const Chip = ({ on, onClick, children, accent }) => (
    <button onClick={onClick} style={{
      padding:"7px 12px",
      borderRadius:"var(--r-pill)",
      fontSize:12,
      fontWeight:600,
      fontFamily:"var(--mono)",
      transition:"all .12s",
      background:on ? `color-mix(in srgb,${accent} 18%,var(--bg-3))` : "var(--bg-3)",
      color:on ? accent : "var(--tx-2)",
      border:`1px solid ${on ? accent : "var(--line)"}`,
    }}>{children}</button>
  );

  const shellStyle = embedded
    ? {position:"absolute",inset:0,zIndex:30,display:"flex",background:"var(--bg-1)"}
    : {};
  const modalStyle = embedded
    ? {width:"100%",height:"100%",maxHeight:"none",display:"flex",flexDirection:"column",overflow:"hidden",borderRadius:0,border:"none"}
    : {width:"min(860px,calc(100vw - 32px))",maxHeight:"86vh",display:"flex",flexDirection:"column",overflow:"hidden"};
  const bodyStyle = embedded
    ? {flex:1,display:"flex",flexDirection:"column",minHeight:0}
    : {flex:1,display:"flex",minHeight:0};
  const railStyle = embedded
    ? {flex:"0 0 auto",borderBottom:"1px solid var(--line)",padding:8,overflowX:"auto",overflowY:"hidden",background:"var(--bg-1)",display:"flex",gap:6}
    : {width:212,flex:"0 0 auto",borderRight:"1px solid var(--line)",padding:10,overflowY:"auto",background:"var(--bg-1)"};
  const providerButtonStyle = (sel, accent) => embedded
    ? {
      minWidth:52,
      flex:"0 0 auto",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      gap:0,
      padding:"9px 8px",
      borderRadius:"var(--r-2)",
      textAlign:"left",
      transition:"all .14s",
      background:sel ? `color-mix(in srgb,${accent} 14%,var(--bg-3))` : "var(--bg-3)",
      border:`1px solid ${sel ? accent : "var(--line)"}`,
    }
    : {
      width:"100%",
      display:"flex",
      alignItems:"center",
      gap:11,
      padding:"11px 11px",
      borderRadius:"var(--r-2)",
      marginBottom:6,
      textAlign:"left",
      transition:"all .14s",
      background:sel ? `color-mix(in srgb,${accent} 14%,var(--bg-3))` : "transparent",
      border:`1px solid ${sel ? accent : "transparent"}`,
    };
  const downloadRowStyle = embedded
    ? {display:"grid",gridTemplateColumns:"1fr auto auto",gap:8,padding:"9px 10px",borderRadius:"var(--r-2)",background:"var(--bg-3)",border:"1px solid var(--line)"}
    : {display:"flex",alignItems:"center",gap:11,padding:"9px 11px",borderRadius:"var(--r-2)",background:"var(--bg-3)",border:"1px solid var(--line)"};

  return (
    <div className="modal-backdrop" style={shellStyle} onMouseDown={e => { if (!embedded && e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={modalStyle}>
        <div style={{padding:embedded ? "12px 14px" : "16px 20px",borderBottom:"1px solid var(--line)",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,borderRadius:9,display:"grid",placeItems:"center",
            background:"conic-gradient(from 140deg,var(--cyan),var(--purple),var(--emerald),var(--cyan))",boxShadow:"0 0 16px var(--cyan-glow)"}}>
            {React.cloneElement(I.spark,{style:{width:16,height:16,color:"#04121a"}})}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:700}}>AI Engine</div>
            <div className="faint" style={{fontSize:11.5}}>Choose who powers your Assistant Producer - cloud or fully local</div>
          </div>
          <button className="iconbtn" onClick={onClose}>{I.close}</button>
        </div>

        <div style={bodyStyle}>
          <div style={railStyle}>
            {Object.entries(PROVIDERS).map(([id, pv]) => {
              const sel = tab === id;
              return (
                <button key={id} onClick={() => { setTab(id); setTest(null); }} style={providerButtonStyle(sel, pv.accent)}>
                  <span style={{
                    width:30,
                    height:30,
                    flex:"0 0 auto",
                    borderRadius:8,
                    display:"grid",
                    placeItems:"center",
                    fontSize:13,
                    fontWeight:700,
                    color:sel ? "#04121a" : pv.accent,
                    background:sel ? pv.accent : `color-mix(in srgb,${pv.accent} 16%,transparent)`,
                    boxShadow:sel ? `0 0 12px ${pv.accent}66` : "none",
                  }}>{pv.label[0]}</span>
                  <div style={{minWidth:0,display:embedded?"none":"block"}}>
                    <div style={{fontSize:12.5,fontWeight:600,whiteSpace:"nowrap"}}>{pv.label}
                      {!pv.needsKey && <span style={{fontSize:9,marginLeft:6,padding:"1px 6px",borderRadius:99,
                        background:"color-mix(in srgb,var(--emerald) 16%,transparent)",color:"var(--emerald)",fontWeight:700,letterSpacing:".04em"}}>
                        {pv.local ? "LOCAL" : "FREE"}</span>}</div>
                    <div className="faint" style={{fontSize:10,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{pv.brand}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:embedded ? "16px 14px" : "20px 22px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
              <span style={{fontSize:17,fontWeight:700}}>{P.label}</span>
              <span className="faint" style={{fontSize:12}}>{P.sub}</span>
            </div>

            {tab === "builtin" && (
              <div style={{fontSize:13,lineHeight:1.7,color:"var(--tx-2)"}}>
                Draftwave tries the <b style={{color:"var(--tx)"}}>built-in model</b> first. If that is unavailable, it automatically tries your local Ollama server before falling back to simple offline commands. Pick another engine on the left to force a specific provider.
              </div>
            )}

            {P.needsKey && (
              <>
                <Field label="API key"
                  hint={<>Stored only in this browser (localStorage) - never sent anywhere but {P.label}. Get one at <b style={{color:P.accent}}>{P.keyUrl}</b></>}>
                  <div style={{display:"flex",gap:8}}>
                    <input type={showKey ? "text" : "password"} value={c.keys[tab]} placeholder={P.keyHint}
                      onChange={e => setKey(tab, e.target.value)} style={inputStyle}/>
                    <button onClick={() => setShowKey(s => !s)} style={{...inputStyle,width:"auto",padding:"0 14px",fontFamily:"var(--ui)",
                      fontWeight:600,fontSize:12,color:"var(--tx-2)",cursor:"pointer"}}>{showKey ? "Hide" : "Show"}</button>
                  </div>
                </Field>
                <Field label="Model" hint="Pick a preset or type any model ID the provider supports.">
                  <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:9}}>
                    {P.models.map(m => <Chip key={m} on={c.models[tab] === m} accent={P.accent} onClick={() => setModel(tab, m)}>{m}</Chip>)}
                  </div>
                  <input value={c.models[tab]} onChange={e => setModel(tab, e.target.value)} placeholder="custom-model-id" style={inputStyle}/>
                </Field>
              </>
            )}

            {tab === "ollama" && (
              <>
                <Field label="Server URL"
                  hint={<>Run <code style={{color:"var(--emerald)"}}>ollama serve</code> locally. For browser access, start it with <code style={{color:"var(--emerald)"}}>OLLAMA_ORIGINS=*</code> so this page is allowed.</>}>
                  <div style={{display:"flex",gap:8}}>
                    <input value={c.ollamaUrl} onChange={e => setC(s => ({...s, ollamaUrl:e.target.value}))} style={{...inputStyle,minWidth:0}}/>
                    <button onClick={detect} style={{...inputStyle,width:"auto",padding:"0 16px",fontFamily:"var(--ui)",fontWeight:600,
                      fontSize:12,color:"var(--emerald)",border:"1px solid color-mix(in srgb,var(--emerald) 40%,transparent)",cursor:"pointer",whiteSpace:"nowrap"}}>
                      {installed === "load" ? "Detecting..." : "Detect models"}</button>
                  </div>
                </Field>

                <Field label="Active model" hint="Detected models appear here. Type any model name you have pulled.">
                  <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:9}}>
                    {(Array.isArray(installed) && installed.length ? installed : P.models).map(m =>
                      <Chip key={m} on={c.models.ollama === m} accent={P.accent} onClick={() => setModel("ollama", m)}>{m}</Chip>)}
                  </div>
                  {Array.isArray(installed) && installed.length === 0 &&
                    <div className="faint" style={{fontSize:11.5,marginBottom:9}}>No models found on the server yet - download one below.</div>}
                  {installed && installed.err &&
                    <div style={{fontSize:11.5,marginBottom:9,color:"var(--amber)"}}>{installed.err}</div>}
                  <input value={c.models.ollama} onChange={e => setModel("ollama", e.target.value)} placeholder="llama3.2" style={inputStyle}/>
                </Field>

                <Field label="Download a local model" hint="Downloads through your local Ollama install. Keep Draftwave open until the model is ready.">
                  <div style={{display:"flex",flexDirection:"column",gap:7}}>
                    {LOCAL_LIBRARY.map(m => {
                      const cmd = "ollama pull " + m.id;
                      const active = pull?.model === m.id && !pull.done;
                      const done = pull?.model === m.id && pull.done && !pull.error;
                      const failed = pull?.model === m.id && pull.error;
                      return (
                        <div key={m.id} style={downloadRowStyle}>
                          <div style={{gridColumn:embedded ? "1 / -1" : "auto",flex:1,minWidth:0}}>
                            <div style={{fontSize:12.5,fontWeight:600}}>{m.name}
                              <span className="faint" style={{fontWeight:400,marginLeft:7,fontSize:11}}>{m.by} - {m.params} - {m.size}</span></div>
                            <div className="faint" style={{fontSize:11,marginTop:2}}>{m.note}</div>
                          </div>
                          <div style={{gridColumn:embedded ? "1 / -1" : "auto",width:embedded ? "100%" : 160,flex:"0 0 auto",minWidth:0}}>
                            <div style={{height:5,borderRadius:99,background:"var(--bg-1)",border:"1px solid var(--line)",overflow:"hidden",marginBottom:5}}>
                              <div style={{height:"100%",width:`${pull?.model === m.id ? (pull.percent || 0) : 0}%`,
                                background:failed ? "var(--red)" : done ? "var(--emerald)" : "var(--cyan)",transition:"width .2s"}}/>
                            </div>
                            <div className="faint" style={{fontSize:10,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                              {pull?.model === m.id ? (failed ? pull.error : pull.status) : cmd}
                            </div>
                          </div>
                          <button onClick={() => downloadModel(m.id)} disabled={active}
                            style={{padding:"6px 11px",borderRadius:7,fontSize:11,fontWeight:600,flex:"0 0 auto",
                              background:done ? "var(--emerald)" : active ? "var(--bg-1)" : "var(--bg-4)",
                              color:done ? "#04121a" : active ? "var(--tx-3)" : "var(--tx)",
                              border:"1px solid var(--line-2)",transition:"all .12s"}}>
                            {active ? "Downloading" : done ? "Ready" : "Download"}</button>
                          <button onClick={() => copy(cmd)} title="Copy terminal command"
                            style={{padding:"6px 9px",borderRadius:7,fontSize:11,fontWeight:600,flex:"0 0 auto",
                              background:copied === cmd ? "var(--emerald)" : "transparent",color:copied === cmd ? "#04121a" : "var(--tx-3)",
                              border:"1px solid var(--line-2)",transition:"all .12s"}}>
                            {copied === cmd ? "Copied" : "Copy"}</button>
                        </div>
                      );
                    })}
                  </div>
                </Field>
              </>
            )}
          </div>
        </div>

        <div style={{padding:embedded ? "10px 12px" : "13px 20px",borderTop:"1px solid var(--line)",display:"flex",alignItems:"center",gap:10,flexWrap:embedded ? "wrap" : "nowrap"}}>
          <button onClick={runTest} disabled={test === "run"}
            style={{display:"flex",alignItems:"center",gap:8,height:38,padding:"0 16px",borderRadius:"var(--r-2)",fontSize:12.5,fontWeight:600,
              background:"var(--bg-4)",border:"1px solid var(--line-2)",color:"var(--tx)"}}>
            {test === "run" ? <><span className="spin" style={{width:13,height:13,border:"2px solid var(--tx-3)",borderTopColor:"var(--cyan)",
              borderRadius:"50%",display:"inline-block"}}/>Testing...</> : "Test connection"}
          </button>
          {test && test !== "run" && (
            <div style={{display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:600,
              color:test.ok ? "var(--emerald)" : "var(--red)",maxWidth:360}}>
              <span style={{width:8,height:8,borderRadius:99,background:"currentColor",boxShadow:"0 0 8px currentColor"}}/>
              <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{test.ok ? "Connected - " + test.msg : test.msg}</span>
            </div>
          )}
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{height:38,padding:"0 16px",borderRadius:"var(--r-2)",fontSize:12.5,fontWeight:600,color:"var(--tx-2)"}}>Cancel</button>
          <button onClick={save} style={{height:38,padding:"0 22px",borderRadius:"var(--r-2)",fontSize:12.5,fontWeight:700,
            background:"var(--cyan)",color:"#04121a",boxShadow:"0 0 16px var(--cyan-glow)"}}>Save engine</button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin .7s linear infinite}`}</style>
    </div>
  );
}

Object.assign(window, { AISettingsModal });
