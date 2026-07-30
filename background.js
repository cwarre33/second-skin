// background.js — Service Worker

chrome.runtime.onInstalled.addListener(() => {
  // Seed a clean mutex on install/update so no stale job lingers.
  storageSet({ currentListingJob: null });
  console.log("[Second Skin] Extension installed. Job mutex reset.");
});

// Seed Ollama defaults if the user has not configured them yet.
chrome.runtime.onInstalled.addListener(async () => {
  const result = await storageGet(["ollamaConfig"]);
  if (!result.ollamaConfig) {
    await storageSet({
      ollamaConfig: {
        baseUrl: "http://localhost:11434",
        visionModel: "llava",
        textModel: "gemma4:latest",
        temperature: 0.7
      }
    });
  }
});

// Allowed web origins for the demo (issue #30).
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

function storageSet(items) {
  return new Promise((resolve) => chrome.storage.local.set(items, resolve));
}

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function isAllowedOrigin(url) {
  try {
    return ALLOWED_ORIGINS.has(new URL(url).origin);
  } catch {
    return false;
  }
}

// Listen for messages from the demo web app.
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!isAllowedOrigin(sender.url)) {
    sendResponse({ ok: false, error: "Unauthorized origin" });
    return false;
  }

  const { type } = message || {};

  if (type === "PING") {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return false;
  }

  if (type === "PARSE_DEPOP") {
    handleParseDepop(message.url).then(sendResponse).catch((err) => {
      sendResponse({ ok: false, error: err.message });
    });
    return true; // async
  }

  if (type === "AUTOFILL_GRAILED") {
    handleAutofillGrailed(message.job).then(sendResponse).catch((err) => {
      sendResponse({ ok: false, error: err.message });
    });
    return true; // async
  }

  sendResponse({ ok: false, error: `Unknown message type: ${type}` });
  return false;
});

async function handleParseDepop(url) {
  const tabs = await chrome.tabs.query({ url: ["*://*.depop.com/*"] });
  const target = tabs.find((t) => (url ? t.url === url : t.active)) || tabs[0];
  if (!target) {
    return { ok: false, error: "No Depop tab found. Open the listing and try again." };
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(target.id, { action: "parseDepopListing" }, (response) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      resolve(response || { ok: false, error: "No response from Depop page." });
    });
  });
}

async function handleAutofillGrailed(job) {
  if (!job || !job.title) {
    return { ok: false, error: "Job missing required fields." };
  }

  const itemId = `demo-${Date.now()}`;
  const item = {
    id: itemId,
    title: job.title,
    description: job.description || "",
    price: job.price || "",
    images: job.images || [],
    tags: job.tags || [],
    platforms: {}
  };

  const listingJob = {
    targetSite: "grailed",
    itemId,
    demo: true,
    demoJob: item
  };

  await storageSet({ currentListingJob: listingJob });
  const result = await storageGet(["inventory"]);
  const inventory = result.inventory || [];
  inventory.push(item);
  await storageSet({ inventory });

  const grailedUrl = "https://www.grailed.com/sell";
  const grailedTabs = await chrome.tabs.query({ url: ["*://*.grailed.com/sell*"] });
  if (grailedTabs.length > 0) {
    await chrome.tabs.update(grailedTabs[0].id, { active: true });
  } else {
    await chrome.tabs.create({ url: grailedUrl });
  }

  return { ok: true };
}

// Listen for future orchestration messages from the dashboard or content scripts.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "clearJobMutex") {
    storageSet({ currentListingJob: null }).then(() => {
      sendResponse({ ok: true });
    });
    return true; // async response
  }

  if (message.action === "getJob") {
    storageGet(["currentListingJob"]).then((result) => {
      sendResponse({ job: result.currentListingJob });
    });
    return true;
  }
});
