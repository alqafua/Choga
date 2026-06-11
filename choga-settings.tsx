import { useState, useEffect } from "react";

// ─── palette ───────────────────────────────────────────────
const C = {
  bg:      "#13171f",
  card:    "#1b2131",
  inp:     "#222a3a",
  border:  "#2a3348",
  accent:  "#F0A030",
  accent2: "#F5C060",
  text:    "#E8EDF5",
  muted:   "#6B7A99",
  dim:     "#3a4560",
  green:   "#22c55e",
};

// ─── nav tabs ──────────────────────────────────────────────
const NAV = [
  { id:"assets",    label:"المواد",     icon:"📁" },
  { id:"research",  label:"البحث",      icon:"🔍" },
  { id:"plan",      label:"الخطة",      icon:"📅" },
  { id:"creator",   label:"المحتوى",   icon:"✨" },
  { id:"review",    label:"المراجعة",   icon:"✅" },
  { id:"publish",   label:"النشر",      icon:"🚀" },
  { id:"inbox",     label:"الردود",     icon:"💬" },
  { id:"analytics", label:"التحليل",    icon:"📊" },
  { id:"settings",  label:"الإعدادات", icon:"⚙️" },
];

const TONES     = ["راقٍ وودّي","احترافي","حماسي","عاطفي","بسيط وصريح"];
const TRAITS    = ["فاخر","حرفي","دافئ","مناسباتي","ودّي","مبدع","موثوق","أنيق"];
const OCCASIONS = ["أعراس","عيد الفطر","عيد الأضحى","رمضان","أعياد ميلاد","تخرج","عيد الأم","خطوبة"];

const PLATFORMS = [
  { id:"instagram", name:"إنستغرام",  color:"#E1306C", icon:"📸", prefix:"@",    note:null },
  { id:"facebook",  name:"فيسبوك",    color:"#4A90D9", icon:"📘", prefix:"",     note:null },
  { id:"snapchat",  name:"سناب شات", color:"#F5D020", icon:"👻", prefix:"@",    note:"النشر يدوي فقط — لا يوجد API رسمي" },
  { id:"tiktok",    name:"تيك توك",   color:"#69C9D0", icon:"🎵", prefix:"@",    note:"يحتاج موافقة من المنصّة" },
  { id:"whatsapp",  name:"واتساب",    color:"#25D366", icon:"💬", prefix:"+967", note:null },
];

const API_FIELDS = [
  { id:"anthropic", name:"Anthropic Claude", desc:"الذكاء الاصطناعي — صناعة المحتوى", where:"console.anthropic.com  ←  API Keys",       ph:"sk-ant-api03-..." },
  { id:"meta",      name:"Meta / Facebook",  desc:"النشر على إنستغرام وفيسبوك",       where:"developers.facebook.com  ←  Apps",         ph:"EAAxxxxxxxxxxxxxxxx" },
  { id:"tiktok",    name:"TikTok",           desc:"النشر على تيك توك",                 where:"developers.tiktok.com  ←  Apps  ←  Keys", ph:"xxxx-xxxx-xxxx-xxxx" },
];

const DEF = {
  name:"Choga", nameAr:"شوقا",
  type:"متجر شوكولاتة فاخرة", location:"صنعاء، اليمن",
  tagline:"هنايُصاغ الطعام بلمسةٍ فنية",
  description:"متجر متخصص بصناعة الشوكلاته وتقديمها بطريقة فاخرة تليق بهداياكم وكافة مناسباتكم 🤎",
  audience:"أصحاب المناسبات والعرسان ومن يبحث عن هدايا راقية",
  audienceAge:"25-45",
  tone:"راقٍ وودّي", traits:["فاخر","حرفي","دافئ","مناسباتي"],
  products:"شوكولاتة يدوية فاخرة، تغليف مميز للمناسبات، هدايا الأعراس والعيد والتخرج",
  occasions:["أعراس","عيد الفطر","عيد الأضحى","رمضان"],
  priceRange:"", extra:"",
  platforms:{ instagram:"choga.yo", facebook:"CHOGA", snapchat:"", tiktok:"", whatsapp:"" },
  api:{ anthropic:"", meta:"", tiktok:"" },
};

// ─── reusable input style ───────────────────────────────────
const inpBase = {
  width:"100%", background:C.inp, border:`1px solid ${C.border}`,
  borderRadius:12, padding:"12px 14px", color:C.text,
  fontSize:14, outline:"none", fontFamily:"'Tajawal',system-ui,sans-serif",
  transition:"border-color .2s", boxSizing:"border-box",
};

export default function App() {
  const [activeNav, setActiveNav] = useState("settings");
  const [sec,       setSec]       = useState("identity");
  const [data,      setData]      = useState(DEF);
  const [reveal,    setReveal]    = useState({});
  const [focus,     setFocus]     = useState("");
  const [status,    setStatus]    = useState("idle");

  useEffect(()=>{
    (async()=>{
      try {
        const r = await window.storage.get("choga-settings");
        if(r?.value) setData(d=>({...d,...JSON.parse(r.value)}));
      } catch{}
    })();
  },[]);

  const up  = (k,v) => setData(d=>({...d,[k]:v}));
  const upP = (k,v) => setData(d=>({...d,platforms:{...d.platforms,[k]:v}}));
  const upA = (k,v) => setData(d=>({...d,api:{...d.api,[k]:v}}));
  const tog = (arr,x) => arr.includes(x)?arr.filter(i=>i!==x):[...arr,x];

  const save = async () => {
    setStatus("saving");
    try { await window.storage.set("choga-settings", JSON.stringify(data)); } catch{}
    setStatus("saved");
    setTimeout(()=>setStatus("idle"), 2500);
  };

  const iStyle = (id) => ({
    ...inpBase,
    borderColor: focus===id ? C.accent : C.border,
    boxShadow:   focus===id ? `0 0 0 3px ${C.accent}18` : "none",
  });

  const chip = (on) => ({
    padding:"8px 14px", borderRadius:10, fontSize:13,
    border: `1px solid ${on ? C.accent : C.border}`,
    background: on ? `${C.accent}22` : "transparent",
    color: on ? C.accent2 : C.muted,
    cursor:"pointer", fontFamily:"'Tajawal',system-ui,sans-serif",
    fontWeight: on ? 600 : 400, transition:"all .15s",
  });

  const card = {
    background:C.card, borderRadius:18,
    border:`1px solid ${C.border}`,
    padding:"18px 16px", marginBottom:12,
  };

  const lbl = {
    display:"block", fontSize:11, color:C.muted,
    marginBottom:7, fontWeight:500,
  };

  const subHead = {
    fontSize:12, fontWeight:700, color:C.muted,
    textTransform:"uppercase", letterSpacing:"0.12em",
    paddingBottom:12, marginBottom:14,
    borderBottom:`1px solid ${C.border}`,
  };

  const idDone  = !!(data.name && data.type);
  const accDone = Object.values(data.platforms).some(Boolean);
  const apiDone = !!(data.api.anthropic);

  const SECS = [
    {id:"identity", label:"هوية المشروع", done:idDone},
    {id:"accounts", label:"الحسابات",      done:accDone},
    {id:"api",      label:"مفاتيح API",    done:apiDone},
  ];

  return (
    <div dir="rtl" style={{fontFamily:"'Tajawal',system-ui,sans-serif", background:C.bg, color:C.text, height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
        input::placeholder,textarea::placeholder{color:${C.dim}}
        input,textarea{font-family:'Tajawal',system-ui,sans-serif}
      `}</style>

      {/* ── Top header ── */}
      <div style={{flexShrink:0, padding:"14px 16px 0", background:C.bg}}>

        {/* brand row */}
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:10,background:`${C.accent}22`,border:`1px solid ${C.accent}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🍫</div>
            <div>
              <div style={{fontWeight:800,fontSize:15,letterSpacing:"0.05em",color:C.text}}>CHOGA</div>
              <div style={{fontSize:10,color:C.muted}}>مركز المحتوى</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,background:`${C.green}18`,border:`1px solid ${C.green}30`,borderRadius:99,padding:"5px 12px"}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:C.green}}/>
            <span style={{fontSize:11,color:C.green,fontWeight:600}}>نشط</span>
          </div>
        </div>

        {/* nav tabs — horizontal scrollable */}
        <div style={{display:"flex",overflowX:"auto",gap:4,paddingBottom:0,scrollbarWidth:"none"}}>
          <style>{`.navscroll::-webkit-scrollbar{display:none}`}</style>
          {NAV.map(t=>{
            const active = t.id === activeNav;
            return (
              <button key={t.id}
                onClick={()=>setActiveNav(t.id)}
                style={{
                  flexShrink:0, display:"flex", alignItems:"center", gap:5,
                  padding:"8px 14px", borderRadius:"12px 12px 0 0",
                  background: active ? C.card : "transparent",
                  border: active ? `1px solid ${C.border}` : "1px solid transparent",
                  borderBottom: active ? `1px solid ${C.card}` : "1px solid transparent",
                  color: active ? C.accent : C.muted,
                  fontSize:13, fontWeight: active ? 700 : 400,
                  cursor:"pointer", fontFamily:"'Tajawal',system-ui,sans-serif",
                  transition:"all .15s", position:"relative", bottom:-1,
                }}>
                <span style={{fontSize:14}}>{t.icon}</span>
                <span>{t.label}</span>
                {!["settings"].includes(t.id) && (
                  <span style={{fontSize:8,background:C.border,color:C.muted,borderRadius:4,padding:"1px 4px",fontWeight:400}}>قريباً</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content area ── */}
      <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:C.card, borderTop:`1px solid ${C.border}`}}>

        {/* section switcher */}
        <div style={{flexShrink:0, display:"flex", borderBottom:`1px solid ${C.border}`, padding:"0 16px", background:C.card}}>
          {SECS.map(s=>(
            <button key={s.id} onClick={()=>setSec(s.id)} style={{
              padding:"13px 16px", fontSize:13, fontWeight: sec===s.id ? 700 : 400,
              background:"none", border:"none", cursor:"pointer",
              fontFamily:"'Tajawal',system-ui,sans-serif",
              borderBottom: sec===s.id ? `2px solid ${C.accent}` : "2px solid transparent",
              color: sec===s.id ? C.accent : C.muted,
              transition:"all .15s", display:"flex", alignItems:"center", gap:6, marginBottom:-1,
            }}>
              {s.label}
              <span style={{width:6,height:6,borderRadius:"50%",background:s.done?C.green:C.border,transition:"background .3s"}}/>
            </button>
          ))}
        </div>

        {/* scroll body */}
        <div style={{flex:1, overflowY:"auto", padding:"16px 14px 24px"}}>

          {/* ══ IDENTITY ══ */}
          {sec==="identity" && <>

            <div style={card}>
              <div style={subHead}>المعلومات الأساسية</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <div>
                  <label style={lbl}>الاسم إنجليزي</label>
                  <input style={iStyle("name")} value={data.name} onFocus={()=>setFocus("name")} onBlur={()=>setFocus("")} onChange={e=>up("name",e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>الاسم عربي</label>
                  <input style={iStyle("nameAr")} value={data.nameAr} onFocus={()=>setFocus("nameAr")} onBlur={()=>setFocus("")} onChange={e=>up("nameAr",e.target.value)} />
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <div>
                  <label style={lbl}>نوع النشاط</label>
                  <input style={iStyle("type")} value={data.type} onFocus={()=>setFocus("type")} onBlur={()=>setFocus("")} onChange={e=>up("type",e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>الموقع</label>
                  <input style={iStyle("loc")} value={data.location} onFocus={()=>setFocus("loc")} onBlur={()=>setFocus("")} onChange={e=>up("location",e.target.value)} />
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={lbl}>الشعار / التاغلاين</label>
                <input style={iStyle("tag")} value={data.tagline} onFocus={()=>setFocus("tag")} onBlur={()=>setFocus("")} onChange={e=>up("tagline",e.target.value)} />
              </div>
              <div>
                <label style={lbl}>وصف المشروع</label>
                <textarea style={{...iStyle("desc"),resize:"none",height:90,lineHeight:1.6}} value={data.description} onFocus={()=>setFocus("desc")} onBlur={()=>setFocus("")} onChange={e=>up("description",e.target.value)} />
              </div>
            </div>

            <div style={card}>
              <div style={subHead}>الجمهور المستهدف</div>
              <div style={{marginBottom:14}}>
                <label style={lbl}>من هم زبائنك؟</label>
                <input style={iStyle("aud")} value={data.audience} onFocus={()=>setFocus("aud")} onBlur={()=>setFocus("")} onChange={e=>up("audience",e.target.value)} />
              </div>
              <div>
                <label style={lbl}>الفئة العمرية</label>
                <input style={iStyle("age")} placeholder="مثال: 25 – 45 سنة" value={data.audienceAge} onFocus={()=>setFocus("age")} onBlur={()=>setFocus("")} onChange={e=>up("audienceAge",e.target.value)} />
              </div>
            </div>

            <div style={card}>
              <div style={subHead}>صوت العلامة</div>
              <div style={{marginBottom:16}}>
                <label style={lbl}>النبرة العامة</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
                  {TONES.map(t=><button key={t} onClick={()=>up("tone",t)} style={chip(data.tone===t)}>{t}</button>)}
                </div>
              </div>
              <div>
                <label style={lbl}>شخصية العلامة</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
                  {TRAITS.map(tr=><button key={tr} onClick={()=>up("traits",tog(data.traits,tr))} style={chip(data.traits.includes(tr))}>{tr}</button>)}
                </div>
              </div>
            </div>

            <div style={card}>
              <div style={subHead}>المنتجات والمناسبات</div>
              <div style={{marginBottom:14}}>
                <label style={lbl}>منتجاتك وخدماتك</label>
                <textarea style={{...iStyle("prod"),resize:"none",height:84,lineHeight:1.6}} value={data.products} onFocus={()=>setFocus("prod")} onBlur={()=>setFocus("")} onChange={e=>up("products",e.target.value)} />
              </div>
              <div style={{marginBottom:14}}>
                <label style={lbl}>المناسبات المستهدفة</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
                  {OCCASIONS.map(o=><button key={o} onClick={()=>up("occasions",tog(data.occasions,o))} style={chip(data.occasions.includes(o))}>{o}</button>)}
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={lbl}>نطاق الأسعار</label>
                <input style={iStyle("price")} placeholder="مثال: 2,000 – 15,000 ريال" value={data.priceRange} onFocus={()=>setFocus("price")} onBlur={()=>setFocus("")} onChange={e=>up("priceRange",e.target.value)} />
              </div>
              <div>
                <label style={lbl}>ملاحظات للذكاء الاصطناعي</label>
                <textarea style={{...iStyle("extra"),resize:"none",height:68,lineHeight:1.6}} placeholder="أي شيء إضافي تريد الذكاء يعرفه…" value={data.extra} onFocus={()=>setFocus("extra")} onBlur={()=>setFocus("")} onChange={e=>up("extra",e.target.value)} />
              </div>
            </div>
          </>}

          {/* ══ ACCOUNTS ══ */}
          {sec==="accounts" && <>
            <p style={{fontSize:12,color:C.muted,marginBottom:14,lineHeight:1.7}}>أضف معرّفاتك على كل منصّة — تُستخدم للنشر وتحليل الأداء.</p>
            {PLATFORMS.map(p=>{
              const val = data.platforms[p.id];
              const fid = `pl_${p.id}`;
              return (
                <div key={p.id} style={card}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                    <div style={{width:44,height:44,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,background:`${p.color}18`,border:`1px solid ${p.color}30`}}>{p.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontWeight:700,fontSize:15}}>{p.name}</span>
                        {val && <span style={{fontSize:10,color:C.green,background:`${C.green}18`,border:`1px solid ${C.green}30`,borderRadius:99,padding:"2px 9px",fontWeight:600}}>مربوط ✓</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{position:"relative"}}>
                    {p.prefix && (
                      <span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:13,fontFamily:"monospace",pointerEvents:"none"}}>{p.prefix}</span>
                    )}
                    <input
                      style={{...iStyle(fid), paddingRight: p.prefix ? 46 : 14, borderColor: focus===fid?C.accent:C.border, boxShadow: focus===fid?`0 0 0 3px ${C.accent}18`:"none"}}
                      placeholder={`معرّف ${p.name}`}
                      value={val}
                      onFocus={()=>setFocus(fid)}
                      onBlur={()=>setFocus("")}
                      onChange={e=>upP(p.id,e.target.value)} />
                  </div>
                  {p.note && (
                    <div style={{marginTop:10,display:"flex",gap:8,fontSize:11,color:"#D4A020",background:"rgba(212,160,32,0.08)",border:"1px solid rgba(212,160,32,0.2)",borderRadius:10,padding:"8px 12px",lineHeight:1.6}}>
                      <span style={{flexShrink:0}}>⚠️</span><span>{p.note}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </>}

          {/* ══ API KEYS ══ */}
          {sec==="api" && <>
            <p style={{fontSize:12,color:C.muted,marginBottom:14,lineHeight:1.7}}>مفاتيح API تمكّن النشر التلقائي والذكاء الاصطناعي. تُحفظ على جهازك فقط.</p>
            {API_FIELDS.map(f=>{
              const val  = data.api[f.id];
              const show = reveal[f.id];
              const fid  = `api_${f.id}`;
              return (
                <div key={f.id} style={card}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:15}}>{f.name}</div>
                      <div style={{fontSize:12,color:C.muted,marginTop:3}}>{f.desc}</div>
                    </div>
                    {val && <span style={{fontSize:10,color:C.green,background:`${C.green}18`,border:`1px solid ${C.green}30`,borderRadius:99,padding:"3px 9px",flexShrink:0,fontWeight:600}}>✓ مضاف</span>}
                  </div>
                  <div style={{position:"relative",marginBottom:10}}>
                    <input
                      type={show?"text":"password"}
                      style={{...iStyle(fid), paddingLeft:60, fontFamily:"monospace", fontSize:13, borderColor:focus===fid?C.accent:C.border, boxShadow:focus===fid?`0 0 0 3px ${C.accent}18`:"none"}}
                      placeholder={f.ph}
                      value={val}
                      onFocus={()=>setFocus(fid)}
                      onBlur={()=>setFocus("")}
                      onChange={e=>upA(f.id,e.target.value)} />
                    <button
                      onClick={()=>setReveal(r=>({...r,[f.id]:!r[f.id]}))}
                      style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"'Tajawal',system-ui",padding:0,fontWeight:500}}>
                      {show?"إخفاء":"إظهار"}
                    </button>
                  </div>
                  <div style={{fontSize:11,color:C.dim,fontFamily:"monospace",direction:"ltr",textAlign:"right"}}>📍 {f.where}</div>
                </div>
              );
            })}

            <div style={card}>
              <div style={{fontSize:13,fontWeight:700,color:C.muted,marginBottom:12}}>تنبيهات أمنية</div>
              {["لا تشارك مفاتيح API مع أحد أبداً","لا تضعها في واتساب أو مجموعات","إذا سرّب مفتاح — أعد إنشاؤه فوراً من الموقع"].map(n=>(
                <div key={n} style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:C.muted,marginBottom:9}}>
                  <span style={{color:C.accent,fontSize:16,flexShrink:0}}>›</span>{n}
                </div>
              ))}
            </div>
          </>}

          {/* ── Big save button ── */}
          <button onClick={save} disabled={status==="saving"}
            style={{
              width:"100%", padding:"16px", borderRadius:16,
              fontSize:16, fontWeight:700, border:"none", cursor:"pointer",
              fontFamily:"'Tajawal',system-ui,sans-serif",
              marginTop:4, marginBottom:8,
              background: status==="saved"
                ? "rgba(34,197,94,0.15)"
                : `linear-gradient(135deg, ${C.accent}, #E08820)`,
              color: status==="saved" ? C.green : "#0a0a0a",
              boxShadow: status==="saved" ? "none" : `0 6px 28px ${C.accent}45`,
              border: status==="saved" ? `1px solid ${C.green}40` : "none",
              transition:"all .2s",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            }}>
            <span style={{fontSize:20}}>
              {status==="saving"?"⏳":status==="saved"?"✅":"💾"}
            </span>
            {status==="saving"?"جاري الحفظ…":status==="saved"?"تم حفظ الإعدادات بنجاح":"حفظ الإعدادات"}
          </button>

          <p style={{textAlign:"center",color:C.dim,fontSize:11,paddingBottom:8}}>
            التبويب التالي ← المواد الخام
          </p>
        </div>
      </div>
    </div>
  );
}
