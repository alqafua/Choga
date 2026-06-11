import { useState, useEffect } from "react";
import { C, card, lbl, subHead, fieldStyle, primaryBtn, ghostBtn, dangerBtn } from "./theme";
import { listCustomers, createCustomer, updateCustomer, deleteCustomer } from "./api";

const EMPTY = { name: "", phone: "", address: "", notes: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [formOpen,  setFormOpen]  = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [focus,     setFocus]     = useState("");
  const [saving,    setSaving]    = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await listCustomers();
      setCustomers(list);
    } catch {
      setCustomers([]);
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
    setForm(EMPTY);
    setFormOpen(true);
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({ name: c.name || "", phone: c.phone || "", address: c.address || "", notes: c.notes || "" });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) await updateCustomer(editingId, form);
      else await createCustomer(form);
      await load();
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("هل تريد حذف هذا العميل؟")) return;
    await deleteCustomer(id);
    await load();
  };

  const filtered = customers.filter(c => {
    const q = search.trim();
    if (!q) return true;
    return (c.name || "").includes(q) || (c.phone || "").includes(q);
  });

  return (
    <div style={{flex:1, overflowY:"auto", padding:"16px 14px 24px"}}>

      {/* header row */}
      <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:14}}>
        <div style={{flex:1}}>
          <input
            style={iStyle("search")}
            placeholder="ابحث بالاسم أو رقم الهاتف…"
            value={search}
            onFocus={()=>setFocus("search")}
            onBlur={()=>setFocus("")}
            onChange={e=>setSearch(e.target.value)} />
        </div>
        <button onClick={openAdd} style={primaryBtn}>+ عميل جديد</button>
      </div>

      {/* add/edit form */}
      {formOpen && (
        <form onSubmit={submit} style={card}>
          <div style={subHead}>{editingId ? "تعديل بيانات العميل" : "إضافة عميل جديد"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label style={lbl}>الاسم *</label>
              <input style={iStyle("name")} value={form.name} onFocus={()=>setFocus("name")} onBlur={()=>setFocus("")} onChange={e=>upF("name",e.target.value)} required />
            </div>
            <div>
              <label style={lbl}>رقم الهاتف</label>
              <input style={iStyle("phone")} value={form.phone} onFocus={()=>setFocus("phone")} onBlur={()=>setFocus("")} onChange={e=>upF("phone",e.target.value)} placeholder="+9677xxxxxxxx" />
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>العنوان</label>
            <input style={iStyle("address")} value={form.address} onFocus={()=>setFocus("address")} onBlur={()=>setFocus("")} onChange={e=>upF("address",e.target.value)} />
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>ملاحظات</label>
            <textarea style={{...iStyle("notes"),resize:"none",height:68,lineHeight:1.6}} value={form.notes} onFocus={()=>setFocus("notes")} onBlur={()=>setFocus("")} onChange={e=>upF("notes",e.target.value)} />
          </div>
          <div style={{display:"flex", gap:10}}>
            <button type="submit" disabled={saving} style={{...primaryBtn, flex:1}}>
              {saving ? "جاري الحفظ…" : editingId ? "حفظ التعديلات" : "إضافة العميل"}
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
          <div style={{fontSize:36, marginBottom:10}}>👥</div>
          <div style={{fontSize:13}}>{search ? "لا توجد نتائج مطابقة" : "لا يوجد عملاء بعد — أضف أول عميل"}</div>
        </div>
      ) : (
        filtered.map(c => (
          <div key={c.id} style={card}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8}}>
              <div>
                <div style={{fontWeight:700, fontSize:15}}>{c.name}</div>
                {c.phone && <div style={{fontSize:12, color:C.muted, marginTop:3, fontFamily:"monospace", direction:"ltr", textAlign:"right"}}>{c.phone}</div>}
              </div>
              <div style={{display:"flex", gap:8}}>
                <button onClick={()=>openEdit(c)} style={ghostBtn}>تعديل</button>
                <button onClick={()=>remove(c.id)} style={dangerBtn}>حذف</button>
              </div>
            </div>
            {c.address && <div style={{fontSize:12, color:C.muted, marginBottom:4}}>📍 {c.address}</div>}
            {c.notes && <div style={{fontSize:12, color:C.muted, lineHeight:1.6}}>{c.notes}</div>}
          </div>
        ))
      )}
    </div>
  );
}
