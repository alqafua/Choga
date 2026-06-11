import { useState, useEffect } from "react";
import { C, card, lbl, subHead, fieldStyle, statusChipStyle, primaryBtn, ghostBtn, dangerBtn, ORDER_STATUSES, statusInfo } from "./theme";
import { listOrders, createOrder, updateOrder, deleteOrder, listCustomers } from "./api";

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  orderNumber: "", customerId: "", customerName: "", customerPhone: "",
  items: "", price: "", orderDate: todayStr(), deliveryDate: "",
  status: "new", notes: "",
});

export default function OrdersPage() {
  const [orders,       setOrders]       = useState([]);
  const [customers,    setCustomers]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen,     setFormOpen]     = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [form,         setForm]         = useState(emptyForm());
  const [focus,        setFocus]        = useState("");
  const [saving,       setSaving]       = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [o, c] = await Promise.all([listOrders(), listCustomers()]);
      setOrders(o);
      setCustomers(c);
    } catch {
      setOrders([]);
      setCustomers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => { await load(); })();
  }, []);

  const iStyle = (id) => fieldStyle(focus, id);
  const upF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const nextOrderNumber = () => {
    const nums = orders.map(o => Number(o.orderNumber)).filter(n => !Number.isNaN(n));
    return String((nums.length ? Math.max(...nums) : 1000) + 1);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), orderNumber: nextOrderNumber() });
    setFormOpen(true);
  };

  const openEdit = (o) => {
    setEditingId(o.id);
    setForm({
      orderNumber: o.orderNumber || "",
      customerId: o.customerId || "",
      customerName: o.customerName || "",
      customerPhone: o.customerPhone || "",
      items: o.items || "",
      price: o.price ?? "",
      orderDate: o.orderDate || todayStr(),
      deliveryDate: o.deliveryDate || "",
      status: o.status || "new",
      notes: o.notes || "",
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const pickCustomer = (id) => {
    const c = customers.find(c => c.id === id);
    setForm(f => ({
      ...f,
      customerId: id,
      customerName: c ? c.name : f.customerName,
      customerPhone: c ? (c.phone || "") : f.customerPhone,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.items.trim()) return;
    setSaving(true);
    try {
      if (editingId) await updateOrder(editingId, form);
      else await createOrder(form);
      await load();
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("هل تريد حذف هذه الطلبية؟")) return;
    await deleteOrder(id);
    await load();
  };

  const setOrderStatus = async (o, status) => {
    setOrders(list => list.map(x => x.id === o.id ? { ...x, status } : x));
    await updateOrder(o.id, { status });
  };

  const filtered = orders
    .filter(o => statusFilter === "all" || o.status === statusFilter)
    .filter(o => {
      const q = search.trim();
      if (!q) return true;
      return String(o.orderNumber || "").includes(q) || (o.customerName || "").includes(q);
    })
    .sort((a, b) => (Number(b.orderNumber) || 0) - (Number(a.orderNumber) || 0));

  return (
    <div style={{flex:1, overflowY:"auto", padding:"16px 14px 24px"}}>

      {/* header row */}
      <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:14}}>
        <div style={{flex:1}}>
          <input
            style={iStyle("search")}
            placeholder="ابحث برقم الطلبية أو اسم العميل…"
            value={search}
            onFocus={()=>setFocus("search")}
            onBlur={()=>setFocus("")}
            onChange={e=>setSearch(e.target.value)} />
        </div>
        <button onClick={openAdd} style={primaryBtn}>+ طلبية جديدة</button>
      </div>

      {/* status filter chips */}
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
        <button onClick={()=>setStatusFilter("all")} style={statusChipStyle(statusFilter==="all", C.accent)}>
          الكل ({orders.length})
        </button>
        {ORDER_STATUSES.map(s => (
          <button key={s.id} onClick={()=>setStatusFilter(s.id)} style={statusChipStyle(statusFilter===s.id, s.color)}>
            {s.label} ({orders.filter(o=>o.status===s.id).length})
          </button>
        ))}
      </div>

      {/* add/edit form */}
      {formOpen && (
        <form onSubmit={submit} style={card}>
          <div style={subHead}>{editingId ? "تعديل الطلبية" : "طلبية جديدة"}</div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label style={lbl}>رقم الطلبية</label>
              <input style={iStyle("orderNumber")} value={form.orderNumber} onFocus={()=>setFocus("orderNumber")} onBlur={()=>setFocus("")} onChange={e=>upF("orderNumber",e.target.value)} />
            </div>
            <div>
              <label style={lbl}>الحالة</label>
              <select style={iStyle("status")} value={form.status} onFocus={()=>setFocus("status")} onBlur={()=>setFocus("")} onChange={e=>upF("status",e.target.value)}>
                {ORDER_STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{marginBottom:14}}>
            <label style={lbl}>العميل</label>
            <select style={iStyle("customer")} value={form.customerId} onFocus={()=>setFocus("customer")} onBlur={()=>setFocus("")} onChange={e=>pickCustomer(e.target.value)}>
              <option value="">عميل غير مسجل (أدخل الاسم يدوياً)</option>
              {customers.map(c=><option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ""}</option>)}
            </select>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label style={lbl}>اسم العميل</label>
              <input style={iStyle("customerName")} value={form.customerName} onFocus={()=>setFocus("customerName")} onBlur={()=>setFocus("")} onChange={e=>upF("customerName",e.target.value)} />
            </div>
            <div>
              <label style={lbl}>رقم الهاتف</label>
              <input style={iStyle("customerPhone")} value={form.customerPhone} onFocus={()=>setFocus("customerPhone")} onBlur={()=>setFocus("")} onChange={e=>upF("customerPhone",e.target.value)} placeholder="+9677xxxxxxxx" />
            </div>
          </div>

          <div style={{marginBottom:14}}>
            <label style={lbl}>تفاصيل الطلب *</label>
            <textarea style={{...iStyle("items"),resize:"none",height:80,lineHeight:1.6}} value={form.items} onFocus={()=>setFocus("items")} onBlur={()=>setFocus("")} onChange={e=>upF("items",e.target.value)} placeholder="مثال: علبة شوكولاتة فاخرة (كبيرة) + تغليف هدايا" required />
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label style={lbl}>السعر (ريال)</label>
              <input type="number" min="0" style={iStyle("price")} value={form.price} onFocus={()=>setFocus("price")} onBlur={()=>setFocus("")} onChange={e=>upF("price",e.target.value)} />
            </div>
            <div>
              <label style={lbl}>تاريخ الطلب</label>
              <input type="date" style={iStyle("orderDate")} value={form.orderDate} onFocus={()=>setFocus("orderDate")} onBlur={()=>setFocus("")} onChange={e=>upF("orderDate",e.target.value)} />
            </div>
            <div>
              <label style={lbl}>تاريخ التسليم</label>
              <input type="date" style={iStyle("deliveryDate")} value={form.deliveryDate} onFocus={()=>setFocus("deliveryDate")} onBlur={()=>setFocus("")} onChange={e=>upF("deliveryDate",e.target.value)} />
            </div>
          </div>

          <div style={{marginBottom:14}}>
            <label style={lbl}>ملاحظات</label>
            <textarea style={{...iStyle("notes"),resize:"none",height:60,lineHeight:1.6}} value={form.notes} onFocus={()=>setFocus("notes")} onBlur={()=>setFocus("")} onChange={e=>upF("notes",e.target.value)} />
          </div>

          <div style={{display:"flex", gap:10}}>
            <button type="submit" disabled={saving} style={{...primaryBtn, flex:1}}>
              {saving ? "جاري الحفظ…" : editingId ? "حفظ التعديلات" : "إضافة الطلبية"}
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
          <div style={{fontSize:36, marginBottom:10}}>🧾</div>
          <div style={{fontSize:13}}>{search || statusFilter!=="all" ? "لا توجد نتائج مطابقة" : "لا توجد طلبيات بعد — أضف أول طلبية"}</div>
        </div>
      ) : (
        filtered.map(o => {
          const st = statusInfo(o.status);
          return (
            <div key={o.id} style={card}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8}}>
                <div>
                  <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
                    <span style={{fontWeight:700, fontSize:15}}>طلبية #{o.orderNumber || "—"}</span>
                    <span style={{fontSize:10, color:st.color, background:`${st.color}18`, border:`1px solid ${st.color}30`, borderRadius:99, padding:"2px 9px", fontWeight:600}}>{st.label}</span>
                  </div>
                  {o.customerName && (
                    <div style={{fontSize:12, color:C.muted, marginTop:4}}>
                      {o.customerName}{o.customerPhone ? ` · ${o.customerPhone}` : ""}
                    </div>
                  )}
                </div>
                <div style={{display:"flex", gap:8, flexShrink:0}}>
                  <button onClick={()=>openEdit(o)} style={ghostBtn}>تعديل</button>
                  <button onClick={()=>remove(o.id)} style={dangerBtn}>حذف</button>
                </div>
              </div>

              {o.items && <div style={{fontSize:13, color:C.text, lineHeight:1.6, marginBottom:8, whiteSpace:"pre-wrap"}}>{o.items}</div>}

              <div style={{display:"flex", flexWrap:"wrap", gap:10, alignItems:"center", justifyContent:"space-between"}}>
                <div style={{display:"flex", flexWrap:"wrap", gap:12, fontSize:12, color:C.muted}}>
                  {o.price !== "" && o.price !== null && o.price !== undefined && <span>💰 {o.price} ريال</span>}
                  {o.orderDate && <span>📅 {o.orderDate}</span>}
                  {o.deliveryDate && <span>🚚 {o.deliveryDate}</span>}
                </div>
                <select value={o.status} onChange={e=>setOrderStatus(o, e.target.value)} style={{
                  background:C.inp, border:`1px solid ${C.border}`, borderRadius:8, color:C.text,
                  fontSize:12, padding:"6px 10px", outline:"none", cursor:"pointer",
                  fontFamily:"'Tajawal',system-ui,sans-serif",
                }}>
                  {ORDER_STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>

              {o.notes && <div style={{fontSize:12, color:C.muted, marginTop:8, lineHeight:1.6}}>{o.notes}</div>}
            </div>
          );
        })
      )}
    </div>
  );
}
