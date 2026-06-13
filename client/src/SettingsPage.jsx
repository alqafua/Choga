import { useState, useEffect } from "react";
import { C, card, lbl, subHead, fieldStyle, chipStyle, primaryBtn, dangerBtn, OCCASIONS } from "./theme";
import { getSettings, saveSettings, getMetaStatus, connectMetaToken, disconnectMeta, getTikTokStatus, disconnectTikTok, getYouTubeStatus, disconnectYouTube } from "./api";

const TONES     = ["راقٍ وودّي","احترافي","حماسي","عاطفي","بسيط وصريح"];
const TRAITS    = ["فاخر","حرفي","دافئ","مناسباتي","ودّي","مبدع","موثوق","أنيق"];

const PLATFORMS = [
  { id:"instagram", name:"إنستغرام",  color:"#E1306C", icon:"📸", prefix:"@",    note:null },
  { id:"facebook",  name:"فيسبوك",    color:"#4A90D9", icon:"📘", prefix:"",     note:null },
  { id:"snapchat",  name:"سناب شات", color:"#F5D020", icon:"👻", prefix:"@",    note:"النشر يدوي فقط — لا يوجد API رسمي" },
  { id:"tiktok",    name:"تيك توك",   color:"#69C9D0", icon:"🎵", prefix:"@",    note:"يحتاج موافقة من المنصّة" },
  { id:"youtube",   name:"يوتيوب",   color:"#FF0000", icon:"▶️", prefix:"@",    note:null },
  { id:"whatsapp",  name:"واتساب",    color:"#25D366", icon:"💬", prefix:"+967", note:null },
];

const API_FIELDS = [
  { id:"anthropic",          name:"Anthropic Claude",        desc:"الذكاء الاصطناعي — صناعة المحتوى",        where:"console.anthropic.com  ←  API Keys",       ph:"sk-ant-api03-..." },
  { id:"tiktokClientKey",    name:"TikTok — Client Key",     desc:"النشر على تيك توك (المعرّف)",            where:"developers.tiktok.com  ←  Apps  ←  Keys", ph:"aw_xxxxxxxxxxxxxxxxxxxx" },
  { id:"tiktokClientSecret", name:"TikTok — Client Secret",  desc:"النشر على تيك توك (الرمز السري)",        where:"developers.tiktok.com  ←  Apps  ←  Keys", ph:"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
  { id:"youtubeClientId",     name:"YouTube — Client ID",     desc:"النشر على يوتيوب شورتس (المعرّف)",       where:"console.cloud.google.com  ←  Credentials", ph:"xxxxxxxxxxxx.apps.googleusercontent.com" },
  { id:"youtubeClientSecret", name:"YouTube — Client Secret", desc:"النشر على يوتيوب شورتس (الرمز السري)",   where:"console.cloud.google.com  ←  Credentials", ph:"GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx" },
];

const TIKTOK_GUIDE_STEPS = [
  "افتح الرابط أدناه وسجّل دخول بحساب تيك توك الخاص بالمحل",
  "اضغط \"Manage apps\" ← \"Create an app\"",
  "من إعدادات التطبيق فعّل صلاحية \"Content Posting API\"",
  "انسخ Client Key و Client Secret من صفحة التطبيق وألصقهما في الحقلين أعلاه ثم احفظ الإعدادات",
  "من حقل \"Redirect URI\" في إعدادات التطبيق، أضف الرابط الموضّح في تبويب «الحسابات» تحت بطاقة «ربط تيك توك»",
  "رجوعاً لتبويب «الحسابات» — اضغط «ربط تيك توك» لإكمال الربط عبر تسجيل الدخول",
];

const YOUTUBE_GUIDE_STEPS = [
  "افتح الرابط أدناه وسجّل دخول بحساب Google الخاص بالمحل، وأنشئ مشروع جديد إن لم يوجد",
  "من القائمة الجانبية: \"APIs & Services\" ← \"Library\" — فعّل \"YouTube Data API v3\"",
  "من \"APIs & Services\" ← \"Credentials\" ← \"Create Credentials\" ← \"OAuth client ID\" (نوع التطبيق: Web application)",
  "في \"Authorized redirect URIs\" أضف الرابط الموضّح في تبويب «الحسابات» تحت بطاقة «ربط يوتيوب»",
  "انسخ Client ID و Client Secret وألصقهما في الحقلين أعلاه ثم احفظ الإعدادات",
  "رجوعاً لتبويب «الحسابات» — اضغط «ربط يوتيوب» لإكمال الربط عبر تسجيل الدخول",
];

const API_GUIDES = {
  anthropic: {
    url: "https://console.anthropic.com/settings/keys",
    steps: [
      "افتح الرابط أدناه وسجّل دخول أو أنشئ حساب جديد",
      "من القائمة الجانبية اضغط \"API Keys\"",
      "اضغط \"Create Key\" وأعطه اسم مثل \"Choga\"",
      "انسخ المفتاح فوراً (يبدأ بـ sk-ant-...) — لن يظهر مرة ثانية",
      "الصقه بالخانة أعلاه ثم اضغط \"حفظ الإعدادات\" بالأسفل",
    ],
  },
  tiktokClientKey:    { url: "https://developers.tiktok.com/apps", steps: TIKTOK_GUIDE_STEPS },
  tiktokClientSecret: { url: "https://developers.tiktok.com/apps", steps: TIKTOK_GUIDE_STEPS },
  youtubeClientId:     { url: "https://console.cloud.google.com/apis/credentials", steps: YOUTUBE_GUIDE_STEPS },
  youtubeClientSecret: { url: "https://console.cloud.google.com/apis/credentials", steps: YOUTUBE_GUIDE_STEPS },
};

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
  platforms:{ instagram:"choga.yo", facebook:"CHOGA", snapchat:"", tiktok:"", youtube:"", whatsapp:"" },
  api:{ anthropic:"", tiktokClientKey:"", tiktokClientSecret:"", youtubeClientId:"", youtubeClientSecret:"" },
};

export default function SettingsPage() {
  const [sec,    setSec]    = useState("identity");
  const [data,   setData]   = useState(DEF);
  const [reveal, setReveal] = useState({});
  const [guideOpen, setGuideOpen] = useState({});
  const [focus,  setFocus]  = useState("");
  const [status, setStatus] = useState("idle");
  const [meta,    setMeta]    = useState(null);
  const [metaMsg] = useState(() => {
    const result = new URLSearchParams(window.location.search).get("meta");
    if (result === "connected") return "تم ربط إنستغرام بنجاح ✅";
    if (result === "error") return "تعذّر الربط — حاول مجدداً";
    return "";
  });

  const [tiktok,    setTiktok]    = useState(null);
  const [tiktokMsg] = useState(() => {
    const result = new URLSearchParams(window.location.search).get("tiktok");
    if (result === "connected") return "تم ربط تيك توك بنجاح ✅";
    if (result === "error") return "تعذّر الربط — حاول مجدداً";
    return "";
  });

  const [youtube,    setYoutube]    = useState(null);
  const [youtubeMsg] = useState(() => {
    const result = new URLSearchParams(window.location.search).get("youtube");
    if (result === "connected") return "تم ربط يوتيوب بنجاح ✅";
    if (result === "error") return "تعذّر الربط — حاول مجدداً";
    return "";
  });

  useEffect(()=>{
    (async()=>{
      try {
        const remote = await getSettings();
        if(remote && Object.keys(remote).length) setData(d=>({...d,...remote}));
      } catch {
        // not logged in / settings not available yet — keep defaults
      }
    })();
  },[]);

  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    if (params.has("meta") || params.has("tiktok") || params.has("youtube")) {
      params.delete("meta");
      params.delete("tiktok");
      params.delete("youtube");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
    (async()=>{
      try {
        setMeta(await getMetaStatus());
      } catch {
        setMeta({ configured:false, connected:false });
      }
    })();
    (async()=>{
      try {
        setTiktok(await getTikTokStatus());
      } catch {
        setTiktok({ configured:false, connected:false });
      }
    })();
    (async()=>{
      try {
        setYoutube(await getYouTubeStatus());
      } catch {
        setYoutube({ configured:false, connected:false });
      }
    })();
  },[]);

  const [metaToken, setMetaToken] = useState("");
  const [metaConnecting, setMetaConnecting] = useState(false);
  const [metaTokenMsg, setMetaTokenMsg] = useState("");

  const handleMetaDisconnect = async () => {
    if (!window.confirm("هل تريد إلغاء ربط إنستغرام؟")) return;
    await disconnectMeta();
    setMeta(await getMetaStatus());
  };

  const handleTikTokDisconnect = async () => {
    if (!window.confirm("هل تريد إلغاء ربط تيك توك؟")) return;
    await disconnectTikTok();
    setTiktok(await getTikTokStatus());
  };

  const handleYouTubeDisconnect = async () => {
    if (!window.confirm("هل تريد إلغاء ربط يوتيوب؟")) return;
    await disconnectYouTube();
    setYoutube(await getYouTubeStatus());
  };

  const handleMetaTokenConnect = async () => {
    if (!metaToken.trim()) return;
    setMetaConnecting(true);
    setMetaTokenMsg("");
    try {
      const res = await connectMetaToken(metaToken.trim());
      if (res.ok) {
        setMetaToken("");
        setMetaTokenMsg("");
        setMeta(await getMetaStatus());
      } else {
        setMetaTokenMsg("الرمز غير صحيح أو منتهي — تأكد من نسخه كاملاً");
      }
    } catch {
      setMetaTokenMsg("تعذّر التحقق من الرمز — حاول مجدداً");
    }
    setMetaConnecting(false);
  };

  const up  = (k,v) => setData(d=>({...d,[k]:v}));
  const upP = (k,v) => setData(d=>({...d,platforms:{...d.platforms,[k]:v}}));
  const upA = (k,v) => setData(d=>({...d,api:{...d.api,[k]:v}}));
  const tog = (arr,x) => arr.includes(x)?arr.filter(i=>i!==x):[...arr,x];

  const save = async () => {
    setStatus("saving");
    try {
      await saveSettings(data);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
    setTimeout(()=>setStatus("idle"), 2500);
  };

  const iStyle = (id) => fieldStyle(focus, id);
  const chip = chipStyle;

  const idDone  = !!(data.name && data.type);
  const accDone = Object.values(data.platforms).some(Boolean);
  const apiDone = !!(data.api.anthropic);

  const SECS = [
    {id:"identity", label:"هوية المشروع", done:idDone},
    {id:"accounts", label:"الحسابات",      done:accDone},
    {id:"api",      label:"مفاتيح API",    done:apiDone},
  ];

  return (
    <>
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
          <div style={card}>
            <div style={subHead}>ربط إنستغرام</div>
            {metaMsg && (
              <div style={{fontSize:12, color: metaMsg.includes("نجاح") ? C.green : C.red, marginBottom:10, lineHeight:1.7}}>{metaMsg}</div>
            )}
            {meta?.connected ? (
              <>
                <div style={{fontSize:13,marginBottom:12,lineHeight:1.8}}>
                  <span style={{color:C.green,fontWeight:700}}>متصل ✓</span>
                  {meta.igUsername && <> — إنستغرام: <strong>@{meta.igUsername}</strong></>}
                  {meta.fbPageName && <> — فيسبوك: <strong>{meta.fbPageName}</strong></>}
                </div>
                <button type="button" onClick={handleMetaDisconnect} style={dangerBtn}>إلغاء الربط</button>
              </>
            ) : (
              <>
                <p style={{fontSize:12,color:C.muted,marginBottom:12,lineHeight:1.7}}>
                  الصق رمز الوصول (Access Token) الذي تُنشئه من لوحة ميتا:
                  <br/>منتج Instagram ← القسم 2 «إنشاء رمز الوصول» ← أضف حساب ← سجّل دخولك ← انسخ الرمز.
                </p>
                <textarea
                  value={metaToken}
                  onChange={e=>setMetaToken(e.target.value)}
                  placeholder="IGQV...الصق الرمز هنا"
                  style={{...fieldStyle(focus,"metatoken"), resize:"none", height:72, fontFamily:"monospace", fontSize:12, lineHeight:1.5, marginBottom:10}}
                  onFocus={()=>setFocus("metatoken")}
                  onBlur={()=>setFocus("")}
                />
                {metaTokenMsg && (
                  <div style={{fontSize:12, color:C.red, marginBottom:10, lineHeight:1.7}}>{metaTokenMsg}</div>
                )}
                <button type="button" onClick={handleMetaTokenConnect} disabled={metaConnecting || !metaToken.trim()}
                  style={{...primaryBtn, opacity: (metaConnecting || !metaToken.trim()) ? 0.5 : 1}}>
                  {metaConnecting ? "جارٍ الربط…" : "ربط إنستغرام"}
                </button>
                {meta?.configured && (
                  <div style={{marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}`}}>
                    <p style={{fontSize:11,color:C.dim,marginBottom:8,lineHeight:1.7}}>أو اربط مباشرة عبر تسجيل الدخول (يحتاج إعداد رابط إعادة التوجيه):</p>
                    <a href="/api/meta/connect" style={{...primaryBtn, display:"inline-block", textDecoration:"none", background:"transparent", border:`1px solid ${C.accent}`, color:C.accent}}>ربط عبر تسجيل الدخول</a>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={card}>
            <div style={subHead}>ربط تيك توك</div>
            {tiktokMsg && (
              <div style={{fontSize:12, color: tiktokMsg.includes("نجاح") ? C.green : C.red, marginBottom:10, lineHeight:1.7}}>{tiktokMsg}</div>
            )}
            {tiktok?.connected ? (
              <>
                <div style={{fontSize:13,marginBottom:12,lineHeight:1.8}}>
                  <span style={{color:C.green,fontWeight:700}}>متصل ✓</span>
                  {tiktok.displayName && <> — <strong>{tiktok.displayName}</strong></>}
                </div>
                <div style={{marginBottom:12,display:"flex",gap:8,fontSize:11,color:"#D4A020",background:"rgba(212,160,32,0.08)",border:"1px solid rgba(212,160,32,0.2)",borderRadius:10,padding:"8px 12px",lineHeight:1.6}}>
                  <span style={{flexShrink:0}}>⚠️</span><span>المنشورات ستكون خاصة (تظهر لك فقط) حتى تتم مراجعة تطبيقك من تيك توك والسماح بالنشر العام.</span>
                </div>
                <button type="button" onClick={handleTikTokDisconnect} style={dangerBtn}>إلغاء الربط</button>
              </>
            ) : (
              <>
                <p style={{fontSize:12,color:C.muted,marginBottom:12,lineHeight:1.7}}>
                  أضف Client Key و Client Secret من تبويب <strong>مفاتيح API</strong> واحفظهما، ثم سجّل رابط إعادة التوجيه التالي في إعدادات تطبيق تيك توك (Redirect URI):
                </p>
                <div style={{fontSize:11,color:C.dim,fontFamily:"monospace",direction:"ltr",textAlign:"right",background:C.inp,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:12,wordBreak:"break-all"}}>
                  {`${window.location.origin}/api/tiktok/callback`}
                </div>
                {tiktok?.configured ? (
                  <a href="/api/tiktok/connect" style={{...primaryBtn, display:"inline-block", textDecoration:"none", textAlign:"center"}}>ربط تيك توك</a>
                ) : (
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>أكمل وحفظ مفتاحي API أعلاه أولاً لتفعيل الربط</div>
                )}
              </>
            )}
          </div>

          <div style={card}>
            <div style={subHead}>ربط يوتيوب</div>
            {youtubeMsg && (
              <div style={{fontSize:12, color: youtubeMsg.includes("نجاح") ? C.green : C.red, marginBottom:10, lineHeight:1.7}}>{youtubeMsg}</div>
            )}
            {youtube?.connected ? (
              <>
                <div style={{fontSize:13,marginBottom:12,lineHeight:1.8}}>
                  <span style={{color:C.green,fontWeight:700}}>متصل ✓</span>
                  {youtube.channelTitle && <> — <strong>{youtube.channelTitle}</strong></>}
                </div>
                <div style={{marginBottom:12,display:"flex",gap:8,fontSize:11,color:"#D4A020",background:"rgba(212,160,32,0.08)",border:"1px solid rgba(212,160,32,0.2)",borderRadius:10,padding:"8px 12px",lineHeight:1.6}}>
                  <span style={{flexShrink:0}}>⚠️</span><span>النشر يحتاج رابط فيديو (mp4) لكل منشور — أضفه من تبويب التخطيط لتفعيل النشر التلقائي على يوتيوب شورتس.</span>
                </div>
                <button type="button" onClick={handleYouTubeDisconnect} style={dangerBtn}>إلغاء الربط</button>
              </>
            ) : (
              <>
                <p style={{fontSize:12,color:C.muted,marginBottom:12,lineHeight:1.7}}>
                  أضف Client ID و Client Secret من تبويب <strong>مفاتيح API</strong> واحفظهما، ثم سجّل رابط إعادة التوجيه التالي في إعدادات تطبيق Google (Authorized redirect URI):
                </p>
                <div style={{fontSize:11,color:C.dim,fontFamily:"monospace",direction:"ltr",textAlign:"right",background:C.inp,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:12,wordBreak:"break-all"}}>
                  {`${window.location.origin}/api/youtube/callback`}
                </div>
                {youtube?.configured ? (
                  <a href="/api/youtube/connect" style={{...primaryBtn, display:"inline-block", textDecoration:"none", textAlign:"center"}}>ربط يوتيوب</a>
                ) : (
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>أكمل وحفظ مفتاحي API أعلاه أولاً لتفعيل الربط</div>
                )}
              </>
            )}
          </div>

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
                    style={{...iStyle(fid), paddingRight: p.prefix ? 46 : 14}}
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
          <p style={{fontSize:12,color:C.muted,marginBottom:14,lineHeight:1.7}}>مفاتيح API تمكّن النشر التلقائي والذكاء الاصطناعي. تُحفظ على الخادم الخاص بك فقط.</p>
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
                    style={{...iStyle(fid), paddingLeft:60, fontFamily:"monospace", fontSize:13}}
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

                <button
                  type="button"
                  onClick={()=>setGuideOpen(g=>({...g,[f.id]:!g[f.id]}))}
                  style={{marginTop:10, background:"none", border:"none", padding:0, cursor:"pointer", fontSize:12, fontWeight:600, color:C.accent2, fontFamily:"'Tajawal',system-ui,sans-serif"}}>
                  {guideOpen[f.id] ? "إخفاء خطوات الحصول على المفتاح ▴" : "كيف أحصل على هذا المفتاح؟ ▾"}
                </button>

                {guideOpen[f.id] && (
                  <div style={{marginTop:10, background:C.inp, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px"}}>
                    <ol style={{margin:0, paddingRight:18, display:"flex", flexDirection:"column", gap:6}}>
                      {API_GUIDES[f.id].steps.map((s,i)=>(
                        <li key={i} style={{fontSize:12, color:C.muted, lineHeight:1.7}}>{s}</li>
                      ))}
                    </ol>
                    <a href={API_GUIDES[f.id].url} target="_blank" rel="noopener noreferrer"
                       style={{display:"inline-block", marginTop:10, fontSize:11, color:C.accent, direction:"ltr", textDecoration:"none", fontFamily:"monospace"}}>
                      🔗 {API_GUIDES[f.id].url}
                    </a>
                  </div>
                )}
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
            fontSize:16, fontWeight:700, cursor:"pointer",
            fontFamily:"'Tajawal',system-ui,sans-serif",
            marginTop:4, marginBottom:8,
            background: status==="saved"
              ? "rgba(34,197,94,0.15)"
              : status==="error"
              ? "rgba(239,68,68,0.15)"
              : `linear-gradient(135deg, ${C.accent}, #E08820)`,
            color: status==="saved" ? C.green : status==="error" ? C.red : "#0a0a0a",
            boxShadow: status==="saved"||status==="error" ? "none" : `0 6px 28px ${C.accent}45`,
            border: status==="saved" ? `1px solid ${C.green}40` : status==="error" ? `1px solid ${C.red}40` : "none",
            transition:"all .2s",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          }}>
          <span style={{fontSize:20}}>
            {status==="saving"?"⏳":status==="saved"?"✅":status==="error"?"⚠️":"💾"}
          </span>
          {status==="saving"?"جاري الحفظ…":status==="saved"?"تم حفظ الإعدادات بنجاح":status==="error"?"تعذّر الحفظ — حاول مجدداً":"حفظ الإعدادات"}
        </button>

        <p style={{textAlign:"center",color:C.dim,fontSize:11,paddingBottom:8}}>
          التبويب التالي ← المواد الخام
        </p>
      </div>
    </>
  );
}
