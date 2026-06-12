import { useState, useEffect } from "react";
import { C, card, lbl, subHead, fieldStyle, statusChipStyle, primaryBtn, ghostBtn, dangerBtn, OCCASIONS, IDEA_STATUSES, ideaStatusInfo } from "./theme";
import { listResearch, createResearch, updateResearch, deleteResearch, generateIdeas, createContent } from "./api";

const emptyForm = () => ({ title: "", source: "", notes: "", status: "idea" });

export default function ResearchPage() {
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen,     setFormOpen]     = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [form,         setForm]         = useState(emptyForm());
  const [focus,        setFocus]        = useState("");
  const [saving,       setSaving]       = useState(false);

  // AI idea generator
  const [topic,        setTopic]        = useState("");
  const [genOccasion,  setGenOccasion]  = useState("");
  const [generating,   setGenerating]   = useState(false);
  const [genError,     setGenError]     = useState("");
  const [suggestions,  setSuggestions]  = useState([]);

  const load = async () => {
    setLoading(true);
    try { setItems(await listResearch()); } catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { (async () => { await load(); })(); }, []);

  const iStyle = (id) => fieldStyle(focus, id);
  const upF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setEditingId(null); setForm(emptyForm()); setFormOpen(true); };
  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({ title: r.title || "", source: r.source || "", notes: r.notes || "", status: r.status || "idea" });
    setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditingId(null); setForm(emptyForm()); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editingId) await updateResearch(editingId, form);
      else await createResearch(form);
      await load();
      closeForm();
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("هل تريد حذف هذه الفكرة؟")) return;
    await deleteResearch(id);
    await load();
  };

  const setStatus = async (r, status) => {
    setItems(list => list.map(x => x.id === r.id ? { ...x, status } : x));
    await updateResearch(r.id, { status });
  };

  const handleGenerate = async () => {
    setGenerating(true); setGenError(""); setSuggestions([]);
    try {
      const res = await generateIdeas({ topic, occasion: genOccasion });
      if (res.ok) setSuggestions(res.ideas || []);
      else if (res.error === "missing_api_key") setGenError("أضف مفتاح Anthropic API من الإعدادات لتفعيل التوليد");
      else setGenError("تعذّر التوليد — حاول مجدداً");
    } catch { setGenError("تعذّر التوليد — حاول مجدداً"); }
    setGenerating(false);
  };

  const saveSuggestion = async (text) => {
    await createResearch({ title: text, source: "اقتراح ذكاء اصطناعي", notes: "", status: "idea" });
    setSuggestions(s => s.filter(x => x !== text));
    await load();
  };

  const sendToPlan = async (text) => {
    await createContent({ title: text, platform: "instagram", occasion: genOccasion || "", type: "منشور", caption: "", notes: "من البحث", status: "draft" });
    setSuggestions(s => s.filter(x => x !== text));
  };

  const filtered = items.filter(r => statusFilter === "all" || r.status === statusFilter);

  return (
    <div style={{flex:1, overflowY:"auto", padding:"16px 14px 24px"}}>
      {/* AI idea generator */}
      <div style={card}>
        <div style={subHead}>✨ مولّد الأفكار</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div>
            <label style={lbl}>الموضوع / التركيز</label>
            <input style={iStyle("topic")} value={topic} onFocus={()=>setFocus("topic")} onBlur={()=>setFocus("")} onChange={e=>setTopic(e.target.value)} placeholder="مثال: هدايا التخرج" />
          </div>
          <div>
            <label style={lbl}>المناسبة</label>
            <select style={iStyle("genOccasion")} value={genOccasion} onFocus={()=>setFocus("genOccasion")} onBlur={()=>setFocus("")} onChange={e=>setGenOccasion(e.target.value)}>
              <option value="">بدون</option>
              {OCCASIONS.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <button type="button" onClick={handleGenerate} disabled={generating} style={{...primaryBtn, width:"100%", opacity: generating?0.6:1}}>
          {generating ? "جاري التوليد…" : "✨ اقترح أفكاراً"}
        </button>
        {genError && <div style={{fontSize:12, color:C.red, marginTop:10, lineHeight:1.7}}>{genError}</div>}

        {suggestions.length > 0 && (
          <div style={{marginTop:14, display:"flex", flexDirection:"column", gap:10}}>
            {suggestions.map((s, i) => (
              <div key={i} style={{background:C.inp, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px"}}>
                <div style={{fontSize:13, color:C.text, lineHeight:1.7, marginBottom:10}}>{s}</div>
                <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                  <button onClick={()=>saveSuggestion(s)} style={{...ghostBtn, fontSize:12, padding:"6px 12px"}}>💾 احفظ كفكرة</button>
                  <button onClick={()=>sendToPlan(s)} style={{...ghostBtn, fontSize:12, padding:"6px 12px"}}>📅 أرسل للخطة</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* manual add + filter */}
      <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:14}}>
        <div style={{flex:1, display:"flex", flexWrap:"wrap", gap:8}}>
          <button onClick={()=>setStatusFilter("all")} style={statusChipStyle(statusFilter==="all", C.accent)}>الكل ({items.length})</button>
          {IDEA_STATUSES.map(s => (
            <button key={s.id} onClick={()=>setStatusFilter(s.id)} style={statusChipStyle(statusFilter===s.id, s.color)}>
              {s.label} ({items.filter(r=>r.status===s.id).length})
            </button>
          ))}
        </div>
        <button onClick={openAdd} style={primaryBtn}>+ فكرة</button>
      </div>

      {formOpen && (
        <form onSubmit={submit} style={card}>
          <div style={subHead}>{editingId ? "تعديل الفكرة" : "فكرة جديدة"}</div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>الفكرة *</label>
            <input style={iStyle("title")} value={form.title} onFocus={()=>setFocus("title")} onBlur={()=>setFocus("")} onChange={e=>upF("title",e.target.value)} required />
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label style={lbl}>المصدر</label>
              <input style={iStyle("source")} value={form.source} onFocus={()=>setFocus("source")} onBlur={()=>setFocus("")} onChange={e=>upF("source",e.target.value)} placeholder="منافس، ترند، إلهام…" />
            </div>
            <div>
              <label style={lbl}>الحالة</label>
              <select style={iStyle("status")} value={form.status} onFocus={()=>setFocus("status")} onBlur={()=>setFocus("")} onChange={e=>upF("status",e.target.value)}>
                {IDEA_STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>ملاحظات</label>
            <textarea style={{...iStyle("notes"),resize:"none",height:60,lineHeight:1.6}} value={form.notes} onFocus={()=>setFocus("notes")} onBlur={()=>setFocus("")} onChange={e=>upF("notes",e.target.value)} />
          </div>
          <div style={{display:"flex", gap:10}}>
            <button type="submit" disabled={saving} style={{...primaryBtn, flex:1}}>{saving ? "جاري الحفظ…" : editingId ? "حفظ" : "إضافة"}</button>
            <button type="button" onClick={closeForm} style={ghostBtn}>إلغاء</button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{textAlign:"center",color:C.muted,fontSize:13,marginTop:24}}>جاري التحميل…</p>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:"center", color:C.muted, marginTop:40}}>
          <div style={{fontSize:36, marginBottom:10}}>🔍</div>
          <div style={{fontSize:13}}>{statusFilter!=="all" ? "لا توجد نتائج مطابقة" : "لا توجد أفكار بعد — استخدم المولّد أعلاه أو أضف فكرة يدوياً"}</div>
        </div>
      ) : (
        filtered.map(r => {
          const st = ideaStatusInfo(r.status);
          return (
            <div key={r.id} style={card}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8}}>
                <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
                  <span style={{fontSize:10, color:st.color, background:`${st.color}18`, border:`1px solid ${st.color}30`, borderRadius:99, padding:"2px 9px", fontWeight:600}}>{st.label}</span>
                  <span style={{fontWeight:700, fontSize:14}}>{r.title}</span>
                </div>
                <div style={{display:"flex", gap:8, flexShrink:0}}>
                  <button onClick={()=>openEdit(r)} style={ghostBtn}>تعديل</button>
                  <button onClick={()=>remove(r.id)} style={dangerBtn}>حذف</button>
                </div>
              </div>
              {r.source && <div style={{fontSize:11, color:C.muted, marginBottom:6}}>📎 {r.source}</div>}
              {r.notes && <div style={{fontSize:12, color:C.muted, marginBottom:8, lineHeight:1.6}}>{r.notes}</div>}
              <div style={{display:"flex", justifyContent:"flex-end"}}>
                <select value={r.status} onChange={e=>setStatus(r, e.target.value)} style={{
                  background:C.inp, border:`1px solid ${C.border}`, borderRadius:8, color:C.text,
                  fontSize:12, padding:"6px 10px", outline:"none", cursor:"pointer", fontFamily:"'Tajawal',system-ui,sans-serif",
                }}>
                  {IDEA_STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
