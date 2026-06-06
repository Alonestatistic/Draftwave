/* ============================================================
   THE DAW — app shell, state, playback engine, action runner
   ============================================================ */
const { useState, useRef, useEffect, useMemo, useCallback } = React;
const PALETTE = ["var(--t1)","var(--t2)","var(--t3)","var(--t4)","var(--t5)","var(--t6)","var(--t7)","var(--t8)"];

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error:null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Renderer error", error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"var(--bg-0)",color:"var(--tx)",padding:24}}>
        <div style={{width:"min(560px,100%)",border:"1px solid var(--line-2)",background:"var(--bg-2)",borderRadius:"var(--r-2)",padding:18,boxShadow:"var(--sh-pop)"}}>
          <div style={{fontSize:18,fontWeight:800,marginBottom:8}}>The DAW hit a renderer error</div>
          <div className="dim" style={{marginBottom:14}}>Reload the app, then use Report Issue if this repeats.</div>
          <pre className="mono" style={{whiteSpace:"pre-wrap",fontSize:11,color:"var(--red)",background:"var(--bg-1)",padding:12,borderRadius:"var(--r-2)",border:"1px solid var(--line)"}}>
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
        </div>
      </div>
    );
  }
}

function buildEvents(tracks){
  const ev=[];
  tracks.forEach(t=>{
    (t.clips||[]).forEach(c=>{
      const base=c.start*4;
      if(c.notes&&c.notes.length){
        c.notes.forEach(n=>{ if(n.muted) return;
          ev.push({beat:base+n.s,trackId:t.id,voice:TRACK_KINDS[t.kind]?.voice||"keys",midi:n.p,dur:n.l,vel:n.v??0.85}); });
      } else if(c.audio && c.mediaId){
        ev.push({beat:base,trackId:t.id,audio:true,mediaId:c.mediaId,offset:c.offset||0,dur:(c.len||1)*4,
          gain:c.gain||1,reverse:!!c.reverse,fadeIn:c.fadeIn||0,fadeOut:c.fadeOut||0,playbackRate:c.playbackRate||1});
      } else if(t.kind==="drum"){
        for(let b=0;b<c.len;b++){ const bb=base+b*4;
          ev.push({beat:bb+0,trackId:t.id,drum:"kick",vel:1}); ev.push({beat:bb+2,trackId:t.id,drum:"kick",vel:.9});
          ev.push({beat:bb+1,trackId:t.id,drum:"snare",vel:.9}); ev.push({beat:bb+3,trackId:t.id,drum:"snare",vel:.9});
          for(let h=0;h<8;h++) ev.push({beat:bb+h*0.5,trackId:t.id,drum:"hat",vel:h%2?0.4:0.6});
        }
      }
    });
  });
  return ev.sort((a,b)=>a.beat-b.beat);
}

function App(){
  const normalizeTrack=(t)=>({...t,type:t.type||TRACK_KINDS[t.kind]?.type||"instrument",
    fxChain:t.fxChain||defaultFxChain(t.kind),instrument:t.instrument||defaultInstrumentState(t.kind)});
  const [tracks,setTracks]=useState(()=>SEED().map(normalizeTrack));
  const [bpm,setBpm]=useState(124);
  const sig=[4,4]; const beatsPerBar=sig[0];
  const [playing,setPlaying]=useState(false);
  const [recording,setRecording]=useState(false);
  const [position,setPositionState]=useState(0);
  const [loop,setLoop]=useState({on:true,start:0,end:8});
  const [metro,setMetro]=useState(false);
  const [snap,setSnap]=useState(true);
  const [scale,setScale]=useState({root:"C",name:"Minor"});
  const [fold,setFold]=useState(false);
  const [selTrack,setSelTrack]=useState(null);
  const [selClip,setSelClip]=useState(null);
  const [showBrowser,setShowBrowser]=useState(true);
  const [showAssistant,setShowAssistant]=useState(true);
  const [bottom,setBottom]=useState("piano");
  const [bottomH,setBottomH]=useState(300);
  const [pxPerBar,setPxPerBar]=useState(72);
  const [masterVol,setMasterVol]=useState(0.85);
  const [levels,setLevels]=useState({});
  const [cpu,setCpu]=useState(18);
  const [settings,setSettings]=useState(()=>ProjectIO.loadSettings());
  const [uiScale,setUiScale]=useState(()=>ProjectIO.loadSettings().appearance.uiScale || 1);
  const [showSettings,setShowSettings]=useState(false);
  const [projectPath,setProjectPath]=useState(null);
  const [projectNotice,setProjectNotice]=useState("Ready");
  const [historyVersion,setHistoryVersion]=useState(0);
  const [media,setMedia]=useState([]);
  const [mediaWarnings,setMediaWarnings]=useState([]);
  const [midiInputs,setMidiInputs]=useState([]);
  const [midiEnabled,setMidiEnabled]=useState(false);
  const [autosavePrompt,setAutosavePrompt]=useState(()=>ProjectIO.autosaveInfo());
  const recentErrorsRef=useRef([]);
  const recorderRef=useRef(null);

  useEffect(()=>{
    const capture = (kind, error) => {
      const message = String(error?.message || error?.reason?.message || error?.reason || error || "Unknown error");
      recentErrorsRef.current = [{ kind, message, at:new Date().toISOString() }, ...recentErrorsRef.current].slice(0, 20);
    };
    const onError = (event) => capture("renderer", event.error || event.message);
    const onUnhandled = (event) => capture("promise", event.reason || event);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandled);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  },[]);

  const noteError=(label,error)=>{
    const message = `${label}: ${String(error?.message || error)}`;
    recentErrorsRef.current = [{ kind:"caught", message, at:new Date().toISOString() }, ...recentErrorsRef.current].slice(0, 20);
    setProjectNotice(message);
  };

  // Apply UI zoom to html element (outside React root so events work)
  useEffect(()=>{ document.documentElement.style.zoom=String(uiScale); },[uiScale]);

  // refs for the rAF engine
  const posRef=useRef(0), playingRef=useRef(false), bpmRef=useRef(bpm), loopRef=useRef(loop),
        metroRef=useRef(metro), tracksRef=useRef(tracks), masterRef=useRef(masterVol),
        eventsRef=useRef([]), levelsRef=useRef({}), lastBeatRef=useRef(0),
        snapshotRef=useRef(null), suppressHistoryRef=useRef(false),
        historyRef=useRef({past:[],future:[]});
  useEffect(()=>{bpmRef.current=bpm;},[bpm]);
  useEffect(()=>{loopRef.current=loop;},[loop]);
  useEffect(()=>{metroRef.current=metro;},[metro]);
  useEffect(()=>{masterRef.current=masterVol;},[masterVol]);
  useEffect(()=>{tracksRef.current=tracks; eventsRef.current=buildEvents(tracks);},[tracks]);

  const setPosition=useCallback((b)=>{ posRef.current=b; lastBeatRef.current=b; setPositionState(b); },[]);

  useEffect(()=>{
    snapshotRef.current = ProjectIO.serialize({tracks,bpm,sig,position,loop,metro,snap,scale,fold,masterVol,settings,media});
  },[tracks,bpm,position,loop,metro,snap,scale,fold,masterVol,settings,media]);

  const recordHistory=useCallback((label="Edit")=>{
    if(suppressHistoryRef.current || !snapshotRef.current) return;
    const h=historyRef.current;
    h.past.push({label,project:cloneData(snapshotRef.current)});
    if(h.past.length>80) h.past.shift();
    h.future=[];
    setHistoryVersion(v=>v+1);
  },[]);

  const restoreProject=(project, opts={})=>{
    const next=ProjectIO.hydrate(project);
    suppressHistoryRef.current=true;
    setPlaying(false); setRecording(false);
    setTracks(next.tracks); setBpm(next.bpm); setLoop(next.loop); setMetro(next.metro); setSnap(next.snap);
    setScale(next.scale); setFold(next.fold); setMasterVol(next.masterVol); setSettings(next.settings);
    setMedia(next.media || []); AudioCore.hydrateMedia(next.media || []).catch(()=>{});
    const warnings = next._warnings || [];
    setMediaWarnings(warnings);
    setPosition(next.position || 0);
    setTimeout(()=>{ suppressHistoryRef.current=false; },0);
    if(opts.path!==undefined) setProjectPath(opts.path);
    const warning = warnings.length ? ` (${warnings.length} media warning${warnings.length===1?"":"s"})` : "";
    if(opts.notice) setProjectNotice(opts.notice + warning);
  };

  const undo=useCallback(()=>{
    const h=historyRef.current;
    if(!h.past.length || !snapshotRef.current) return;
    const prev=h.past.pop();
    h.future.push({label:"Redo",project:cloneData(snapshotRef.current)});
    restoreProject(prev.project,{notice:"Undo: "+prev.label});
    setHistoryVersion(v=>v+1);
  },[]);

  const redo=useCallback(()=>{
    const h=historyRef.current;
    if(!h.future.length || !snapshotRef.current) return;
    const next=h.future.pop();
    h.past.push({label:"Undo",project:cloneData(snapshotRef.current)});
    restoreProject(next.project,{notice:"Redo"});
    setHistoryVersion(v=>v+1);
  },[]);

  const setTracksProject=(label, updater)=>{ recordHistory(label); setTracks(updater); };
  const setBpmProject=(value)=>{ recordHistory("Tempo"); setBpm(value); };
  const setLoopProject=(updater)=>{ recordHistory("Loop"); setLoop(updater); };
  const setSnapProject=(updater)=>{ recordHistory("Snap"); setSnap(updater); };
  const setScaleProject=(value)=>{ recordHistory("Scale"); setScale(value); };
  const setMasterVolProject=(value)=>{ recordHistory("Master volume"); setMasterVol(value); };
  const applySettings=(next)=>{ recordHistory("Settings"); const merged=ProjectIO.saveSettings(next); setSettings(merged); setUiScale(merged.appearance.uiScale || uiScale); };

  useEffect(()=>{
    if(!settings.project.autosave || suppressHistoryRef.current) return;
    const id=setTimeout(()=>{
      const project=ProjectIO.serialize({tracks,bpm,sig,position,loop,metro,snap,scale,fold,masterVol,settings,media});
      if(ProjectIO.autosave(project)) setProjectNotice("Autosaved");
    }, Math.max(5,settings.project.autosaveSeconds||12)*1000);
    return ()=>clearTimeout(id);
  },[tracks,bpm,loop,metro,snap,scale,fold,masterVol,settings,media]);

  const songBars=useMemo(()=>{ let m=16; tracks.forEach(t=>(t.clips||[]).forEach(c=>m=Math.max(m,c.start+c.len))); return m+2; },[tracks]);

  const audible=(t)=>{ const anySolo=tracksRef.current.some(x=>x.solo); return !t.mute && (!anySolo||t.solo); };

  const triggerRange=(a,b)=>{
    const evs=eventsRef.current; const spb=60/bpmRef.current;
    for(const e of evs){ if(e.beat>=a && e.beat<b){
      const t=tracksRef.current.find(x=>x.id===e.trackId); if(!t||!audible(t)) continue;
      const g=t.vol*masterRef.current;
      levelsRef.current[e.trackId]=Math.min(1,(e.vel||0.8)*Math.min(1,t.vol*1.2));
      if(e.audio) Audio.sample(AudioCore.getBuffer(e.mediaId),0,e.offset||0,e.dur*spb,g,t.pan||0,
        {gain:e.gain,reverse:e.reverse,fadeIn:e.fadeIn,fadeOut:e.fadeOut,playbackRate:e.playbackRate});
      else if(e.drum) Audio.drum(e.drum,0,e.vel*g);
      else Audio.note(e.midi,0,Math.max(0.08,e.dur*spb),e.voice,e.vel,g,t.pan||0);
    }}
  };

  useEffect(()=>{ playingRef.current=playing; if(!playing) return;
    let raf, last=performance.now();
    const tick=(now)=>{
      const dt=(now-last)/1000; last=now;
      const spb=60/bpmRef.current; const adv=dt/spb;
      let prev=posRef.current; let pos=prev+adv;
      const lp=loopRef.current;
      if(metroRef.current){ if(Math.floor(pos)>Math.floor(prev)){ const bt=Math.floor(pos); Audio.click(bt%beatsPerBar===0); } }
      if(lp.on && pos>=lp.end*beatsPerBar){
        triggerRange(prev, lp.end*beatsPerBar);
        pos=lp.start*beatsPerBar + (pos-lp.end*beatsPerBar);
        posRef.current=lp.start*beatsPerBar; prev=posRef.current;
        triggerRange(prev-0.0001, pos);
      } else { triggerRange(prev,pos); }
      posRef.current=pos;
      const L=levelsRef.current; for(const k in L){ L[k]*=0.90; if(L[k]<0.01)L[k]=0; }
      setLevels({...L}); setPositionState(pos);
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[playing]);

  useEffect(()=>{ const id=setInterval(()=>{
    setCpu(c=>clamp(c+(Math.random()-0.5)*8 + (playingRef.current?28-c+ (Math.random()*10):14-c),6,82));
    if(!playingRef.current){ const L=levelsRef.current; let ch=false; for(const k in L){ if(L[k]>0){L[k]*=0.85;ch=true;} } if(ch)setLevels({...L}); }
  },400); return ()=>clearInterval(id); },[]);

  // transport
  const onPlay=()=>{ try{ Audio.ensure(); setPlaying(p=>{ setProjectNotice(p?"Paused":"Playing"); return !p; }); }
    catch(e){ setProjectNotice("Audio failed: "+String(e.message||e)); } };
  const onStop=()=>{ setPlaying(false); if(recorderRef.current) stopMicRecording(); else setRecording(false); setPosition(loop.on?loop.start*beatsPerBar:0); setProjectNotice("Stopped"); };
  const onRec=()=>{ if(recorderRef.current){ stopMicRecording(); setProjectNotice("Recording stopped"); return; }
    try{ Audio.ensure(); startMicRecording(); }
    catch(e){ setProjectNotice("Recording failed: "+String(e.message||e)); } };

  // global keyboard
  useEffect(()=>{ const k=(e)=>{ const tag=e.target.tagName;
    const typing = tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT";
    if((e.ctrlKey||e.metaKey) && (e.key==="="||e.key==="+")){ e.preventDefault(); setUiScale(s=>clamp(+(s+0.1).toFixed(2),0.6,1.6)); return; }
    if((e.ctrlKey||e.metaKey) && e.key==="-"){ e.preventDefault(); setUiScale(s=>clamp(+(s-0.1).toFixed(2),0.6,1.6)); return; }
    if((e.ctrlKey||e.metaKey) && e.key==="0"){ e.preventDefault(); setUiScale(1); return; }
    if(!typing && (e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="s"){ e.preventDefault(); saveProject(e.shiftKey); return; }
    if(!typing && (e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="o"){ e.preventDefault(); openProject(); return; }
    if(!typing && (e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="n"){ e.preventDefault(); cleanSlate(); return; }
    if(!typing && (e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="z"){ e.preventDefault(); e.shiftKey?redo():undo(); return; }
    if(!typing && (e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="y"){ e.preventDefault(); redo(); return; }
    if(typing) return;
    if(e.code==="Space"){e.preventDefault();onPlay();}
    if(e.key.toLowerCase()==="s" && selClip && bottom!=="piano"){ e.preventDefault(); splitClip(selClip.trackId,selClip.clipId,posRef.current/beatsPerBar); return; }
    if(e.key==="Enter"){setPosition(0);} };
    window.addEventListener("keydown",k); return ()=>window.removeEventListener("keydown",k); },[loop,projectPath,tracks,bpm,position,loop,metro,snap,scale,fold,masterVol,settings,undo,redo]);

  // track ops
  const upd=(id,patch,label="Track edit")=>setTracksProject(label,ts=>ts.map(t=>t.id===id?{...t,...(typeof patch==="function"?patch(t):patch)}:t));
  const toggleMute=(id)=>upd(id,t=>({mute:!t.mute}));
  const toggleSolo=(id)=>upd(id,t=>({solo:!t.solo}));
  const toggleFav=(id)=>upd(id,t=>({fav:!t.fav}));
  const setVol=(id,v)=>upd(id,{vol:v}); const setPan=(id,v)=>upd(id,{pan:v});
  const renameTrack=(id,name)=>upd(id,{name:name||"Track"});
  const addFx=(id,effectId)=>upd(id,t=>({fxChain:[...(t.fxChain||[]),makeFx(effectId)]}),"Add effect");
  const toggleFx=(id,fxId)=>upd(id,t=>({fxChain:(t.fxChain||[]).map(f=>f.id===fxId?{...f,enabled:f.enabled===false}:f)}),"Toggle effect");
  const removeFx=(id,fxId)=>upd(id,t=>({fxChain:(t.fxChain||[]).filter(f=>f.id!==fxId)}),"Remove effect");
  const selectTrack=(id)=>setSelTrack(id);
  const selectClip=(trackId,clipId)=>{ setSelTrack(trackId); setSelClip({trackId,clipId}); };
  const moveClip=(trackId,clipId,start)=>setTracks(ts=>ts.map(t=>t.id!==trackId?t:{...t,clips:t.clips.map(c=>c.id===clipId?{...c,start}:c)}));
  const openPiano=()=>setBottom("piano");

  const deleteTrack=(id)=>{ setTracksProject("Delete track",ts=>ts.filter(t=>t.id!==id));
    setSelClip(s=>s&&s.trackId===id?null:s); setSelTrack(s=>s===id?null:s); };
  const duplicateTrack=(id)=>{ setTracksProject("Duplicate track",ts=>{ const i=ts.findIndex(t=>t.id===id); if(i<0)return ts;
    const src=ts[i]; const nid=uid();
    const copy={...src,id:nid,name:src.name+" copy",solo:false,
      clips:(src.clips||[]).map(c=>({...c,id:uid(),notes:c.notes?c.notes.map(n=>({...n,id:uid()})):c.notes}))};
    const out=[...ts]; out.splice(i+1,0,copy); setSelTrack(nid); return out; }); };
  const silenceTrack=(id)=>upd(id,{clips:[]},"Silence track");  // clear content
  const clearClips=(id)=>upd(id,{clips:[]},"Clear clips");

  const newTrack=(kind,name,clip)=>{ const id=uid(); const color=PALETTE[tracks.length%PALETTE.length];
    const tk={id,name:name||"New "+kind,kind,type:TRACK_KINDS[kind]?.type||"instrument",color,mute:false,solo:false,fav:false,vol:0.78,pan:0,
      fxChain:defaultFxChain(kind),instrument:defaultInstrumentState(kind),
      clips: clip!==undefined?clip:[{id:uid(),start:0,len:4,name:name||"Clip",notes:kind==="drum"?undefined:[]}]};
    setTracksProject("Add track",ts=>[...ts,tk]); setSelTrack(id); return tk; };
  const addTrack=()=>{ newTrack("keys","Audio "+(tracks.length+1)); };

  const dropItem=(item,bar)=>{
    if(item.mediaId){ const found=media.find(m=>m.id===item.mediaId); if(found){ addAudioMediaAsTrack(found,Math.max(0,bar)); return; } }
    const kind=item.kind==="fx"?"keys":item.kind;
    const clip=[{id:uid(),start:Math.max(0,bar),len:kind==="drum"?8:4,name:item.name,
      notes:kind==="drum"?undefined:[],audio:kind==="audio"?true:undefined}];
    const t=newTrack(kind,item.name,clip);
    if(kind!=="drum"&&kind!=="audio"){ setSelClip({trackId:t.id,clipId:t.clips[0].id}); setBottom("piano"); }
  };

  // clip ops
  const duplicateClip=(trackId,clipId)=>setTracksProject("Duplicate clip",ts=>ts.map(t=>{ if(t.id!==trackId)return t;
    const c=t.clips.find(x=>x.id===clipId); if(!c)return t;
    const nc={...c,id:uid(),start:c.start+c.len,notes:c.notes?c.notes.map(n=>({...n,id:uid()})):c.notes};
    return {...t,clips:[...t.clips,nc]}; }));
  const deleteClip=(trackId,clipId)=>{ setTracksProject("Delete clip",ts=>ts.map(t=>t.id!==trackId?t:{...t,clips:t.clips.filter(c=>c.id!==clipId)}));
    setSelClip(s=>s&&s.clipId===clipId?null:s); };
  const renameClip=(trackId,clipId,name)=>setTracksProject("Rename clip",ts=>ts.map(t=>t.id!==trackId?t:{...t,clips:t.clips.map(c=>c.id===clipId?{...c,name}:c)}));
  const resizeClip=(trackId,clipId,len)=>setTracks(ts=>ts.map(t=>t.id!==trackId?t:{...t,clips:t.clips.map(c=>c.id===clipId?{...c,len}:c)}));
  const updateClip=(trackId,clipId,patch,label="Edit clip")=>setTracksProject(label,ts=>ts.map(t=>t.id!==trackId?t:{...t,clips:t.clips.map(c=>c.id===clipId?{...c,...(typeof patch==="function"?patch(c):patch)}:c)}));
  const splitClip=(trackId,clipId,atBar)=>setTracksProject("Split clip",ts=>ts.map(t=>{ if(t.id!==trackId)return t;
    const c=t.clips.find(x=>x.id===clipId); if(!c || atBar<=c.start || atBar>=c.start+c.len)return t;
    const leftLen=atBar-c.start, rightLen=c.len-leftLen, splitBeat=leftLen*4;
    const left={...c,id:uid(),len:leftLen,name:c.name+" A"};
    const right={...c,id:uid(),start:atBar,len:rightLen,name:c.name+" B"};
    if(c.notes){
      left.notes=c.notes.filter(n=>n.s<splitBeat).map(n=>({...n,l:Math.min(n.l,Math.max(0.0625,splitBeat-n.s))}));
      right.notes=c.notes.filter(n=>n.s+n.l>splitBeat).map(n=>({...n,id:uid(),s:Math.max(0,n.s-splitBeat),l:n.s<splitBeat?n.s+n.l-splitBeat:n.l}));
    }
    if(c.audio){ right.offset=(c.offset||0)+splitBeat*(60/bpmRef.current)/(c.playbackRate||1); }
    return {...t,clips:t.clips.flatMap(x=>x.id===clipId?[left,right]:[x])};
  }));
  const dropItemAt=(trackId,bar)=>setTracksProject("Add clip",ts=>ts.map(t=>t.id!==trackId?t:{...t,clips:[...t.clips,{id:uid(),start:Math.max(0,bar),len:4,name:"Clip",notes:t.kind==="drum"?undefined:[]}]}));
  const updateNotes=(notes)=>{ if(!selClip)return;
    setTracks(ts=>ts.map(t=>t.id!==selClip.trackId?t:{...t,clips:t.clips.map(c=>c.id===selClip.clipId?{...c,notes}:c)})); };
  const updateControllers=(controllers)=>{ if(!selClip)return;
    setTracks(ts=>ts.map(t=>t.id!==selClip.trackId?t:{...t,clips:t.clips.map(c=>c.id===selClip.clipId?{...c,controllers}:c)})); };
  const growSelClip=(toBeats)=>{ if(!selClip)return;
    setTracks(ts=>ts.map(t=>t.id!==selClip.trackId?t:{...t,clips:t.clips.map(c=>c.id===selClip.clipId?
      {...c,len:Math.max(c.len,Math.ceil(toBeats/4))}:c)})); };

  // loop ops
  const setLoopRange=(start,end)=>setLoopProject(l=>({...l,on:true,start:Math.max(0,Math.min(start,end-1)),end:Math.max(start+1,end)}));

  // project ops
  const cleanSlate=()=>{ recordHistory("New project"); setPlaying(false); setTracks([]); setSelClip(null); setSelTrack(null);
    setMedia([]); setMediaWarnings([]); setProjectPath(null); setPosition(0); setLoop({on:true,start:0,end:8}); };
  const loadDemo=()=>{ recordHistory("Load demo"); setPlaying(false); const t=SEED().map(normalizeTrack); setTracks(t);
    setMedia([]); setMediaWarnings([]); setSelClip({trackId:t[2].id,clipId:t[2].clips[0].id}); setSelTrack(t[2].id); setPosition(0); };

  const saveProject=async(saveAs=false)=>{
    const project=ProjectIO.serialize({tracks,bpm,sig,position,loop,metro,snap,scale,fold,masterVol,settings,media});
    const warnings = ProjectIO.validateMedia(project);
    setMediaWarnings(warnings);
    try{
      const res=saveAs?await ProjectIO.saveAs(project):await ProjectIO.save(project,projectPath);
      if(!res?.canceled){
        setProjectPath(res.path||projectPath);
        setProjectNotice(warnings.length ? `Saved with ${warnings.length} media warning${warnings.length===1?"":"s"}` : (res.path?"Saved "+res.path:"Project exported"));
      }
    } catch(e){ noteError("Save failed", e); }
  };
  const openProject=async()=>{
    try{
      const res=await ProjectIO.open();
      if(res?.canceled){ if(res.error) setProjectNotice("Open failed: "+res.error); return; }
      recordHistory("Open project");
      restoreProject(res.project,{path:res.path,notice:"Loaded "+(res.path||"project")});
      setSelClip(null); setSelTrack(null);
    } catch(e){ noteError("Open failed", e); }
  };
  const loadAutosave=()=>{
    const saved=ProjectIO.loadAutosave();
    if(!saved){ setProjectNotice("No autosave found"); return; }
    recordHistory("Load autosave");
    restoreProject(saved,{notice:"Loaded autosave"});
  };
  const restoreAutosavePrompt=()=>{
    if(!autosavePrompt?.project) return;
    recordHistory("Restore autosave");
    restoreProject(autosavePrompt.project,{notice:"Restored autosave"});
    ProjectIO.clearAutosave();
    setAutosavePrompt(null);
  };
  const discardAutosavePrompt=()=>{
    ProjectIO.clearAutosave();
    setAutosavePrompt(null);
    setProjectNotice("Autosave discarded");
  };
  const runScaffold=(id,label)=>{
    CapabilityRegistry.request(id).then(res=>setProjectNotice(label+": "+(res.message||"Not available yet.")));
  };

  const currentProject=()=>ProjectIO.serialize({tracks,bpm,sig,position,loop,metro,snap,scale,fold,masterVol,settings,media});
  const alphaWorkflowProject=()=>({
    version: PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    app: "The DAW",
    transport:{ bpm:126, sig, position:0, loop:{on:true,start:0,end:8}, metro:false, snap:true },
    music:{ scale:{root:"C",name:"Minor"}, fold:false },
    mixer:{ masterVol:0.85 },
    settings,
    media:[{ id:"alpha_media", kind:"audio", name:"alpha_loop.wav", format:"wav", type:"audio/wav", size:4,
      duration:2, sampleRate:48000, channels:1, waveform:[0.2,0.45,0.7,0.5,0.3,0.8,0.4,0.25], dataUrl:"data:audio/wav;base64,AAAA" }],
    tracks:[
      { id:"alpha_keys", name:"Alpha Keys", kind:"keys", type:"instrument", color:"var(--t1)", mute:false, solo:false, fav:false, vol:0.78, pan:0,
        fxChain:defaultFxChain("keys"), instrument:defaultInstrumentState("keys"),
        clips:[{ id:"alpha_midi_clip", start:0, len:4, name:"Alpha MIDI", notes:[{id:"alpha_note",p:60,s:0,l:1,v:0.8}] }] },
      { id:"alpha_audio", name:"Alpha Audio", kind:"audio", type:"audio", color:"var(--t7)", mute:false, solo:false, fav:false, vol:0.78, pan:0,
        fxChain:defaultFxChain("audio"), instrument:null,
        clips:[{ id:"alpha_audio_clip", start:1, len:2, name:"Alpha Loop", audio:true, mediaId:"alpha_media", waveform:true }] },
    ],
  });

  useEffect(()=>{
    window.__THE_DAW_ALPHA_TEST__ = {
      loadWorkflowProject() {
        restoreProject(alphaWorkflowProject(), { notice:"Alpha workflow loaded" });
        setSelTrack("alpha_keys");
        setSelClip({ trackId:"alpha_keys", clipId:"alpha_midi_clip" });
        return true;
      },
      moveMidiClip(start=2) {
        recordHistory("Move clip");
        setTracks(ts=>ts.map(t=>t.id!=="alpha_keys"?t:{...t,clips:t.clips.map(c=>c.id==="alpha_midi_clip"?{...c,start}:c)}));
        return true;
      },
      editMidiNote(pitch=64) {
        recordHistory("Edit notes");
        setTracks(ts=>ts.map(t=>t.id!=="alpha_keys"?t:{...t,clips:t.clips.map(c=>c.id==="alpha_midi_clip"?{...c,notes:(c.notes||[]).map(n=>n.id==="alpha_note"?{...n,p:pitch}:n)}:c)}));
        return true;
      },
      duplicateAudioClip() {
        duplicateClip("alpha_audio", "alpha_audio_clip");
        return true;
      },
      deleteDuplicatedAudioClip() {
        const dup = tracksRef.current.find(t=>t.id==="alpha_audio")?.clips?.find(c=>c.id!=="alpha_audio_clip");
        if (!dup) return false;
        deleteClip("alpha_audio", dup.id);
        return true;
      },
      undo: () => { undo(); return true; },
      redo: () => { redo(); return true; },
      snapshot() {
        const project = currentProject();
        const midiClip = project.tracks.find(t=>t.id==="alpha_keys")?.clips.find(c=>c.id==="alpha_midi_clip");
        const audioTrack = project.tracks.find(t=>t.id==="alpha_audio");
        return {
          bpm:project.transport.bpm,
          tracks:project.tracks.length,
          media:project.media.length,
          warnings:ProjectIO.validateMedia(project),
          midiStart:midiClip?.start,
          firstPitch:midiClip?.notes?.[0]?.p,
          audioClips:audioTrack?.clips?.length || 0,
          waveformPoints:project.media.find(m=>m.id==="alpha_media")?.waveform?.length || 0,
          notice:projectNotice,
        };
      },
    };
    return ()=>{ delete window.__THE_DAW_ALPHA_TEST__; };
  },[tracks,bpm,position,loop,metro,snap,scale,fold,masterVol,settings,media,projectNotice,undo,redo]);

  const renderMixdown=async()=>{
    try{
      setProjectNotice("Rendering WAV...");
      const bytes=await RenderCore.renderWav(currentProject());
      const res=await RenderCore.saveWav(bytes,"The DAW Mixdown.wav");
      setProjectNotice(res?.path?`Rendered ${res.path}`:"Rendered WAV");
    } catch(e){ noteError("Render failed", e); }
  };
  const exportStems=async()=>{
    try{
      setProjectNotice("Rendering stems manifest...");
      const manifest={ version:1, createdAt:new Date().toISOString(), stems:tracks.map(t=>({trackId:t.id,name:t.name,kind:t.kind,clips:(t.clips||[]).length})) };
      const project={...currentProject(), stemManifest:manifest};
      await ProjectIO.saveAs(project);
      setProjectNotice("Stem export manifest saved");
    } catch(e){ noteError("Stem export failed", e); }
  };
  const reportIssue=async()=>{
    try{
      const report={
        createdAt:new Date().toISOString(),
        app:{ name:"The DAW", version:window.dawNative?.appVersion || "0.1.0", electron:window.dawNative?.electronVersion || null },
        platform:window.dawNative?.platform || navigator.platform,
        notice:projectNotice,
        projectPath,
        projectSummary:projectSummary(currentProject()),
        mediaWarnings,
        capabilities:CapabilityRegistry.all().map(({id,title,status})=>({id,title,status})),
        recentErrors:recentErrorsRef.current,
      };
      const content=JSON.stringify(report,null,2);
      const res=window.dawNative?.saveIssueReport
        ? await window.dawNative.saveIssueReport({ content, suggestedName:"the-daw-issue-report.json" })
        : await ProjectIO.downloadJson(report, "the-daw-issue-report.json");
      setProjectNotice(res?.path?`Issue report saved ${res.path}`:"Issue report exported");
    } catch(e){ setProjectNotice("Issue report failed: "+String(e.message||e)); }
  };
  const loadTemplate=(templateId)=>{
    const tpl=TEMPLATE_PROJECTS.find(t=>t.id===templateId);
    if(!tpl) return;
    recordHistory("Load template");
    const made=tpl.make();
    setPlaying(false); setTracks((made.tracks||[]).map(normalizeTrack)); setLoop(made.loop||{on:true,start:0,end:8});
    setBpm(made.bpm||124); setScale(made.scale||{root:"C",name:"Minor"}); setMedia([]); setMediaWarnings([]); setSelClip(null); setSelTrack(null); setPosition(0);
    setProjectNotice("Loaded template: "+tpl.name);
  };
  const openPanel=(panel)=>window.dawNative?.openPanel
    ? window.dawNative.openPanel({panel}).then(()=>setProjectNotice("Opened "+panel+" panel"))
    : setProjectNotice("Detachable panels need the Electron desktop shell");
  const listExtensions=async()=>{
    try{
      const res=await ExtensionHost.list();
      const count=(res.native?.extensions?.length||0)+(res.renderer?.length||0);
      setProjectNotice(`Extensions: ${count} found${res.native?.dir?` in ${res.native.dir}`:""}`);
    } catch(e){ noteError("Extension scan failed", e); }
  };
  const scanNativePlugins=async()=>{
    if(!window.dawNative?.scanNativePlugins){ runScaffold("vst","VST hosting"); return; }
    try{
      const res=await window.dawNative.scanNativePlugins();
      setProjectNotice(res.message || `Native plugins found: ${res.plugins?.length||0}`);
    } catch(e){ noteError("Plugin scan failed", e); }
  };

  const addAudioMediaAsTrack=(item,startBar=0)=>{
    const id=uid(); const color=PALETTE[tracksRef.current.length%PALETTE.length];
    const beats=(item.duration||4)/(60/bpmRef.current);
    const len=Math.max(1,Math.ceil(beats/4));
    const tk={id,name:item.name.replace(/\.[^.]+$/,""),kind:"audio",type:"audio",color,mute:false,solo:false,fav:false,vol:0.78,pan:0,
      fxChain:defaultFxChain("audio"),instrument:null,
      clips:[{id:uid(),start:startBar,len,name:item.name,audio:true,mediaId:item.id,waveform:true}]};
    setTracksProject("Import audio",ts=>[...ts,tk]);
    setSelTrack(id);
  };

  const importAudio=()=>{
    const input=document.createElement("input");
    input.type="file";
    input.multiple=true;
    input.accept=".wav,.mp3,.ogg,.flac,.webm,audio/wav,audio/mpeg,audio/ogg,audio/flac,audio/webm";
    input.onchange=async()=>{
      const files=Array.from(input.files||[]);
      if(!files.length) return;
      try{
        setProjectNotice("Importing audio...");
        const imported=await AudioCore.importAudioFiles(files);
        recordHistory("Import audio");
        setMedia(m=>[...m,...imported]);
        setMediaWarnings([]);
        imported.forEach(item=>addAudioMediaAsTrack(item,Math.floor(posRef.current/beatsPerBar)));
        setProjectNotice(`Imported ${imported.length} audio file${imported.length===1?"":"s"}`);
      } catch(e){ noteError("Audio import failed", e); }
    };
    input.click();
  };

  const stopMicRecording=()=>{
    if(recorderRef.current && recorderRef.current.state!=="inactive") recorderRef.current.stop();
    recorderRef.current=null;
    setRecording(false);
  };

  const startMicRecording=async()=>{
    try{
      setProjectNotice("Requesting microphone...");
      const startBar=Math.floor(posRef.current/beatsPerBar);
      recorderRef.current=await AudioCore.recordMicrophone({
        onStop:(item)=>{
          if(item){
            recordHistory("Microphone recording");
            setMedia(m=>[...m,item]);
            addAudioMediaAsTrack(item,startBar);
            setProjectNotice("Recorded "+item.name);
          }
        },
        onError:(e)=>noteError("Recording failed", e),
      });
      setRecording(true); setPlaying(true); setProjectNotice("Recording microphone");
    } catch(e){ setRecording(false); noteError("Recording unavailable", e); }
  };

  const handleMidiMessage=useCallback((msg)=>{
    if(msg.type==="noteon"){
      const t=selTrack?tracksRef.current.find(x=>x.id===selTrack):tracksRef.current.find(x=>TRACK_KINDS[x.kind]?.type==="instrument");
      if(t) Audio.note(msg.note,0,0.35,TRACK_KINDS[t.kind]?.voice||"keys",msg.velocity||0.8,t.vol*masterRef.current,t.pan||0);
      if(recording && selClip){
        const beatInClip=Math.max(0,posRef.current - (tracksRef.current.find(x=>x.id===selClip.trackId)?.clips||[]).find(c=>c.id===selClip.clipId)?.start*beatsPerBar || 0);
        const note={id:uid(),p:msg.note,s:beatInClip,l:0.5,v:msg.velocity||0.8};
        setTracksProject("MIDI record",ts=>ts.map(tr=>tr.id!==selClip.trackId?tr:{...tr,clips:tr.clips.map(c=>c.id===selClip.clipId?{...c,notes:[...(c.notes||[]),note]}:c)}));
      }
    } else if(msg.type==="cc"||msg.type==="pitchbend"||msg.type==="aftertouch"){
      setProjectNotice(`MIDI ${msg.type} ch ${msg.channel}`);
    }
  },[selTrack,selClip,recording]);

  const startMidi=async()=>{
    try{
      const inputs=await MidiCore.start(handleMidiMessage);
      setMidiInputs(inputs); setMidiEnabled(true);
      setProjectNotice(inputs.length?`MIDI enabled: ${inputs.length} input${inputs.length===1?"":"s"}`:"MIDI enabled: no inputs found");
    } catch(e){ noteError("MIDI unavailable", e); }
  };

  const appMenu=(e)=>openMenu(e,[
    { header:"Project" },
    { label:"New - Clean Slate", icon:"newfile", shortcut:"Ctrl+N", onClick:cleanSlate },
    { label:"Open Project...", icon:"newfile", shortcut:"Ctrl+O", onClick:openProject },
    { label:"Save Project", icon:"copy", shortcut:"Ctrl+S", onClick:()=>saveProject(false) },
    { label:"Save Project As...", icon:"copy", shortcut:"Ctrl+Shift+S", onClick:()=>saveProject(true) },
    { label:"Load Autosave", icon:"loop", onClick:loadAutosave },
    { label:"Load Demo Session", icon:"dice", onClick:loadDemo },
    { sep:true },
    { header:"Add Track" },
    { label:"Built-in Sampler", icon:"wave", onClick:()=>newTrack("sampler","Built-in Sampler") },
    { label:"Drum Rack", icon:"drum", onClick:()=>newTrack("drum","Drum Rack") },
    { label:"Multi-Sample Instrument", icon:"piano", onClick:()=>newTrack("multisample","Multi-Sample Keys") },
    { sep:true },
    { header:"Import / Export" },
    { label:"Import Audio (WAV/MP3/OGG/FLAC)", icon:"wave", onClick:importAudio },
    { label:"Import MIDI", icon:"piano", onClick:()=>runScaffold("midi-input","MIDI import") },
    { label:"Import SoundFont", icon:"piano", onClick:()=>runScaffold("soundfont","SoundFont import") },
    { label:"Export Mixdown WAV", icon:"wave", onClick:renderMixdown },
    { label:"Export Stems Manifest", icon:"mixer", onClick:exportStems },
    { label:"Template Projects", icon:"star", onClick:()=>openMenu(e,[
      { header:"Template Projects" },
      ...TEMPLATE_PROJECTS.map(t=>({label:t.name,icon:"star",onClick:()=>loadTemplate(t.id)})),
    ]) },
    { sep:true },
    { header:"View" },
    { label:(showBrowser?"Hide":"Show")+" Browser", icon:"search", checked:showBrowser, onClick:()=>setShowBrowser(b=>!b) },
    { label:(bottom==="piano"?"Hide":"Show")+" Piano Roll", icon:"piano", checked:bottom==="piano", onClick:()=>setBottom(b=>b==="piano"?null:"piano") },
    { label:(bottom==="mixer"?"Hide":"Show")+" Mixer", icon:"mixer", checked:bottom==="mixer", onClick:()=>setBottom(b=>b==="mixer"?null:"mixer") },
    { label:(showAssistant?"Hide":"Show")+" Assistant", icon:"spark", checked:showAssistant, onClick:()=>setShowAssistant(a=>!a) },
    { label:"Settings...", icon:"fx", onClick:()=>setShowSettings(true) },
    { label:"Report Issue...", icon:"spark", onClick:reportIssue },
    { sep:true },
    { header:"Edit" },
    { label:"Undo", shortcut:"Ctrl+Z", disabled:!historyRef.current.past.length, onClick:undo },
    { label:"Redo", shortcut:"Ctrl+Shift+Z", disabled:!historyRef.current.future.length, onClick:redo },
    { sep:true },
    { header:"Desktop / Native" },
    { label:"VST Plugin Hosting", icon:"fx", onClick:scanNativePlugins },
    { label:"Scan Extensions", icon:"search", onClick:listExtensions },
    { label:"Detach Mixer Window", icon:"mixer", onClick:()=>openPanel("mixer") },
    { label:"Detach Piano Roll Window", icon:"piano", onClick:()=>openPanel("piano") },
    { label:"Microphone Recording", icon:"rec", onClick:startMicRecording },
    { label:midiEnabled?"MIDI Enabled":"Enable MIDI Input", icon:"piano", checked:midiEnabled, onClick:startMidi },
    { label:"Automatic Remastering", icon:"spark", onClick:()=>runScaffold("ai-remaster","Automatic remastering") },
    { label:"Stem Splitting", icon:"scissors", onClick:()=>runScaffold("stem-split","Stem splitting") },
    { sep:true },
    { label:"Zoom In", icon:"zoomin", shortcut:"Ctrl+", onClick:()=>setUiScale(s=>clamp(+(s+0.1).toFixed(2),0.6,1.6)) },
    { label:"Zoom Out", icon:"zoomout", shortcut:"Ctrl-", onClick:()=>setUiScale(s=>clamp(+(s-0.1).toFixed(2),0.6,1.6)) },
    { label:"Reset Zoom (100%)", shortcut:"Ctrl+0", onClick:()=>setUiScale(1) },
    { sep:true },
    { header:projectPath?projectPath:projectNotice },
  ]);

  // ---- assistant action runner ----
  const findTrack=(name)=>{ const ts=tracksRef.current;
    return ts.find(t=>t.name.toLowerCase()===(name||"").toLowerCase())
      || (name? ts.find(t=>t.name.toLowerCase().includes(name.toLowerCase())) : null)
      || (name? ts.find(t=>t.kind===name.toLowerCase()) : null); };
  const runAction=(a)=>{
    switch(a.action){
      case "set_bpm": setBpmProject(clamp(Math.round(a.value),40,250)); return `Tempo → ${clamp(Math.round(a.value),40,250)} BPM`;
      case "set_key": setScaleProject({root:a.root||"C",name:SCALES[a.scale]?a.scale:"Minor"}); return `Key → ${a.root} ${a.scale}`;
      case "play": Audio.ensure(); setPlaying(true); return "Playing";
      case "stop": setPlaying(false); return "Stopped";
      case "set_loop": { const s=clamp(Math.round(a.start_bar??0),0,256), en=clamp(Math.round(a.end_bar??8),s+1,260);
        setLoopRange(s,en); return `Loop ${s+1}–${en} bars`; }
      case "clear_project": cleanSlate(); return "Cleared the project";
      case "add_track": { const t=newTrack(a.kind||"keys",a.name); return `Added “${t.name}”`; }
      case "delete_track": { const t=findTrack(a.track); if(t){deleteTrack(t.id); return `Deleted ${t.name}`;} return null; }
      case "duplicate_track": { const t=findTrack(a.track); if(t){duplicateTrack(t.id); return `Duplicated ${t.name}`;} return null; }
      case "set_volume": { const t=findTrack(a.track); if(t){setVol(t.id,clamp(a.value,0,1)); return `${t.name} vol ${Math.round(a.value*100)}%`;} return null; }
      case "mute": { const t=findTrack(a.track); if(t){upd(t.id,{mute:!!a.on},"Mute"); return `${a.on?"Muted":"Unmuted"} ${t.name}`;} return null; }
      case "solo": { const t=findTrack(a.track); if(t){upd(t.id,{solo:!!a.on},"Solo"); return `${a.on?"Soloed":"Unsoloed"} ${t.name}`;} return null; }
      case "add_chords": {
        const notes=[]; (a.chords||[]).forEach(c=>chord(c.root,c.type,c.s,c.l,0.8).forEach(n=>notes.push({...n,id:uid()})));
        return placeNotes(a.track,notes,a.kind||"pad","AI Chords");
      }
      case "add_melody": {
        const notes=(a.notes||[]).map(n=>({id:uid(),p:n.p,s:n.s,l:n.l,v:n.v??0.85}));
        return placeNotes(a.track,notes,a.kind||"lead","AI Melody");
      }
      case "add_bassline": {
        const notes=(a.notes||[]).map(n=>({id:uid(),p:n.p,s:n.s,l:n.l,v:n.v??0.9}));
        return placeNotes(a.track,notes,"bass","AI Bass");
      }
      default: return null;
    }
  };
  const placeNotes=(trackName,notes,kind,clipName)=>{
    if(!notes.length) return null;
    const maxBeat=Math.max(...notes.map(n=>n.s+n.l)); const len=Math.max(4,Math.ceil(maxBeat/4));
    let t=findTrack(trackName);
    if(t){ const clipId=uid();
      setTracksProject("Assistant notes",ts=>ts.map(x=>x.id!==t.id?x:{...x,clips:[...x.clips,{id:clipId,start:0,len,name:clipName,notes}]}));
      setSelClip({trackId:t.id,clipId}); setSelTrack(t.id);
    } else { const id=uid(),clipId=uid(),color=PALETTE[tracksRef.current.length%PALETTE.length];
      const tk={id,name:trackName||clipName,kind,color,mute:false,solo:false,fav:false,vol:0.75,pan:0,
        clips:[{id:clipId,start:0,len,name:clipName,notes}]};
      setTracksProject("Assistant track",ts=>[...ts,tk]); setSelClip({trackId:id,clipId}); setSelTrack(id);
    }
    setBottom("piano");
    return `${notes.length} notes → ${trackName}`;
  };

  const describeStateObj=()=>({bpm,key:`${scale.root} ${scale.name}`,loop:`${loop.start+1}-${loop.end}`,
    tracks:tracks.map(t=>({name:t.name,kind:t.kind,muted:t.mute,clips:(t.clips||[]).length}))});
  const describeState=()=>{ const s=describeStateObj();
    return `${s.bpm} BPM, key ${s.key}. Tracks: ${s.tracks.length? s.tracks.map(t=>`${t.name} (${t.kind})`).join(", "):"none yet"}`; };

  const selClipObj = selClip ? (()=>{ const t=tracks.find(x=>x.id===selClip.trackId);
    const c=t&&t.clips.find(x=>x.id===selClip.clipId); return c?{clip:c,track:t}:null; })() : null;
  const playBeatInClip = selClipObj ? position - selClipObj.clip.start*beatsPerBar : null;
  const trackGain = selClipObj ? selClipObj.track.vol*masterVol : 0.8;

  const arrCtx = { tracks,pxPerBar,beatsPerBar,timelineBars:songBars,position,selClip,selTrack,playing,loop,snap,
    mediaIds:new Set(media.map(m=>m.id)), mediaById:new Map(media.map(m=>[m.id,m])),
    setZoom:setPxPerBar,setPosition,selectTrack,selectClip,moveClip,renameTrack,renameClip,toggleMute,toggleSolo,toggleFav,
    addTrack,dropItem,dropItemAt,openPiano,deleteTrack,duplicateTrack,silenceTrack,clearClips,duplicateClip,deleteClip,resizeClip,setLoopRange,
    setLoop, recordHistory, wheelZoom:settings.editing.wheelZoom, updateClip, splitClip };

  return (
    <div className="scan" style={{height:"100vh",display:"flex",flexDirection:"column",position:"relative"}}>
      <Transport {...{bpm,setBpm:setBpmProject,playing,recording,position,sig,loop,metro,snap,scale,cpu,uiScale,setUiScale,
        projectNotice,nativeMode:!!window.dawNative,
        onAppMenu:appMenu,onPlay,onStop,onRec,onLoop:()=>setLoopProject(l=>{ const next={...l,on:!l.on}; setProjectNotice(next.on?"Loop enabled":"Loop disabled"); return next; }),onMetro:()=>{recordHistory("Metronome");setMetro(m=>!m);},
        onSnap:()=>setSnapProject(s=>!s),showBrowser,onBrowser:()=>setShowBrowser(b=>!b),
        bottom,onBottom:(v)=>setBottom(b=>b===v?null:v),showAssistant,onAssistant:()=>setShowAssistant(a=>!a)}}/>

      <div style={{flex:1,display:"flex",minHeight:0}}>
        {showBrowser && <Browser onAdd={dropItem} onClose={()=>setShowBrowser(false)} media={media}/>}

        <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
          <Arrangement {...arrCtx}/>

          {bottom && <>
            <div onPointerDown={(e)=>{ const sy=e.clientY,sh=bottomH;
              const mv=(ev)=>setBottomH(clamp(sh+(sy-ev.clientY),140,window.innerHeight/uiScale-220));
              const up=()=>{window.removeEventListener("pointermove",mv);window.removeEventListener("pointerup",up);};
              window.addEventListener("pointermove",mv);window.addEventListener("pointerup",up); }}
              style={{height:6,flex:"0 0 auto",cursor:"ns-resize",background:"var(--bg-3)",borderTop:"1px solid var(--line-2)",
                position:"relative"}}>
              <div style={{position:"absolute",left:"50%",top:2,transform:"translateX(-50%)",width:40,height:2,borderRadius:99,background:"var(--line-3)"}}/>
            </div>
            <div style={{height:bottomH,flex:"0 0 auto"}}>
              {bottom==="piano" && <PianoRoll height={bottomH} clip={selClipObj&&selClipObj.clip} track={selClipObj&&selClipObj.track}
                scale={scale} setScale={setScaleProject} snap={snap} setSnap={setSnapProject} fold={fold} onFold={()=>{recordHistory("Fold");setFold(f=>!f);}}
                updateNotes={updateNotes} updateControllers={updateControllers} growClip={growSelClip} playing={playing} playBeatInClip={playBeatInClip} trackGain={trackGain}
                onClose={()=>setBottom(null)} recordHistory={recordHistory} wheelZoom={settings.editing.wheelZoom} settings={settings}/>}
              {bottom==="mixer" && <Mixer height={bottomH} tracks={tracks} levels={levels} selTrack={selTrack}
                selectTrack={selectTrack} setVol={setVol} setPan={setPan} toggleMute={toggleMute} toggleSolo={toggleSolo}
                masterVol={masterVol} setMasterVol={setMasterVolProject} onAddFx={addFx} onToggleFx={toggleFx} onRemoveFx={removeFx}
                onClose={()=>setBottom(null)}/>}
            </div>
          </>}
        </div>

        {showAssistant && <Assistant onClose={()=>setShowAssistant(false)} runAction={runAction}
          describeState={describeState} describeStateObj={describeStateObj}/>}
      </div>

      <ContextMenuHost/>
      {mediaWarnings.length > 0 && (
        <div style={{position:"absolute",left:16,right:16,top:autosavePrompt?132:74,zIndex:48,display:"flex",justifyContent:"center",pointerEvents:"none"}}>
          <div title={mediaWarnings.join("\n")} style={{pointerEvents:"auto",maxWidth:860,width:"100%",display:"flex",alignItems:"center",gap:12,padding:"10px 13px",
            border:"1px solid color-mix(in srgb,var(--amber) 45%,transparent)",background:"color-mix(in srgb,var(--bg-2) 94%,var(--amber))",
            borderRadius:"var(--r-2)",boxShadow:"var(--sh-pop)"}}>
            <div style={{width:9,height:9,borderRadius:99,background:"var(--amber)",boxShadow:"0 0 12px var(--amber)"}}/>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontWeight:800,fontSize:12.5}}>Project media warning</div>
              <div className="mono dim" style={{fontSize:10,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {ProjectIO.mediaWarningSummary(mediaWarnings)}
              </div>
            </div>
            <button onClick={()=>setMediaWarnings([])} style={{height:28,padding:"0 10px",borderRadius:"var(--r-2)",background:"var(--bg-4)",color:"var(--tx-2)",fontWeight:700}}>Dismiss</button>
          </div>
        </div>
      )}
      {autosavePrompt && (
        <div style={{position:"absolute",left:16,right:16,top:74,zIndex:50,display:"flex",justifyContent:"center",pointerEvents:"none"}}>
          <div style={{pointerEvents:"auto",maxWidth:760,width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",
            border:"1px solid color-mix(in srgb,var(--amber) 45%,transparent)",background:"color-mix(in srgb,var(--bg-2) 92%,var(--amber))",
            borderRadius:"var(--r-2)",boxShadow:"var(--sh-pop)"}}>
            <div style={{width:9,height:9,borderRadius:99,background:"var(--amber)",boxShadow:"0 0 12px var(--amber)"}}/>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontWeight:800,fontSize:12.5}}>Autosave recovery available</div>
              <div className="mono dim" style={{fontSize:10,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{autosavePrompt.summary}</div>
            </div>
            <button onClick={restoreAutosavePrompt} style={{height:30,padding:"0 12px",borderRadius:"var(--r-2)",background:"var(--cyan)",color:"#061016",fontWeight:800}}>Restore</button>
            <button onClick={discardAutosavePrompt} style={{height:30,padding:"0 12px",borderRadius:"var(--r-2)",background:"var(--bg-4)",color:"var(--tx-2)",fontWeight:700}}>Discard</button>
          </div>
        </div>
      )}
      {showSettings && <SettingsModal settings={settings} onChange={applySettings} onClose={()=>setShowSettings(false)}/>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AppErrorBoundary><App/></AppErrorBoundary>);
