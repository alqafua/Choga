import { useState, useEffect } from "react";
import { C, fontImport, PLATFORMS } from "./theme";
import { getPublicStorefront } from "./api";

export default function StorefrontPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setData(await getPublicStorefront()); } catch { setData(null); }
      setLoading(false);
    })();
  }, []);

  const theme = data?.themeColor || C.accent;

  if (loading) {
    return (
      <div dir="rtl" style={{
        fontFamily:"'Tajawal',system-ui,sans-serif", background:C.bg, color:C.muted,
        height:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <style>{fontImport}</style>
        جاري التحميل…
      </div>
    );
  }

  const links = Object.entries(data?.links || {})
    .map(([id, link]) => ({ ...platformInfo(id), ...link }))
    .filter(l => l.url);

  const items = data?.catalog || [];

  return (
    <div dir="rtl" style={{fontFamily:"'Tajawal',system-ui,sans-serif", background:C.bg, color:C.text, minHeight:"100vh"}}>
      <style>{fontImport}</style>

      {/* cover */}
      <div style={{
        height: data?.coverImage ? 180 : 90, position:"relative",
        background: data?.coverImage ? `url(${data.coverImage}) center/cover no-repeat` : `linear-gradient(135deg, ${theme}, #1b2131)`,
      }} />

      <div style={{maxWidth:680, margin:"0 auto", padding:"0 18px 60px", position:"relative"}}>
        {/* logo + identity */}
        <div style={{display:"flex", alignItems:"flex-end", gap:16, marginTop:-36, marginBottom:18}}>
          {data?.logo ? (
            <img src={data.logo} alt="" style={{width:84, height:84, borderRadius:20, objectFit:"cover", border:`3px solid ${C.bg}`, background:C.card, flexShrink:0}} />
          ) : (
            <div style={{width:84, height:84, borderRadius:20, border:`3px solid ${C.bg}`, background:C.card, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:36}}>🍫</div>
          )}
          <div style={{paddingBottom:6}}>
            <h1 style={{fontSize:24, fontWeight:800}}>{data?.name || "المتجر"}</h1>
            {data?.tagline && <div style={{fontSize:13, color:theme, fontWeight:600, marginTop:2}}>{data.tagline}</div>}
          </div>
        </div>

        {data?.description && (
          <p style={{fontSize:14, color:C.muted, lineHeight:1.8, marginBottom:10}}>{data.description}</p>
        )}
        {data?.location && (
          <div style={{fontSize:13, color:C.muted, marginBottom:24}}>📍 {data.location}</div>
        )}

        {/* social links */}
        {links.length > 0 && (
          <div style={{display:"flex", flexWrap:"wrap", gap:10, marginBottom:32}}>
            {links.map(l => (
              <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" style={{
                display:"flex", alignItems:"center", gap:8, padding:"9px 16px", borderRadius:12,
                background:C.card, border:`1px solid ${C.border}`, color:C.text, textDecoration:"none", fontSize:13, fontWeight:600,
              }}>
                <span style={{fontSize:16}}>{l.icon}</span>
                {l.label || l.name}
              </a>
            ))}
          </div>
        )}

        {/* catalog */}
        <h2 style={{fontSize:16, fontWeight:800, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${C.border}`}}>المنتجات</h2>
        {items.length === 0 ? (
          <div style={{textAlign:"center", color:C.muted, marginTop:30, marginBottom:30}}>
            <div style={{fontSize:36, marginBottom:10}}>🛍️</div>
            <div style={{fontSize:13}}>لا توجد منتجات معروضة حالياً</div>
          </div>
        ) : (
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:14}}>
            {items.map(item => (
              <div key={item.id} style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden"}}>
                {item.image ? (
                  <img src={item.image} alt={item.name||""} style={{width:"100%", height:120, objectFit:"cover"}} onError={(e)=>{e.target.style.display="none";}} />
                ) : (
                  <div style={{width:"100%", height:120, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, background:C.inp}}>🍫</div>
                )}
                <div style={{padding:"10px 12px"}}>
                  <div style={{fontWeight:700, fontSize:13, marginBottom:4}}>{item.name}</div>
                  {item.price && <div style={{fontSize:12, fontWeight:700, color:theme, marginBottom:4}}>{item.price}</div>}
                  {item.description && <div style={{fontSize:11, color:C.muted, lineHeight:1.6}}>{item.description}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{textAlign:"center", color:C.dim, fontSize:11, marginTop:40}}>مدعوم من Choga</p>
      </div>
    </div>
  );
}

function platformInfo(id) {
  return PLATFORMS.find(p => p.id === id) || { id, name: id, icon: "🔗" };
}
