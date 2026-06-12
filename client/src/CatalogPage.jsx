import { useState, useEffect } from "react";
import { C, card, lbl, subHead, fieldStyle, statusChipStyle, primaryBtn, ghostBtn, dangerBtn } from "./theme";
import { listCatalog, createCatalogItem, updateCatalogItem, deleteCatalogItem } from "./api";

const emptyForm = () => ({ name: "", price: "", image: "", description: "", visible: true });

export default function CatalogPage() {
  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [formOpen,  setFormOpen]  = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form,      setForm]      = useState(emptyForm());
  const [focus,     setFocus]     = useState("");
  const [saving,    setSaving]    = useState(false);

  const load = async () => {
    setLoading(true);
    try { setItems(await listCatalog()); } catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { (async () => { await load(); })(); }, []);

  const iStyle = (id) => fieldStyle(focus, id);
  const upF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setEditingId(null); setForm(emptyForm()); setFormOpen(true); };
  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || "", price: item.price || "", image: item.image || "",
      description: item.description || "", visible: item.visible !== false,
    });
    setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditingId(null); setForm(emptyForm()); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) await updateCatalogItem(editingId, form);
      else await createCatalogItem(form);
      await load();
      closeForm();
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("هل تريد حذف هذا المنتج؟")) return;
    await deleteCatalogItem(id);
    await load();
  };

  const toggleVisible = async (item) => {
    await updateCatalogItem(item.id, { ...item, visible: !item.visible });
    await load();
  };

  const filtered = items.filter(a => {
    const q = search.trim();
    if (!q) return true;
    return (a.name || "").includes(q) || (a.description || "").includes(q);
  });

  const visibleCount = items.filter(a => a.visible !== false).length;

  return (
    <div style={{flex:1, overflowY:"auto", padding:"16px 14px 24px"}}>
      <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:14}}>
        <div style={{flex:1}}>
          <input style={iStyle("search")} placeholder="ابحث في الكتالوج…" value={search}
            onFocus={()=>setFocus("search")} onBlur={()=>setFocus("")} onChange={e=>setSearch(e.target.value)} />
        </div>
        <button onClick={openAdd} style={primaryBtn}>+ منتج</button>
      </div>

      <p style={{fontSize:12, color:C.muted, marginBottom:14, lineHeight:1.7}}>
        المنتجات المُفعّلة (👁️ {visibleCount} من {items.length}) تظهر في موقع المتجر العام تلقائياً.
      </p>

      {formOpen && (
        <form onSubmit={submit} style={card}>
          <div style={subHead}>{editingId ? "تعديل المنتج" : "منتج جديد"}</div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>اسم المنتج *</label>
            <input style={iStyle("name")} value={form.name} onFocus={()=>setFocus("name")} onBlur={()=>setFocus("")} onChange={e=>upF("name",e.target.value)} placeholder="مثال: علبة شوكولاتة فاخرة" required />
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>السعر</label>
            <input style={iStyle("price")} value={form.price} onFocus={()=>setFocus("price")} onBlur={()=>setFocus("")} onChange={e=>upF("price",e.target.value)} placeholder="مثال: 8,000 ريال" />
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>رابط الصورة</label>
            <input style={{...iStyle("image"),direction:"ltr",textAlign:"right",fontFamily:"monospace",fontSize:12}} value={form.image} onFocus={()=>setFocus("image")} onBlur={()=>setFocus("")} onChange={e=>upF("image",e.target.value)} placeholder="https://...الصق رابط الصورة" />
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>الوصف</label>
            <textarea style={{...iStyle("description"),resize:"none",height:80,lineHeight:1.6}} value={form.description} onFocus={()=>setFocus("description")} onBlur={()=>setFocus("")} onChange={e=>upF("description",e.target.value)} placeholder="وصف مختصر للمنتج…" />
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>الظهور في الموقع</label>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button type="button" onClick={()=>upF("visible",true)} style={statusChipStyle(form.visible===true, C.green)}>👁️ يظهر</button>
              <button type="button" onClick={()=>upF("visible",false)} style={statusChipStyle(form.visible===false, C.muted)}>🚫 مخفي</button>
            </div>
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
          <div style={{fontSize:36, marginBottom:10}}>🛍️</div>
          <div style={{fontSize:13}}>{search ? "لا توجد نتائج مطابقة" : "الكتالوج فارغ — أضف منتجاتك لتظهر في موقع المتجر"}</div>
        </div>
      ) : (
        filtered.map(item => (
          <div key={item.id} style={card}>
            <div style={{display:"flex", gap:12}}>
              {item.image && (
                <img src={item.image} alt={item.name||""} style={{width:72, height:72, objectFit:"cover", borderRadius:12, flexShrink:0, border:`1px solid ${C.border}`}} onError={(e)=>{e.target.style.display="none";}} />
              )}
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:4}}>
                  <span style={{fontWeight:700, fontSize:14}}>{item.name}</span>
                  <span style={{
                    fontSize:10, flexShrink:0, fontWeight:600, borderRadius:99, padding:"2px 9px",
                    color: item.visible !== false ? C.green : C.muted,
                    background: item.visible !== false ? `${C.green}18` : `${C.muted}18`,
                    border: `1px solid ${item.visible !== false ? C.green : C.muted}30`,
                  }}>
                    {item.visible !== false ? "👁️ يظهر" : "🚫 مخفي"}
                  </span>
                </div>
                {item.price && <div style={{fontSize:13, color:C.accent2, fontWeight:700, marginBottom:4}}>{item.price}</div>}
                {item.description && <div style={{fontSize:12, color:C.muted, lineHeight:1.6}}>{item.description}</div>}
              </div>
            </div>
            <div style={{display:"flex", gap:8, marginTop:12}}>
              <button onClick={()=>toggleVisible(item)} style={{...ghostBtn, flex:1}}>
                {item.visible !== false ? "إخفاء من الموقع" : "إظهار في الموقع"}
              </button>
              <button onClick={()=>openEdit(item)} style={ghostBtn}>تعديل</button>
              <button onClick={()=>remove(item.id)} style={dangerBtn}>حذف</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
