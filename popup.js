// popup.js — Extension action popup for Second Skin

const DEMO_ORIGIN = "https://second-skin-zeta.vercel.app";
const DEMO_DEV_ORIGIN = "http://localhost:3000";

const hintEl = document.getElementById("hint");
const crossListBtn = document.getElementById("crossListBtn");
const openDemoBtn = document.getElementById("openDemoBtn");
const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    showError("No active tab found.");
    return;
  }

  const isDepop = tab.url && /^https?:\/\/([^/]+\.)?depop\.com\//i.test(tab.url);
  if (!isDepop) {
    hintEl.textContent = "Navigate to a Depop listing to cross-list it.";
    crossListBtn.disabled = true;
  } else {
    crossListBtn.disabled = false;
    crossListBtn.addEventListener("click", () => handleCrossList(tab));
  }

  openDemoBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: DEMO_ORIGIN });
    window.close();
  });
}

async function handleCrossList(tab) {
  crossListBtn.disabled = true;
  statusEl.textContent = "Reading Depop listing...";
  errorEl.textContent = "";

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: "parseDepopListing" });
    if (!response?.ok || !response.job) {
      throw new Error(response?.error || "Could not parse this Depop page.");
    }

    const job = response.job;
    const demoUrl = await buildDemoUrl(job);
    chrome.tabs.create({ url: demoUrl });
    window.close();
  } catch (err) {
    console.error("[Second Skin] Popup cross-list failed:", err);
    showError(err.message || "Failed to read Depop listing.");
    crossListBtn.disabled = false;
    statusEl.textContent = "";
  }
}

async function buildDemoUrl(job) {
  const params = new URLSearchParams();
  params.set("source", "depop");
  params.set("url", job.url || "");
  params.set("title", job.title || "");
  params.set("description", job.description || "");
  params.set("price", job.price || "");
  if (Array.isArray(job.tags)) {
    params.set("tags", job.tags.join(", "));
  }
  if (Array.isArray(job.images) && job.images.length > 0) {
    // Pass only the first image to avoid overly long URLs.
    params.set("image", job.images[0]);
  }

  // Target the dev demo (localhost:3000) when the operator has opted in via
  // chrome.storage.local.demoDevMode; otherwise ship the production demo URL.
  const useDev = await new Promise((resolve) =>
    chrome.storage.local.get(["demoDevMode"], (data) => resolve(!!data.demoDevMode))
  );
  const origin = useDev ? DEMO_DEV_ORIGIN : DEMO_ORIGIN;
  return `${origin}/?${params.toString()}`;
}

function showError(message) {
  errorEl.textContent = message;
  statusEl.textContent = "";
}

init().catch((err) => {
  console.error("[Second Skin] Popup init failed:", err);
  showError(err.message || "Popup failed to initialize.");
});
