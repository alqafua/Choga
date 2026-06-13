import { useState, useEffect } from "react";
import { C, card, lbl, subHead, fieldStyle, statusChipStyle, primaryBtn, ghostBtn, dangerBtn } from "./theme";
import {
  listCatalog, createCatalogItem, updateCatalogItem, deleteCatalogItem,
  getMetaCatalog, selectMetaCatalog, syncMetaCatalog, importMetaCatalog,
} from "./api";

const CURRENCIES = [
  { id: "YER", label: "ر.ي" },
  { id: "SAR", label: "ر.س" },
  { id: "USD", label: "$" },
];

const emptyForm = () => ({ name: "", price: "", priceAmount: "", currency: "YER", image: "", description: "", visible: true });

export default function CatalogPage() {
  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [formOpen,  setFormOpen]  = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form,      setForm]      = useState(emptyForm());
  const [focus,     setFocus]     = useState("");
  const [saving,    setSaving]    = useState(false);

  const [fbCatalog,  setFbCatalog]  = useState(null);
  const [fbLoading,  setFbLoading]  = useState(true);
  const [fbSyncing,  setFbSyncing]  = useState(false);
  const [fbSyncMsg,  setFbSyncMsg]  = useState("");
  const [fbImporting, setFbImporting] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setItems(await listCatalog()); } catch { setItems([]); }
    setLoading(false);
  };

  const loadFbCatalog = async () => {
    setFbLoading(true);
    try { setFbCatalog(await getMetaCatalog()); } catch { setFbCatalog(null); }
    setFbLoading(false);
  };

  useEffect(() => { (async () => { await load(); })(); }, []);
  useEffect(() => { (async () => { await loadFbCatalog(); })(); }, []);

  const iStyle = (id) => fieldStyle(focus, id);
  const upF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setEditingId(null); setForm(emptyForm()); setFormOpen(true); };
  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || "", price: item.price || "",
      priceAmount: item.priceAmount ?? "", currency: item.currency || "YER",
      image: item.image || "", description: item.description || "", visible: item.visible !== false,
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

  const selectCatalog = async (id) => {
    await selectMetaCatalog(id);
    setFbCatalog(c => ({ ...c, selectedCatalogId: id }));
  };

  const doSync = async () => {
    setFbSyncing(true);
    setFbSyncMsg("");
    try {
      const res = await syncMetaCatalog();
      setFbSyncMsg(res.ok ? `تمت مزامنة ${res.count ?? 0} منتج مع كتالوج فيسبوك ✅` : (res.error || "تعذّرت المزامنة"));
    } catch {
      setFbSyncMsg("تعذّرت المزامنة");
    }
    setFbSyncing(false);
  };

  const doImport = async () => {
    setFbImporting(true);
    setFbSyncMsg("");
    try {
      const res = await importMetaCatalog();
      if (res.ok) {
        setFbSyncMsg(`تم استيراد ${res.imported ?? 0} منتج جديد وتحديث ${res.updated ?? 0} من كتالوج فيسبوك ✅`);
        await load();
      } else {
        setFbSyncMsg(res.error || "تعذّر الاستيراد");
      }
    } catch {
      setFbSyncMsg("تعذّر الاستيراد");
    }
    setFbImporting(false);
  };

  const filtered = items.filter(a => {
    const q = search.trim();
    if (!q) return true;
    return (a.name || "").includes(q) || (a.description || "").includes(q);
  });

  const visibleCount = items.filter(a => a.visible !== false).length;
  const currencyLabel = (id) => (CURRENCIES.find(c => c.id === id) || CURRENCIES[0]).label;

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

      {/* ── Facebook / Instagram Shop catalog sync ── */}
      {!fbLoading && fbCatalog?.connected && (
        <div style={card}>
          <div style={subHead}>مزامنة كتالوج فيسبوك / متجر إنستغرام</div>
          {fbCatalog.needsPermission ? (
            <p style={{fontSize:12, color:C.muted, lineHeight:1.8}}>
              يحتاج ربط ميتا صلاحية إضافية (<code style={{color:C.accent2}}>catalog_management</code>) للوصول إلى كتالوج المنتجات.
              أعد توليد رمز الوصول من Graph API Explorer مع تفعيل هذه الصلاحية، ثم أعد لصقه من تبويب «الإعدادات» ← «الحسابات».
            </p>
          ) : !fbCatalog.catalogs?.length ? (
            <p style={{fontSize:12, color:C.muted, lineHeight:1.8}}>
              لم يتم العثور على كتالوج منتجات في حسابك على ميتا. أنشئ كتالوجاً من Commerce Manager أولاً ثم حدّث هذه الصفحة.
            </p>
          ) : (
            <>
              <p style={{fontSize:12, color:C.muted, marginBottom:10, lineHeight:1.8}}>
                اختر الكتالوج الذي يُغذّي متجر إنستغرام. «استيراد من فيسبوك» يجلب منتجاته الحالية إلى Choga، و«مزامنة الآن» يرفع تعديلاتك من Choga إليه.
              </p>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
                {fbCatalog.catalogs.map(c => (
                  <button key={c.id} onClick={()=>selectCatalog(c.id)} style={statusChipStyle(fbCatalog.selectedCatalogId===c.id, C.accent)}>
                    {c.name}{c.productCount != null ? ` (${c.productCount})` : ""}
                  </button>
                ))}
              </div>
              {fbCatalog.selectedCatalogId && (
                <div style={{display:"flex", gap:10}}>
                  <button onClick={doImport} disabled={fbImporting} style={{...primaryBtn, flex:1, opacity: fbImporting ? 0.6 : 1}}>
                    {fbImporting ? "جاري الاستيراد…" : "📥 استيراد من فيسبوك"}
                  </button>
                  <button onClick={doSync} disabled={fbSyncing} style={{...ghostBtn, flex:1, opacity: fbSyncing ? 0.6 : 1}}>
                    {fbSyncing ? "جاري المزامنة…" : "🔄 مزامنة الآن"}
                  </button>
                </div>
              )}
              {fbSyncMsg && <div style={{fontSize:12, color: fbSyncMsg.includes("✅") ? C.green : C.red, marginTop:10, lineHeight:1.7}}>{fbSyncMsg}</div>}
            </>
          )}
        </div>
      )}

      {formOpen && (
        <form onSubmit={submit} style={card}>
          <div style={subHead}>{editingId ? "تعديل المنتج" : "منتج جديد"}</div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>اسم المنتج *</label>
            <input style={iStyle("name")} value={form.name} onFocus={()=>setFocus("name")} onBlur={()=>setFocus("")} onChange={e=>upF("name",e.target.value)} placeholder="مثال: علبة شوكولاتة فاخرة" required />
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>السعر (للعرض في الموقع)</label>
            <input style={iStyle("price")} value={form.price} onFocus={()=>setFocus("price")} onBlur={()=>setFocus("")} onChange={e=>upF("price",e.target.value)} placeholder="مثال: 8,000 ريال" />
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>السعر الرقمي (لمزامنة كتالوج فيسبوك)</label>
            <div style={{display:"flex", gap:8}}>
              <input type="number" min="0" step="0.01" style={{...iStyle("priceAmount"), flex:1}} value={form.priceAmount} onFocus={()=>setFocus("priceAmount")} onBlur={()=>setFocus("")} onChange={e=>upF("priceAmount",e.target.value)} placeholder="8000" />
              <div style={{display:"flex", gap:6}}>
                {CURRENCIES.map(c => (
                  <button type="button" key={c.id} onClick={()=>upF("currency",c.id)} style={statusChipStyle(form.currency===c.id, C.accent)}>{c.label}</button>
                ))}
              </div>
            </div>
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
                {item.priceAmount && <div style={{fontSize:11, color:C.muted, marginBottom:4}}>للمزامنة: {item.priceAmount} {currencyLabel(item.currency)}</div>}
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
