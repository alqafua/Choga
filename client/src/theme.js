// ─── shared palette ────────────────────────────────────────
export const C = {
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
  red:     "#ef4444",
  blue:    "#4A90D9",
  purple:  "#A78BFA",
};

export const inpBase = {
  width: "100%", background: C.inp, border: `1px solid ${C.border}`,
  borderRadius: 12, padding: "12px 14px", color: C.text,
  fontSize: 14, outline: "none", fontFamily: "'Tajawal',system-ui,sans-serif",
  transition: "border-color .2s", boxSizing: "border-box",
};

export const fontImport = `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{width:3px;height:3px}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
  input::placeholder,textarea::placeholder{color:${C.dim}}
  input,textarea{font-family:'Tajawal',system-ui,sans-serif}
`;

// ─── shared layout / form pieces ──────────────────────────────
export const card = {
  background: C.card, borderRadius: 18,
  border: `1px solid ${C.border}`,
  padding: "18px 16px", marginBottom: 12,
};

export const lbl = {
  display: "block", fontSize: 11, color: C.muted,
  marginBottom: 7, fontWeight: 500,
};

export const subHead = {
  fontSize: 12, fontWeight: 700, color: C.muted,
  textTransform: "uppercase", letterSpacing: "0.12em",
  paddingBottom: 12, marginBottom: 14,
  borderBottom: `1px solid ${C.border}`,
};

export const fieldStyle = (focus, id) => ({
  ...inpBase,
  borderColor: focus === id ? C.accent : C.border,
  boxShadow:   focus === id ? `0 0 0 3px ${C.accent}18` : "none",
});

export const chipStyle = (on) => ({
  padding: "8px 14px", borderRadius: 10, fontSize: 13,
  border: `1px solid ${on ? C.accent : C.border}`,
  background: on ? `${C.accent}22` : "transparent",
  color: on ? C.accent2 : C.muted,
  cursor: "pointer", fontFamily: "'Tajawal',system-ui,sans-serif",
  fontWeight: on ? 600 : 400, transition: "all .15s",
});

export const statusChipStyle = (on, color) => ({
  padding: "8px 14px", borderRadius: 10, fontSize: 13,
  border: `1px solid ${on ? color : C.border}`,
  background: on ? `${color}22` : "transparent",
  color: on ? color : C.muted,
  cursor: "pointer", fontFamily: "'Tajawal',system-ui,sans-serif",
  fontWeight: on ? 600 : 400, transition: "all .15s",
});

export const primaryBtn = {
  padding: "11px 18px", borderRadius: 12, fontSize: 13, fontWeight: 700,
  border: "none", cursor: "pointer", fontFamily: "'Tajawal',system-ui,sans-serif",
  background: `linear-gradient(135deg, ${C.accent}, #E08820)`, color: "#0a0a0a",
};

export const ghostBtn = {
  padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600,
  border: `1px solid ${C.border}`, background: "transparent", color: C.muted,
  cursor: "pointer", fontFamily: "'Tajawal',system-ui,sans-serif",
};

export const dangerBtn = {
  padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600,
  border: `1px solid ${C.red}40`, background: `${C.red}15`, color: C.red,
  cursor: "pointer", fontFamily: "'Tajawal',system-ui,sans-serif",
};

// ─── orders ────────────────────────────────────────────────
export const ORDER_STATUSES = [
  { id: "new",        label: "جديدة",         color: C.blue },
  { id: "processing", label: "قيد التجهيز",   color: C.accent },
  { id: "ready",      label: "جاهزة للتسليم", color: C.purple },
  { id: "delivered",  label: "تم التسليم",    color: C.green },
  { id: "cancelled",  label: "ملغية",         color: C.red },
];

export const statusInfo = (id) => ORDER_STATUSES.find((s) => s.id === id) || ORDER_STATUSES[0];

// ─── content / social platforms ───────────────────────────────
export const OCCASIONS = ["أعراس","عيد الفطر","عيد الأضحى","رمضان","أعياد ميلاد","تخرج","عيد الأم","خطوبة"];

export const PLATFORMS = [
  { id:"instagram", name:"إنستغرام",  color:"#E1306C", icon:"📸" },
  { id:"facebook",  name:"فيسبوك",    color:"#4A90D9", icon:"📘" },
  { id:"snapchat",  name:"سناب شات", color:"#F5D020", icon:"👻" },
  { id:"tiktok",    name:"تيك توك",   color:"#69C9D0", icon:"🎵" },
  { id:"youtube",   name:"يوتيوب",   color:"#FF0000", icon:"▶️" },
  { id:"whatsapp",  name:"واتساب",    color:"#25D366", icon:"💬" },
];

export const platformInfo = (id) => PLATFORMS.find((p) => p.id === id) || PLATFORMS[0];

export const CONTENT_STATUSES = [
  { id: "draft",     label: "مسودة",         color: C.muted },
  { id: "review",    label: "قيد المراجعة",   color: C.purple },
  { id: "ready",     label: "جاهز للنشر",     color: C.accent },
  { id: "published", label: "تم النشر",       color: C.green },
];

export const contentStatusInfo = (id) => CONTENT_STATUSES.find((s) => s.id === id) || CONTENT_STATUSES[0];

export const CONTENT_TYPES = ["منشور", "ستوري", "ريل", "إعلان"];

// ─── assets (raw materials library) ────────────────────────────
export const ASSET_TYPES = [
  { id: "image",   label: "صورة",       icon: "🖼️", color: C.blue },
  { id: "hashtag", label: "هاشتاقات",   icon: "#️⃣", color: C.purple },
  { id: "snippet", label: "نص جاهز",    icon: "📝", color: C.accent },
  { id: "link",    label: "رابط",       icon: "🔗", color: C.green },
];
export const assetTypeInfo = (id) => ASSET_TYPES.find((t) => t.id === id) || ASSET_TYPES[0];

// ─── research (ideas board) ────────────────────────────────────
export const IDEA_STATUSES = [
  { id: "idea",     label: "فكرة",      color: C.muted },
  { id: "using",    label: "قيد الاستخدام", color: C.accent },
  { id: "archived", label: "مؤرشفة",    color: C.dim },
];
export const ideaStatusInfo = (id) => IDEA_STATUSES.find((s) => s.id === id) || IDEA_STATUSES[0];

// ─── replies (saved quick replies) ─────────────────────────────
export const REPLY_CATEGORIES = ["الأسعار", "التوصيل", "الطلب", "المواعيد", "عام"];
