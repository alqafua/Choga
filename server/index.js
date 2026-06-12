import express from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { makeStore } from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "choga-dev-secret-change-me";
const ADMIN_USER = process.env.ADMIN_USER || "Choga";
const ADMIN_PASS = process.env.ADMIN_PASS || "7007";

// On Railway, mount a Volume at this path (e.g. /data) and set DATA_DIR=/data
// so saved settings survive redeploys. Defaults to a local folder for dev.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "settings.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const customers = makeStore(DATA_DIR, "customers.json");
const orders = makeStore(DATA_DIR, "orders.json");

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || "";
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET || "";
const META_FILE = path.join(DATA_DIR, "meta-connection.json");
const IG_GRAPH = "https://graph.instagram.com";
const IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
  "instagram_business_content_publish",
].join(",");

function readMetaConnection() {
  try {
    return JSON.parse(fs.readFileSync(META_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function writeMetaConnection(data) {
  fs.writeFileSync(META_FILE, JSON.stringify(data, null, 2));
}

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

function getToken(req) {
  if (req.cookies?.token) return req.cookies.token;
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: "unauthorized" });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ user: username }, JWT_SECRET, { expiresIn: "30d" });
    res.cookie("token", token, cookieOpts);
    return res.json({ ok: true, token });
  }
  res.status(401).json({ error: "invalid credentials" });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

app.get("/api/me", requireAuth, (req, res) => res.json({ ok: true }));

app.get("/api/settings", requireAuth, (req, res) => {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    res.json(JSON.parse(raw));
  } catch {
    res.json({});
  }
});

app.post("/api/settings", requireAuth, (req, res) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(req.body ?? {}, null, 2));
  res.json({ ok: true });
});

// ── customers ─────────────────────────────────────────────────
app.get("/api/customers", requireAuth, (req, res) => {
  res.json(customers.list());
});

app.post("/api/customers", requireAuth, (req, res) => {
  res.status(201).json(customers.create(req.body ?? {}));
});

app.put("/api/customers/:id", requireAuth, (req, res) => {
  const updated = customers.update(req.params.id, req.body ?? {});
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});

app.delete("/api/customers/:id", requireAuth, (req, res) => {
  if (!customers.remove(req.params.id)) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// ── orders ───────────────────────────────────────────────────
app.get("/api/orders", requireAuth, (req, res) => {
  res.json(orders.list());
});

app.post("/api/orders", requireAuth, (req, res) => {
  res.status(201).json(orders.create(req.body ?? {}));
});

app.put("/api/orders/:id", requireAuth, (req, res) => {
  const updated = orders.update(req.params.id, req.body ?? {});
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});

app.delete("/api/orders/:id", requireAuth, (req, res) => {
  if (!orders.remove(req.params.id)) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// ── instagram (business login) connection ──────────────────────
app.get("/api/meta/status", requireAuth, (req, res) => {
  const conn = readMetaConnection();
  res.json({
    configured: !!(INSTAGRAM_APP_ID && INSTAGRAM_APP_SECRET),
    connected: !!conn,
    igUsername: conn?.igUsername || null,
    connectedAt: conn?.connectedAt || null,
  });
});

app.get("/api/meta/connect", requireAuth, (req, res) => {
  if (!INSTAGRAM_APP_ID) return res.status(500).send("INSTAGRAM_APP_ID is not configured");
  const redirectUri = `${req.protocol}://${req.get("host")}/api/meta/callback`;
  const url = `https://www.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(IG_SCOPES)}&response_type=code`;
  res.redirect(url);
});

app.get("/api/meta/callback", async (req, res) => {
  const token = getToken(req);
  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    return res.redirect("/?meta=error");
  }

  const { code, error } = req.query;
  if (error || !code) return res.redirect("/?meta=error");

  const redirectUri = `${req.protocol}://${req.get("host")}/api/meta/callback`;

  try {
    const form = new URLSearchParams({
      client_id: INSTAGRAM_APP_ID,
      client_secret: INSTAGRAM_APP_SECRET,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code: String(code),
    });
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body: form,
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("token exchange failed");

    const longRes = await fetch(
      `${IG_GRAPH}/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${tokenData.access_token}`
    );
    const longData = await longRes.json();
    const accessToken = longData.access_token || tokenData.access_token;

    const meRes = await fetch(`${IG_GRAPH}/v21.0/me?fields=user_id,username&access_token=${accessToken}`);
    const meData = await meRes.json();

    writeMetaConnection({
      igUserId: meData.user_id || tokenData.user_id || null,
      igUsername: meData.username || null,
      accessToken,
      connectedAt: new Date().toISOString(),
    });

    res.redirect("/?meta=connected");
  } catch (err) {
    console.error("instagram oauth error:", err);
    res.redirect("/?meta=error");
  }
});

app.post("/api/meta/disconnect", requireAuth, (req, res) => {
  if (fs.existsSync(META_FILE)) fs.unlinkSync(META_FILE);
  res.json({ ok: true });
});

// ── serve the built frontend ─────────────────────────────────
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Choga server running on port ${PORT}`);
});
