import { useState, useEffect } from "react";
import { C, card, lbl, subHead, fieldStyle, statusChipStyle, primaryBtn, ghostBtn, dangerBtn, ASSET_TYPES, assetTypeInfo } from "./theme";
import { listAssets, createAsset, updateAsset, deleteAsset } from "./api";

const emptyForm = () => ({ type: "image", title: "", content: "", tags: "", notes: "" });

export default function AssetsPage() {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formOpen,   setFormOpen]   = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [form,       setForm]       = useState(emptyForm());
  const [focus,      setFocus]      = useState("");
  const [saving,     setSaving]     = useState(false);
  const [copied,     setCopied]     = useState(null);

  const load = async () => {
    setLoading(true);
    try { setItems(await listAssets()); } catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { (async () => { await load(); })(); }, []);

  const iStyle = (id) => fieldStyle(focus, id);
  const upF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = (type = "image") => { setEditingId(null); setForm({ ...emptyForm(), type }); setFormOpen(true); };
  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({ type: a.type || "image", title: a.title || "", content: a.content || "", tags: a.tags || "", notes: a.notes || "" });
    setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditingId(null); setForm(emptyForm()); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.content.trim()) return;
    setSaving(true);
    try {
      if (editingId) await updateAsset(editingId, form);
      else await createAsset(form);
      await load();
      closeForm();
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("هل تريد حذف هذه المادة؟")) return;
    await deleteAsset(id);
    await load();
  };

  const copy = async (a) => {
    try { await navigator.clipboard.writeText(a.content || ""); setCopied(a.id); setTimeout(() => setCopied(null), 1500); } catch { /* ignore */ }
  };

  const filtered = items
    .filter(a => typeFilter === "all" || a.type === typeFilter)
    .filter(a => {
      const q = search.trim();
      if (!q) return true;
      return (a.title || "").includes(q) || (a.content || "").includes(q) || (a.tags || "").includes(q);
    });

  const contentLabel = { image: "رابط الصورة *", hashtag: "الهاشتاقات *", snippet: "النص *", link: "الرابط *" };
  const contentPh = {
    image: "https://...الصق رابط الصورة",
    hashtag: "#شوكولاتة #هدايا #صنعاء",
    snippet: "نص جاهز لإعادة الاستخدام في المنشورات…",
    link: "https://...",
  };

  return (
    <div style={{flex:1, overflowY:"auto", padding:"16px 14px 24px"}}>
      <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:14}}>
        <div style={{flex:1}}>
          <input style={iStyle("search")} placeholder="ابحث في المكتبة…" value={search}
            onFocus={()=>setFocus("search")} onBlur={()=>setFocus("")} onChange={e=>setSearch(e.target.value)} />
        </div>
        <button onClick={()=>openAdd()} style={primaryBtn}>+ مادة</button>
      </div>

      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
        <button onClick={()=>setTypeFilter("all")} style={statusChipStyle(typeFilter==="all", C.accent)}>
          الكل ({items.length})
        </button>
        {ASSET_TYPES.map(t => (
          <button key={t.id} onClick={()=>setTypeFilter(t.id)} style={statusChipStyle(typeFilter===t.id, t.color)}>
            {t.icon} {t.label} ({items.filter(a=>a.type===t.id).length})
          </button>
        ))}
      </div>

      {formOpen && (
        <form onSubmit={submit} style={card}>
          <div style={subHead}>{editingId ? "تعديل المادة" : "مادة جديدة"}</div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>النوع</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
              {ASSET_TYPES.map(t => (
                <button type="button" key={t.id} onClick={()=>upF("type",t.id)} style={statusChipStyle(form.type===t.id, t.color)}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>العنوان</label>
            <input style={iStyle("title")} value={form.title} onFocus={()=>setFocus("title")} onBlur={()=>setFocus("")} onChange={e=>upF("title",e.target.value)} placeholder="اسم مختصر للمادة" />
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>{contentLabel[form.type]}</label>
            {form.type === "snippet" || form.type === "hashtag" ? (
              <textarea style={{...iStyle("content"),resize:"none",height:90,lineHeight:1.6}} value={form.content} onFocus={()=>setFocus("content")} onBlur={()=>setFocus("")} onChange={e=>upF("content",e.target.value)} placeholder={contentPh[form.type]} required />
            ) : (
              <input style={{...iStyle("content"),direction:"ltr",textAlign:"right",fontFamily:"monospace",fontSize:12}} value={form.content} onFocus={()=>setFocus("content")} onBlur={()=>setFocus("")} onChange={e=>upF("content",e.target.value)} placeholder={contentPh[form.type]} required />
            )}
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>وسوم (اختياري)</label>
            <input style={iStyle("tags")} value={form.tags} onFocus={()=>setFocus("tags")} onBlur={()=>setFocus("")} onChange={e=>upF("tags",e.target.value)} placeholder="عيد، هدايا، فاخر" />
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>ملاحظات</label>
            <textarea style={{...iStyle("notes"),resize:"none",height:56,lineHeight:1.6}} value={form.notes} onFocus={()=>setFocus("notes")} onBlur={()=>setFocus("")} onChange={e=>upF("notes",e.target.value)} />
          </div>
          <div style={{display:"flex", gap:10}}>
            <button type="submit" disabled={saving} style={{...primaryBtn, flex:1}}>
              {saving ? "جاري الحفظ…" : editingId ? "حفظ التعديلات" : "إضافة"}
            </button>
            <button type="button" onClick={closeForm} style={ghostBtn}>إلغاء</button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{textAlign:"center",color:C.muted,fontSize:13,marginTop:24}}>جاري التحميل…</p>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:"center", color:C.muted, marginTop:40}}>
          <div style={{fontSize:36, marginBottom:10}}>📁</div>
          <div style={{fontSize:13}}>{search || typeFilter!=="all" ? "لا توجد نتائج مطابقة" : "المكتبة فارغة — أضف صور وهاشتاقات ونصوص جاهزة لإعادة استخدامها"}</div>
        </div>
      ) : (
        filtered.map(a => {
          const t = assetTypeInfo(a.type);
          return (
            <div key={a.id} style={card}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8}}>
                <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
                  <span style={{fontSize:10, color:t.color, background:`${t.color}18`, border:`1px solid ${t.color}30`, borderRadius:99, padding:"2px 9px", fontWeight:600}}>{t.icon} {t.label}</span>
                  {a.title && <span style={{fontWeight:700, fontSize:14}}>{a.title}</span>}
                </div>
                <div style={{display:"flex", gap:8, flexShrink:0}}>
                  <button onClick={()=>openEdit(a)} style={ghostBtn}>تعديل</button>
                  <button onClick={()=>remove(a.id)} style={dangerBtn}>حذف</button>
                </div>
              </div>

              {a.type === "image" && a.content && (
                <img src={a.content} alt={a.title||""} style={{width:"100%", maxHeight:200, objectFit:"cover", borderRadius:12, marginBottom:8, border:`1px solid ${C.border}`}} onError={(e)=>{e.target.style.display="none";}} />
              )}
              {(a.type === "snippet" || a.type === "hashtag") && a.content && (
                <div style={{fontSize:13, color:C.text, lineHeight:1.7, marginBottom:8, whiteSpace:"pre-wrap", background:C.inp, borderRadius:10, padding:"10px 12px"}}>{a.content}</div>
              )}
              {a.type === "link" && a.content && (
                <a href={a.content} target="_blank" rel="noopener noreferrer" style={{fontSize:12, color:C.accent, direction:"ltr", display:"block", textAlign:"right", fontFamily:"monospace", marginBottom:8, wordBreak:"break-all"}}>{a.content}</a>
              )}

              {a.tags && <div style={{fontSize:11, color:C.muted, marginBottom:8}}>🏷️ {a.tags}</div>}
              {a.notes && <div style={{fontSize:12, color:C.muted, marginBottom:8, lineHeight:1.6}}>{a.notes}</div>}

              <button onClick={()=>copy(a)} style={{...ghostBtn, fontSize:12, padding:"6px 12px"}}>
                {copied===a.id ? "تم النسخ ✓" : "📋 نسخ"}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
