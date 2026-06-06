/* ============================================================
   Draftwave — global right-click context menu
   openMenu(event, items)  ·  <ContextMenuHost/> at app root
   item: { label, icon, shortcut, danger, disabled, checked, onClick }
         { sep:true }  ·  { header:"TEXT" }
   ============================================================ */

function openMenu(e, items){
  e.preventDefault(); e.stopPropagation();
  window.dispatchEvent(new CustomEvent("daw:ctx",{ detail:{ x:e.clientX, y:e.clientY, items:items.filter(Boolean) } }));
}

function ContextMenuHost(){
  const [menu,setMenu]=React.useState(null);
  React.useEffect(()=>{
    const open=(e)=>setMenu(e.detail);
    const close=()=>setMenu(null);
    const key=(e)=>{ if(e.key==="Escape") setMenu(null); };
    const fallback=(e)=>{
      if(e.defaultPrevented) return;
      const target = e.target;
      const control = target?.closest?.("button,[role='button'],input,textarea");
      if(control?.closest?.(".ctx-pop")) return;
      e.preventDefault();
      e.stopPropagation();
      if(control){
        const label = (control.getAttribute("title") || control.getAttribute("aria-label") || control.textContent || control.value || "Control").trim();
        setMenu({ x:e.clientX, y:e.clientY, items:[
          { header:label || "Control" },
          { label:"Activate", icon:"pointer", disabled:control.disabled, onClick:()=>control.click() },
          { label:"Focus", icon:"selectall", disabled:typeof control.focus!=="function", onClick:()=>control.focus() },
        ] });
      } else {
        setMenu({ x:e.clientX, y:e.clientY, items:[
          { header:"Draftwave" },
          { label:"Project Menu", icon:"newfile", onClick:()=>window.dispatchEvent(new CustomEvent("daw:appmenu",{ detail:{ x:e.clientX, y:e.clientY } })) },
          { label:"Close Menu", icon:"close" },
        ] });
      }
    };
    window.addEventListener("daw:ctx",open);
    window.addEventListener("contextmenu",fallback);
    window.addEventListener("blur",close);
    window.addEventListener("resize",close);
    window.addEventListener("keydown",key,true);
    return ()=>{ window.removeEventListener("daw:ctx",open); window.removeEventListener("blur",close);
      window.removeEventListener("contextmenu",fallback); window.removeEventListener("resize",close); window.removeEventListener("keydown",key,true); };
  },[]);
  if(!menu) return null;
  const W=224;
  const approxH = menu.items.reduce((a,it)=> a + (it.sep?11 : it.header?22 : 31), 12);
  const x=Math.max(6, Math.min(menu.x, window.innerWidth-W-8));
  const y=Math.max(6, Math.min(menu.y, window.innerHeight-approxH-8));
  return (
    <div style={{position:"fixed",inset:0,zIndex:3000}}
      onPointerDown={()=>setMenu(null)}
      onContextMenu={(e)=>{e.preventDefault();setMenu(null);}}>
      <div onPointerDown={e=>e.stopPropagation()} className="no-sel ctx-pop"
        style={{position:"absolute",left:x,top:y,width:W,padding:6,background:"var(--bg-3)",
          border:"1px solid var(--line-3)",borderRadius:"var(--r-2)",boxShadow:"var(--sh-pop)"}}>
        {menu.items.map((it,i)=> it.sep
          ? <div key={i} style={{height:1,background:"var(--line)",margin:"5px 6px"}}/>
          : it.header
          ? <div key={i} className="faint" style={{fontSize:9.5,fontWeight:700,letterSpacing:".1em",
              textTransform:"uppercase",padding:"6px 9px 4px"}}>{it.header}</div>
          : <button key={i} disabled={it.disabled} className="ctx-item"
              onClick={()=>{ setMenu(null); it.onClick&&it.onClick(); }}
              style={{display:"flex",alignItems:"center",gap:11,width:"100%",height:31,padding:"0 9px",borderRadius:6,
                fontSize:12.5,fontWeight:500,textAlign:"left",
                color: it.disabled?"var(--tx-4)":(it.danger?"var(--red)":"var(--tx)"),
                cursor:it.disabled?"default":"pointer"}}>
              <span style={{width:16,height:16,display:"grid",placeItems:"center",flex:"0 0 auto",
                color: it.danger?"var(--red)":(it.checked?"var(--cyan)":"var(--tx-2)"),fontSize:12}}>
                {it.icon ? React.cloneElement(I[it.icon]||I.spark,{style:{width:14.5,height:14.5}})
                  : (it.checked?"✓":"")}</span>
              <span style={{flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it.label}</span>
              {it.shortcut && <span className="faint mono" style={{fontSize:10,letterSpacing:".02em"}}>{it.shortcut}</span>}
            </button>
        )}
      </div>
    </div>
  );
}

Object.assign(window,{ openMenu, ContextMenuHost });
