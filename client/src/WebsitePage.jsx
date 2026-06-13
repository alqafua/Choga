import { useState, useEffect } from "react";
import { C, card, lbl, subHead, fieldStyle, primaryBtn, ghostBtn } from "./theme";
import { getSettings, saveSettings } from "./api";

const THEME_COLORS = ["#F0A030", "#E1306C", "#4A90D9", "#22c55e", "#A78BFA", "#F5D020", "#69C9D0", "#ef4444"];

export default function WebsitePage() {
  const [settings, setSettings] = useState(null);
  const [identity, setIdentity] = useState({ logo: "", coverImage: "", themeColor: C.accent });
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState("");
  const [status, setStatus] = useState("idle");
  const [copied, setCopied] = useState(false);

  const url = `${window.location.origin}/store`;

  useEffect(() => {
    (async () => {
      try {
        const remote = await getSettings();
        setSettings(remote || {});
        const a = remote?.appearance || {};
        setIdentity({ logo: a.logo || "", coverImage: a.coverImage || "", themeColor: a.themeColor || C.accent });
      } catch {
        setSettings({});
      }
      setLoading(false);
    })();
  }, []);

  const iStyle = (id) => fieldStyle(focus, id);
  const up = (k, v) => setIdentity(i => ({ ...i, [k]: v }));

  const save = async () => {
    setStatus("saving");
    try {
      await saveSettings({ ...settings, appearance: { ...(settings?.appearance || {}), ...identity } });
      setStatus("saved");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2500);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(()=>setCopied(false), 1500); } catch { /* ignore */ }
  };

  if (loading) {
    return <p style={{textAlign:"center",color:C.muted,fontSize:13,marginTop:24}}>جاري التحميل…</p>;
  }

  return (
    <div style={{flex:1, overflowY:"auto", padding:"16px 14px 24px"}}>
      <div style={card}>
        <div style={subHead}>هوية الموقع</div>
        <div style={{marginBottom:14}}>
          <label style={lbl}>رابط الشعار (Logo)</label>
          <input style={{...iStyle("logo"),direction:"ltr",textAlign:"right",fontFamily:"monospace",fontSize:12}} value={identity.logo} onFocus={()=>setFocus("logo")} onBlur={()=>setFocus("")} onChange={e=>up("logo",e.target.value)} placeholder="https://...الصق رابط الشعار" />
          {identity.logo && (
            <img src={identity.logo} alt="" style={{width:56,height:56,objectFit:"cover",borderRadius:12,marginTop:10,border:`1px solid ${C.border}`}} onError={(e)=>{e.target.style.display="none";}} />
          )}
        </div>
        <div style={{marginBottom:14}}>
          <label style={lbl}>رابط صورة الغلاف</label>
          <input style={{...iStyle("cover"),direction:"ltr",textAlign:"right",fontFamily:"monospace",fontSize:12}} value={identity.coverImage} onFocus={()=>setFocus("cover")} onBlur={()=>setFocus("")} onChange={e=>up("coverImage",e.target.value)} placeholder="https://...الصق رابط صورة الغلاف" />
          {identity.coverImage && (
            <img src={identity.coverImage} alt="" style={{width:"100%",height:90,objectFit:"cover",borderRadius:12,marginTop:10,border:`1px solid ${C.border}`}} onError={(e)=>{e.target.style.display="none";}} />
          )}
        </div>
        <div style={{marginBottom:16}}>
          <label style={lbl}>اللون الأساسي للموقع</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:8,alignItems:"center"}}>
            {THEME_COLORS.map(c => (
              <button key={c} type="button" onClick={()=>up("themeColor",c)} style={{
                width:32, height:32, borderRadius:"50%", background:c, cursor:"pointer",
                border: identity.themeColor===c ? `3px solid ${C.text}` : `1px solid ${C.border}`,
                boxShadow: identity.themeColor===c ? `0 0 0 2px ${c}55` : "none",
              }} />
            ))}
            <input type="color" value={identity.themeColor} onChange={e=>up("themeColor",e.target.value)}
              style={{width:40,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:"none",cursor:"pointer",padding:2}} />
          </div>
        </div>
        <button onClick={save} disabled={status==="saving"}
          style={{
            width:"100%", padding:"13px", borderRadius:14,
            fontSize:14, fontWeight:700, cursor:"pointer",
            fontFamily:"'Tajawal',system-ui,sans-serif",
            background: status==="saved"
              ? "rgba(34,197,94,0.15)"
              : status==="error"
              ? "rgba(239,68,68,0.15)"
              : `linear-gradient(135deg, ${C.accent}, #E08820)`,
            color: status==="saved" ? C.green : status==="error" ? C.red : "#0a0a0a",
            border: status==="saved" ? `1px solid ${C.green}40` : status==="error" ? `1px solid ${C.red}40` : "none",
            transition:"all .2s",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          }}>
          {status==="saving"?"⏳ جاري الحفظ…":status==="saved"?"✅ تم الحفظ":status==="error"?"⚠️ تعذّر الحفظ":"💾 حفظ هوية الموقع"}
        </button>
      </div>

      <div style={card}>
        <div style={subHead}>رابط متجرك العام</div>
        <p style={{fontSize:13, color:C.muted, marginBottom:14, lineHeight:1.8}}>
          هذا رابط صفحة متجرك العامة — يمكن لأي شخص زيارته بدون تسجيل دخول. شاركه مع زبائنك أو ضعه في الوصف على إنستغرام وفيسبوك.
        </p>
        <div style={{
          background:C.inp, border:`1px solid ${C.border}`, borderRadius:12,
          padding:"12px 14px", fontFamily:"monospace", fontSize:13, direction:"ltr",
          textAlign:"right", color:C.accent2, marginBottom:14, wordBreak:"break-all",
        }}>
          {url}
        </div>
        <div style={{display:"flex", gap:10}}>
          <button onClick={copy} style={{...primaryBtn, flex:1}}>{copied ? "تم النسخ ✓" : "📋 نسخ الرابط"}</button>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{...ghostBtn, textDecoration:"none", display:"flex", alignItems:"center"}}>↗️ فتح</a>
        </div>
      </div>

      <div style={card}>
        <div style={subHead}>كيف تتحكم بشكل الموقع؟</div>
        {[
          { icon: "🛍️", title: "الكتالوج", desc: "أضف منتجاتك من تبويب «الكتالوج» وفعّل «يظهر في الموقع» لكل منتج تريد عرضه." },
          { icon: "👥", title: "روابط الحسابات", desc: "من تبويب «المظهر» أضف الاسم المعروض ورابط كل حساب (إنستغرام، فيسبوك...) ليظهر في أسفل الموقع." },
          { icon: "⚙️", title: "الإعدادات", desc: "اسم المتجر، الشعار النصي (Tagline)، والوصف تُؤخذ من تبويب «الإعدادات» ← «هوية المشروع»." },
        ].map(s => (
          <div key={s.title} style={{display:"flex", gap:12, marginBottom:14, alignItems:"flex-start"}}>
            <div style={{fontSize:22, flexShrink:0}}>{s.icon}</div>
            <div>
              <div style={{fontWeight:700, fontSize:14, marginBottom:3}}>{s.title}</div>
              <div style={{fontSize:12, color:C.muted, lineHeight:1.7}}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={subHead}>معاينة</div>
        <div style={{borderRadius:12, overflow:"hidden", border:`1px solid ${C.border}`, height:480}}>
          <iframe src="/store" title="معاينة الموقع" style={{width:"100%", height:"100%", border:"none", background:C.bg}} />
        </div>
      </div>
    </div>
  );
}
