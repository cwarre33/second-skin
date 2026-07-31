// content_grailed.js — Grailed automation layer

(function executionEngine() {
  chrome.storage.local.get(["currentListingJob", "inventory"], (state) => {
    const job = state.currentListingJob;
    if (!job || job.targetSite !== "grailed") return;

    const activeItem = job.demoJob
      ? job.demoJob
      : (state.inventory || []).find((item) => item.id === job.itemId);
    if (!activeItem) {
      SECOND_SKIN.clearJobMutex();
      return;
    }

    if (window.location.href.includes("/sell")) {
      processGrailedForm(activeItem, job.demoJob ? { demo: true } : {});
    }
  });
})();

// Preferences for Grailed's chained selectors.
// These were pulled from a live `grailed.com/sell/new` DOM dump via cdp-tools/inspect-grailed.js.
const GRAILED_PREFS = {
  categoryTriggerText: "Department / Category",
  categoryOptionText: "Tops",
  subcategoryTriggerText: "Sub-category",
  subcategoryOptionText: "T-Shirts",
  sizeTriggerText: "Size",
  sizeOptionText: "XL",
  designerText: "Vintage",
  conditionText: ""
};

async function processGrailedForm(item, options = {}) {
  const isDemo = options.demo || false;
  console.log("[Second Skin] Starting Grailed listing for", item.id || "demo");
  await SECOND_SKIN.humanDelay(1500, 1500);

  const basicsOk = await fillBasicFields(item);
  if (!basicsOk) {
    console.warn("[Second Skin] Grailed basic fields not found — partial or no injection.");
    return;
  }

  if (Array.isArray(item.tags) && item.tags.length > 0) {
    await fillTags(item.tags);
  }

  // Demo jobs keep images, sizing, category, designer, and condition manual (#32).
  if (!isDemo) {
    const imagesOk = await uploadImages(item);
    if (imagesOk) {
      console.log("[Second Skin] Grailed images injected for", item.id);
    }

    await chainCategoryAndDesigner();
    await fillCondition();
  }

  if (item.id) {
    await SECOND_SKIN.updatePlatformMeta(item.id, "grailed", "active");
  }
  SECOND_SKIN.clearJobMutex();
  console.log("[Second Skin] Grailed form ready for review:", item.id || "demo");
  console.log("[Second Skin] Listing stopped before publish — review and submit manually.");
}

async function fillBasicFields(item) {
  const titleEl = await SECOND_SKIN.waitFor('input[name="title"], input[id*="title" i], input[placeholder*="title" i]', 5000);
  const priceEl = await SECOND_SKIN.waitFor('input[name="price"], input[id*="price" i], input[placeholder*="price" i], input[type="number"]', 5000);
  const descriptionEl = await SECOND_SKIN.waitFor('textarea[name="description"], textarea[id*="description" i], textarea[placeholder*="description" i]', 5000);

  if (!titleEl || !priceEl || !descriptionEl) {
    console.warn("[Second Skin] Missing one of title/price/description on Grailed.", {
      title: !!titleEl,
      price: !!priceEl,
      description: !!descriptionEl
    });
    return false;
  }

  const titleInjected = SECOND_SKIN.dispatchSyntheticInput(titleEl, item.title);
  const priceInjected = SECOND_SKIN.dispatchSyntheticInput(priceEl, item.price);
  const descriptionInjected = SECOND_SKIN.dispatchSyntheticInput(descriptionEl, item.description);

  if (!titleInjected || !priceInjected || !descriptionInjected) {
    return false;
  }

  // Trigger React re-renders by refocusing the body.
  await SECOND_SKIN.humanDelay(200, 300);
  document.body.dispatchEvent(new Event("click", { bubbles: true }));
  return true;
}

async function fillTags(tags) {
  const tagString = Array.isArray(tags) ? tags.join(", ") : String(tags);
  if (!tagString) return false;

  const input = await findTagsInput();
  if (!input) {
    console.warn("[Second Skin] Grailed tags input not found — tried input[name/tags], placeholders, aria-labels, contenteditable, and label scan. Tags skipped.");
    return false;
  }

  SECOND_SKIN.dispatchSyntheticInput(input, tagString);

  // Grailed may require a keypress/blur to commit tag chips.
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  input.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
  input.blur();

  console.log("[Second Skin] Grailed tags injected:", tagString);
  return true;
}

async function findTagsInput() {
  const selectors = [
    'input[name="tags" i]',
    'input[id*="tags" i]',
    'input[placeholder*="tag" i]',
    'input[aria-label*="tag" i]',
    'textarea[placeholder*="tag" i]',
    'textarea[aria-label*="tag" i]',
    '[contenteditable="true"][placeholder*="tag" i]',
    '[contenteditable="true"][aria-label*="tag" i]',
    '[data-testid*="tag" i] input',
    '[data-testid*="tag" i] [contenteditable="true"]'
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && isVisible(el)) return el;
  }

  // Fallback: scan labels/headings near an editable field that mention "tag".
  const labels = document.querySelectorAll('label, span, div, p, h1, h2, h3, h4');
  for (const label of labels) {
    const text = (label.textContent || "").toLowerCase();
    if (text.includes("tag") || text.includes("keyword") || text.includes("style")) {
      // Look for an input or contenteditable within the same parent container.
      const container = label.closest('[class*="field" i], [class*="input" i], [class*="form-group" i], [data-testid*="field" i]') || label.parentElement;
      if (container) {
        const candidate = container.querySelector('input, textarea, [contenteditable="true"]');
        if (candidate && isVisible(candidate)) return candidate;
      }
    }
  }

  // Last resort: any visible contenteditable or input after a "Tags" heading.
  const allEditable = document.querySelectorAll('input, textarea, [contenteditable="true"]');
  for (const el of allEditable) {
    if (!isVisible(el)) continue;
    const aria = (el.getAttribute("aria-label") || "").toLowerCase();
    const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
    const idName = (el.id || el.name || "").toLowerCase();
    if (aria.includes("tag") || placeholder.includes("tag") || idName.includes("tag")) {
      return el;
    }
  }

  return null;
}

function isVisible(el) {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

async function uploadImages(item) {
  if (!item.images || item.images.length === 0) return false;

  const fileInput = await SECOND_SKIN.waitFor('input[type="file"]', 5000);
  if (!fileInput) {
    console.warn("[Second Skin] Grailed file input not found — images skipped.");
    return false;
  }

  const files = item.images.map((dataUrl, idx) => {
    const mime = dataUrl.match(/^data:([^;]+);base64,/)?.[1] || "image/jpeg";
    const base64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
    const ext = mime.split("/")[1] || "jpg";
    return { name: `photo_${idx + 1}.${ext}`, mime, data: base64 };
  });

  return SECOND_SKIN.injectFiles(fileInput, files);
}

async function chainCategoryAndDesigner() {
  // 1. Department / Category
  const categoryOk = await selectDropdownOption(
    GRAILED_PREFS.categoryTriggerText,
    GRAILED_PREFS.categoryOptionText
  );
  if (categoryOk) {
    console.log("[Second Skin] Grailed category set to", GRAILED_PREFS.categoryOptionText);
    await SECOND_SKIN.humanDelay(600, 800);
  }

  // 2. Subcategory (enabled only after category is selected).
  const subcategoryOk = await selectDropdownOption(
    GRAILED_PREFS.subcategoryTriggerText,
    GRAILED_PREFS.subcategoryOptionText
  );
  if (subcategoryOk) {
    console.log("[Second Skin] Grailed subcategory set to", GRAILED_PREFS.subcategoryOptionText);
    await SECOND_SKIN.humanDelay(600, 800);
  }

  // 3. Size (Radix dropdown; enabled after category is selected).
  if (GRAILED_PREFS.sizeOptionText) {
    const sizeOk = await selectDropdownOption(
      GRAILED_PREFS.sizeTriggerText,
      GRAILED_PREFS.sizeOptionText
    );
    if (sizeOk) {
      console.log("[Second Skin] Grailed size set to", GRAILED_PREFS.sizeOptionText);
      await SECOND_SKIN.humanDelay(400, 600);
    }
  }

  // 4. Designer autocomplete (enabled after category is selected).
  const designerInput = await SECOND_SKIN.waitForEnabled(
    '#designer-autocomplete, input[placeholder*="designer" i], input[aria-label*="designer" i]',
    5000
  );
  if (designerInput) {
    const filled = await SECOND_SKIN.fillAutocomplete(designerInput, GRAILED_PREFS.designerText);
    console.log("[Second Skin] Grailed designer", filled ? "set" : "not set", "to", GRAILED_PREFS.designerText);
  } else {
    console.warn("[Second Skin] Grailed designer input did not become enabled — category may not have committed.");
  }
}

async function fillCondition() {
  if (GRAILED_PREFS.conditionText) {
    const conditionOk = await selectDropdownOption("Condition", GRAILED_PREFS.conditionText);
    if (conditionOk) {
      console.log("[Second Skin] Grailed condition set to", GRAILED_PREFS.conditionText);
    }
  }
}

// Click a visible trigger whose text contains `triggerText`, then pick the option
// whose text contains `optionText`. Falls back to the first option if the target
// text is not found.
async function selectDropdownOption(triggerText, optionText) {
  if (!triggerText || !optionText) return false;

  const trigger = await findTriggerByText(triggerText);
  if (!trigger) return false;

  const specific = await SECOND_SKIN.selectRadixOption(trigger, optionText);
  if (specific) return true;

  // Fallback: open trigger and click the first available option.
  trigger.click();
  await SECOND_SKIN.humanDelay(300, 400);
  const firstOption = await SECOND_SKIN.waitFor(
    '[role="option"]:first-child, [role="menuitem"]:first-child, [data-testid*="option"]:first-child',
    2000
  );
  if (firstOption) {
    firstOption.click();
    await SECOND_SKIN.humanDelay(200, 300);
    return true;
  }
  return false;
}

async function findTriggerByText(text) {
  const selectors = [
    'button',
    '[role="combobox"]',
    '[role="button"]',
    '[data-state="closed"]'
  ];
  const deadline = Date.now() + 3000;

  while (Date.now() < deadline) {
    for (const sel of selectors) {
      const elements = document.querySelectorAll(sel);
      for (const el of elements) {
        const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        const t = (el.textContent || "").toLowerCase();
        const aria = (el.getAttribute("aria-label") || "").toLowerCase();
        const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
        if (visible && (t.includes(text.toLowerCase()) || aria.includes(text.toLowerCase()) || placeholder.includes(text.toLowerCase()))) {
          return el;
        }
      }
    }
    await SECOND_SKIN.humanDelay(300, 300);
  }
  return null;
}

// --- Demo bridge: parse active Grailed listing (#48) ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== "parseGrailedListing") return false;

  // Grailed is an SPA; wait briefly for the title to hydrate before reading.
  parseGrailedListingAsync()
    .then((data) => sendResponse({ ok: true, job: data }))
    .catch((err) => sendResponse({ ok: false, error: err.message || "Failed to parse Grailed listing." }));
  return true;
});

async function parseGrailedListingAsync() {
  await SECOND_SKIN.waitFor("h1, [data-testid*='title' i], [class*='title' i]", 2500);
  return parseActiveGrailedListing();
}

function parseActiveGrailedListing() {
  const ld = extractJsonLdProduct();

  const title = pickText([
    "h1",
    "[data-testid*='title' i]",
    "meta[property='og:title']",
    "meta[name='twitter:title']",
  ]) || ld.name || "";

  const description = pickText([
    "[data-testid*='description' i]",
    "[class*='description' i]",
    ".listing-description",
    "meta[property='og:description']",
    "meta[name='description']",
  ]) || ld.description || "";

  const priceRaw =
    pickText([
      "meta[property='product:price:amount']",
      "[data-testid*='price' i]",
      "[class*='price' i]",
    ]) || (ld.offers && ld.offers.price ? String(ld.offers.price) : "") || "";
  const price = priceRaw.replace(/[^\d.,]/g, "");

  const brand =
    ld.brand || pickText([
      "[data-testid*='designer' i]",
      "[class*='designer' i]",
      "meta[property='product:brand']",
    ]);

  const category =
    ld.category || pickText([
      "[data-testid*='category' i]",
      "[class*='category' i]",
    ]);

  const size =
    ld.size || pickText([
      "[data-testid*='size' i]",
      "[class*='size' i]",
    ]);

  const condition =
    ld.itemCondition || ld.condition || pickText([
      "[data-testid*='condition' i]",
      "[class*='condition' i]",
    ]);

  const images = pickImages();
  const tags = dedupeAndTrim(
    [...extractFashionTokens(title), ...extractFashionTokens(description)],
    10
  );

  return {
    url: window.location.href,
    title,
    description,
    price,
    images,
    tags,
    brand: brand || "",
    category: category || "",
    size: size || "",
    condition: normalizeCondition(condition),
  };
}

// Grailed uses Schema.org condition URLs (e.g. https://schema.org/NewCondition).
// Map those (and any raw label) onto our condition vocabulary where possible.
function normalizeCondition(raw) {
  if (!raw) return "";
  const s = String(raw).toLowerCase();
  // Check more-specific patterns before the bare "new" substring, so
  // "Like New" / LikeNewCondition don't collapse to "new".
  if (s.includes("like new") || s.includes("very good") || s.includes("excellent")) return "like_new";
  if (s.includes("new")) return "new";
  if (s.includes("fair") || s.includes("poor") || s.includes("worn")) return "fair";
  if (s.includes("distressed") || s.includes("heavily")) return "distressed";
  if (s.includes("good") || s.includes("used")) return "good";
  return "";
}

function pickText(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const text = (el.textContent || el.content || "").trim();
    if (text) return text;
  }
  return "";
}

function pickImages() {
  const urls = new Set();
  document.querySelectorAll('meta[property="og:image"], meta[property="og:image:secure_url"]').forEach((m) => {
    const url = m.getAttribute("content");
    if (url) urls.add(resolveUrl(url));
  });
  document.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("data-src") || img.getAttribute("src");
    if (!src) return;
    const absolute = resolveUrl(src);
    if (absolute.match(/\.(svg|png|ico)(\?|$)/i) && !absolute.match(/grailed|cdn/i)) return;
    if (absolute.match(/avatar|profile|placeholder/i)) return;
    if (img.naturalWidth && img.naturalHeight && (img.naturalWidth < 100 || img.naturalHeight < 100)) return;
    urls.add(absolute);
  });
  return Array.from(urls).slice(0, 8);
}

function resolveUrl(src) {
  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
  }
}

// Best-effort JSON-LD Product extraction. Grailed embeds Schema.org Product
// data on listing pages; fall back to "" for any missing field.
function extractJsonLdProduct() {
  const out = { name: "", description: "", brand: "", category: "", size: "", itemCondition: "", offers: null };
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      let data;
      try {
        data = JSON.parse(script.textContent || "");
      } catch {
        continue;
      }
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item && /product/i.test(item["@type"] || "")) {
          out.name = item.name || out.name;
          out.description = item.description || out.description;
          out.category = item.category || out.category;
          out.size = item.size || out.size;
          out.itemCondition = item.itemCondition || out.condition || out.itemCondition;
          if (item.brand) out.brand = typeof item.brand === "string" ? item.brand : (item.brand.name || "");
          if (item.offers) out.offers = item.offers;
        }
      }
    }
  } catch {
    // ignore — fall back to DOM/meta selectors
  }
  return out;
}

function extractFashionTokens(text) {
  if (!text) return [];
  const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const tokens = [];
  const keywords = [
    "nike", "adidas", "supreme", "levis", "carhartt", "champion", "ralph lauren",
    "vintage", "retro", "y2k", "streetwear", "rare", "deadstock",
    "tee", "t-shirt", "tshirt", "shirt", "jacket", "pants", "jeans", "shorts",
    "hoodie", "sweatshirt", "dress", "sweater", "coat", "flannel"
  ];
  for (const word of keywords) {
    if (lower.includes(word)) tokens.push(word);
  }
  return tokens;
}

function dedupeAndTrim(items, limit) {
  return Array.from(new Set(items.map((s) => String(s).trim().toLowerCase()).filter(Boolean))).slice(0, limit);
}

// --- Passive Grailed sold-state detection (#51) ---
//
// Mirrors the Depop profile scraper (content_depop.js passiveProfileScrape).
// When the operator views a Grailed storefront or the listings index — a page
// that shows a seller's live listings — cross-reference inventory and mark any
// active Grailed item whose URL is no longer in the live set as "sold".
//
// Honest UX: this is DETECTION ONLY. It never auto-delists, removes, or
// publishes anything; it only flips the local inventory status to "sold" so the
// dashboard can surface it. The user reviews and acts.
//
// Known limitations (same shape as the Depop scraper):
//   - A paginated storefront only shows the first page of listings; items on
//     later pages are not in `liveUrls` and would be falsely marked sold.
//   - Viewing another seller's storefront marks your items (whose URLs aren't
//     on that page) sold. Status is user-correctable; no destructive action.
// Mitigation: only run on storefront/index-style paths (a bare /segment, e.g.
// grailed.com/<seller> or grailed.com/listings), never on a single listing
// (grailed.com/listings/<id>), and only when listing links are present.

function passiveGrailedScrape() {
  // Storefront/index-style path: a single path segment (e.g. /<seller> or
  // /listings). Excludes single listings (/listings/<id>) and /sell/new (two
  // segments). /sell (exact) does match, but the sell form has no listing
  // links, so liveUrls is empty and we early-return below — no harm.
  if (!window.location.pathname.match(/^\/[a-zA-Z0-9_.-]+\/?$/)) return;

  const liveUrls = Array.from(document.querySelectorAll('a[href*="/listings/"]'))
    .map((a) => a.href)
    .filter((href) => /grailed\.com\/listings\//i.test(href));
  if (liveUrls.length === 0) return;

  chrome.storage.local.get(["inventory"], (data) => {
    const inventory = data.inventory || [];
    let mutated = false;

    inventory.forEach((item) => {
      const meta = item.platforms && item.platforms.grailed;
      if (meta && meta.status === "active" && meta.url && !liveUrls.includes(meta.url)) {
        meta.status = "sold";
        meta.lastChecked = new Date().toISOString();
        mutated = true;
      }
    });

    if (mutated) {
      chrome.storage.local.set({ inventory });
    }
  });
}

setTimeout(passiveGrailedScrape, 3500);

const grailedObserver = new MutationObserver(() => {
  if (grailedObserver._timer) clearTimeout(grailedObserver._timer);
  grailedObserver._timer = setTimeout(passiveGrailedScrape, 1500);
});

grailedObserver.observe(document.body, { childList: true, subtree: true });
