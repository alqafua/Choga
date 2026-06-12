import { useState, useEffect } from "react";
import { C, card, primaryBtn, platformInfo } from "./theme";
import { listContent, updateContent } from "./api";

export default function PublishPage() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId,  setBusyId]  = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listContent());
    } catch {
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => { await load(); })();
  }, []);

  const ready = items.filter(i => i.status === "ready")
    .sort((a, b) => (a.scheduledDate || "").localeCompare(b.scheduledDate || ""));
  const published = items.filter(i => i.status === "published")
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""))
    .slice(0, 10);

  const markPublished = async (item) => {
    setBusyId(item.id);
    await updateContent(item.id, { status: "published", publishedAt: new Date().toISOString() });
    await load();
    setBusyId(null);
  };

  return (
    <div style={{flex:1, overflowY:"auto", padding:"16px 14px 24px"}}>
      <p style={{fontSize:12,color:C.muted,marginBottom:14,lineHeight:1.7}}>المحتوى الجاهز للنشر — انشره يدوياً على المنصة ثم اضغط "تم النشر" لتسجيله.</p>

      {loading ? (
        <p style={{textAlign:"center",color:C.muted,fontSize:13,marginTop:24}}>جاري التحميل…</p>
      ) : ready.length === 0 ? (
        <div style={{textAlign:"center", color:C.muted, marginTop:40}}>
          <div style={{fontSize:36, marginBottom:10}}>🚀</div>
          <div style={{fontSize:13}}>لا يوجد محتوى جاهز للنشر حالياً</div>
        </div>
      ) : (
        ready.map(item => {
          const pl = platformInfo(item.platform);
          return (
            <div key={item.id} style={card}>
              <div style={{marginBottom:8}}>
                <div style={{fontWeight:700, fontSize:15}}>{item.title || "بدون عنوان"}</div>
                <div style={{fontSize:12, color:C.muted, marginTop:4, display:"flex", flexWrap:"wrap", gap:10}}>
                  <span>{pl.icon} {pl.name}</span>
                  {item.type && <span>· {item.type}</span>}
                  {item.occasion && <span>· {item.occasion}</span>}
                  {item.scheduledDate && <span>· 📅 {item.scheduledDate}</span>}
                </div>
              </div>
              {item.caption && <div style={{fontSize:13, color:C.text, lineHeight:1.6, marginBottom:12, whiteSpace:"pre-wrap"}}>{item.caption}</div>}
              <button type="button" disabled={busyId===item.id} onClick={()=>markPublished(item)} style={{...primaryBtn, width:"100%", opacity:busyId===item.id?0.6:1}}>
                {busyId===item.id ? "جاري الحفظ…" : "تم النشر ✅"}
              </button>
            </div>
          );
        })
      )}

      {published.length > 0 && (
        <>
          <div style={{fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.12em", margin:"20px 0 12px"}}>تم نشره مؤخراً</div>
          {published.map(item => {
            const pl = platformInfo(item.platform);
            return (
              <div key={item.id} style={{...card, opacity:0.7}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:700, fontSize:14}}>{item.title || "بدون عنوان"}</div>
                    <div style={{fontSize:12, color:C.muted, marginTop:4}}>{pl.icon} {pl.name}{item.publishedAt ? ` · ${item.publishedAt.slice(0,10)}` : ""}</div>
                  </div>
                  <span style={{fontSize:10, color:C.green, background:`${C.green}18`, border:`1px solid ${C.green}30`, borderRadius:99, padding:"2px 9px", fontWeight:600}}>تم النشر</span>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
