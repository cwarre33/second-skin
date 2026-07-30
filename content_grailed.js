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
