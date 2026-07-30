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

  if (item.id) {
    await SECOND_SKIN.updatePlatformMeta(item.id, "depop", "active");
  }
  SECOND_SKIN.clearJobMutex();
  console.log("[Second Skin] Depop form ready for review:", item.id || "demo");
  if (imagesInjected) console.log("[Second Skin] Depop images injected for", item.id);
  console.log("[Second Skin] Listing stopped before publish — review and submit manually.");
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

  const data = parseActiveListing();
  sendResponse({ ok: true, job: data });
  return false;
});

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
