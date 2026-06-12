import { useState, useEffect } from "react";
import { C, card, subHead, ORDER_STATUSES } from "./theme";
import { listOrders, listCustomers, getMetaInsights } from "./api";

const fmt = (n) => new Intl.NumberFormat("ar").format(Math.round(n));

const MONTH_NAMES = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const monthLabel = (ym) => MONTH_NAMES[Number(ym.split("-")[1]) - 1] || ym;

const last6Months = () => {
  const out = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
};

export default function AnalyticsPage() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [o, c] = await Promise.all([listOrders(), listCustomers()]);
        setOrders(o);
        setCustomers(c);
      } catch {
        setOrders([]);
        setCustomers([]);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try { setInsights(await getMetaInsights()); } catch { setInsights(null); }
      setInsightsLoading(false);
    })();
  }, []);

  const activeOrders = orders.filter(o => o.status !== "cancelled");
  const totalRevenue = activeOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
  const avgOrder = activeOrders.length ? totalRevenue / activeOrders.length : 0;
  const deliveredCount = orders.filter(o => o.status === "delivered").length;

  const statusCounts = ORDER_STATUSES.map(s => ({ ...s, count: orders.filter(o => o.status === s.id).length }));
  const maxStatusCount = Math.max(1, ...statusCounts.map(s => s.count));

  const monthlyRevenue = last6Months().map(ym => ({
    ym,
    total: orders
      .filter(o => o.status !== "cancelled" && (o.orderDate || "").startsWith(ym))
      .reduce((sum, o) => sum + (Number(o.price) || 0), 0),
  }));
  const maxMonthly = Math.max(1, ...monthlyRevenue.map(m => m.total));

  const byCustomer = {};
  activeOrders.forEach(o => {
    const key = o.customerName || "غير معروف";
    if (!byCustomer[key]) byCustomer[key] = { name: key, count: 0, total: 0 };
    byCustomer[key].count += 1;
    byCustomer[key].total += Number(o.price) || 0;
  });
  const topCustomers = Object.values(byCustomer).sort((a, b) => b.total - a.total).slice(0, 5);

  const statCards = [
    { label: "إجمالي الطلبيات", value: fmt(orders.length), icon: "🧾" },
    { label: "إجمالي المبيعات", value: `${fmt(totalRevenue)} ريال`, icon: "💰" },
    { label: "متوسط الطلبية", value: `${fmt(avgOrder)} ريال`, icon: "📈" },
    { label: "العملاء", value: fmt(customers.length), icon: "👥" },
  ];

  return (
    <div style={{flex:1, overflowY:"auto", padding:"16px 14px 24px"}}>
      {loading ? (
        <p style={{textAlign:"center",color:C.muted,fontSize:13,marginTop:24}}>جاري التحميل…</p>
      ) : (
        <>
          {/* summary cards */}
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12}}>
            {statCards.map(s => (
              <div key={s.label} style={{...card, marginBottom:0}}>
                <div style={{fontSize:22, marginBottom:6}}>{s.icon}</div>
                <div style={{fontSize:18, fontWeight:800, color:C.text}}>{s.value}</div>
                <div style={{fontSize:11, color:C.muted, marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* social media insights */}
          {!insightsLoading && insights?.connected && (insights.instagram || insights.facebook) && (
            <div style={card}>
              <div style={subHead}>أداء حسابات التواصل</div>
              <div style={{display:"flex", flexWrap:"wrap", gap:10, marginBottom: (insights.instagram?.recentMedia?.length ? 14 : 0)}}>
                {insights.instagram && (
                  <div style={{flex:"1 1 140px", display:"flex", alignItems:"center", gap:10, background:C.inp, borderRadius:12, padding:"10px 12px"}}>
                    {insights.instagram.profilePic ? (
                      <img src={insights.instagram.profilePic} alt="" style={{width:36,height:36,borderRadius:10,objectFit:"cover"}} />
                    ) : (
                      <div style={{width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,background:"#E1306C18",border:"1px solid #E1306C30"}}>📸</div>
                    )}
                    <div>
                      <div style={{fontSize:16, fontWeight:800}}>{insights.instagram.followers != null ? fmt(insights.instagram.followers) : "—"}</div>
                      <div style={{fontSize:11, color:C.muted}}>متابعين إنستغرام {insights.instagram.username ? `@${insights.instagram.username}` : ""}</div>
                    </div>
                  </div>
                )}
                {insights.facebook && (
                  <div style={{flex:"1 1 140px", display:"flex", alignItems:"center", gap:10, background:C.inp, borderRadius:12, padding:"10px 12px"}}>
                    {insights.facebook.picture ? (
                      <img src={insights.facebook.picture} alt="" style={{width:36,height:36,borderRadius:10,objectFit:"cover"}} />
                    ) : (
                      <div style={{width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,background:`${C.blue}18`,border:`1px solid ${C.blue}30`}}>📘</div>
                    )}
                    <div>
                      <div style={{fontSize:16, fontWeight:800}}>{insights.facebook.followers != null ? fmt(insights.facebook.followers) : "—"}</div>
                      <div style={{fontSize:11, color:C.muted}}>متابعين فيسبوك {insights.facebook.name || ""}</div>
                    </div>
                  </div>
                )}
              </div>
              {insights.instagram?.recentMedia?.length > 0 && (
                <div style={{display:"flex", gap:8, overflowX:"auto", paddingBottom:4}}>
                  {insights.instagram.recentMedia.map(m => (
                    <a key={m.id} href={m.permalink} target="_blank" rel="noopener noreferrer" style={{flexShrink:0, width:96, textDecoration:"none"}}>
                      {m.media_url && (m.media_type === "VIDEO" ? (
                        <div style={{width:96, height:96, borderRadius:10, background:C.inp, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24}}>🎬</div>
                      ) : (
                        <img src={m.media_url} alt="" style={{width:96, height:96, objectFit:"cover", borderRadius:10}} onError={(e)=>{e.target.style.display="none";}} />
                      ))}
                      <div style={{fontSize:11, color:C.muted, marginTop:4, textAlign:"center"}}>❤️ {m.like_count ?? 0} 💬 {m.comments_count ?? 0}</div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* orders by status */}
          <div style={card}>
            <div style={subHead}>الطلبيات بحسب الحالة</div>
            {statusCounts.map(s => (
              <div key={s.id} style={{marginBottom:10}}>
                <div style={{display:"flex", justifyContent:"space-between", fontSize:12, color:C.muted, marginBottom:5}}>
                  <span>{s.label}</span>
                  <span>{s.count}</span>
                </div>
                <div style={{height:8, borderRadius:5, background:C.inp, overflow:"hidden"}}>
                  <div style={{height:"100%", width:`${(s.count/maxStatusCount)*100}%`, background:s.color, borderRadius:5, transition:"width .3s"}} />
                </div>
              </div>
            ))}
          </div>

          {/* monthly revenue */}
          <div style={card}>
            <div style={subHead}>المبيعات الشهرية (آخر 6 أشهر)</div>
            <div style={{display:"flex", alignItems:"flex-end", gap:10, height:130}}>
              {monthlyRevenue.map(m => (
                <div key={m.ym} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6, height:"100%", justifyContent:"flex-end"}}>
                  <div style={{fontSize:10, color:C.muted}}>{m.total ? fmt(m.total) : ""}</div>
                  <div style={{
                    width:"100%", maxWidth:32, borderRadius:"6px 6px 0 0",
                    background:`linear-gradient(180deg, ${C.accent}, #E08820)`,
                    height: `${Math.max(4, (m.total/maxMonthly)*84)}px`,
                  }} />
                  <div style={{fontSize:11, color:C.muted}}>{monthLabel(m.ym)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* top customers */}
          <div style={card}>
            <div style={subHead}>أفضل العملاء</div>
            {topCustomers.length === 0 ? (
              <div style={{fontSize:12, color:C.muted, textAlign:"center", padding:"10px 0"}}>لا توجد بيانات كافية بعد</div>
            ) : topCustomers.map((c, i) => (
              <div key={c.name} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom: i < topCustomers.length-1 ? `1px solid ${C.border}` : "none"}}>
                <div style={{display:"flex", alignItems:"center", gap:10}}>
                  <div style={{width:26,height:26,borderRadius:8,background:`${C.accent}18`,border:`1px solid ${C.accent}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:C.accent}}>{i+1}</div>
                  <div>
                    <div style={{fontSize:13, fontWeight:600}}>{c.name}</div>
                    <div style={{fontSize:11, color:C.muted}}>{c.count} طلبية</div>
                  </div>
                </div>
                <div style={{fontSize:13, fontWeight:700, color:C.accent2}}>{fmt(c.total)} ريال</div>
              </div>
            ))}
          </div>

          {deliveredCount > 0 && (
            <p style={{textAlign:"center", color:C.dim, fontSize:11, paddingBottom:8}}>
              تم تسليم {deliveredCount} طلبية من إجمالي {orders.length}
            </p>
          )}
        </>
      )}
    </div>
  );
}
