// ollama.js — Local Ollama bridge for Second Skin
//
// Expects Ollama running on localhost (default http://localhost:11434).
// All image analysis and listing generation stays on the user's machine.

const OLLAMA_DEFAULTS = {
  baseUrl: "http://localhost:11434",
  visionModel: "llava",
  textModel: "gemma4:latest",
  temperature: 0.7
};

const OLLAMA = {
  async getConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["ollamaConfig"], (result) => {
        resolve({ ...OLLAMA_DEFAULTS, ...(result.ollamaConfig || {}) });
      });
    });
  },

  async saveConfig(config) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ ollamaConfig: config }, resolve);
    });
  },

  async chat(config, messages, options = {}) {
    const url = `${config.baseUrl}/api/chat`;
    const body = {
      model: options.model || config.textModel,
      messages,
      stream: false,
      options: {
        temperature: config.temperature
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ollama ${res.status}: ${text}`);
    }

    const data = await res.json();
    return data.message?.content || "";
  },

  /**
   * Build a vision message containing one or more base64 images.
   * `images` is an array of base64 data strings (no data: URI prefix).
   */
  buildVisionMessage(prompt, images) {
    return {
      role: "user",
      content: prompt,
      images
    };
  },

  /**
   * Ask the vision model to describe the garment in the uploaded photos.
   */
  async describeGarment(config, images) {
    const prompt = [
      "You are looking at photos of a second-hand garment for sale on Grailed.",
      "Describe what you see in 3-5 concise sentences. Include: brand/logo if visible,",
      "garment type (t-shirt, jacket, jeans, etc.), color, material/texture, era/vintage clues,",
      "condition issues (stains, holes, fade, pilling), and any measurements or size tags visible.",
      "Do not include pricing or marketing language."
    ].join(" ");

    const content = await this.chat(
      config,
      [this.buildVisionMessage(prompt, images)],
      { model: config.visionModel }
    );

    return content.trim();
  },

  /**
   * Turn a garment description into a marketplace listing.
   * Returns { title, description, price }.
   */
  async composeListing(config, description) {
    const prompt = [
      "You are writing a listing for Grailed, a curated resale marketplace for menswear and vintage.",
      "Based on the garment description below, return a JSON object exactly like this example:",
      '{"title":"Vintage 1990s Band Tee Black XL","description":"...","price":145}',
      "Rules:",
      "- title: under 50 characters, specific, includes brand/era/color/size if known.",
      "- description: 2-4 sentences, mention fit, fabric, condition, and measurements if provided.",
      "- price: integer USD. Price competitively for Grailed; vintage tees $40-300, designer more.",
      "Return ONLY the JSON object, no markdown, no explanation.",
      "",
      "Garment description:",
      description
    ].join("\n");

    const content = await this.chat(
      config,
      [{ role: "user", content: prompt }],
      { model: config.textModel }
    );

    return this.parseListing(content);
  },

  /**
   * Robustly extract { title, description, price } from model output.
   */
  parseListing(content) {
    const clean = content.trim();

    // Try a fenced JSON block first.
    const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced ? fenced[1].trim() : clean;

    // Extract the first {...} object.
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      throw new Error("No JSON object found in model output");
    }

    let parsed;
    try {
      parsed = JSON.parse(objectMatch[0]);
    } catch (err) {
      throw new Error(`Failed to parse listing JSON: ${err.message}`);
    }

    const title = String(parsed.title || "").trim();
    const description = String(parsed.description || "").trim();
    const price = Number(parsed.price);

    if (!title || !description || Number.isNaN(price) || price <= 0) {
      throw new Error("Model JSON missing title/description/price");
    }

    return { title, description, price };
  }
};

// Node testability.
if (typeof module !== "undefined" && module.exports) {
  module.exports = OLLAMA;
}
