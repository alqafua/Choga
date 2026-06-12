export const NAV = [
  { id:"assets",    label:"المواد",     icon:"📁" },
  { id:"research",  label:"البحث",      icon:"🔍" },
  { id:"plan",      label:"الخطة",      icon:"📅" },
  { id:"creator",   label:"المحتوى",   icon:"✨" },
  { id:"review",    label:"المراجعة",   icon:"✅" },
  { id:"publish",   label:"النشر",      icon:"🚀" },
  { id:"inbox",     label:"الردود",     icon:"💬" },
  { id:"analytics", label:"التحليل",    icon:"📊" },
  { id:"customers", label:"العملاء",    icon:"👥" },
  { id:"orders",    label:"الطلبيات",   icon:"🧾" },
  { id:"settings",  label:"الإعدادات", icon:"⚙️" },
];

export const READY_NAV = new Set(["customers", "orders", "settings", "analytics", "plan", "creator", "review", "publish"]);
