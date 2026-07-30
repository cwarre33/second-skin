// content_depop.js — Depop automation & passive scraper layer

(function executionEngine() {
  chrome.storage.local.get(["currentListingJob", "inventory"], (state) => {
    const job = state.currentListingJob;
    if (!job || job.targetSite !== "depop") return;

    const activeItem = (state.inventory || []).find((item) => item.id === job.itemId);
    if (!activeItem) {
      SECOND_SKIN.clearJobMutex();
      return;
    }

    if (window.location.href.includes("/products/create")) {
      processDepopForm(activeItem);
    }
  });
})();

async function processDepopForm(item) {
  await SECOND_SKIN.humanDelay(1500, 1500);

  const unifiedBody = `${item.title}\n\n${item.description}`;

  const descriptionEl = await SECOND_SKIN.waitFor('textarea[name="description"]');
  const priceEl = await SECOND_SKIN.waitFor('input[name="price"]');

  const descriptionInjected = SECOND_SKIN.dispatchSyntheticInput(descriptionEl, unifiedBody);
  const priceInjected = SECOND_SKIN.dispatchSyntheticInput(priceEl, item.price);

  let imagesInjected = false;
  if (item.images && item.images.length > 0) {
    const fileInput = await SECOND_SKIN.waitFor('input[type="file"]', 3000);
    if (fileInput) {
      imagesInjected = await SECOND_SKIN.injectFiles(fileInput, item.images);
    } else {
      console.warn("[Second Skin] Depop file input not found — images skipped.");
    }
  }

  if (descriptionInjected && priceInjected) {
    await SECOND_SKIN.updatePlatformMeta(item.id, "depop", "active");
    SECOND_SKIN.clearJobMutex();
    console.log("[Second Skin] Depop form fields injected for", item.id);
    if (imagesInjected) console.log("[Second Skin] Depop images injected for", item.id);
  } else {
    console.warn("[Second Skin] Depop selectors not found — partial or no injection.");
  }
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
  const titleEl =
    document.querySelector('h1') ||
    document.querySelector('[data-testid*="title" i]') ||
    document.querySelector('[class*="title" i]');

  const descriptionEl =
    document.querySelector('[data-testid*="description" i]') ||
    document.querySelector('.description p') ||
    document.querySelector('p[class*="description" i]') ||
    document.querySelector('meta[name="description"]');

  const title = (titleEl?.textContent || titleEl?.content || "").trim();
  const description = (descriptionEl?.textContent || descriptionEl?.content || "").trim();

  // Simple tag extraction from the title/description and page meta keywords.
  const metaKeywords = document.querySelector('meta[name="keywords"]');
  const keywords = metaKeywords?.content || "";
  const tags = Array.from(new Set([
    ...keywords.split(/[,\s]+/).filter(Boolean),
    ...extractFashionTokens(title),
    ...extractFashionTokens(description)
  ])).slice(0, 10);

  return {
    url: window.location.href,
    title,
    description,
    tags
  };
}

function extractFashionTokens(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const tokens = [];
  const brands = ["nike", "adidas", "supreme", "levis", "vintage", "carhartt", "ralph lauren", "champion"];
  const categories = ["tee", "t-shirt", "shirt", "jacket", "pants", "jeans", "shorts", "hoodie", "sweatshirt", "dress"];
  for (const word of [...brands, ...categories]) {
    if (lower.includes(word)) tokens.push(word);
  }
  return tokens;
}
