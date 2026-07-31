// content_depop.js — Depop automation & passive scraper layer

(function executionEngine() {
  chrome.storage.local.get(["currentListingJob", "inventory"], (state) => {
    const job = state.currentListingJob;
    if (!job || job.targetSite !== "depop") return;

    const activeItem = job.demoJob
      ? job.demoJob
      : (state.inventory || []).find((item) => item.id === job.itemId);
    if (!activeItem) {
      SECOND_SKIN.clearJobMutex();
      return;
    }

    if (window.location.href.includes("/products/create")) {
      processDepopForm(activeItem, job.demoJob ? { demo: true } : {});
    }
  });
})();

async function processDepopForm(item, options = {}) {
  const isDemo = options.demo || false;
  console.log("[Second Skin] Starting Depop listing for", item.id || "demo");
  await SECOND_SKIN.humanDelay(1500, 1500);

  const unifiedBody = `${item.title}\n\n${item.description}`;

  const descriptionEl = await SECOND_SKIN.waitFor('textarea[name="description"]');
  const priceEl = await SECOND_SKIN.waitFor('input[name="price"]');

  const descriptionInjected = SECOND_SKIN.dispatchSyntheticInput(descriptionEl, unifiedBody);
  const priceInjected = SECOND_SKIN.dispatchSyntheticInput(priceEl, item.price);

  if (!descriptionInjected || !priceInjected) {
    console.warn("[Second Skin] Depop basic fields not found — partial or no injection.");
    return;
  }

  let imagesInjected = false;
  if (!isDemo && item.images && item.images.length > 0) {
    const fileInput = await SECOND_SKIN.waitFor('input[type="file"]', 3000);
    if (fileInput) {
      imagesInjected = await SECOND_SKIN.injectFiles(fileInput, item.images);
    } else {
      console.warn("[Second Skin] Depop file input not found — images skipped.");
    }
  }

  // Structured fields (#49): map category/brand/size/condition from the draft
  // into Depop's create form via chained selectors. No-harm — each field is
  // skipped silently if its control isn't found, so this never blocks the basic
  // description/price fill above.
  await fillDepopStructuredFields(item);

  if (item.id) {
    await SECOND_SKIN.updatePlatformMeta(item.id, "depop", "active");
  }
  SECOND_SKIN.clearJobMutex();
  console.log("[Second Skin] Depop form ready for review:", item.id || "demo");
  if (imagesInjected) console.log("[Second Skin] Depop images injected for", item.id);
  console.log("[Second Skin] Listing stopped before publish — review and submit manually.");
}

// --- Depop structured-field autofill (#49) ---

// Map our condition vocabulary to Depop's condition labels. Depop's web create
// form uses human-readable condition names; match by substring so minor label
// drift ("New with tags" vs "New with tags (NWT)") still resolves.
const DEPOP_CONDITION_MAP = {
  new: "New with tags",
  like_new: "New without tags",
  good: "Good",
  fair: "Fair",
  distressed: "Poor",
};

async function fillDepopStructuredFields(item) {
  if (!item) return;

  if (item.category) {
    const ok = await selectDepopDropdown("Category", item.category);
    if (ok) {
      console.log("[Second Skin] Depop category set to", item.category);
      await SECOND_SKIN.humanDelay(400, 600);
    }
  }
  if (item.brand) {
    const ok = await fillDepopBrand(item.brand);
    if (ok) console.log("[Second Skin] Depop brand set to", item.brand);
  }
  if (item.size) {
    const ok = await selectDepopDropdown("Size", item.size);
    if (ok) console.log("[Second Skin] Depop size set to", item.size);
  }
  if (item.condition) {
    const label = DEPOP_CONDITION_MAP[item.condition] || item.condition;
    const ok = await selectDepopDropdown("Condition", label);
    if (ok) console.log("[Second Skin] Depop condition set to", label);
  }
}

// Open a Depop dropdown trigger (Radix or native <select>) and pick the option
// whose text matches `optionText`. Returns false (no-harm) if the control or
// option isn't found, so a missing field never aborts the rest of the fill.
async function selectDepopDropdown(triggerText, optionText) {
  if (!triggerText || !optionText) return false;

  // Native <select> first — Depop still uses some plain selects.
  const native = findNativeSelectByLabel(triggerText);
  if (native) {
    const opt = Array.from(native.options).find((o) =>
      o.text.toLowerCase().includes(optionText.toLowerCase())
    );
    if (opt) {
      native.value = opt.value;
      native.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
  }

  // Radix-style trigger + menu.
  const trigger = await findDepopTriggerByText(triggerText);
  if (!trigger) return false;
  const specific = await SECOND_SKIN.selectRadixOption(trigger, optionText);
  if (specific) return true;

  // Fallback: open and click the first available option (better than nothing).
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

async function fillDepopBrand(brand) {
  const input = await SECOND_SKIN.waitForEnabled(
    'input[name="brand" i], input[id*="brand" i], input[placeholder*="brand" i], input[aria-label*="brand" i]',
    4000
  );
  if (!input) return false;
  return SECOND_SKIN.fillAutocomplete(input, brand);
}

function findNativeSelectByLabel(labelText) {
  const lower = labelText.toLowerCase();
  // A <select> whose <label for=...> matches.
  for (const sel of document.querySelectorAll("select")) {
    if (sel.id) {
      const lab = document.querySelector(`label[for="${CSS.escape(sel.id)}"]`);
      if (lab && (lab.textContent || "").toLowerCase().includes(lower)) return sel;
    }
  }
  // A <select> inside a labeled field container.
  for (const lab of document.querySelectorAll("label")) {
    if ((lab.textContent || "").toLowerCase().includes(lower)) {
      const container = lab.closest('label, [class*="field" i], [class*="group" i]') || lab.parentElement;
      if (container) {
        const sel = container.querySelector("select");
        if (sel) return sel;
      }
    }
  }
  return null;
}

async function findDepopTriggerByText(text) {
  const selectors = ["button", '[role="combobox"]', '[role="button"]', '[data-state="closed"]'];
  const deadline = Date.now() + 3000;
  const lower = text.toLowerCase();
  while (Date.now() < deadline) {
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        if (!visible) continue;
        const t = (el.textContent || "").toLowerCase();
        const aria = (el.getAttribute("aria-label") || "").toLowerCase();
        const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
        if (t.includes(lower) || aria.includes(lower) || placeholder.includes(lower)) return el;
      }
    }
    await SECOND_SKIN.humanDelay(300, 300);
  }
  return null;
}

// --- Passive profile scraper (sold-state detection) ---

function passiveProfileScrape() {
  if (!window.location.pathname.match(/^\/[a-zA-Z0-9_.-]+\/?$/)) return;

  const cards = document.querySelectorAll('[data-testid="productCard"]');
  if (cards.length === 0) return;

  const liveUrls = Array.from(cards)
    .map((card) => {
      const anchor = card.querySelector("a");
      return anchor ? anchor.href : null;
    })
    .filter(Boolean);

  chrome.storage.local.get(["inventory"], (data) => {
    const inventory = data.inventory || [];
    let mutated = false;

    inventory.forEach((item) => {
      const meta = item.platforms.depop;
      if (meta.status === "active" && meta.url && !liveUrls.includes(meta.url)) {
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

setTimeout(passiveProfileScrape, 3500);

const observer = new MutationObserver(() => {
  if (observer._timer) clearTimeout(observer._timer);
  observer._timer = setTimeout(passiveProfileScrape, 1500);
});

observer.observe(document.body, { childList: true, subtree: true });

// --- Demo bridge: parse active Depop listing ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== "parseDepopListing") return false;

  // Depop is an SPA: the listing DOM may not have hydrated when the message
  // arrives. Wait briefly for a title-like element, then read the DOM. Keep the
  // channel open (return true) so sendResponse fires after the async work.
  parseActiveListingAsync()
    .then((data) => sendResponse({ ok: true, job: data }))
    .catch((err) => sendResponse({ ok: false, error: err.message || "Failed to parse Depop listing." }));
  return true;
});

async function parseActiveListingAsync() {
  await SECOND_SKIN.waitFor(
    '[data-testid*="title" i], h1, [class*="title" i]',
    2500
  );
  return parseActiveListing();
}

function parseActiveListing() {
  const title = pickText([
    '[data-testid*="title" i]',
    'h1',
    '[class*="title" i]',
    'meta[property="og:title"]',
    'meta[name="twitter:title"]'
  ]);

  const description = pickText([
    '[data-testid*="description" i]',
    '[class*="description" i]',
    '.description p',
    'p[class*="description" i]',
    'meta[property="og:description"]',
    'meta[name="description"]'
  ]);

  const price = pickText([
    '[data-testid*="price" i]',
    '[class*="price" i]',
    'meta[property="product:price:amount"]'
  ]).replace(/[^\d.,]/g, "");

  const images = pickImages();

  const rawTags = [
    ...extractMetaKeywords(),
    ...extractFashionTokens(title),
    ...extractFashionTokens(description)
  ];

  const tags = dedupeAndTrim(rawTags, 10);

  return {
    url: window.location.href,
    title,
    description,
    price,
    images,
    tags
  };
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
  // Cheap image collection: og:image, product shots from data-src/src, and srcset.
  const urls = new Set();

  document.querySelectorAll('meta[property="og:image"], meta[property="og:image:secure_url"]').forEach((m) => {
    const url = m.getAttribute("content");
    if (url) urls.add(resolveUrl(url));
  });

  document.querySelectorAll('img').forEach((img) => {
    const src =
      img.getAttribute("data-src") ||
      img.getAttribute("data-lazy-src") ||
      img.getAttribute("src");
    if (!src) return;
    const absolute = resolveUrl(src);
    // Skip tiny icons and generic placeholders.
    if (absolute.match(/\.(svg|png|ico)(\?|$)/i) && !absolute.match(/depop|cdn/i)) return;
    // Skip avatars / profile / placeholder imagery that leaks past the icon filter.
    if (absolute.match(/avatar|profile|placeholder/i)) return;
    // Skip loaded images smaller than 100px (thumbnails of related items/avatars).
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

function extractMetaKeywords() {
  const meta = document.querySelector('meta[name="keywords"]');
  if (!meta) return [];
  return (meta.getAttribute("content") || "").split(/[,\s]+/).filter(Boolean);
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
