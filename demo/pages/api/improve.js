/**
 * POST /api/improve
 *
 * Accepts a listing payload and returns an improved version.
 * Server-side environment (NVIDIA_API_KEY) is used in issue #8.
 *
 * Body: { platform, title, description, tags? }
 * Response: { title, description, tags }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { platform = "grailed", title = "", description = "", tags = [] } = req.body || {};

  if (!title.trim() && !description.trim()) {
    return res.status(400).json({ error: "Provide a title or description." });
  }

  // Stub improvement for issue #28. Issue #8 wires this to NVIDIA NIM.
  const improvedTitle = title.trim()
    ? `${title.trim().replace(/\.$/, "")} — refreshed`
    : "Refreshed listing";

  const improvedDescription = description.trim()
    ? description.trim().replace(/\s+/g, " ").slice(0, 1000)
    : "";

  const improvedTags = Array.isArray(tags)
    ? tags.filter(Boolean).map((t) => t.trim().toLowerCase())
    : typeof tags === "string"
    ? tags
        .split(/[,#\s]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    : [];

  if (improvedTags.length === 0) {
    improvedTags.push("vintage", "streetwear");
  }

  return res.status(200).json({
    platform,
    title: improvedTitle,
    description: improvedDescription,
    tags: improvedTags.slice(0, 10),
  });
}
