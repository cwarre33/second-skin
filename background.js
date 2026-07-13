// background.js — Service Worker

chrome.runtime.onInstalled.addListener(() => {
  // Seed a clean mutex on install/update so no stale job lingers.
  chrome.storage.local.set({ currentListingJob: null });
  console.log("[Second Skin] Extension installed. Job mutex reset.");
});

// Listen for future orchestration messages from the dashboard or content scripts.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "clearJobMutex") {
    chrome.storage.local.set({ currentListingJob: null }, () => {
      sendResponse({ ok: true });
    });
    return true; // async response
  }

  if (message.action === "getJob") {
    chrome.storage.local.get(["currentListingJob"], (result) => {
      sendResponse({ job: result.currentListingJob });
    });
    return true;
  }
});
