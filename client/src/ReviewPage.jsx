import { useState, useEffect } from "react";
import { C, card, fieldStyle, primaryBtn, ghostBtn, platformInfo } from "./theme";
import { listContent, updateContent } from "./api";

export default function ReviewPage() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [edits,   setEdits]   = useState({});
  const [focus,   setFocus]   = useState("");
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

  const reviewItems = items.filter(i => i.status === "review");

  const captionFor = (item) => edits[item.id] !== undefined ? edits[item.id] : (item.caption || "");
  const setCaption = (id, v) => setEdits(e => ({ ...e, [id]: v }));

  const approve = async (item) => {
    setBusyId(item.id);
    await updateContent(item.id, { caption: captionFor(item), status: "ready" });
    setEdits(e => { const n = { ...e }; delete n[item.id]; return n; });
    await load();
    setBusyId(null);
  };

  const sendBack = async (item) => {
    setBusyId(item.id);
    await updateContent(item.id, { caption: captionFor(item), status: "draft" });
    setEdits(e => { const n = { ...e }; delete n[item.id]; return n; });
    await load();
    setBusyId(null);
  };

  return (
    <div style={{flex:1, overflowY:"auto", padding:"16px 14px 24px"}}>
      <p style={{fontSize:12,color:C.muted,marginBottom:14,lineHeight:1.7}}>راجع المحتوى المُرسل للمراجعة، عدّل النص إذا لزم، ثم اعتمده للنشر أو أرجعه للمسودة.</p>

      {loading ? (
        <p style={{textAlign:"center",color:C.muted,fontSize:13,marginTop:24}}>جاري التحميل…</p>
      ) : reviewItems.length === 0 ? (
        <div style={{textAlign:"center", color:C.muted, marginTop:40}}>
          <div style={{fontSize:36, marginBottom:10}}>✅</div>
          <div style={{fontSize:13}}>لا يوجد محتوى بانتظار المراجعة حالياً</div>
        </div>
      ) : (
        reviewItems.map(item => {
          const pl = platformInfo(item.platform);
          const fid = `caption_${item.id}`;
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

              <textarea
                style={{...fieldStyle(focus, fid), resize:"none", height:120, lineHeight:1.7, marginBottom:12}}
                value={captionFor(item)}
                onFocus={()=>setFocus(fid)}
                onBlur={()=>setFocus("")}
                onChange={e=>setCaption(item.id, e.target.value)} />

              {item.notes && <div style={{fontSize:12, color:C.muted, marginBottom:12, lineHeight:1.6}}>{item.notes}</div>}

              <div style={{display:"flex", gap:10}}>
                <button type="button" disabled={busyId===item.id} onClick={()=>approve(item)} style={{...primaryBtn, flex:1, opacity: busyId===item.id?0.6:1}}>
                  اعتماد ✅
                </button>
                <button type="button" disabled={busyId===item.id} onClick={()=>sendBack(item)} style={ghostBtn}>
                  إرجاع لمسودة
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
