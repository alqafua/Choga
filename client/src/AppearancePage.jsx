import { useState, useEffect } from "react";
import { C, card, lbl, subHead, fieldStyle, PLATFORMS } from "./theme";
import { getSettings, saveSettings } from "./api";

const emptyLinks = () => PLATFORMS.reduce((acc, p) => ({ ...acc, [p.id]: { label: "", url: "" } }), {});

export default function AppearancePage() {
  const [settings, setSettings] = useState(null);
  const [links, setLinks] = useState(emptyLinks());
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    (async () => {
      try {
        const remote = await getSettings();
        setSettings(remote || {});
        const a = remote?.appearance || {};
        setLinks({ ...emptyLinks(), ...(a.links || {}) });
      } catch {
        setSettings({});
      }
      setLoading(false);
    })();
  }, []);

  const iStyle = (id) => fieldStyle(focus, id);
  const upLink = (id, k, v) => setLinks(l => ({ ...l, [id]: { ...l[id], [k]: v } }));

  const save = async () => {
    setStatus("saving");
    try {
      await saveSettings({ ...settings, appearance: { ...(settings?.appearance || {}), links } });
      setStatus("saved");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2500);
  };

  if (loading) {
    return <p style={{textAlign:"center",color:C.muted,fontSize:13,marginTop:24}}>جاري التحميل…</p>;
  }

  return (
    <div style={{flex:1, overflowY:"auto", padding:"16px 14px 24px"}}>
      <p style={{fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.7}}>
        حدّد الاسم المعروض ورابط الصفحة لكل حساب — تُستخدم هذه البيانات في موقع المتجر العام وأي مكان تُعرض فيه حساباتك.
      </p>

      <div style={card}>
        <div style={subHead}>أسماء وروابط الحسابات</div>
        {PLATFORMS.map(p => {
          const link = links[p.id] || { label: "", url: "" };
          return (
            <div key={p.id} style={{marginBottom:16, paddingBottom:16, borderBottom:`1px solid ${C.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,background:`${p.color}18`,border:`1px solid ${p.color}30`}}>{p.icon}</div>
                <span style={{fontWeight:700,fontSize:14}}>{p.name}</span>
              </div>
              <div style={{marginBottom:10}}>
                <label style={lbl}>الاسم المعروض</label>
                <input style={iStyle(`${p.id}_label`)} value={link.label} onFocus={()=>setFocus(`${p.id}_label`)} onBlur={()=>setFocus("")} onChange={e=>upLink(p.id,"label",e.target.value)} placeholder={`اسم ${p.name} كما يظهر للزوار`} />
              </div>
              <div>
                <label style={lbl}>الرابط</label>
                <input style={{...iStyle(`${p.id}_url`),direction:"ltr",textAlign:"right",fontFamily:"monospace",fontSize:12}} value={link.url} onFocus={()=>setFocus(`${p.id}_url`)} onBlur={()=>setFocus("")} onChange={e=>upLink(p.id,"url",e.target.value)} placeholder="https://..." />
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={save} disabled={status==="saving"}
        style={{
          width:"100%", padding:"16px", borderRadius:16,
          fontSize:16, fontWeight:700, cursor:"pointer",
          fontFamily:"'Tajawal',system-ui,sans-serif",
          marginTop:4, marginBottom:8,
          background: status==="saved"
            ? "rgba(34,197,94,0.15)"
            : status==="error"
            ? "rgba(239,68,68,0.15)"
            : `linear-gradient(135deg, ${C.accent}, #E08820)`,
          color: status==="saved" ? C.green : status==="error" ? C.red : "#0a0a0a",
          boxShadow: status==="saved"||status==="error" ? "none" : `0 6px 28px ${C.accent}45`,
          border: status==="saved" ? `1px solid ${C.green}40` : status==="error" ? `1px solid ${C.red}40` : "none",
          transition:"all .2s",
          display:"flex", alignItems:"center", justifyContent:"center", gap:10,
        }}>
        <span style={{fontSize:20}}>
          {status==="saving"?"⏳":status==="saved"?"✅":status==="error"?"⚠️":"💾"}
        </span>
        {status==="saving"?"جاري الحفظ…":status==="saved"?"تم حفظ المظهر بنجاح":status==="error"?"تعذّر الحفظ — حاول مجدداً":"حفظ المظهر"}
      </button>
    </div>
  );
}
