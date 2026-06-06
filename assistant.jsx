/* ============================================================
   THE DAW — The Assistant Producer (AI co-pilot)
   ============================================================ */

const ACTION_SPEC = `
You control a real DAW. When the producer asks for something concrete, DO IT by emitting actions — don't just talk about it.
Available actions (emit any number, in order):
- {"action":"add_track","kind":"keys|bass|lead|pad|pluck|drum|audio","name":"string"}
- {"action":"delete_track","track":"name"}   {"action":"duplicate_track","track":"name"}
- {"action":"set_bpm","value":number}
- {"action":"set_key","root":"C..B","scale":"Major|Minor|Dorian|Phrygian|Lydian|Mixolydian|Harmonic Min|Pentatonic"}
- {"action":"set_loop","start_bar":int,"end_bar":int}
- {"action":"set_volume","track":"name","value":0..1}
- {"action":"mute","track":"name","on":bool}   {"action":"solo","track":"name","on":bool}
- {"action":"clear_project"}
- {"action":"play"}   {"action":"stop"}
- {"action":"add_chords","track":"name (made if missing)","kind":"keys|pad","chords":[{"root":48..72 midi,"type":"maj|min|sus|maj7|min7","s":beat,"l":beats}]}
- {"action":"add_melody","track":"name","kind":"lead|keys|pluck","notes":[{"p":midi,"s":beat,"l":beats,"v":0..1}]}
- {"action":"add_bassline","track":"name","notes":[{"p":midi,"s":beat,"l":beats,"v":0..1}]}
Beats are 0-indexed, 1 bar = 4 beats, middle C = 60. Write 4-8 bars, musical, in the project key. Reference existing track names when relevant.`;

function Assistant(p) {
  const [msgs, setMsgs] = React.useState([
    { role:"assistant", text:"I'm your Assistant Producer. Tell me what you want — \"add a warm pad\", \"write a Cm7 progression\", \"bump it to 140\" — and I'll do it.", acts:[] }
  ]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [cfg, setCfg] = React.useState(AI.load());
  const scrollRef = React.useRef(null);
  React.useEffect(()=>{ if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; },[msgs,busy]);

  const chips = ["Write a Cm7 chord progression","Add a lo-fi drum beat","Build me a full 8-bar idea","Give me a catchy lead melody","Add a deep bassline","What chords go with this?"];

  function parseReply(raw, userText){
    // strip code fences
    let s=(raw||"").trim().replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();
    const a=s.indexOf("{"), b=s.lastIndexOf("}");
    if(a>=0 && b>a){ try{ const j=JSON.parse(s.slice(a,b+1));
      return { reply: j.reply || j.message || "Done.", actions: j.actions || [] }; }catch(_){} }
    // not JSON — treat as a normal chat reply, still try to act from the request
    const local = localFallback(userText, p.describeStateObj());
    return { reply: s || local.reply, actions: local.actions };
  }

  async function send(text){
    text=(text||input).trim(); if(!text||busy) return;
    setInput(""); const history=[...msgs,{role:"user",text}];
    setMsgs(history); setBusy(true);
    let reply="", actions=[];
    try {
      const convo = history.slice(-7).map(m=>`${m.role==="user"?"Producer":"You"}: ${m.text}`).join("\n");
      const sys = `You are "The Assistant Producer", a sharp, encouraging music-production collaborator living inside a DAW. `+
        `Talk like a real studio partner — concise, warm, a little hyped, never robotic. You can answer music-theory questions, `+
        `suggest ideas, AND directly edit the session. Current session: ${p.describeState()}.\n${ACTION_SPEC}\n`+
        `ALWAYS reply with a single JSON object: {"reply":"1-3 natural sentences","actions":[...]}. `+
        `If they just want to chat or ask a question, return an empty actions array. Nothing outside the JSON.`;
      const raw = await AI.ask({ system: sys, user: convo + "\n\n(Respond as JSON now.)" });
      const parsed = parseReply(raw, text); reply=parsed.reply; actions=parsed.actions;
    } catch(e){
      const local = localFallback(text, p.describeStateObj());
      reply = local.reply + (local.actions.length? "" : "  (running offline — add an API key in settings for full AI.)");
      actions = local.actions;
    }
    const receipts = [];
    for(const a of actions){ try{ const r=p.runAction(a); if(r) receipts.push(r); }catch(_){} }
    setMsgs(m=>[...m,{role:"assistant",text:reply,acts:receipts}]); setBusy(false);
  }

  return (
    <aside className="no-sel" style={{width:330,flex:"0 0 auto",display:"flex",flexDirection:"column",
      background:"linear-gradient(180deg,var(--bg-2),var(--bg-1))",borderLeft:"1px solid var(--line-2)",
      position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-80,right:-60,width:200,height:200,borderRadius:"50%",
        background:"radial-gradient(circle,var(--cyan-glow),transparent 70%)",opacity:.4,pointerEvents:"none"}}/>
      {/* header */}
      <div style={{padding:"12px 14px",borderBottom:"1px solid var(--line)",display:"flex",alignItems:"center",gap:10,position:"relative"}}>
        <div style={{width:30,height:30,borderRadius:9,display:"grid",placeItems:"center",
          background:"conic-gradient(from 140deg,var(--cyan),var(--purple),var(--emerald),var(--cyan))",
          boxShadow:"0 0 18px var(--cyan-glow)"}}>
          {React.cloneElement(I.spark,{style:{width:16,height:16,color:"#04121a"}})}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,letterSpacing:".02em"}}>Assistant Producer</div>
          <button onClick={()=>setShowSettings(true)} title="Change AI engine"
            style={{display:"flex",alignItems:"center",gap:5,marginTop:2,padding:"2px 7px",borderRadius:99,maxWidth:"100%",
              background:"var(--bg-4)",border:"1px solid var(--line-2)",color:"var(--tx-2)",transition:"all .14s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor="var(--cyan)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="var(--line-2)"}>
            <span style={{width:5,height:5,borderRadius:99,background:"var(--emerald)",boxShadow:"0 0 6px var(--emerald)",flex:"0 0 auto"}}/>
            <span style={{fontSize:10,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>via {AI.engineLabel(cfg)}</span>
          </button>
        </div>
        <button className="iconbtn" onClick={()=>setShowSettings(true)} title="AI engine settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
        <button className="iconbtn" onClick={p.onClose} title="Hide">{I.close}</button>
      </div>
      {showSettings && <AISettingsModal onClose={()=>setShowSettings(false)}
        onSaved={()=>{ const nc=AI.load(); setCfg(nc);
          setMsgs(m=>[...m,{role:"assistant",text:`Switched engine — now running on ${AI.engineLabel(nc)}.`,acts:[]}]); }}/>}

      {/* messages */}
      <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:"14px",display:"flex",flexDirection:"column",gap:12}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{animation:"fadeUp .25s ease",alignSelf:m.role==="user"?"flex-end":"flex-start",maxWidth:"90%"}}>
            <div style={{padding:"9px 12px",borderRadius:m.role==="user"?"12px 12px 3px 12px":"12px 12px 12px 3px",fontSize:12.5,lineHeight:1.5,
              background: m.role==="user"?"var(--bg-4)":"color-mix(in srgb,var(--cyan) 10%,var(--bg-3))",
              border:`1px solid ${m.role==="user"?"var(--line-2)":"color-mix(in srgb,var(--cyan) 25%,transparent)"}`,
              color:"var(--tx)"}}>
              {m.text}
            </div>
            {m.acts && m.acts.length>0 && <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6}}>
              {m.acts.map((a,j)=>(
                <span key={j} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:10.5,padding:"3px 8px",
                  borderRadius:99,background:"color-mix(in srgb,var(--emerald) 14%,transparent)",
                  border:"1px solid color-mix(in srgb,var(--emerald) 35%,transparent)",color:"var(--emerald)"}}>
                  {React.cloneElement(I.spark,{style:{width:10,height:10}})}{a}</span>
              ))}
            </div>}
          </div>
        ))}
        {busy && <div style={{alignSelf:"flex-start",padding:"10px 14px",borderRadius:"12px 12px 12px 3px",
          background:"color-mix(in srgb,var(--cyan) 10%,var(--bg-3))",border:"1px solid color-mix(in srgb,var(--cyan) 25%,transparent)",
          display:"flex",gap:4}}>
          {[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:99,background:"var(--cyan)",
            animation:`pulseRec 1s ${i*0.15}s infinite`}}/>)}
        </div>}
      </div>

      {/* quick chips */}
      <div style={{padding:"0 12px 8px",display:"flex",flexWrap:"wrap",gap:6}}>
        {chips.map(c=>(
          <button key={c} onClick={()=>send(c)} disabled={busy}
            style={{fontSize:10.5,padding:"5px 9px",borderRadius:99,background:"var(--bg-3)",border:"1px solid var(--line-2)",
              color:"var(--tx-2)",transition:"all .14s",opacity:busy?.5:1}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--cyan)";e.currentTarget.style.color="var(--cyan)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--line-2)";e.currentTarget.style.color="var(--tx-2)";}}>
            {c}</button>
        ))}
      </div>

      {/* input */}
      <div style={{padding:"10px 12px 12px",borderTop:"1px solid var(--line)"}}>
        <div style={{display:"flex",alignItems:"flex-end",gap:8,background:"var(--bg-1)",borderRadius:"var(--r-3)",
          border:"1px solid var(--line-2)",padding:"7px 7px 7px 12px"}}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} rows={1}
            onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }}
            placeholder="Ask your producer…"
            style={{flex:1,background:"none",border:"none",outline:"none",color:"var(--tx)",fontSize:12.5,resize:"none",
              fontFamily:"var(--ui)",maxHeight:80,lineHeight:1.4}}/>
          <button onClick={()=>send()} disabled={busy||!input.trim()}
            style={{width:32,height:32,borderRadius:9,display:"grid",placeItems:"center",flex:"0 0 auto",
              background:input.trim()?"var(--cyan)":"var(--bg-4)",color:input.trim()?"#04121a":"var(--tx-3)",
              boxShadow:input.trim()?"0 0 14px var(--cyan-glow)":"none",transition:"all .14s"}}>
            {React.cloneElement(I.send,{style:{width:15,height:15}})}</button>
        </div>
      </div>
    </aside>
  );
}

/* offline fallback so the assistant always does something useful */
function localFallback(text, st){
  const t=text.toLowerCase(); const actions=[]; let reply="On it.";
  const bpmM=t.match(/(\d{2,3})\s*bpm/)||t.match(/to\s+(\d{2,3})\b/);
  if(/bpm|tempo|faster|slower|speed/.test(t)){ let v=bpmM?+bpmM[1]:(/(faster|up|speed)/.test(t)?st.bpm+10:st.bpm-10);
    actions.push({action:"set_bpm",value:clamp(v,40,250)}); reply=`Tempo set to ${clamp(v,40,250)} BPM.`; }
  if(/\b(play|start)\b/.test(t)){ actions.push({action:"play"}); reply="Rolling."; }
  if(/\b(stop|pause)\b/.test(t)){ actions.push({action:"stop"}); reply="Stopped."; }
  if(/clear|clean slate|start over|empty/.test(t)){ actions.push({action:"clear_project"}); reply="Cleared it — fresh canvas."; }
  const keyM=t.match(/\b([a-g]#?)\s*(maj|min|major|minor|dorian|lydian|phrygian|mixolydian|pentatonic)/);
  if(keyM){ const root=keyM[1].toUpperCase(); const sc=keyM[2].startsWith("maj")?"Major":keyM[2].startsWith("min")?"Minor":
      keyM[2][0].toUpperCase()+keyM[2].slice(1); actions.push({action:"set_key",root,scale:sc});
    reply=`Key is now ${root} ${sc}.`; }

  const full = /(full|whole|complete|entire|8[\s-]?bar|everything|whole idea|a song|a beat|track idea|sketch)/.test(t) && /(idea|beat|song|track|sketch|start|build|make)/.test(t);
  if(full){
    actions.push({action:"add_track",kind:"drum",name:"Drums"});
    actions.push({action:"add_bassline",track:"Bass",notes:[
      {p:36,s:0,l:1.5,v:.95},{p:36,s:2,l:1,v:.85},{p:39,s:4,l:1.5,v:.9},{p:34,s:6,l:1,v:.85},
      {p:36,s:8,l:1.5,v:.95},{p:36,s:10,l:1,v:.85},{p:41,s:12,l:1.5,v:.9},{p:39,s:14,l:1,v:.85}]});
    actions.push({action:"add_chords",track:"Chords",kind:"keys",chords:[
      {root:60,type:"min7",s:0,l:4},{root:63,type:"maj7",s:4,l:4},{root:58,type:"maj7",s:8,l:4},{root:60,type:"min7",s:12,l:4}]});
    actions.push({action:"add_melody",track:"Lead",kind:"lead",notes:[
      {p:72,s:0,l:1,v:.9},{p:75,s:1,l:.5,v:.8},{p:74,s:2,l:1,v:.85},{p:70,s:3.5,l:.5,v:.7},
      {p:72,s:8,l:1,v:.9},{p:67,s:9.5,l:.5,v:.8},{p:70,s:11,l:1.5,v:.85}]});
    return { reply:"Laid down a full 8-bar idea — drums, bass, Cm7 chords and a lead hook. Hit play!", actions };
  }
  if(/bass(line)?|808|sub/.test(t)){ actions.push({action:"add_bassline",track:"Bass",notes:[
    {p:36,s:0,l:1.5,v:.95},{p:36,s:2,l:1,v:.85},{p:39,s:4,l:1.5,v:.9},{p:34,s:6,l:1,v:.85},
    {p:36,s:8,l:1.5,v:.95},{p:41,s:12,l:2,v:.9}]});
    reply="Dropped a deep, syncopated bassline."; }
  if(/pad/.test(t)){ actions.push({action:"add_chords",track:"Pad",kind:"pad",chords:[
    {root:48,type:"min7",s:0,l:4},{root:51,type:"maj7",s:4,l:4},{root:46,type:"maj7",s:8,l:4},{root:48,type:"min7",s:12,l:4}]});
    reply="Added a lush 4-chord pad."; }
  else if(/chord|progression|harmon/.test(t)){ actions.push({action:"add_chords",track:"Chords",kind:"keys",chords:[
    {root:60,type:"min7",s:0,l:4},{root:63,type:"maj",s:4,l:4},{root:58,type:"maj",s:8,l:4},{root:60,type:"min7",s:12,l:4}]});
    reply="Wrote a Cm7 → Eb → Bb → Cm7 progression."; }
  if(/lead|melody|hook|catchy|topline/.test(t)){ actions.push({action:"add_melody",track:"Lead",kind:"lead",notes:[
    {p:72,s:0,l:1,v:.9},{p:75,s:1,l:.5,v:.8},{p:74,s:2,l:1,v:.85},{p:70,s:3.5,l:.5,v:.7},
    {p:72,s:8,l:1,v:.9},{p:67,s:9.5,l:.5,v:.8},{p:70,s:11,l:1,v:.85}]});
    reply="Here's a catchy lead hook to build on."; }
  if(/drum|beat|kit|groove/.test(t)){ actions.push({action:"add_track",kind:"drum",name:"Drums"});
    reply="Added a drum track grooving with the tempo."; }

  if(!actions.length){
    if(/what|how|why|which|should|recommend|tip|advice|\?/.test(t)){
      reply="Good question — for that vibe I'd lean on a i–VI–III progression and keep the bass on the root. Want me to lay it down?";
    } else {
      reply="I can build beats, write chords/basslines/melodies, set the key or tempo, mute and balance tracks, or clear the project — just say the word.";
    }
  }
  return { reply, actions };
}

Object.assign(window, { Assistant });
