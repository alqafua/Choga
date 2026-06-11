import { useState, useEffect } from "react";
import Login from "./Login";
import Layout from "./Layout";
import SettingsPage from "./SettingsPage";
import CustomersPage from "./CustomersPage";
import OrdersPage from "./OrdersPage";
import ComingSoon from "./ComingSoon";
import { checkAuth } from "./api";
import { C, fontImport } from "./theme";

const PAGES = {
  settings: SettingsPage,
  customers: CustomersPage,
  orders: OrdersPage,
};

export default function App() {
  const [authed, setAuthed] = useState(null); // null = checking
  const [activeNav, setActiveNav] = useState("settings");

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

  const Page = PAGES[activeNav] || ComingSoon;

  return (
    <Layout activeNav={activeNav} setActiveNav={setActiveNav} onLogout={() => setAuthed(false)}>
      <Page />
    </Layout>
  );
}
