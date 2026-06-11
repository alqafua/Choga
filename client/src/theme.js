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
