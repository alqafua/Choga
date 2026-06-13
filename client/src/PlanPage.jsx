import { useState, useEffect } from "react";
import { C, card, lbl, subHead, fieldStyle, statusChipStyle, primaryBtn, ghostBtn, dangerBtn, PLATFORMS, OCCASIONS, CONTENT_TYPES, CONTENT_STATUSES, contentStatusInfo, platformInfo } from "./theme";
import { listContent, createContent, updateContent, deleteContent } from "./api";

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  title: "", platform: "instagram", occasion: "", type: CONTENT_TYPES[0],
  scheduledDate: todayStr(), caption: "", image: "", video: "", notes: "", status: "draft",
});

export default function PlanPage() {
  const [items,        setItems]       = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [search,       setSearch]      = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen,     setFormOpen]    = useState(false);
  const [editingId,    setEditingId]   = useState(null);
  const [form,         setForm]        = useState(emptyForm());
  const [focus,        setFocus]       = useState("");
  const [saving,       setSaving]      = useState(false);

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

  const iStyle = (id) => fieldStyle(focus, id);
  const upF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      platform: item.platform || "instagram",
      occasion: item.occasion || "",
      type: item.type || CONTENT_TYPES[0],
      scheduledDate: item.scheduledDate || todayStr(),
      caption: item.caption || "",
      image: item.image || "",
      video: item.video || "",
      notes: item.notes || "",
      status: item.status || "draft",
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editingId) await updateContent(editingId, form);
      else await createContent(form);
      await load();
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("هل تريد حذف هذا المحتوى؟")) return;
    await deleteContent(id);
    await load();
  };

  const setItemStatus = async (item, status) => {
    setItems(list => list.map(x => x.id === item.id ? { ...x, status } : x));
    await updateContent(item.id, { status });
  };

  const filtered = items
    .filter(i => statusFilter === "all" || i.status === statusFilter)
    .filter(i => {
      const q = search.trim();
      if (!q) return true;
      return (i.title || "").includes(q) || (i.caption || "").includes(q);
    })
    .sort((a, b) => (b.scheduledDate || "").localeCompare(a.scheduledDate || ""));

  return (
    <div style={{flex:1, overflowY:"auto", padding:"16px 14px 24px"}}>

      {/* header row */}
      <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:14}}>
        <div style={{flex:1}}>
          <input
            style={iStyle("search")}
            placeholder="ابحث بالعنوان أو النص…"
            value={search}
            onFocus={()=>setFocus("search")}
            onBlur={()=>setFocus("")}
            onChange={e=>setSearch(e.target.value)} />
        </div>
        <button onClick={openAdd} style={primaryBtn}>+ محتوى جديد</button>
      </div>

      {/* status filter chips */}
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
        <button onClick={()=>setStatusFilter("all")} style={statusChipStyle(statusFilter==="all", C.accent)}>
          الكل ({items.length})
        </button>
        {CONTENT_STATUSES.map(s => (
          <button key={s.id} onClick={()=>setStatusFilter(s.id)} style={statusChipStyle(statusFilter===s.id, s.color)}>
            {s.label} ({items.filter(i=>i.status===s.id).length})
          </button>
        ))}
      </div>

      {/* add/edit form */}
      {formOpen && (
        <form onSubmit={submit} style={card}>
          <div style={subHead}>{editingId ? "تعديل المحتوى" : "محتوى جديد"}</div>

          <div style={{marginBottom:14}}>
            <label style={lbl}>العنوان / الفكرة *</label>
            <input style={iStyle("title")} value={form.title} onFocus={()=>setFocus("title")} onBlur={()=>setFocus("")} onChange={e=>upF("title",e.target.value)} placeholder="مثال: منشور تهنئة بمناسبة عيد الفطر" required />
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label style={lbl}>المنصة</label>
              <select style={iStyle("platform")} value={form.platform} onFocus={()=>setFocus("platform")} onBlur={()=>setFocus("")} onChange={e=>upF("platform",e.target.value)}>
                {PLATFORMS.map(p=><option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>النوع</label>
              <select style={iStyle("type")} value={form.type} onFocus={()=>setFocus("type")} onBlur={()=>setFocus("")} onChange={e=>upF("type",e.target.value)}>
                {CONTENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>المناسبة</label>
              <select style={iStyle("occasion")} value={form.occasion} onFocus={()=>setFocus("occasion")} onBlur={()=>setFocus("")} onChange={e=>upF("occasion",e.target.value)}>
                <option value="">بدون</option>
                {OCCASIONS.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label style={lbl}>تاريخ النشر المخطط</label>
              <input type="date" style={iStyle("scheduledDate")} value={form.scheduledDate} onFocus={()=>setFocus("scheduledDate")} onBlur={()=>setFocus("")} onChange={e=>upF("scheduledDate",e.target.value)} />
            </div>
            <div>
              <label style={lbl}>الحالة</label>
              <select style={iStyle("status")} value={form.status} onFocus={()=>setFocus("status")} onBlur={()=>setFocus("")} onChange={e=>upF("status",e.target.value)}>
                {CONTENT_STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{marginBottom:14}}>
            <label style={lbl}>نص المحتوى (Caption)</label>
            <textarea style={{...iStyle("caption"),resize:"none",height:100,lineHeight:1.6}} value={form.caption} onFocus={()=>setFocus("caption")} onBlur={()=>setFocus("")} onChange={e=>upF("caption",e.target.value)} placeholder="نص المنشور الجاهز للنشر…" />
          </div>

          <div style={{marginBottom:14}}>
            <label style={lbl}>رابط الصورة (مطلوب للنشر التلقائي على إنستغرام/تيك توك)</label>
            <input style={{...iStyle("image"),direction:"ltr",textAlign:"right",fontFamily:"monospace",fontSize:12}} value={form.image} onFocus={()=>setFocus("image")} onBlur={()=>setFocus("")} onChange={e=>upF("image",e.target.value)} placeholder="https://...الصق رابط الصورة" />
            {form.image && (
              <img src={form.image} alt="" style={{width:"100%",maxHeight:140,objectFit:"cover",borderRadius:12,marginTop:10,border:`1px solid ${C.border}`}} onError={(e)=>{e.target.style.display="none";}} onLoad={(e)=>{e.target.style.display="block";}} />
            )}
          </div>

          {form.platform === "youtube" && (
            <div style={{marginBottom:14}}>
              <label style={lbl}>رابط الفيديو (mp4 — مطلوب للنشر التلقائي على يوتيوب شورتس)</label>
              <input style={{...iStyle("video"),direction:"ltr",textAlign:"right",fontFamily:"monospace",fontSize:12}} value={form.video} onFocus={()=>setFocus("video")} onBlur={()=>setFocus("")} onChange={e=>upF("video",e.target.value)} placeholder="https://...الصق رابط الفيديو" />
              {form.video && (
                <video src={form.video} controls style={{width:"100%",maxHeight:220,borderRadius:12,marginTop:10,border:`1px solid ${C.border}`}} />
              )}
            </div>
          )}

          <div style={{marginBottom:14}}>
            <label style={lbl}>ملاحظات</label>
            <textarea style={{...iStyle("notes"),resize:"none",height:60,lineHeight:1.6}} value={form.notes} onFocus={()=>setFocus("notes")} onBlur={()=>setFocus("")} onChange={e=>upF("notes",e.target.value)} />
          </div>

          <div style={{display:"flex", gap:10}}>
            <button type="submit" disabled={saving} style={{...primaryBtn, flex:1}}>
              {saving ? "جاري الحفظ…" : editingId ? "حفظ التعديلات" : "إضافة"}
            </button>
            <button type="button" onClick={closeForm} style={ghostBtn}>إلغاء</button>
          </div>
        </form>
      )}

      {/* list */}
      {loading ? (
        <p style={{textAlign:"center",color:C.muted,fontSize:13,marginTop:24}}>جاري التحميل…</p>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:"center", color:C.muted, marginTop:40}}>
          <div style={{fontSize:36, marginBottom:10}}>📅</div>
          <div style={{fontSize:13}}>{search || statusFilter!=="all" ? "لا توجد نتائج مطابقة" : "لا يوجد محتوى مخطط بعد — أضف أول عنصر"}</div>
        </div>
      ) : (
        filtered.map(item => {
          const st = contentStatusInfo(item.status);
          const pl = platformInfo(item.platform);
          return (
            <div key={item.id} style={card}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8}}>
                <div>
                  <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
                    <span style={{fontWeight:700, fontSize:15}}>{item.title || "بدون عنوان"}</span>
                    <span style={{fontSize:10, color:st.color, background:`${st.color}18`, border:`1px solid ${st.color}30`, borderRadius:99, padding:"2px 9px", fontWeight:600}}>{st.label}</span>
                  </div>
                  <div style={{fontSize:12, color:C.muted, marginTop:4, display:"flex", flexWrap:"wrap", gap:10}}>
                    <span>{pl.icon} {pl.name}</span>
                    {item.type && <span>· {item.type}</span>}
                    {item.occasion && <span>· {item.occasion}</span>}
                    {item.scheduledDate && <span>· 📅 {item.scheduledDate}</span>}
                    {item.image && <span>· 🖼️ صورة</span>}
                    {item.video && <span>· 🎬 فيديو</span>}
                  </div>
                </div>
                <div style={{display:"flex", gap:8, flexShrink:0}}>
                  <button onClick={()=>openEdit(item)} style={ghostBtn}>تعديل</button>
                  <button onClick={()=>remove(item.id)} style={dangerBtn}>حذف</button>
                </div>
              </div>

              {item.caption && <div style={{fontSize:13, color:C.text, lineHeight:1.6, marginBottom:8, whiteSpace:"pre-wrap"}}>{item.caption}</div>}

              <div style={{display:"flex", justifyContent:"flex-end"}}>
                <select value={item.status} onChange={e=>setItemStatus(item, e.target.value)} style={{
                  background:C.inp, border:`1px solid ${C.border}`, borderRadius:8, color:C.text,
                  fontSize:12, padding:"6px 10px", outline:"none", cursor:"pointer",
                  fontFamily:"'Tajawal',system-ui,sans-serif",
                }}>
                  {CONTENT_STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>

              {item.notes && <div style={{fontSize:12, color:C.muted, marginTop:8, lineHeight:1.6}}>{item.notes}</div>}
            </div>
          );
        })
      )}
    </div>
  );
}
