import { useState, useEffect } from "react";
import { C, card, subHead, statusChipStyle, primaryBtn, platformInfo } from "./theme";
import { listContent, updateContent, publishContent, getSettings, saveSettings, getMetaStatus, getTikTokStatus, getYouTubeStatus } from "./api";

const ERROR_LABELS = {
  meta_not_connected: "يجب ربط حساب ميتا من الإعدادات أولاً",
  facebook_not_connected: "لا يوجد صفحة فيسبوك مرتبطة بحساب ميتا",
  instagram_not_connected: "لا يوجد حساب إنستغرام مرتبط بحساب ميتا",
  tiktok_not_connected: "يجب ربط حساب تيك توك من الإعدادات أولاً",
  youtube_not_connected: "يجب ربط حساب يوتيوب من الإعدادات أولاً",
  image_required: "أضف صورة لهذا المنشور من تبويب التخطيط لتفعيل النشر التلقائي",
  video_required: "أضف رابط فيديو لهذا المنشور من تبويب التخطيط لتفعيل النشر التلقائي",
  video_fetch_failed: "تعذّر تحميل الفيديو من الرابط المضاف — تأكد من صحته",
  unsupported_platform: "هذه المنصة لا تدعم النشر التلقائي بعد",
};
const errorLabel = (code) => ERROR_LABELS[code] || code || "تعذّر النشر — حاول مجدداً";

export default function PublishPage() {
  const [items,    setItems]    = useState([]);
  const [settings, setSettings] = useState(null);
  const [meta,     setMeta]     = useState(null);
  const [tiktok,   setTiktok]   = useState(null);
  const [youtube,  setYoutube]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [busyId,   setBusyId]   = useState(null);
  const [errors,   setErrors]   = useState({});
  const [modeMsg,  setModeMsg]  = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [c, s, m, t, y] = await Promise.all([listContent(), getSettings(), getMetaStatus(), getTikTokStatus(), getYouTubeStatus()]);
      setItems(c);
      setSettings(s || {});
      setMeta(m);
      setTiktok(t);
      setYoutube(y);
    } catch {
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => { await load(); })();
  }, []);

  const publishMode = settings?.publishMode || "manual";

  const setMode = async (mode) => {
    if (mode === publishMode) return;
    const next = { ...(settings || {}), publishMode: mode };
    setSettings(next);
    try {
      await saveSettings(next);
      setModeMsg("تم الحفظ ✅");
    } catch {
      setModeMsg("تعذّر الحفظ");
    }
    setTimeout(() => setModeMsg(""), 2000);
  };

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

  const doPublish = async (item) => {
    setBusyId(item.id);
    setErrors(e => ({ ...e, [item.id]: "" }));
    try {
      const res = await publishContent(item.id);
      if (res.ok) {
        await load();
      } else {
        setErrors(e => ({ ...e, [item.id]: errorLabel(res.error) }));
      }
    } catch {
      setErrors(e => ({ ...e, [item.id]: "تعذّر النشر — حاول مجدداً" }));
    }
    setBusyId(null);
  };

  return (
    <div style={{flex:1, overflowY:"auto", padding:"16px 14px 24px"}}>

      <div style={card}>
        <div style={subHead}>وضع النشر</div>
        <div style={{display:"flex", gap:10, marginBottom:10}}>
          <button onClick={()=>setMode("manual")} style={statusChipStyle(publishMode==="manual", C.accent)}>✋ يدوي</button>
          <button onClick={()=>setMode("auto")} style={statusChipStyle(publishMode==="auto", C.green)}>🤖 تلقائي</button>
          {modeMsg && <span style={{fontSize:12, color:C.muted, alignSelf:"center"}}>{modeMsg}</span>}
        </div>
        <p style={{fontSize:12, color:C.muted, lineHeight:1.7}}>
          {publishMode === "auto"
            ? "سيُنشر المحتوى «جاهز للنشر» على إنستغرام وفيسبوك وتيك توك ويوتيوب تلقائياً عند حلول تاريخه المخطط (يحتاج صورة للمنشورات على إنستغرام/تيك توك، ورابط فيديو للمنشورات على يوتيوب). باقي المنصات تبقى يدوية."
            : "النشر على إنستغرام وفيسبوك وتيك توك ويوتيوب يتم بضغطة «نشر الآن 🚀» — وباقي المنصات تبقى يدوية بالكامل."}
        </p>
      </div>

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
          const igOk = !!(meta?.connected && meta.igUsername);
          const fbOk = !!(meta?.connected && meta.fbPageName);
          const ttOk = !!tiktok?.connected;
          const ytOk = !!youtube?.connected;
          const apiSupported = (item.platform === "instagram" && igOk) || (item.platform === "facebook" && fbOk) || (item.platform === "tiktok" && ttOk) || (item.platform === "youtube" && ytOk);
          const needsImage = (item.platform === "instagram" || item.platform === "tiktok") && !item.image;
          const needsVideo = item.platform === "youtube" && !item.video;
          const needsMedia = needsImage || needsVideo;
          const canPublishNow = apiSupported && !needsMedia;
          const busy = busyId === item.id;

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

              {item.image && (
                <img src={item.image} alt="" style={{width:"100%",maxHeight:160,objectFit:"cover",borderRadius:12,marginBottom:10,border:`1px solid ${C.border}`}} onError={(e)=>{e.target.style.display="none";}} />
              )}

              {item.video && (
                <video src={item.video} controls style={{width:"100%",maxHeight:200,borderRadius:12,marginBottom:10,border:`1px solid ${C.border}`}} />
              )}

              {item.caption && <div style={{fontSize:13, color:C.text, lineHeight:1.6, marginBottom:12, whiteSpace:"pre-wrap"}}>{item.caption}</div>}

              {apiSupported && needsMedia && (
                <div style={{marginBottom:10,display:"flex",gap:8,fontSize:11,color:"#D4A020",background:"rgba(212,160,32,0.08)",border:"1px solid rgba(212,160,32,0.2)",borderRadius:10,padding:"8px 12px",lineHeight:1.6}}>
                  <span style={{flexShrink:0}}>⚠️</span><span>{needsVideo ? "أضف رابط فيديو لهذا المنشور من تبويب التخطيط لتفعيل النشر التلقائي" : "أضف صورة لهذا المنشور من تبويب التخطيط لتفعيل النشر التلقائي"}</span>
                </div>
              )}

              {canPublishNow && item.platform === "tiktok" && (
                <div style={{marginBottom:10,display:"flex",gap:8,fontSize:11,color:"#D4A020",background:"rgba(212,160,32,0.08)",border:"1px solid rgba(212,160,32,0.2)",borderRadius:10,padding:"8px 12px",lineHeight:1.6}}>
                  <span style={{flexShrink:0}}>⚠️</span><span>سيُنشر هذا المنشور كمسودة خاصة (تظهر لك فقط) على تيك توك حتى تتم مراجعة التطبيق والسماح بالنشر العام</span>
                </div>
              )}

              {errors[item.id] && (
                <div style={{marginBottom:10, fontSize:12, color:C.red, lineHeight:1.7}}>⚠️ {errors[item.id]}</div>
              )}

              {canPublishNow ? (
                <button type="button" disabled={busy} onClick={()=>doPublish(item)} style={{...primaryBtn, width:"100%", opacity:busy?0.6:1}}>
                  {busy ? "جاري النشر…" : "🚀 نشر الآن"}
                </button>
              ) : (
                <button type="button" disabled={busy} onClick={()=>markPublished(item)} style={{...primaryBtn, width:"100%", opacity:busy?0.6:1}}>
                  {busy ? "جاري الحفظ…" : "تم النشر ✅"}
                </button>
              )}

              {canPublishNow && publishMode==="auto" && (
                <div style={{fontSize:11, color:C.muted, marginTop:8, lineHeight:1.6}}>⏳ النشر التلقائي مفعّل — سيُنشر هذا المنشور تلقائياً عند حلول تاريخه إن لم تنشره يدوياً الآن</div>
              )}
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
                  <span style={{fontSize:10, color:C.green, background:`${C.green}18`, border:`1px solid ${C.green}30`, borderRadius:99, padding:"2px 9px", fontWeight:600}}>
                    {item.publishedPostId ? "نُشر تلقائياً ✓" : "تم النشر"}
                  </span>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
