import { useState, useEffect } from "react";
import Login from "./Login";
import ChogaSettings from "./ChogaSettings";
import { checkAuth } from "./api";
import { C, fontImport } from "./theme";

export default function App() {
  const [authed, setAuthed] = useState(null); // null = checking

  useEffect(() => {
    checkAuth().then(setAuthed);
  }, []);

  if (authed === null) {
    return (
      <div dir="rtl" style={{
        fontFamily: "'Tajawal',system-ui,sans-serif", background: C.bg, color: C.muted,
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <style>{fontImport}</style>
        جاري التحميل…
      </div>
    );
  }

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <ChogaSettings onLogout={() => setAuthed(false)} />;
}
