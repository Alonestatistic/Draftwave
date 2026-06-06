/* ============================================================
   THE DAW — shared UI widgets
   ============================================================ */

/* Rotary knob — drag vertically to turn */
function Knob({ value, min=0, max=1, onChange, size=34, color="var(--cyan)", label, fmt }) {
  const drag = React.useRef(null);
  const norm = (value - min) / (max - min);
  const ang = -135 + norm * 270;
  const start = (e) => {
    e.preventDefault();
    drag.current = { y: e.clientY ?? e.touches[0].clientY, v: value };
    const move = (ev) => {
      const y = ev.clientY ?? ev.touches[0].clientY;
      const dv = (drag.current.y - y) / 160 * (max - min);
      onChange(clamp(drag.current.v + dv, min, max));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const r = size/2 - 3, cx = size/2, cy = size/2;
  const a0 = (-135) * Math.PI/180, a1 = ang * Math.PI/180;
  const pt = (a) => [cx + r*Math.cos(a), cy + r*Math.sin(a)];
  const arc = (s,e,large) => { const [x0,y0]=pt(s),[x1,y1]=pt(e); return `M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1}`; };
  return (
    <div className="knob no-sel" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <svg width={size} height={size} onPointerDown={start} style={{cursor:"ns-resize",touchAction:"none"}}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line-3)" strokeWidth="3"
          strokeDasharray={`${r*Math.PI*1.5} 999`} strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`}/>
        <path d={arc(a0,a1, norm>0.5?1:0)} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          style={{filter:`drop-shadow(0 0 4px ${color})`}}/>
        <line x1={cx} y1={cy} x2={pt(a1)[0]} y2={pt(a1)[1]} stroke="var(--tx)" strokeWidth="2" strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={r-5} fill="var(--bg-4)" stroke="var(--line)" />
      </svg>
      {label && <span className="faint" style={{fontSize:9,textTransform:"uppercase",letterSpacing:".08em"}}>{label}</span>}
      {fmt && <span className="mono" style={{fontSize:9.5,color:"var(--tx-2)"}}>{fmt(value)}</span>}
    </div>
  );
}

/* Vertical fader */
function Fader({ value, onChange, height=120, color="var(--cyan)" }) {
  const ref = React.useRef(null);
  const set = (clientY) => {
    const r = ref.current.getBoundingClientRect();
    onChange(clamp(1 - (clientY - r.top) / r.height, 0, 1));
  };
  const start = (e) => { e.preventDefault(); set(e.clientY);
    const move = (ev) => set(ev.clientY);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  return (
    <div ref={ref} className="fader no-sel" onPointerDown={start}
      style={{position:"relative",width:30,height,cursor:"ns-resize",touchAction:"none"}}>
      <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:4,transform:"translateX(-50%)",
        background:"var(--bg-5)",borderRadius:99}}/>
      <div style={{position:"absolute",left:"50%",bottom:0,width:4,height:`${value*100}%`,transform:"translateX(-50%)",
        background:`linear-gradient(${color},${color})`,borderRadius:99,boxShadow:`0 0 8px ${color}`}}/>
      <div style={{position:"absolute",left:"50%",bottom:`calc(${value*100}% - 9px)`,transform:"translateX(-50%)",
        width:24,height:18,borderRadius:4,background:"var(--bg-5)",border:"1px solid var(--line-3)",
        boxShadow:"var(--sh-1)"}}>
        <div style={{position:"absolute",left:3,right:3,top:"50%",height:2,background:color,borderRadius:2,opacity:.9}}/>
      </div>
    </div>
  );
}

/* Animated VU meter (vertical). level 0..1 driven externally */
function VuMeter({ level, height=120, w=7 }) {
  const pct = clamp(level,0,1);
  return (
    <div style={{position:"relative",width:w,height,background:"var(--bg-1)",borderRadius:3,overflow:"hidden",
      border:"1px solid var(--line)"}}>
      <div style={{position:"absolute",left:0,right:0,bottom:0,height:`${pct*100}%`,
        background:"linear-gradient(0deg,var(--emerald) 0%,var(--emerald) 62%,var(--amber) 82%,var(--red) 100%)",
        transition:"height .05s linear",borderRadius:2}}/>
      {/* tick marks */}
      {[0.25,0.5,0.75].map(t=>(
        <div key={t} style={{position:"absolute",left:0,right:0,bottom:`${t*100}%`,height:1,background:"rgba(0,0,0,.45)"}}/>
      ))}
    </div>
  );
}

/* Pill toggle */
function Toggle({ on, onClick, children, color="var(--cyan)", title }) {
  return (
    <button title={title} onClick={onClick} className="no-sel"
      style={{display:"inline-flex",alignItems:"center",gap:6,height:26,padding:"0 10px",borderRadius:"var(--r-pill)",
        fontSize:11,fontWeight:600,letterSpacing:".02em",transition:"all .14s",
        color: on?"#04121a":"var(--tx-2)",
        background: on?color:"var(--bg-4)",
        boxShadow: on?`0 0 14px ${color}66`:"none"}}>
      {children}
    </button>
  );
}

/* Segmented control */
function Segmented({ options, value, onChange, color="var(--cyan)" }) {
  return (
    <div className="no-sel" style={{display:"inline-flex",background:"var(--bg-2)",borderRadius:"var(--r-2)",
      padding:3,gap:2,border:"1px solid var(--line)"}}>
      {options.map(o=>{ const v=o.value??o, lab=o.label??o, act=v===value;
        return <button key={v} onClick={()=>onChange(v)} title={o.title}
          style={{height:24,padding:"0 10px",borderRadius:6,fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:5,
            color:act?"#04121a":"var(--tx-2)",background:act?color:"transparent",transition:"all .12s",
            boxShadow:act?`0 0 10px ${color}55`:"none"}}>
          {o.icon && React.cloneElement(I[o.icon],{style:{width:13,height:13}})}{lab}
        </button>; })}
    </div>
  );
}

Object.assign(window, { Knob, Fader, VuMeter, Toggle, Segmented });
