import { useState, useEffect } from "react";
import { C, card, lbl, subHead, fieldStyle, primaryBtn, ghostBtn, PLATFORMS, OCCASIONS, CONTENT_TYPES } from "./theme";
import { getSettings, generateContent, createContent } from "./api";

export default function CreatorPage() {
  const [hasKey, setHasKey] = useState(true);
  const [checked, setChecked] = useState(false);
  const [platform, setPlatform] = useState("instagram");
  const [occasion, setOccasion] = useState("");
  const [type, setType] = useState(CONTENT_TYPES[0]);
  const [notes, setNotes] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [focus, setFocus] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const s = await getSettings();
        setHasKey(!!s?.api?.anthropic);
      } catch {
        setHasKey(false);
      }
      setChecked(true);
    })();
  }, []);

  const iStyle = (id) => fieldStyle(focus, id);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError("");
    try {
      const res = await generateContent({ platform, occasion, type, notes });
      if (res.ok) {
        setCaption(res.text || "");
      } else if (res.error === "missing_api_key") {
        setGenError("لم تتم إضافة مفتاح Anthropic API — أضفه من الإعدادات ← مفاتيح API");
      } else {
        setGenError("تعذّر توليد المحتوى — حاول مجدداً");
      }
    } catch {
      setGenError("تعذّر توليد المحتوى — حاول مجدداً");
    }
    setGenerating(false);
  };

  const handleSave = async (status) => {
    if (!caption.trim()) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await createContent({
        title: title.trim() || caption.slice(0, 40),
        platform, occasion, type, scheduledDate, caption, image, video, notes, status,
      });
      setSaveMsg(status === "review" ? "تم الحفظ وإرساله للمراجعة ✅" : "تم الحفظ كمسودة ✅");
      setCaption("");
      setTitle("");
      setImage("");
      setVideo("");
      setNotes("");
    } catch {
      setSaveMsg("تعذّر الحفظ — حاول مجدداً");
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  return (
    <div style={{flex:1, overflowY:"auto", padding:"16px 14px 24px"}}>

      {checked && !hasKey && (
        <div style={{...card, border:`1px solid ${C.accent}40`, background:`${C.accent}10`}}>
          <div style={{fontSize:13, color:C.accent2, lineHeight:1.7}}>
            ⚠️ لم تتم إضافة مفتاح Anthropic API بعد. أضفه من تبويب <strong>الإعدادات ← مفاتيح API</strong> لتفعيل توليد المحتوى بالذكاء الاصطناعي.
          </div>
        </div>
      )}

      <div style={card}>
        <div style={subHead}>إعدادات المحتوى</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
          <div>
            <label style={lbl}>المنصة</label>
            <select style={iStyle("platform")} value={platform} onFocus={()=>setFocus("platform")} onBlur={()=>setFocus("")} onChange={e=>setPlatform(e.target.value)}>
              {PLATFORMS.map(p=><option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>النوع</label>
            <select style={iStyle("type")} value={type} onFocus={()=>setFocus("type")} onBlur={()=>setFocus("")} onChange={e=>setType(e.target.value)}>
              {CONTENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>المناسبة</label>
            <select style={iStyle("occasion")} value={occasion} onFocus={()=>setFocus("occasion")} onBlur={()=>setFocus("")} onChange={e=>setOccasion(e.target.value)}>
              <option value="">بدون</option>
              {OCCASIONS.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={lbl}>وصف الفكرة (اختياري)</label>
          <textarea style={{...iStyle("notes"),resize:"none",height:72,lineHeight:1.6}} value={notes} onFocus={()=>setFocus("notes")} onBlur={()=>setFocus("")} onChange={e=>setNotes(e.target.value)} placeholder="مثال: منشور يعرض علبة شوكولاتة هدايا التخرج مع خصم لفترة محدودة" />
        </div>
        <button type="button" onClick={handleGenerate} disabled={generating}
          style={{...primaryBtn, width:"100%", marginTop:14, opacity: generating ? 0.6 : 1}}>
          {generating ? "جاري التوليد…" : "✨ توليد بالذكاء الاصطناعي"}
        </button>
        {genError && <div style={{fontSize:12, color:C.red, marginTop:10, lineHeight:1.7}}>{genError}</div>}
      </div>

      <div style={card}>
        <div style={subHead}>النتيجة</div>
        <div style={{marginBottom:14}}>
          <label style={lbl}>العنوان / الفكرة</label>
          <input style={iStyle("title")} value={title} onFocus={()=>setFocus("title")} onBlur={()=>setFocus("")} onChange={e=>setTitle(e.target.value)} placeholder="عنوان مختصر للحفظ في الخطة" />
        </div>
        <div style={{marginBottom:14}}>
          <label style={lbl}>نص المحتوى (Caption)</label>
          <textarea style={{...iStyle("caption"),resize:"none",height:160,lineHeight:1.7}} value={caption} onFocus={()=>setFocus("caption")} onBlur={()=>setFocus("")} onChange={e=>setCaption(e.target.value)} placeholder="سيظهر النص المولّد هنا — يمكنك تعديله قبل الحفظ" />
        </div>
        <div style={{marginBottom:14}}>
          <label style={lbl}>رابط الصورة (مطلوب للنشر التلقائي على إنستغرام/تيك توك)</label>
          <input style={{...iStyle("image"),direction:"ltr",textAlign:"right",fontFamily:"monospace",fontSize:12}} value={image} onFocus={()=>setFocus("image")} onBlur={()=>setFocus("")} onChange={e=>setImage(e.target.value)} placeholder="https://...الصق رابط الصورة" />
          {image && (
            <img src={image} alt="" style={{width:"100%",maxHeight:140,objectFit:"cover",borderRadius:12,marginTop:10,border:`1px solid ${C.border}`}} onError={(e)=>{e.target.style.display="none";}} onLoad={(e)=>{e.target.style.display="block";}} />
          )}
        </div>
        {(platform === "youtube" || platform === "snapchat") && (
          <div style={{marginBottom:14}}>
            <label style={lbl}>رابط الفيديو (mp4 — مطلوب للنشر التلقائي على يوتيوب شورتس، اختياري لسناب شات)</label>
            <input style={{...iStyle("video"),direction:"ltr",textAlign:"right",fontFamily:"monospace",fontSize:12}} value={video} onFocus={()=>setFocus("video")} onBlur={()=>setFocus("")} onChange={e=>setVideo(e.target.value)} placeholder="https://...الصق رابط الفيديو" />
            {video && (
              <video src={video} controls style={{width:"100%",maxHeight:220,borderRadius:12,marginTop:10,border:`1px solid ${C.border}`}} />
            )}
          </div>
        )}
        <div style={{marginBottom:14}}>
          <label style={lbl}>تاريخ النشر المخطط (اختياري)</label>
          <input type="date" style={iStyle("scheduledDate")} value={scheduledDate} onFocus={()=>setFocus("scheduledDate")} onBlur={()=>setFocus("")} onChange={e=>setScheduledDate(e.target.value)} />
        </div>
        <div style={{display:"flex", gap:10}}>
          <button type="button" disabled={saving || !caption.trim()} onClick={()=>handleSave("review")} style={{...primaryBtn, flex:1, opacity:(saving||!caption.trim())?0.5:1}}>
            {saving ? "جاري الحفظ…" : "حفظ وإرسال للمراجعة"}
          </button>
          <button type="button" disabled={saving || !caption.trim()} onClick={()=>handleSave("draft")} style={{...ghostBtn, opacity:(saving||!caption.trim())?0.5:1}}>
            حفظ كمسودة
          </button>
        </div>
        {saveMsg && <div style={{fontSize:12, color: saveMsg.includes("تعذّر") ? C.red : C.green, marginTop:10, lineHeight:1.7}}>{saveMsg}</div>}
      </div>
    </div>
  );
}
