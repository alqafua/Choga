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
const content = makeStore(DATA_DIR, "content.json");
const assets = makeStore(DATA_DIR, "assets.json");
const research = makeStore(DATA_DIR, "research.json");
const replies = makeStore(DATA_DIR, "replies.json");
const catalog = makeStore(DATA_DIR, "catalog.json");

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

// ── content plan (calendar / creator / review / publish) ────────
app.get("/api/content", requireAuth, (req, res) => {
  res.json(content.list());
});

app.post("/api/content", requireAuth, (req, res) => {
  res.status(201).json(content.create(req.body ?? {}));
});

app.put("/api/content/:id", requireAuth, (req, res) => {
  const updated = content.update(req.params.id, req.body ?? {});
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});

app.delete("/api/content/:id", requireAuth, (req, res) => {
  if (!content.remove(req.params.id)) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// ── assets (raw materials / reusable library) ──────────────────
app.get("/api/assets", requireAuth, (req, res) => res.json(assets.list()));
app.post("/api/assets", requireAuth, (req, res) => res.status(201).json(assets.create(req.body ?? {})));
app.put("/api/assets/:id", requireAuth, (req, res) => {
  const updated = assets.update(req.params.id, req.body ?? {});
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});
app.delete("/api/assets/:id", requireAuth, (req, res) => {
  if (!assets.remove(req.params.id)) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// ── research (ideas board) ─────────────────────────────────────
app.get("/api/research", requireAuth, (req, res) => res.json(research.list()));
app.post("/api/research", requireAuth, (req, res) => res.status(201).json(research.create(req.body ?? {})));
app.put("/api/research/:id", requireAuth, (req, res) => {
  const updated = research.update(req.params.id, req.body ?? {});
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});
app.delete("/api/research/:id", requireAuth, (req, res) => {
  if (!research.remove(req.params.id)) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// ── replies (saved quick replies) ──────────────────────────────
app.get("/api/replies", requireAuth, (req, res) => res.json(replies.list()));
app.post("/api/replies", requireAuth, (req, res) => res.status(201).json(replies.create(req.body ?? {})));
app.put("/api/replies/:id", requireAuth, (req, res) => {
  const updated = replies.update(req.params.id, req.body ?? {});
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});
app.delete("/api/replies/:id", requireAuth, (req, res) => {
  if (!replies.remove(req.params.id)) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// ── catalog (products shown on the public storefront) ──────────
app.get("/api/catalog", requireAuth, (req, res) => res.json(catalog.list()));
app.post("/api/catalog", requireAuth, (req, res) => res.status(201).json(catalog.create(req.body ?? {})));
app.put("/api/catalog/:id", requireAuth, (req, res) => {
  const updated = catalog.update(req.params.id, req.body ?? {});
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});
app.delete("/api/catalog/:id", requireAuth, (req, res) => {
  if (!catalog.remove(req.params.id)) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// ── AI helpers (Anthropic) ─────────────────────────────────────
function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function buildBrandContext(settings) {
  return [
    `اسم المتجر: ${settings.nameAr || settings.name || "—"}`,
    settings.type && `النشاط: ${settings.type}`,
    settings.location && `الموقع: ${settings.location}`,
    settings.tagline && `الشعار: ${settings.tagline}`,
    settings.description && `الوصف: ${settings.description}`,
    settings.audience && `الجمهور المستهدف: ${settings.audience}${settings.audienceAge ? ` (الفئة العمرية: ${settings.audienceAge})` : ""}`,
    settings.tone && `نبرة الكتابة: ${settings.tone}`,
    Array.isArray(settings.traits) && settings.traits.length && `شخصية العلامة: ${settings.traits.join("، ")}`,
    settings.products && `المنتجات والخدمات: ${settings.products}`,
    settings.extra && `ملاحظات إضافية: ${settings.extra}`,
  ].filter(Boolean).join("\n");
}

async function callClaude(apiKey, system, user, maxTokens = 1024) {
  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = await aiRes.json();
  if (data.error) {
    const err = new Error(data.error.message || "ai_error");
    err.anthropic = true;
    throw err;
  }
  return data.content?.map((b) => b.text || "").join("") || "";
}

// ── AI: content caption generation ─────────────────────────────
app.post("/api/generate", requireAuth, async (req, res) => {
  const settings = readSettings();
  const apiKey = settings?.api?.anthropic;
  if (!apiKey) return res.status(400).json({ ok: false, error: "missing_api_key" });

  const { platform, occasion, type, notes } = req.body || {};
  const requestLines = [
    platform && `المنصة: ${platform}`,
    occasion && `المناسبة: ${occasion}`,
    type && `نوع المحتوى: ${type}`,
    notes && `تفاصيل إضافية من الفريق: ${notes}`,
  ].filter(Boolean).join("\n");

  const systemPrompt = `أنت كاتب محتوى تسويقي محترف متخصص بالعربية لإدارة وسائل التواصل الاجتماعي. اكتب نصاً جاهزاً للنشر (caption) يناسب العلامة التالية:\n\n${buildBrandContext(settings)}\n\nاكتب بالعربية الفصحى السهلة أو لهجة راقية تناسب الجمهور، أضف هاشتاقات مناسبة إن كانت تخدم المنصة، ولا تشرح ما كتبته — أعد فقط النص الجاهز للنشر.`;
  const userPrompt = requestLines || "اكتب منشوراً تسويقياً عاماً يناسب العلامة.";

  try {
    const text = await callClaude(apiKey, systemPrompt, userPrompt);
    res.json({ ok: true, text });
  } catch (err) {
    console.error("generate error:", err);
    res.status(500).json({ ok: false, error: err.anthropic ? err.message : "generation_failed" });
  }
});

// ── AI: content ideas (research board) ─────────────────────────
app.post("/api/ideas", requireAuth, async (req, res) => {
  const settings = readSettings();
  const apiKey = settings?.api?.anthropic;
  if (!apiKey) return res.status(400).json({ ok: false, error: "missing_api_key" });

  const { topic, occasion } = req.body || {};
  const focus = [
    topic && `الموضوع/التركيز: ${topic}`,
    occasion && `المناسبة: ${occasion}`,
  ].filter(Boolean).join("\n");

  const systemPrompt = `أنت خبير تسويق عبر وسائل التواصل الاجتماعي. اقترح أفكار محتوى إبداعية وقابلة للتنفيذ تناسب العلامة التالية:\n\n${buildBrandContext(settings)}\n\nأعد بالضبط 6 أفكار، كل فكرة في سطر مستقل يبدأ بعلامة «- »، كل فكرة جملة واحدة واضحة وعملية بالعربية. لا تضف مقدمة ولا خاتمة ولا ترقيم — فقط الأسطر الستة.`;
  const userPrompt = focus || "اقترح أفكار محتوى متنوعة تناسب العلامة.";

  try {
    const text = await callClaude(apiKey, systemPrompt, userPrompt);
    const ideas = text.split("\n")
      .map((l) => l.replace(/^[-•*\d.\s]+/, "").trim())
      .filter(Boolean);
    res.json({ ok: true, ideas });
  } catch (err) {
    console.error("ideas error:", err);
    res.status(500).json({ ok: false, error: err.anthropic ? err.message : "generation_failed" });
  }
});

// ── AI: draft a reply to a customer message ────────────────────
app.post("/api/reply", requireAuth, async (req, res) => {
  const settings = readSettings();
  const apiKey = settings?.api?.anthropic;
  if (!apiKey) return res.status(400).json({ ok: false, error: "missing_api_key" });

  const { message } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ ok: false, error: "missing_message" });
  }

  const systemPrompt = `أنت مسؤول خدمة العملاء لهذه العلامة وتردّ على رسائل العملاء على وسائل التواصل:\n\n${buildBrandContext(settings)}\n\nاكتب رداً مهذباً ودوداً ومناسباً لنبرة العلامة بالعربية. كن مختصراً ومباشراً وواضحاً. إن كان السؤال عن السعر أو التوفر ولا تملك المعلومة، اطلب التفاصيل بلطف ووجّه العميل للتواصل. أعد فقط نص الرد الجاهز للإرسال.`;

  try {
    const text = await callClaude(apiKey, systemPrompt, String(message).trim(), 600);
    res.json({ ok: true, text });
  } catch (err) {
    console.error("reply error:", err);
    res.status(500).json({ ok: false, error: err.anthropic ? err.message : "generation_failed" });
  }
});

// ── instagram (business login) connection ──────────────────────
app.get("/api/meta/status", requireAuth, async (req, res) => {
  const conn = readMetaConnection();
  let fbPageName = null;
  if (conn?.pageId && conn?.accessToken) {
    try {
      const pageRes = await fetch(
        `https://graph.facebook.com/v21.0/${conn.pageId}?fields=name&access_token=${conn.accessToken}`
      );
      const pageData = await pageRes.json();
      fbPageName = pageData.name || null;
    } catch {
      // token may have expired since connecting — leave fbPageName null
    }
  }
  res.json({
    configured: !!(INSTAGRAM_APP_ID && INSTAGRAM_APP_SECRET),
    connected: !!conn,
    igUsername: conn?.igUsername || null,
    fbPageName,
    connectedAt: conn?.connectedAt || null,
  });
});

// Real follower / post performance pulled live from Instagram & Facebook.
app.get("/api/meta/insights", requireAuth, async (req, res) => {
  const conn = readMetaConnection();
  if (!conn) return res.json({ connected: false });

  // Tokens from the Instagram Business Login flow only work against
  // graph.instagram.com; tokens obtained via Facebook Login (which also
  // gave us a pageId) work against graph.facebook.com.
  const base = conn.pageId ? "https://graph.facebook.com/v21.0" : `${IG_GRAPH}/v21.0`;

  let instagram = null;
  if (conn.igUserId) {
    try {
      const igRes = await fetch(
        `${base}/${conn.igUserId}?fields=username,followers_count,media_count,profile_picture_url&access_token=${conn.accessToken}`
      );
      const igData = await igRes.json();
      let recentMedia = [];
      try {
        const mediaRes = await fetch(
          `${base}/${conn.igUserId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=6&access_token=${conn.accessToken}`
        );
        const mediaData = await mediaRes.json();
        recentMedia = mediaData.data || [];
      } catch {
        // recent media is best-effort
      }
      instagram = {
        username: igData.username || conn.igUsername || null,
        followers: igData.followers_count ?? null,
        mediaCount: igData.media_count ?? null,
        profilePic: igData.profile_picture_url || null,
        recentMedia,
      };
    } catch (err) {
      console.error("instagram insights error:", err);
    }
  }

  let facebook = null;
  if (conn.pageId) {
    try {
      const pageRes = await fetch(
        `https://graph.facebook.com/v21.0/${conn.pageId}?fields=name,followers_count,fan_count,picture&access_token=${conn.accessToken}`
      );
      const pageData = await pageRes.json();
      facebook = {
        name: pageData.name || null,
        followers: pageData.followers_count ?? pageData.fan_count ?? null,
        picture: pageData.picture?.data?.url || null,
      };
    } catch (err) {
      console.error("facebook insights error:", err);
    }
  }

  res.json({ connected: true, instagram, facebook });
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

// Connect by pasting a token generated in Meta's console
// (Instagram product > "Generate access token" > Add account).
// This avoids needing a redirect URI / OAuth callback entirely.
app.post("/api/meta/token", requireAuth, async (req, res) => {
  const raw = (req.body?.token || "").trim();
  if (!raw) return res.status(400).json({ ok: false, error: "missing token" });

  try {
    // Try to upgrade a short-lived token to a long-lived one (60 days).
    // If it's already long-lived this just fails harmlessly and we keep the original.
    let accessToken = raw;
    if (INSTAGRAM_APP_SECRET) {
      try {
        const longRes = await fetch(
          `${IG_GRAPH}/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${raw}`
        );
        const longData = await longRes.json();
        if (longData.access_token) accessToken = longData.access_token;
      } catch {
        // keep the original token
      }
    }

    // Path 1: Instagram Business Login token (graph.instagram.com).
    const meRes = await fetch(`${IG_GRAPH}/me?fields=user_id,username&access_token=${accessToken}`);
    const meData = await meRes.json();
    if (meData && (meData.user_id || meData.username)) {
      writeMetaConnection({
        igUserId: meData.user_id || null,
        igUsername: meData.username || null,
        accessToken,
        connectedAt: new Date().toISOString(),
      });
      return res.json({ ok: true, igUsername: meData.username || null });
    }

    // Path 2: Facebook access token — find the connected Instagram
    // business account via the user's Pages.
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=name,instagram_business_account{id,username}&access_token=${accessToken}`
    );
    const pagesData = await pagesRes.json();
    const pageWithIg = (pagesData.data || []).find((p) => p.instagram_business_account);
    if (pageWithIg) {
      const ig = pageWithIg.instagram_business_account;
      writeMetaConnection({
        igUserId: ig.id,
        igUsername: ig.username || null,
        pageId: pageWithIg.id,
        accessToken,
        connectedAt: new Date().toISOString(),
      });
      return res.json({ ok: true, igUsername: ig.username || null });
    }

    res.status(400).json({ ok: false, error: "invalid token" });
  } catch (err) {
    console.error("instagram token connect error:", err);
    res.status(500).json({ ok: false, error: "could not verify token" });
  }
});

app.post("/api/meta/disconnect", requireAuth, (req, res) => {
  if (fs.existsSync(META_FILE)) fs.unlinkSync(META_FILE);
  res.json({ ok: true });
});

// ── public storefront (no auth — read-only) ────────────────────
app.get("/api/public/storefront", (req, res) => {
  const settings = readSettings();
  const appearance = settings.appearance || {};
  res.json({
    name: settings.nameAr || settings.name || "",
    tagline: settings.tagline || "",
    description: settings.description || "",
    location: settings.location || "",
    logo: appearance.logo || "",
    coverImage: appearance.coverImage || "",
    themeColor: appearance.themeColor || "",
    links: appearance.links || {},
    catalog: catalog.list().filter((c) => c.visible),
  });
});

// ── serve the built frontend ─────────────────────────────────
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Choga server running on port ${PORT}`);
});
