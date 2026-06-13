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

// ── TikTok connection (Content Posting API) ─────────────────────
const TIKTOK_FILE = path.join(DATA_DIR, "tiktok-connection.json");
const TIKTOK_SCOPES = ["user.info.basic", "video.publish", "video.upload"].join(",");

function readTikTokConnection() {
  try {
    return JSON.parse(fs.readFileSync(TIKTOK_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function writeTikTokConnection(data) {
  fs.writeFileSync(TIKTOK_FILE, JSON.stringify(data, null, 2));
}

// Publish a content item to its target platform via the Meta Graph API.
// Returns { ok: true, postId } on success or { ok: false, error } otherwise.
async function publishToMeta(item) {
  const conn = readMetaConnection();
  if (!conn?.accessToken) return { ok: false, error: "meta_not_connected" };

  if (item.platform === "facebook") {
    if (!conn.pageId) return { ok: false, error: "facebook_not_connected" };
    const body = new URLSearchParams({ access_token: conn.accessToken });
    const endpoint = item.image
      ? `https://graph.facebook.com/v21.0/${conn.pageId}/photos`
      : `https://graph.facebook.com/v21.0/${conn.pageId}/feed`;
    if (item.image) {
      body.set("url", item.image);
      body.set("caption", item.caption || "");
    } else {
      body.set("message", item.caption || "");
    }
    const r = await fetch(endpoint, { method: "POST", body });
    const data = await r.json();
    if (data.error) return { ok: false, error: data.error.message };
    return { ok: true, postId: data.post_id || data.id };
  }

  if (item.platform === "instagram") {
    if (!conn.igUserId) return { ok: false, error: "instagram_not_connected" };
    if (!item.image) return { ok: false, error: "image_required" };
    const base = conn.pageId ? "https://graph.facebook.com/v21.0" : `${IG_GRAPH}/v21.0`;
    const containerBody = new URLSearchParams({
      image_url: item.image,
      caption: item.caption || "",
      access_token: conn.accessToken,
    });
    if (item.type === "ستوري") containerBody.set("media_type", "STORIES");
    const containerRes = await fetch(`${base}/${conn.igUserId}/media`, { method: "POST", body: containerBody });
    const containerData = await containerRes.json();
    if (containerData.error) return { ok: false, error: containerData.error.message };
    const publishRes = await fetch(`${base}/${conn.igUserId}/media_publish`, {
      method: "POST",
      body: new URLSearchParams({ creation_id: containerData.id, access_token: conn.accessToken }),
    });
    const publishData = await publishRes.json();
    if (publishData.error) return { ok: false, error: publishData.error.message };
    return { ok: true, postId: publishData.id };
  }

  return { ok: false, error: "unsupported_platform" };
}

// Returns a valid TikTok access token, refreshing it via the stored
// refresh token (valid for 1 year) if the access token (valid for 24h)
// has expired.
async function getTikTokAccessToken() {
  const conn = readTikTokConnection();
  if (!conn?.accessToken) return null;
  if (conn.expiresAt && Date.now() < conn.expiresAt - 60_000) return conn.accessToken;
  if (!conn.refreshToken) return conn.accessToken;

  const settings = readSettings();
  const clientKey = settings?.api?.tiktokClientKey;
  const clientSecret = settings?.api?.tiktokClientSecret;
  if (!clientKey || !clientSecret) return conn.accessToken;

  try {
    const r = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: conn.refreshToken,
      }),
    });
    const data = await r.json();
    if (!data.access_token) return conn.accessToken;
    writeTikTokConnection({
      ...conn,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || conn.refreshToken,
      expiresAt: Date.now() + (data.expires_in || 0) * 1000,
    });
    return data.access_token;
  } catch {
    return conn.accessToken;
  }
}

// Publish a photo post to TikTok via the Content Posting API. Unaudited
// apps are restricted by TikTok to private (SELF_ONLY) visibility until
// the app passes review, and PULL_FROM_URL requires the image to be on a
// domain verified in the TikTok developer portal.
async function publishToTikTok(item) {
  const accessToken = await getTikTokAccessToken();
  if (!accessToken) return { ok: false, error: "tiktok_not_connected" };
  if (!item.image) return { ok: false, error: "image_required" };

  try {
    const r = await fetch("https://open.tiktokapis.com/v2/post/publish/content/init/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        post_info: {
          title: item.caption || "",
          privacy_level: "SELF_ONLY",
          disable_comment: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          photo_cover_index: 0,
          photo_images: [item.image],
        },
        post_mode: "DIRECT_POST",
        media_type: "PHOTO",
      }),
    });
    const data = await r.json();
    if (data.error && data.error.code !== "ok") return { ok: false, error: data.error.message || data.error.code };
    return { ok: true, postId: data.data?.publish_id || null };
  } catch (err) {
    console.error("tiktok publish error:", err);
    return { ok: false, error: "tiktok publish failed" };
  }
}

// Dispatch a content item to the right platform publisher.
async function publishContentItem(item) {
  if (item.platform === "tiktok") return publishToTikTok(item);
  return publishToMeta(item);
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

// Publish a "ready" content item to Instagram/Facebook/TikTok right now via
// the connected accounts, and mark it as published on success.
app.post("/api/content/:id/publish", requireAuth, async (req, res) => {
  const item = content.list().find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ ok: false, error: "not found" });

  const result = await publishContentItem(item);
  if (!result.ok) return res.status(400).json(result);

  const updated = content.update(item.id, {
    status: "published",
    publishedAt: new Date().toISOString(),
    publishedPostId: result.postId,
  });
  res.json({ ok: true, item: updated });
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

// ── Instagram DM inbox ──────────────────────────────────────────
// Reads recent message threads and sends replies via the Messaging API.
// Requires the instagram_business_manage_messages permission on the token.
app.get("/api/meta/conversations", requireAuth, async (req, res) => {
  const conn = readMetaConnection();
  if (!conn?.accessToken || !conn?.igUserId) return res.json({ connected: false });

  const base = conn.pageId ? "https://graph.facebook.com/v21.0" : `${IG_GRAPH}/v21.0`;
  const ownerId = conn.pageId || conn.igUserId;
  const platformParam = conn.pageId ? "&platform=instagram" : "";

  try {
    const r = await fetch(
      `${base}/${ownerId}/conversations?fields=participants,updated_time,messages.limit(1){message,from,created_time}${platformParam}&access_token=${conn.accessToken}`
    );
    const data = await r.json();
    if (data.error) {
      return res.json({ connected: true, needsPermission: true, error: data.error.message });
    }
    const conversations = (data.data || []).map((c) => {
      const participants = c.participants?.data || [];
      const other = participants.find((p) => p.id !== conn.igUserId) || null;
      const last = c.messages?.data?.[0] || null;
      return {
        id: c.id,
        participant: other,
        updatedTime: c.updated_time,
        lastMessage: last ? { text: last.message || "", fromId: last.from?.id || null, time: last.created_time } : null,
      };
    });
    res.json({ connected: true, conversations });
  } catch (err) {
    console.error("conversations error:", err);
    res.status(500).json({ connected: true, error: "failed to load conversations" });
  }
});

app.get("/api/meta/conversations/:id/messages", requireAuth, async (req, res) => {
  const conn = readMetaConnection();
  if (!conn?.accessToken) return res.status(400).json({ ok: false, error: "not connected" });
  const base = conn.pageId ? "https://graph.facebook.com/v21.0" : `${IG_GRAPH}/v21.0`;

  try {
    const r = await fetch(
      `${base}/${req.params.id}/messages?fields=id,message,from,created_time&access_token=${conn.accessToken}`
    );
    const data = await r.json();
    if (data.error) return res.status(400).json({ ok: false, error: data.error.message });
    const messages = (data.data || [])
      .map((m) => ({
        id: m.id,
        text: m.message || "",
        mine: m.from?.id === conn.igUserId,
        time: m.created_time,
      }))
      .reverse();
    res.json({ ok: true, messages });
  } catch (err) {
    console.error("conversation messages error:", err);
    res.status(500).json({ ok: false, error: "failed to load messages" });
  }
});

app.post("/api/meta/conversations/:id/reply", requireAuth, async (req, res) => {
  const conn = readMetaConnection();
  if (!conn?.accessToken || !conn?.igUserId) return res.status(400).json({ ok: false, error: "not connected" });

  const { message, recipientId } = req.body || {};
  if (!message?.trim() || !recipientId) return res.status(400).json({ ok: false, error: "missing fields" });

  const base = conn.pageId ? "https://graph.facebook.com/v21.0" : `${IG_GRAPH}/v21.0`;
  const ownerId = conn.pageId || conn.igUserId;

  try {
    const body = new URLSearchParams({
      recipient: JSON.stringify({ id: recipientId }),
      message: JSON.stringify({ text: message }),
      access_token: conn.accessToken,
    });
    const r = await fetch(`${base}/${ownerId}/messages`, { method: "POST", body });
    const data = await r.json();
    if (data.error) return res.status(400).json({ ok: false, error: data.error.message });
    res.json({ ok: true });
  } catch (err) {
    console.error("send reply error:", err);
    res.status(500).json({ ok: false, error: "send failed" });
  }
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

// ── TikTok connection (Content Posting API) ─────────────────────
// Uses the Client Key/Secret pasted into Settings ← مفاتيح API, so the
// whole setup is self-serve (no server env vars / redeploy needed).
app.get("/api/tiktok/status", requireAuth, (req, res) => {
  const conn = readTikTokConnection();
  const settings = readSettings();
  res.json({
    configured: !!(settings?.api?.tiktokClientKey && settings?.api?.tiktokClientSecret),
    connected: !!conn,
    displayName: conn?.displayName || null,
    connectedAt: conn?.connectedAt || null,
  });
});

app.get("/api/tiktok/connect", requireAuth, (req, res) => {
  const settings = readSettings();
  const clientKey = settings?.api?.tiktokClientKey;
  if (!clientKey) return res.status(400).send("أضف Client Key و Client Secret من الإعدادات ← مفاتيح API أولاً");

  const redirectUri = `${req.protocol}://${req.get("host")}/api/tiktok/callback`;
  const state = jwt.sign({ purpose: "tiktok-connect" }, JWT_SECRET, { expiresIn: "10m" });
  const url = `https://www.tiktok.com/v2/auth/authorize/?client_key=${encodeURIComponent(clientKey)}&scope=${encodeURIComponent(TIKTOK_SCOPES)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
  res.redirect(url);
});

app.get("/api/tiktok/callback", async (req, res) => {
  const { code, state, error } = req.query;
  try {
    jwt.verify(String(state), JWT_SECRET);
  } catch {
    return res.redirect("/?tiktok=error");
  }
  if (error || !code) return res.redirect("/?tiktok=error");

  const settings = readSettings();
  const clientKey = settings?.api?.tiktokClientKey;
  const clientSecret = settings?.api?.tiktokClientSecret;
  if (!clientKey || !clientSecret) return res.redirect("/?tiktok=error");

  const redirectUri = `${req.protocol}://${req.get("host")}/api/tiktok/callback`;
  try {
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code: String(code),
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("token exchange failed");

    let displayName = null;
    try {
      const infoRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const infoData = await infoRes.json();
      displayName = infoData.data?.user?.display_name || null;
    } catch {
      // best-effort
    }

    writeTikTokConnection({
      openId: tokenData.open_id || null,
      displayName,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresAt: Date.now() + (tokenData.expires_in || 0) * 1000,
      connectedAt: new Date().toISOString(),
    });

    res.redirect("/?tiktok=connected");
  } catch (err) {
    console.error("tiktok oauth error:", err);
    res.redirect("/?tiktok=error");
  }
});

app.post("/api/tiktok/disconnect", requireAuth, (req, res) => {
  if (fs.existsSync(TIKTOK_FILE)) fs.unlinkSync(TIKTOK_FILE);
  res.json({ ok: true });
});

// ── product catalog sync (Facebook Commerce Manager → Instagram Shop) ──
// Discover product catalogs the connected account manages, so local
// catalog items can be pushed into the same catalog feeding Instagram Shop.
app.get("/api/meta/catalog", requireAuth, async (req, res) => {
  const conn = readMetaConnection();
  if (!conn?.accessToken) return res.json({ connected: false });

  try {
    const bizRes = await fetch(
      `https://graph.facebook.com/v21.0/me/businesses?fields=id,name&access_token=${conn.accessToken}`
    );
    const bizData = await bizRes.json();
    if (bizData.error) {
      return res.json({ connected: true, needsPermission: true, error: bizData.error.message, selectedCatalogId: conn.catalogId || null });
    }

    const catalogs = [];
    for (const biz of bizData.data || []) {
      const catRes = await fetch(
        `https://graph.facebook.com/v21.0/${biz.id}/owned_product_catalogs?fields=id,name,product_count&access_token=${conn.accessToken}`
      );
      const catData = await catRes.json();
      if (catData.error) continue;
      for (const c of catData.data || []) {
        catalogs.push({ id: c.id, name: c.name, productCount: c.product_count ?? null, businessName: biz.name });
      }
    }

    res.json({ connected: true, catalogs, selectedCatalogId: conn.catalogId || null });
  } catch (err) {
    console.error("catalog discovery error:", err);
    res.status(500).json({ connected: true, error: "discovery failed" });
  }
});

app.post("/api/meta/catalog/select", requireAuth, (req, res) => {
  const conn = readMetaConnection();
  if (!conn) return res.status(400).json({ ok: false, error: "not connected" });
  const { catalogId } = req.body ?? {};
  if (!catalogId) return res.status(400).json({ ok: false, error: "missing catalogId" });
  writeMetaConnection({ ...conn, catalogId });
  res.json({ ok: true });
});

// Push local catalog items into the selected Facebook product catalog.
app.post("/api/meta/catalog/sync", requireAuth, async (req, res) => {
  const conn = readMetaConnection();
  if (!conn?.accessToken || !conn?.catalogId) {
    return res.status(400).json({ ok: false, error: "no catalog selected" });
  }

  const storeUrl = `${req.protocol}://${req.get("host")}/store`;
  const items = catalog.list();
  if (!items.length) return res.json({ ok: true, count: 0 });

  const requests = items.map((item) => {
    const retailerId = item.fbRetailerId || item.id;
    if (item.visible === false) {
      return { method: "DELETE", retailer_id: retailerId };
    }
    return {
      method: "UPDATE",
      retailer_id: retailerId,
      data: {
        name: item.name || "منتج",
        description: item.description || item.name || "",
        availability: "in stock",
        condition: "new",
        price: `${Number(item.priceAmount) || 0} ${item.currency || "YER"}`,
        image_url: item.image || "",
        url: storeUrl,
        brand: "Choga",
      },
    };
  });

  try {
    const body = new URLSearchParams({
      item_type: "PRODUCT_ITEM",
      requests: JSON.stringify(requests),
      access_token: conn.accessToken,
    });
    const syncRes = await fetch(`https://graph.facebook.com/v21.0/${conn.catalogId}/items_batch`, {
      method: "POST",
      body,
    });
    const syncData = await syncRes.json();
    if (syncData.error) return res.status(400).json({ ok: false, error: syncData.error.message });
    res.json({ ok: true, count: requests.length, handles: syncData.handles || [] });
  } catch (err) {
    console.error("catalog sync error:", err);
    res.status(500).json({ ok: false, error: "sync failed" });
  }
});

// Pull existing products from the selected Facebook catalog into Choga,
// so products already managed in Commerce Manager show up here too.
app.post("/api/meta/catalog/import", requireAuth, async (req, res) => {
  const conn = readMetaConnection();
  if (!conn?.accessToken || !conn?.catalogId) {
    return res.status(400).json({ ok: false, error: "no catalog selected" });
  }

  try {
    const prodRes = await fetch(
      `https://graph.facebook.com/v21.0/${conn.catalogId}/products?fields=id,retailer_id,name,description,price,image_url,availability&limit=200&access_token=${conn.accessToken}`
    );
    const prodData = await prodRes.json();
    if (prodData.error) return res.status(400).json({ ok: false, error: prodData.error.message });

    const existing = catalog.list();
    let imported = 0, updated = 0;
    for (const p of prodData.data || []) {
      const fbRetailerId = p.retailer_id || p.id;
      const priceMatch = (p.price || "").match(/([\d.]+)\s*([A-Za-z]{3})?/);
      const fields = {
        name: p.name || "",
        description: p.description || "",
        image: p.image_url || "",
        price: p.price || "",
        priceAmount: priceMatch ? priceMatch[1] : "",
        currency: (priceMatch && priceMatch[2] && priceMatch[2].toUpperCase()) || "YER",
        visible: p.availability !== "out of stock",
        fbRetailerId,
      };
      const match = existing.find((e) => e.fbRetailerId === fbRetailerId);
      if (match) {
        catalog.update(match.id, fields);
        updated++;
      } else {
        catalog.create(fields);
        imported++;
      }
    }
    res.json({ ok: true, imported, updated, total: (prodData.data || []).length });
  } catch (err) {
    console.error("catalog import error:", err);
    res.status(500).json({ ok: false, error: "import failed" });
  }
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

// ── auto-publish: posts "ready" content when due ─────────────────────
async function runAutoPublish() {
  try {
    const settings = readSettings();
    if (settings?.publishMode !== "auto") return;
    const today = new Date().toISOString().slice(0, 10);
    const due = content.list().filter((i) =>
      i.status === "ready" &&
      ["instagram", "facebook", "tiktok"].includes(i.platform) &&
      (!i.scheduledDate || i.scheduledDate <= today)
    );
    for (const item of due) {
      const result = await publishContentItem(item);
      if (result.ok) {
        content.update(item.id, { status: "published", publishedAt: new Date().toISOString(), publishedPostId: result.postId });
      } else {
        console.error(`auto-publish failed for "${item.title}":`, result.error);
      }
    }
  } catch (err) {
    console.error("auto-publish loop error:", err);
  }
}

setTimeout(runAutoPublish, 30 * 1000);
setInterval(runAutoPublish, 10 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Choga server running on port ${PORT}`);
});
