import { useState } from "react";
import { C, card, subHead, primaryBtn, ghostBtn } from "./theme";

export default function WebsitePage() {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/store`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(()=>setCopied(false), 1500); } catch { /* ignore */ }
  };

  return (
    <div style={{flex:1, overflowY:"auto", padding:"16px 14px 24px"}}>
      <div style={card}>
        <div style={subHead}>موقع متجرك العام</div>
        <p style={{fontSize:13, color:C.muted, marginBottom:14, lineHeight:1.8}}>
          هذا رابط صفحة متجرك العامة — يمكن لأي شخص زيارته بدون تسجيل دخول. شاركه مع زبائنك أو ضعه في الوصف على إنستغرام وفيسبوك.
        </p>
        <div style={{
          background:C.inp, border:`1px solid ${C.border}`, borderRadius:12,
          padding:"12px 14px", fontFamily:"monospace", fontSize:13, direction:"ltr",
          textAlign:"right", color:C.accent2, marginBottom:14, wordBreak:"break-all",
        }}>
          {url}
        </div>
        <div style={{display:"flex", gap:10}}>
          <button onClick={copy} style={{...primaryBtn, flex:1}}>{copied ? "تم النسخ ✓" : "📋 نسخ الرابط"}</button>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{...ghostBtn, textDecoration:"none", display:"flex", alignItems:"center"}}>↗️ فتح</a>
        </div>
      </div>

      <div style={card}>
        <div style={subHead}>كيف تتحكم بشكل الموقع؟</div>
        {[
          { icon: "🛍️", title: "الكتالوج", desc: "أضف منتجاتك من تبويب «الكتالوج» وفعّل «يظهر في الموقع» لكل منتج تريد عرضه." },
          { icon: "🎨", title: "المظهر", desc: "من تبويب «المظهر» أضف شعار المتجر، صورة الغلاف، اللون الأساسي، وروابط حساباتك على كل منصّة." },
          { icon: "⚙️", title: "الإعدادات", desc: "اسم المتجر، الشعار النصي (Tagline)، والوصف تُؤخذ من تبويب «الإعدادات» ← «هوية المشروع»." },
        ].map(s => (
          <div key={s.title} style={{display:"flex", gap:12, marginBottom:14, alignItems:"flex-start"}}>
            <div style={{fontSize:22, flexShrink:0}}>{s.icon}</div>
            <div>
              <div style={{fontWeight:700, fontSize:14, marginBottom:3}}>{s.title}</div>
              <div style={{fontSize:12, color:C.muted, lineHeight:1.7}}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={subHead}>معاينة</div>
        <div style={{borderRadius:12, overflow:"hidden", border:`1px solid ${C.border}`, height:480}}>
          <iframe src="/store" title="معاينة الموقع" style={{width:"100%", height:"100%", border:"none", background:C.bg}} />
        </div>
      </div>
    </div>
  );
}
