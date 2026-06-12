import { useState, useEffect } from "react";
import { C, card, lbl, subHead, fieldStyle, statusChipStyle, primaryBtn, ghostBtn, dangerBtn, REPLY_CATEGORIES } from "./theme";
import { listReplies, createReply, updateReply, deleteReply, draftReply } from "./api";

const emptyForm = () => ({ category: "عام", label: "", text: "" });

export default function InboxPage() {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [catFilter,  setCatFilter]  = useState("all");
  const [formOpen,   setFormOpen]   = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [form,       setForm]       = useState(emptyForm());
  const [focus,      setFocus]      = useState("");
  const [saving,     setSaving]     = useState(false);
  const [copied,     setCopied]     = useState(null);

  // AI reply drafter
  const [msg,        setMsg]        = useState("");
  const [drafting,   setDrafting]   = useState(false);
  const [draft,      setDraft]      = useState("");
  const [draftError, setDraftError] = useState("");
  const [draftCopied,setDraftCopied]= useState(false);

  const load = async () => {
    setLoading(true);
    try { setItems(await listReplies()); } catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { (async () => { await load(); })(); }, []);

  const iStyle = (id) => fieldStyle(focus, id);
  const upF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setEditingId(null); setForm(emptyForm()); setFormOpen(true); };
  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({ category: r.category || "عام", label: r.label || "", text: r.text || "" });
    setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditingId(null); setForm(emptyForm()); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    setSaving(true);
    try {
      if (editingId) await updateReply(editingId, form);
      else await createReply(form);
      await load();
      closeForm();
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("هل تريد حذف هذا الرد؟")) return;
    await deleteReply(id);
    await load();
  };

  const copy = async (text, id) => {
    try { await navigator.clipboard.writeText(text || ""); setCopied(id); setTimeout(() => setCopied(null), 1500); } catch { /* ignore */ }
  };

  const handleDraft = async () => {
    if (!msg.trim()) return;
    setDrafting(true); setDraftError(""); setDraft("");
    try {
      const res = await draftReply(msg.trim());
      if (res.ok) setDraft(res.text || "");
      else if (res.error === "missing_api_key") setDraftError("أضف مفتاح Anthropic API من الإعدادات لتفعيل صياغة الردود");
      else setDraftError("تعذّرت الصياغة — حاول مجدداً");
    } catch { setDraftError("تعذّرت الصياغة — حاول مجدداً"); }
    setDrafting(false);
  };

  const copyDraft = async () => {
    try { await navigator.clipboard.writeText(draft || ""); setDraftCopied(true); setTimeout(() => setDraftCopied(false), 1500); } catch { /* ignore */ }
  };

  const saveDraftAsReply = async () => {
    await createReply({ category: "عام", label: msg.slice(0, 40), text: draft });
    await load();
  };

  const filtered = items.filter(r => catFilter === "all" || r.category === catFilter);

  return (
    <div style={{flex:1, overflowY:"auto", padding:"16px 14px 24px"}}>
      {/* info banner */}
      <div style={{...card, border:`1px solid ${C.blue}30`, background:`${C.blue}0f`}}>
        <div style={{fontSize:12, color:C.muted, lineHeight:1.7}}>
          💬 مزامنة رسائل إنستغرام المباشرة تُفعّل تلقائياً بعد ربط الحساب. حتى ذلك الحين، استخدم <strong style={{color:C.text}}>الردود الجاهزة</strong> ومساعد <strong style={{color:C.text}}>صياغة الرد بالذكاء الاصطناعي</strong> أدناه.
        </div>
      </div>

      {/* AI reply drafter */}
      <div style={card}>
        <div style={subHead}>✨ صياغة رد على رسالة عميل</div>
        <div style={{marginBottom:12}}>
          <label style={lbl}>الصق رسالة العميل</label>
          <textarea style={{...iStyle("msg"),resize:"none",height:72,lineHeight:1.6}} value={msg} onFocus={()=>setFocus("msg")} onBlur={()=>setFocus("")} onChange={e=>setMsg(e.target.value)} placeholder="مثال: السلام عليكم، كم سعر علبة الشوكولاتة الكبيرة وهل توصلون صنعاء؟" />
        </div>
        <button type="button" onClick={handleDraft} disabled={drafting || !msg.trim()} style={{...primaryBtn, width:"100%", opacity:(drafting||!msg.trim())?0.5:1}}>
          {drafting ? "جاري الصياغة…" : "✨ اكتب رداً مقترحاً"}
        </button>
        {draftError && <div style={{fontSize:12, color:C.red, marginTop:10, lineHeight:1.7}}>{draftError}</div>}
        {draft && (
          <div style={{marginTop:12}}>
            <textarea style={{...iStyle("draft"),resize:"none",height:110,lineHeight:1.7}} value={draft} onFocus={()=>setFocus("draft")} onBlur={()=>setFocus("")} onChange={e=>setDraft(e.target.value)} />
            <div style={{display:"flex", gap:8, marginTop:10, flexWrap:"wrap"}}>
              <button onClick={copyDraft} style={{...primaryBtn, fontSize:12, padding:"8px 14px"}}>{draftCopied ? "تم النسخ ✓" : "📋 نسخ الرد"}</button>
              <button onClick={saveDraftAsReply} style={{...ghostBtn, fontSize:12, padding:"8px 14px"}}>💾 احفظ كرد جاهز</button>
            </div>
          </div>
        )}
      </div>

      {/* saved replies header */}
      <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:14}}>
        <div style={{flex:1, display:"flex", flexWrap:"wrap", gap:8}}>
          <button onClick={()=>setCatFilter("all")} style={statusChipStyle(catFilter==="all", C.accent)}>الكل ({items.length})</button>
          {REPLY_CATEGORIES.map(c => (
            <button key={c} onClick={()=>setCatFilter(c)} style={statusChipStyle(catFilter===c, C.accent)}>
              {c} ({items.filter(r=>r.category===c).length})
            </button>
          ))}
        </div>
        <button onClick={openAdd} style={primaryBtn}>+ رد</button>
      </div>

      {formOpen && (
        <form onSubmit={submit} style={card}>
          <div style={subHead}>{editingId ? "تعديل الرد" : "رد جاهز جديد"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label style={lbl}>التصنيف</label>
              <select style={iStyle("category")} value={form.category} onFocus={()=>setFocus("category")} onBlur={()=>setFocus("")} onChange={e=>upF("category",e.target.value)}>
                {REPLY_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>العنوان / السؤال</label>
              <input style={iStyle("label")} value={form.label} onFocus={()=>setFocus("label")} onBlur={()=>setFocus("")} onChange={e=>upF("label",e.target.value)} placeholder="مثال: كم السعر؟" />
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>نص الرد *</label>
            <textarea style={{...iStyle("text"),resize:"none",height:90,lineHeight:1.7}} value={form.text} onFocus={()=>setFocus("text")} onBlur={()=>setFocus("")} onChange={e=>upF("text",e.target.value)} required />
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
          <div style={{fontSize:36, marginBottom:10}}>💬</div>
          <div style={{fontSize:13}}>{catFilter!=="all" ? "لا توجد ردود في هذا التصنيف" : "لا توجد ردود جاهزة بعد — أضف ردوداً للأسئلة المتكررة"}</div>
        </div>
      ) : (
        filtered.map(r => (
          <div key={r.id} style={card}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8}}>
              <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
                <span style={{fontSize:10, color:C.accent2, background:`${C.accent}18`, border:`1px solid ${C.accent}30`, borderRadius:99, padding:"2px 9px", fontWeight:600}}>{r.category || "عام"}</span>
                {r.label && <span style={{fontWeight:700, fontSize:14}}>{r.label}</span>}
              </div>
              <div style={{display:"flex", gap:8, flexShrink:0}}>
                <button onClick={()=>openEdit(r)} style={ghostBtn}>تعديل</button>
                <button onClick={()=>remove(r.id)} style={dangerBtn}>حذف</button>
              </div>
            </div>
            <div style={{fontSize:13, color:C.text, lineHeight:1.7, marginBottom:10, whiteSpace:"pre-wrap"}}>{r.text}</div>
            <button onClick={()=>copy(r.text, r.id)} style={{...ghostBtn, fontSize:12, padding:"6px 12px"}}>
              {copied===r.id ? "تم النسخ ✓" : "📋 نسخ"}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
