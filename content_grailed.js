// content_grailed.js — Grailed automation layer

(function executionEngine() {
  chrome.storage.local.get(["currentListingJob", "inventory"], (state) => {
    const job = state.currentListingJob;
    if (!job || job.targetSite !== "grailed") return;

    const activeItem = (state.inventory || []).find((item) => item.id === job.itemId);
    if (!activeItem) {
      SECOND_SKIN.clearJobMutex();
      return;
    }

    if (window.location.href.includes("/sell")) {
      processGrailedForm(activeItem);
    }
  });
})();

async function processGrailedForm(item) {
  await SECOND_SKIN.humanDelay(1500, 1500);

  const titleEl = await SECOND_SKIN.waitFor('input[name="title"]');
  const priceEl = await SECOND_SKIN.waitFor('input[name="price"]');
  const descriptionEl = await SECOND_SKIN.waitFor('textarea[name="description"]');

  const titleInjected = SECOND_SKIN.dispatchSyntheticInput(titleEl, item.title);
  const priceInjected = SECOND_SKIN.dispatchSyntheticInput(priceEl, item.price);
  const descriptionInjected = SECOND_SKIN.dispatchSyntheticInput(descriptionEl, item.description);

  let imagesInjected = false;
  if (item.images && item.images.length > 0) {
    const fileInput = await SECOND_SKIN.waitFor('input[type="file"]', 3000);
    if (fileInput) {
      imagesInjected = await SECOND_SKIN.injectFiles(fileInput, item.images);
    } else {
      console.warn("[Second Skin] Grailed file input not found — images skipped.");
    }
  }

  await chainCategoryAndDesigner();

  if (titleInjected && priceInjected && descriptionInjected) {
    await SECOND_SKIN.updatePlatformMeta(item.id, "grailed", "active");
    SECOND_SKIN.clearJobMutex();
    console.log("[Second Skin] Grailed form fields injected for", item.id);
    if (imagesInjected) console.log("[Second Skin] Grailed images injected for", item.id);
  } else {
    console.warn("[Second Skin] Grailed selectors not found — partial or no injection.");
  }
}

async function chainCategoryAndDesigner() {
  // Grailed requires selecting Category → Subcategory → Designer in sequence.
  // These selectors are platform-specific and should be refined against the live DOM.

  const categoryEl = await SECOND_SKIN.waitFor('[data-testid="category-trigger"], button[aria-label*="Category"]', 3000);
  if (categoryEl) {
    categoryEl.click();
    await SECOND_SKIN.humanDelay(300, 400);

    const firstCategory = await SECOND_SKIN.waitFor('[data-testid="category-option"]:first-child, [role="option"]:first-child', 3000);
    if (firstCategory) {
      firstCategory.click();
      await SECOND_SKIN.humanDelay(300, 400);
    }
  }

  const designerEl = await SECOND_SKIN.waitFor('[data-testid="designer-trigger"], input[placeholder*="designer" i]', 3000);
  if (designerEl) {
    if (designerEl.tagName === "INPUT") {
      SECOND_SKIN.dispatchSyntheticInput(designerEl, "Vintage");
      await SECOND_SKIN.humanDelay(400, 600);
      const firstDesigner = await SECOND_SKIN.waitFor('[role="option"]:first-child', 2000);
      if (firstDesigner) firstDesigner.click();
    } else {
      designerEl.click();
      await SECOND_SKIN.humanDelay(300, 400);
      const firstDesigner = await SECOND_SKIN.waitFor('[data-testid="designer-option"]:first-child, [role="option"]:first-child', 3000);
      if (firstDesigner) firstDesigner.click();
    }
  }
}
