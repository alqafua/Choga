import { C, fontImport } from "./theme";
import { logout } from "./api";
import { NAV, READY_NAV } from "./nav";

export default function Layout({ activeNav, setActiveNav, onLogout, children }) {
  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  return (
    <div dir="rtl" style={{fontFamily:"'Tajawal',system-ui,sans-serif", background:C.bg, color:C.text, height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden"}}>
      <style>{fontImport}</style>

      {/* ── Top header ── */}
      <div style={{flexShrink:0, padding:"14px 16px 0", background:C.bg}}>

        {/* brand row */}
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:10,background:`${C.accent}22`,border:`1px solid ${C.accent}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🍫</div>
            <div>
              <div style={{fontWeight:800,fontSize:15,letterSpacing:"0.05em",color:C.text}}>CHOGA</div>
              <div style={{fontSize:10,color:C.muted}}>مركز المحتوى</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6,background:`${C.green}18`,border:`1px solid ${C.green}30`,borderRadius:99,padding:"5px 12px"}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:C.green}}/>
              <span style={{fontSize:11,color:C.green,fontWeight:600}}>نشط</span>
            </div>
            <button onClick={handleLogout} style={{
              display:"flex",alignItems:"center",gap:6,background:"transparent",
              border:`1px solid ${C.border}`,borderRadius:99,padding:"5px 12px",
              color:C.muted, fontSize:11, fontWeight:600, cursor:"pointer",
              fontFamily:"'Tajawal',system-ui,sans-serif",
            }}>
              خروج
            </button>
          </div>
        </div>

        {/* nav tabs — horizontal scrollable */}
        <div style={{display:"flex",overflowX:"auto",gap:4,paddingBottom:0,scrollbarWidth:"none"}}>
          <style>{`.navscroll::-webkit-scrollbar{display:none}`}</style>
          {NAV.map(t=>{
            const active = t.id === activeNav;
            return (
              <button key={t.id}
                onClick={()=>setActiveNav(t.id)}
                style={{
                  flexShrink:0, display:"flex", alignItems:"center", gap:5,
                  padding:"8px 14px", borderRadius:"12px 12px 0 0",
                  background: active ? C.card : "transparent",
                  border: active ? `1px solid ${C.border}` : "1px solid transparent",
                  borderBottom: active ? `1px solid ${C.card}` : "1px solid transparent",
                  color: active ? C.accent : C.muted,
                  fontSize:13, fontWeight: active ? 700 : 400,
                  cursor:"pointer", fontFamily:"'Tajawal',system-ui,sans-serif",
                  transition:"all .15s", position:"relative", bottom:-1,
                }}>
                <span style={{fontSize:14}}>{t.icon}</span>
                <span>{t.label}</span>
                {!READY_NAV.has(t.id) && (
                  <span style={{fontSize:8,background:C.border,color:C.muted,borderRadius:4,padding:"1px 4px",fontWeight:400}}>قريباً</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content area ── */}
      <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:C.card, borderTop:`1px solid ${C.border}`}}>
        {children}
      </div>
    </div>
  );
}
