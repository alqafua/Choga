import { useState } from "react";
import { C, inpBase, fontImport } from "./theme";
import { login } from "./api";

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focus, setFocus] = useState("");

  const iStyle = (id) => ({
    ...inpBase,
    borderColor: focus === id ? C.accent : C.border,
    boxShadow: focus === id ? `0 0 0 3px ${C.accent}18` : "none",
  });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      onSuccess();
    } catch {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" style={{
      fontFamily: "'Tajawal',system-ui,sans-serif", background: C.bg, color: C.text,
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <style>{fontImport}</style>

      <form onSubmit={submit} style={{
        width: "100%", maxWidth: 360, background: C.card, borderRadius: 18,
        border: `1px solid ${C.border}`, padding: "28px 22px",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: `${C.accent}22`,
            border: `1px solid ${C.accent}40`, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 26, marginBottom: 12,
          }}>🍫</div>
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "0.05em" }}>CHOGA</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>تسجيل الدخول إلى مركز المحتوى</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 7, fontWeight: 500 }}>
            اسم المستخدم
          </label>
          <input
            style={iStyle("user")}
            value={username}
            autoFocus
            onFocus={() => setFocus("user")}
            onBlur={() => setFocus("")}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="اسم المستخدم"
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 7, fontWeight: 500 }}>
            كلمة المرور
          </label>
          <input
            type="password"
            style={iStyle("pass")}
            value={password}
            onFocus={() => setFocus("pass")}
            onBlur={() => setFocus("")}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div style={{
            marginBottom: 14, fontSize: 12, color: C.red, background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "8px 12px",
            textAlign: "center",
          }}>{error}</div>
        )}

        <button type="submit" disabled={loading} style={{
          width: "100%", padding: "14px", borderRadius: 14, fontSize: 15, fontWeight: 700,
          border: "none", cursor: loading ? "default" : "pointer",
          fontFamily: "'Tajawal',system-ui,sans-serif",
          background: `linear-gradient(135deg, ${C.accent}, #E08820)`,
          color: "#0a0a0a", boxShadow: `0 6px 28px ${C.accent}45`,
          opacity: loading ? 0.7 : 1, transition: "all .2s",
        }}>
          {loading ? "جاري الدخول…" : "دخول"}
        </button>
      </form>
    </div>
  );
}
