/**
 * POST /api/improve
 *
 * Improves a resale listing using NVIDIA NIM.
 * NVIDIA_API_KEY is server-side only (issue #8).
 *
 * Body: { platform, title, description, tags? }
 * Response: { title, description, tags, platform }
 */

const NIM_URL =
  process.env.NVIDIA_NIM_URL || "https://integrate.api.nvidia.com/v1/chat/completions";
const NIM_MODEL =
  process.env.NVIDIA_NIM_MODEL || "meta/llama-3.1-70b-instruct";
const NIM_API_KEY = process.env.NVIDIA_API_KEY;

// Basic in-memory abuse cap per IP (issue #8). Production scaling → issue #24.
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 10;
const rateBuckets = new Map();

// Simple in-memory response cache keyed by normalized request hash.
// TTL is intentionally short (2 minutes) to keep demo costs low without
// serving stale listings for long. Production scaling → Redis / persistent cache.
const CACHE_TTL_MS = 2 * 60 * 1000;
const responseCache = new Map();

const PLATFORM_PROMPTS = {
  depop: {
    name: "Depop",
    titleRules: "- title: under 40 characters, trendy/casual, include era or vibe if known.",
    descriptionRules: "- description: 1-2 short sentences, mention fit, fabric, and condition. Keep it casual and scroll-stopping.",
    tagRules: "- tags: exactly 5 lowercase single-word tags, no hashtags. Include brand, item type, and 2 style tags.",
  },
  grailed: {
    name: "Grailed",
    titleRules: "- title: under 60 characters, specific, includes brand/era/color/size if known.",
    descriptionRules: "- description: 2-4 sentences, mention fit, fabric, condition, and style. Use menswear/spec-head language.",
    tagRules: "- tags: 5-10 relevant lowercase tags, no hashtags. Include brand, era, silhouette, material.",
  },
  poshmark: {
    name: "Poshmark",
    titleRules: "- title: under 80 characters, front-load keywords (brand + item + style).",
    descriptionRules: "- description: 3-5 friendly sentences. Mention condition, fit, and invite offers/bundles.",
    tagRules: "- tags: 3 hashtags at the end of the description (e.g. #nike #athleisure #poshmark). Return them as the tags array.",
  },
};

function hashRequest(payload) {
  const flaws = Array.isArray(payload.flaws) ? payload.flaws : [];
  const flawHash = flaws
    .map((f) => `${String(f.location || "").trim().toLowerCase()}:${String(f.description || "").trim().toLowerCase()}`)
    .join(";");
  const normalized = [
    String(payload.platform || "grailed"),
    String(payload.title || "").trim().toLowerCase(),
    String(payload.description || "").trim().toLowerCase(),
    (Array.isArray(payload.tags) ? payload.tags : String(payload.tags || "").split(/[,#\s]+/))
      .map((t) => String(t).trim().toLowerCase())
      .filter(Boolean)
      .join(","),
    String(payload.condition || "").trim().toLowerCase(),
    flawHash,
  ].join("|");
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0;
  }
  return String(hash);
}

function getCached(key) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value) {
  responseCache.set(key, { ts: Date.now(), value });
}

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = (rateBuckets.get(ip) || []).filter(
    (ts) => now - ts < RATE_WINDOW_MS
  );
  if (bucket.length >= RATE_MAX) return true;
  bucket.push(now);
  rateBuckets.set(ip, bucket);
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: "Rate limit exceeded. Try again in a minute." });
  }

  const { platform = "grailed", title = "", description = "", tags = [], price = "", condition = "", flaws = [] } = req.body || {};

  if (!title.trim() && !description.trim()) {
    return res.status(400).json({ error: "Provide a title or description." });
  }

  if (!NIM_API_KEY) {
    return res.status(503).json({ error: "NVIDIA_API_KEY is not configured." });
  }

  const cacheKey = hashRequest({ platform, title, description, tags, price, condition, flaws });
  const cached = getCached(cacheKey);
  if (cached) {
    return res.status(200).json({ ...cached, cached: true });
  }

  try {
    const improved = await improveWithNim({ platform, title, description, tags, price, condition, flaws });
    setCached(cacheKey, improved);
    return res.status(200).json(improved);
  } catch (err) {
    console.error("[/api/improve] NIM error:", err);
    return res
      .status(502)
      .json({ error: err.message || "Improve failed. Please try again." });
  }
}

async function improveWithNim({ platform, title, description, tags, price, condition, flaws }) {
  const existingTags = Array.isArray(tags) ? tags.join(", ") : String(tags || "");
  const rules = PLATFORM_PROMPTS[platform] || PLATFORM_PROMPTS.grailed;

  const flawText = (flaws || [])
    .filter((f) => f.location?.trim() || f.description?.trim())
    .map((f) => {
      const loc = f.location?.trim();
      const desc = f.description?.trim();
      if (loc && desc) return `${loc}: ${desc}`;
      return loc || desc;
    })
    .join("; ");

  const prompt = [
    `You are a fashion resale expert optimizing a listing for ${rules.name}.`,
    "Given the draft below, return an improved listing as a single JSON object:",
    '{"title":"...","description":"...","tags":["...","..."]}',
    "",
    "Rules:",
    rules.titleRules,
    rules.descriptionRules,
    rules.tagRules,
    price ? "- price context (do NOT return price): " + price : "",
    condition ? "- condition context (do NOT return condition separately): " + condition + (flawText ? "; flaws: " + flawText : "") : "",
    "- Return ONLY the JSON object, no markdown, no explanation.",
    "",
    "Draft title:", title || "(none)",
    "Draft description:", description || "(none)",
    "Existing tags:", existingTags || "(none)",
  ].filter(Boolean).join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(NIM_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${NIM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: NIM_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`NIM ${response.status}: ${text}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    if (!content) {
      throw new Error("Empty response from NIM");
    }

    return parseListingResponse(content, platform);
  } finally {
    clearTimeout(timeout);
  }
}

function parseListingResponse(content, platform) {
  // Extract JSON from a fenced block or bare object.
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : content;
  const objectMatch = candidate.match(/\{[\s\S]*\}/);

  if (!objectMatch) {
    throw new Error("No JSON object found in NIM response");
  }

  let parsed;
  try {
    parsed = JSON.parse(objectMatch[0]);
  } catch (err) {
    throw new Error(`Failed to parse NIM JSON: ${err.message}`);
  }

  const title = String(parsed.title || "").trim();
  const description = String(parsed.description || "").trim();
  let tagList = parsed.tags;
  if (typeof tagList === "string") {
    tagList = tagList.split(/[,#\s]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
  }
  tagList = Array.isArray(tagList)
    ? tagList.filter(Boolean).map((t) => String(t).trim().toLowerCase())
    : [];

  if (!title || !description) {
    throw new Error("NIM response missing title or description");
  }

  return {
    platform,
    title,
    description,
    tags: tagList.slice(0, 10),
  };
}
