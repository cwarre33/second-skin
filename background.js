// background.js — Service Worker

chrome.runtime.onInstalled.addListener(() => {
  // Seed a clean mutex on install/update so no stale job lingers.
  storageSet({ currentListingJob: null });
  console.log("[Second Skin] Extension installed. Job mutex reset.");
});

// Seed Ollama defaults if the user has not configured them yet.
chrome.runtime.onInstalled.addListener(async () => {
  const result = await storageGet(["ollamaConfig", "allowedOrigins"]);
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
  if (!result.allowedOrigins) {
    await storageSet({ allowedOrigins: DEFAULT_ALLOWED_ORIGINS });
  }
});

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://second-skin-zeta.vercel.app"
];

function storageSet(items) {
  return new Promise((resolve) => chrome.storage.local.set(items, resolve));
}

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

async function getAllowedOrigins() {
  const result = await storageGet(["allowedOrigins"]);
  return new Set(result.allowedOrigins || DEFAULT_ALLOWED_ORIGINS);
}

async function isAllowedOrigin(url) {
  try {
    return (await getAllowedOrigins()).has(new URL(url).origin);
  } catch {
    return false;
  }
}

// Listen for messages from the demo web app.
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log("[Second Skin] External message from", sender.url, "type:", message?.type);

  isAllowedOrigin(sender.url).then((allowed) => {
    if (!allowed) {
      console.warn("[Second Skin] Unauthorized origin:", sender.url);
      sendResponse({ ok: false, error: "Unauthorized origin" });
      return;
    }

    const { type } = message || {};

    if (type === "PING") {
      sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
      return;
    }

    if (type === "PARSE_DEPOP") {
      handleParseDepop(message.url).then(sendResponse).catch((err) => {
        sendResponse({ ok: false, error: err.message });
      });
      return;
    }

    if (type === "AUTOFILL_GRAILED") {
      handlePublish(message.job, "grailed").then(sendResponse).catch((err) => {
        sendResponse({ ok: false, error: err.message });
      });
      return;
    }

    if (type === "PUBLISH_DEPOP") {
      handlePublish(message.job, "depop").then(sendResponse).catch((err) => {
        sendResponse({ ok: false, error: err.message });
      });
      return;
    }

    sendResponse({ ok: false, error: `Unknown message type: ${type}` });
  });

  return true; // keep channel open for async origin check
});

async function handleParseDepop(url) {
  const tabs = await chrome.tabs.query({ url: ["*://*.depop.com/*"] });
  const target =
    tabs.find((t) => url && t.url && t.url.split("?")[0] === url.split("?")[0]) ||
    tabs.find((t) => url && t.url === url) ||
    tabs.find((t) => t.active) ||
    tabs[0];
  if (!target) {
    return { ok: false, error: "No Depop tab found. Open the listing and try again." };
  }

  async function sendParseMessage(tabId) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { action: "parseDepopListing" }, (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve(response || { ok: false, error: "No response from Depop page." });
      });
    });
  }

  try {
    return await sendParseMessage(target.id);
  } catch (err) {
    const isMissingReceiver = /receiving end does not exist/i.test(err.message);
    if (!isMissingReceiver) {
      return { ok: false, error: err.message };
    }

    // Content script is not running in this tab (common after extension install
    // or on pre-rendered SPAs). Programmatically inject it and retry once.
    try {
      await chrome.scripting.executeScript({
        target: { tabId: target.id },
        files: ["shared.js", "content_depop.js"],
      });
      return await sendParseMessage(target.id);
    } catch (injectErr) {
      return {
        ok: false,
        error: `Could not inject into Depop tab: ${injectErr.message}`,
      };
    }
  }
}

async function handlePublish(job, targetSite) {
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
    targetSite,
    itemId,
    demo: true,
    demoJob: item
  };

  await storageSet({ currentListingJob: listingJob });
  const result = await storageGet(["inventory"]);
  const inventory = result.inventory || [];
  inventory.push(item);
  await storageSet({ inventory });

  if (targetSite === "grailed") {
    const grailedUrl = "https://www.grailed.com/sell";
    const grailedTabs = await chrome.tabs.query({ url: ["*://*.grailed.com/sell*"] });
    if (grailedTabs.length > 0) {
      await chrome.tabs.update(grailedTabs[0].id, { active: true });
    } else {
      await chrome.tabs.create({ url: grailedUrl });
    }
  } else if (targetSite === "depop") {
    const depopUrl = "https://www.depop.com/products/create/";
    const depopTabs = await chrome.tabs.query({ url: ["*://*.depop.com/products/create*"] });
    if (depopTabs.length > 0) {
      await chrome.tabs.update(depopTabs[0].id, { active: true });
    } else {
      await chrome.tabs.create({ url: depopUrl });
    }
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
