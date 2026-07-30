// dashboard.js — Control Center / Options Page

const INITIAL_INVENTORY = [
  {
    id: "item_001",
    title: "Vintage 1994 Nine Inch Nails Downward Spiral Tee",
    price: "250",
    description: "Single stitch, fade present. Boxy XL. Pit to pit: 24in, Length: 29in.",
    images: [],
    platforms: {
      depop: { status: "ready", url: "", lastChecked: "" },
      grailed: { status: "ready", url: "", lastChecked: "" }
    }
  }
];

const SITE_URLS = {
  depop: "https://www.depop.com/products/create/",
  grailed: "https://www.grailed.com/sell"
};

const IMAGE_MAX_DIMENSION = 1200;
const IMAGE_QUALITY = 0.82;
const IMAGE_MIME = "image/jpeg";

// Track in-flight generation per item so the UI can disable buttons.
const generationLocks = new Set();

document.addEventListener("DOMContentLoaded", () => {
  initializeDatabase();
  setupEventDelegation();
  setupControls();
});

function initializeDatabase() {
  chrome.storage.local.get(["inventory"], (result) => {
    if (!result.inventory) {
      chrome.storage.local.set({ inventory: INITIAL_INVENTORY }, renderDOM);
    } else {
      renderDOM();
    }
  });
}

function getInventory() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["inventory"], (result) => {
      resolve(result.inventory || []);
    });
  });
}

function setInventory(inventory) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ inventory }, resolve);
  });
}

function renderDOM() {
  chrome.storage.local.get(["inventory"], (result) => {
    const inventory = result.inventory || [];
    const container = document.getElementById("inventory-container");
    if (!container) return;

    if (inventory.length === 0) {
      container.innerHTML = `<p class="subtitle">No inventory yet. Use + Add Item to start.</p>`;
      return;
    }

    container.innerHTML = inventory.map((item) => {
      const thumbs = (item.images || [])
        .map((src, idx) => `<img src="${escapeHtml(src)}" alt="photo ${idx + 1}" />`)
        .join("");

      const genStatus = item.genStatus
        ? `<span class="gen-status">${escapeHtml(item.genStatus)}</span>`
        : "";

      const grailedStatus = item.platforms.grailed.status;
      const depopStatus = item.platforms.depop.status;
      const isGenerating = generationLocks.has(item.id);

      return `
      <div class="inventory-card" data-id="${item.id}">
        <div class="item-details">
          <h3>${escapeHtml(item.title)} — $${escapeHtml(item.price)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <div class="item-meta">
            Images: ${(item.images || []).length} |
            Grailed: <span class="status-${grailedStatus}">${grailedStatus}</span>
          </div>
        </div>

        <div class="image-section">
          <div class="thumbnails">${thumbs}</div>
          <input type="file" accept="image/*" multiple class="image-input" />
          <button class="upload-photos" ${isGenerating ? "disabled" : ""}>Upload Photos</button>
        </div>

        <div class="generation-section">
          <button class="generate-listing" ${(item.images || []).length === 0 || isGenerating ? "disabled" : ""}>
            Generate Listing (Ollama)
          </button>
          ${genStatus}
        </div>

        <div class="edit-section">
          <input class="edit-title" value="${escapeHtml(item.title)}" placeholder="Title" ${isGenerating ? "disabled" : ""} />
          <input class="edit-price" value="${escapeHtml(item.price)}" placeholder="Price" ${isGenerating ? "disabled" : ""} />
          <textarea class="edit-description" placeholder="Description" ${isGenerating ? "disabled" : ""}>${escapeHtml(item.description)}</textarea>
          <button class="save-item" ${isGenerating ? "disabled" : ""}>Save</button>
        </div>

        <div class="control-panel">
          <button class="automation-trigger grailed-theme" data-site="grailed">
            Grailed: ${grailedStatus.toUpperCase()}
          </button>
          <button class="automation-trigger depop-theme" data-site="depop" disabled title="Depop support is coming next — Grailed focus now">
            Depop: ${depopStatus.toUpperCase()}
          </button>
        </div>
      </div>
    `;
    }).join("");
  });
}

function setupEventDelegation() {
  const container = document.getElementById("inventory-container");

  container.addEventListener("click", (event) => {
    const card = event.target.closest(".inventory-card");
    if (!card) return;
    const itemId = card.getAttribute("data-id");

    if (event.target.classList.contains("upload-photos")) {
      const input = card.querySelector(".image-input");
      if (input) input.click();
      return;
    }

    if (event.target.classList.contains("generate-listing")) {
      handleGenerate(itemId);
      return;
    }

    if (event.target.classList.contains("save-item")) {
      handleSave(itemId, card);
      return;
    }

    if (event.target.classList.contains("automation-trigger")) {
      const targetSite = event.target.getAttribute("data-site");
      executeCrossListJob(itemId, targetSite);
    }
  });

  container.addEventListener("change", (event) => {
    if (!event.target.classList.contains("image-input")) return;
    const card = event.target.closest(".inventory-card");
    const itemId = card.getAttribute("data-id");
    handleImageUpload(itemId, event.target.files);
    event.target.value = "";
  });
}

function setupControls() {
  document.getElementById("reset-data").addEventListener("click", () => {
    if (confirm("Reset inventory to seed data? This cannot be undone.")) {
      chrome.storage.local.set({ inventory: INITIAL_INVENTORY, currentListingJob: null }, renderDOM);
    }
  });

  document.getElementById("add-item").addEventListener("click", () => {
    chrome.storage.local.get(["inventory"], (result) => {
      const inventory = result.inventory || [];
      const nextId = `item_${String(inventory.length + 1).padStart(3, "0")}`;
      const newItem = {
        id: nextId,
        title: "New Item",
        price: "0",
        description: "Upload photos and click Generate Listing.",
        images: [],
        platforms: {
          depop: { status: "ready", url: "", lastChecked: "" },
          grailed: { status: "ready", url: "", lastChecked: "" }
        }
      };
      chrome.storage.local.set({ inventory: [...inventory, newItem] }, renderDOM);
    });
  });
}

async function handleImageUpload(itemId, fileList) {
  if (!fileList || fileList.length === 0) return;

  const inventory = await getInventory();
  const item = inventory.find((i) => i.id === itemId);
  if (!item) return;

  const newImages = [];
  for (const file of Array.from(fileList)) {
    try {
      const dataUrl = await readFileAsDataURL(file);
      const resized = await resizeImage(dataUrl, IMAGE_MAX_DIMENSION, IMAGE_QUALITY);
      newImages.push(resized);
    } catch (err) {
      console.error("[Second Skin] Failed to process image:", err);
    }
  }

  if (newImages.length === 0) {
    alert("No usable images were uploaded.");
    return;
  }

  item.images = [...(item.images || []), ...newImages];
  item.genStatus = "";
  await setInventory(inventory);
  renderDOM();
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function resizeImage(dataUrl, maxDimension, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL(IMAGE_MIME, quality));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl;
  });
}

async function handleGenerate(itemId) {
  if (generationLocks.has(itemId)) return;
  generationLocks.add(itemId);

  const inventory = await getInventory();
  const item = inventory.find((i) => i.id === itemId);
  if (!item || !(item.images || []).length) {
    generationLocks.delete(itemId);
    renderDOM();
    return;
  }

  item.genStatus = "analyzing photos...";
  await setInventory(inventory);
  renderDOM();

  try {
    const config = await OLLAMA.getConfig();
    const rawBase64Images = item.images.map((dataUrl) =>
      dataUrl.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, "")
    );

    item.genStatus = "describing garment...";
    await setInventory(inventory);
    renderDOM();

    const description = await OLLAMA.describeGarment(config, rawBase64Images);

    item.genStatus = "writing listing...";
    await setInventory(inventory);
    renderDOM();

    const listing = await OLLAMA.composeListing(config, description);

    item.title = String(listing.title);
    item.price = String(listing.price);
    item.description = String(listing.description);
    item.genStatus = "done — review and save";
  } catch (err) {
    console.error("[Second Skin] Generation failed:", err);
    item.genStatus = `error: ${err.message}`;
  } finally {
    generationLocks.delete(itemId);
    await setInventory(inventory);
    renderDOM();
  }
}

async function handleSave(itemId, card) {
  const title = card.querySelector(".edit-title").value.trim();
  const price = card.querySelector(".edit-price").value.trim();
  const description = card.querySelector(".edit-description").value.trim();

  if (!title || !price || !description) {
    alert("Title, price, and description are required.");
    return;
  }

  const inventory = await getInventory();
  const item = inventory.find((i) => i.id === itemId);
  if (!item) return;

  item.title = title;
  item.price = price;
  item.description = description;
  item.genStatus = "";
  await setInventory(inventory);
  renderDOM();
}

function executeCrossListJob(itemId, targetSite) {
  const targetUrl = SITE_URLS[targetSite];
  if (!targetUrl) return;

  chrome.storage.local.set({
    currentListingJob: { itemId, targetSite }
  }, () => {
    chrome.tabs.create({ url: targetUrl });
  });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.inventory) {
    renderDOM();
  }
});

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
