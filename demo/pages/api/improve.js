/**
 * POST /api/improve
 *
 * Improves a resale listing using NVIDIA NIM.
 * NVIDIA_API_KEY is server-side only (issue #8).
 *
 * Body: { platform, title, description, tags? }
 * Response: { title, description, tags }
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

  const { platform = "grailed", title = "", description = "", tags = [] } = req.body || {};

  if (!title.trim() && !description.trim()) {
    return res.status(400).json({ error: "Provide a title or description." });
  }

  if (!NIM_API_KEY) {
    return res.status(503).json({ error: "NVIDIA_API_KEY is not configured." });
  }

  try {
    const improved = await improveWithNim({ platform, title, description, tags });
    return res.status(200).json(improved);
  } catch (err) {
    console.error("[/api/improve] NIM error:", err);
    return res
      .status(502)
      .json({ error: err.message || "Improve failed. Please try again." });
  }
}

async function improveWithNim({ platform, title, description, tags }) {
  const existingTags = Array.isArray(tags) ? tags.join(", ") : String(tags || "");

  const prompt = [
    `You are a fashion resale expert optimizing a listing for ${platform}.`,
    "Given the draft below, return an improved listing as a single JSON object:",
    '{"title":"...","description":"...","tags":["...","..."]}',
    "",
    "Rules:",
    "- title: under 60 characters, specific, includes brand/era/color/size if known.",
    "- description: 2-4 sentences, mention fit, fabric, condition, and style.",
    "- tags: 5-10 relevant lowercase tags. No hashtags.",
    "- Return ONLY the JSON object, no markdown, no explanation.",
    "",
    "Draft title:", title || "(none)",
    "Draft description:", description || "(none)",
    "Existing tags:", existingTags || "(none)",
  ].join("\n");

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
