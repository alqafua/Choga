import { useState, useEffect } from "react";
import { C, card, lbl, subHead, fieldStyle, primaryBtn, PLATFORMS } from "./theme";
import { getSettings, saveSettings } from "./api";

const THEME_COLORS = ["#F0A030", "#E1306C", "#4A90D9", "#22c55e", "#A78BFA", "#F5D020", "#69C9D0", "#ef4444"];

const emptyLinks = () => PLATFORMS.reduce((acc, p) => ({ ...acc, [p.id]: { label: "", url: "" } }), {});

const DEF_APPEARANCE = { logo: "", coverImage: "", themeColor: C.accent, links: emptyLinks() };

export default function AppearancePage() {
  const [settings, setSettings] = useState(null);
  const [appearance, setAppearance] = useState(DEF_APPEARANCE);
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    (async () => {
      try {
        const remote = await getSettings();
        setSettings(remote || {});
        const a = remote?.appearance || {};
        setAppearance({
          logo: a.logo || "",
          coverImage: a.coverImage || "",
          themeColor: a.themeColor || C.accent,
          links: { ...emptyLinks(), ...(a.links || {}) },
        });
      } catch {
        setSettings({});
      }
      setLoading(false);
    })();
  }, []);

  const iStyle = (id) => fieldStyle(focus, id);
  const up = (k, v) => setAppearance(a => ({ ...a, [k]: v }));
  const upLink = (id, k, v) => setAppearance(a => ({ ...a, links: { ...a.links, [id]: { ...a.links[id], [k]: v } } }));

  const save = async () => {
    setStatus("saving");
    try {
      await saveSettings({ ...settings, appearance });
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
        تحكّم بشكل متجرك العام (الموقع الإلكتروني) — الشعار، صورة الغلاف، اللون الأساسي، وأسماء وروابط حساباتك.
      </p>

      <div style={card}>
        <div style={subHead}>هوية المتجر</div>
        <div style={{marginBottom:14}}>
          <label style={lbl}>رابط الشعار (Logo)</label>
          <input style={{...iStyle("logo"),direction:"ltr",textAlign:"right",fontFamily:"monospace",fontSize:12}} value={appearance.logo} onFocus={()=>setFocus("logo")} onBlur={()=>setFocus("")} onChange={e=>up("logo",e.target.value)} placeholder="https://...الصق رابط الشعار" />
          {appearance.logo && (
            <img src={appearance.logo} alt="" style={{width:56,height:56,objectFit:"cover",borderRadius:12,marginTop:10,border:`1px solid ${C.border}`}} onError={(e)=>{e.target.style.display="none";}} />
          )}
        </div>
        <div style={{marginBottom:14}}>
          <label style={lbl}>رابط صورة الغلاف</label>
          <input style={{...iStyle("cover"),direction:"ltr",textAlign:"right",fontFamily:"monospace",fontSize:12}} value={appearance.coverImage} onFocus={()=>setFocus("cover")} onBlur={()=>setFocus("")} onChange={e=>up("coverImage",e.target.value)} placeholder="https://...الصق رابط صورة الغلاف" />
          {appearance.coverImage && (
            <img src={appearance.coverImage} alt="" style={{width:"100%",height:90,objectFit:"cover",borderRadius:12,marginTop:10,border:`1px solid ${C.border}`}} onError={(e)=>{e.target.style.display="none";}} />
          )}
        </div>
        <div>
          <label style={lbl}>اللون الأساسي للموقع</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:8,alignItems:"center"}}>
            {THEME_COLORS.map(c => (
              <button key={c} type="button" onClick={()=>up("themeColor",c)} style={{
                width:32, height:32, borderRadius:"50%", background:c, cursor:"pointer",
                border: appearance.themeColor===c ? `3px solid ${C.text}` : `1px solid ${C.border}`,
                boxShadow: appearance.themeColor===c ? `0 0 0 2px ${c}55` : "none",
              }} />
            ))}
            <input type="color" value={appearance.themeColor} onChange={e=>up("themeColor",e.target.value)}
              style={{width:40,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:"none",cursor:"pointer",padding:2}} />
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={subHead}>أسماء وروابط الحسابات</div>
        <p style={{fontSize:12,color:C.muted,marginBottom:14,lineHeight:1.7}}>تظهر هذه الروابط في موقع المتجر العام — اتركها فارغة لإخفاء المنصّة.</p>
        {PLATFORMS.map(p => {
          const link = appearance.links[p.id] || { label: "", url: "" };
          return (
            <div key={p.id} style={{marginBottom:16, paddingBottom:16, borderBottom:`1px solid ${C.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,background:`${p.color}18`,border:`1px solid ${p.color}30`}}>{p.icon}</div>
                <span style={{fontWeight:700,fontSize:14}}>{p.name}</span>
              </div>
              <div style={{marginBottom:10}}>
                <label style={lbl}>الاسم المعروض</label>
                <input style={iStyle(`${p.id}_label`)} value={link.label} onFocus={()=>setFocus(`${p.id}_label`)} onBlur={()=>setFocus("")} onChange={e=>upLink(p.id,"label",e.target.value)} placeholder={`اسم ${p.name} كما يظهر في الموقع`} />
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
