// content_depop.js — Depop automation & passive scraper layer

(function executionEngine() {
  chrome.storage.local.get(["currentListingJob", "inventory"], (state) => {
    const job = state.currentListingJob;
    if (!job || job.targetSite !== "depop") return;

    const activeItem = (state.inventory || []).find((item) => item.id === job.itemId);
    if (!activeItem) {
      clearJobMutex();
      return;
    }

    if (window.location.href.includes("/products/create")) {
      processDepopForm(activeItem);
    }
  });
})();

function processDepopForm(item) {
  // Graceful initialization window for framework DOM rendering
  const delay = Math.floor(Math.random() * 1500) + 1500;

  setTimeout(() => {
    // Depop's description textarea appears to combine title + body in practice.
    const unifiedBody = `${item.title}\n\n${item.description}`;

    const descriptionInjected = dispatchSyntheticInput('textarea[name="description"]', unifiedBody);
    const priceInjected = dispatchSyntheticInput('input[name="price"]', item.price);

    if (descriptionInjected && priceInjected) {
      updatePlatformMeta(item.id, "depop", "active");
      clearJobMutex();
      console.log("[Second Skin] Depop form fields injected for", item.id);
    } else {
      console.warn("[Second Skin] Depop selectors not found — partial or no injection.");
    }
  }, delay);
}

function dispatchSyntheticInput(selector, value) {
  const element = document.querySelector(selector);
  if (!element) return false;

  // 1. Native value mutation
  element.value = value;

  // 2. Triple-event burst to satisfy React/Next.js state hooks
  element.dispatchEvent(new Event("focus", { bubbles: true }));
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));

  return true;
}

function updatePlatformMeta(itemId, site, status) {
  chrome.storage.local.get(["inventory"], (result) => {
    const inventory = result.inventory || [];
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;

    item.platforms[site] = {
      ...item.platforms[site],
      status,
      lastChecked: new Date().toISOString()
    };

    chrome.storage.local.set({ inventory });
  });
}

function clearJobMutex() {
  chrome.storage.local.set({ currentListingJob: null });
}

// --- Passive profile scraper (sold-state detection) ---

function passiveProfileScrape() {
  // Guard: only run on seller profile routes like /username
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

// Run once after page settles, then watch for DOM mutations.
setTimeout(passiveProfileScrape, 3500);

const observer = new MutationObserver(() => {
  // Debounce: avoid firing on every micro-mutation
  if (observer._timer) clearTimeout(observer._timer);
  observer._timer = setTimeout(passiveProfileScrape, 1500);
});

observer.observe(document.body, { childList: true, subtree: true });
