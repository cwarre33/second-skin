// content_grailed.js — Grailed automation layer

(function executionEngine() {
  chrome.storage.local.get(["currentListingJob", "inventory"], (state) => {
    const job = state.currentListingJob;
    if (!job || job.targetSite !== "grailed") return;

    const activeItem = (state.inventory || []).find((item) => item.id === job.itemId);
    if (!activeItem) {
      clearJobMutex();
      return;
    }

    if (window.location.href.includes("/sell")) {
      processGrailedForm(activeItem);
    }
  });
})();

function processGrailedForm(item) {
  // Human-like randomized delay to reduce anti-bot signals
  const delay = Math.floor(Math.random() * 1500) + 1500;

  setTimeout(() => {
    // Grailed splits the listing flow across title, price, category, subcategory, designer.
    // This MVP injects the simplest text fields; multi-step menus require per-DOM selectors.
    const titleInjected = dispatchSyntheticInput('input[name="title"]', item.title);
    const priceInjected = dispatchSyntheticInput('input[name="price"]', item.price);
    const descriptionInjected = dispatchSyntheticInput('textarea[name="description"]', item.description);

    if (titleInjected && priceInjected && descriptionInjected) {
      updatePlatformMeta(item.id, "grailed", "active");
      clearJobMutex();
      console.log("[Second Skin] Grailed form fields injected for", item.id);
    } else {
      console.warn("[Second Skin] Grailed selectors not found — partial or no injection.");
    }
  }, delay);
}

function dispatchSyntheticInput(selector, value) {
  const element = document.querySelector(selector);
  if (!element) return false;

  element.value = value;

  // Triple-event burst for React/Vue state hooks
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

// TODO: chained multi-step selector helper for Grailed category/designer menus.
// Example shape:
// async function clickWhenPresent(selector, timeout = 5000) { ... }
