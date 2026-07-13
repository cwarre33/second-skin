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

function renderDOM() {
  chrome.storage.local.get(["inventory"], (result) => {
    const inventory = result.inventory || [];
    const container = document.getElementById("inventory-container");
    if (!container) return;

    if (inventory.length === 0) {
      container.innerHTML = `<p class="subtitle">No inventory yet. Use + Add Item to start.</p>`;
      return;
    }

    container.innerHTML = inventory.map((item) => `
      <div class="inventory-card" data-id="${item.id}">
        <div class="item-details">
          <h3>${escapeHtml(item.title)} — $${escapeHtml(item.price)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <div class="item-meta">
            Images: ${(item.images || []).length} |
            Depop: <span class="status-${item.platforms.depop.status}">${item.platforms.depop.status}</span> |
            Grailed: <span class="status-${item.platforms.grailed.status}">${item.platforms.grailed.status}</span>
          </div>
        </div>
        <div class="control-panel">
          <button class="automation-trigger depop-theme" data-site="depop">
            Depop: ${item.platforms.depop.status.toUpperCase()}
          </button>
          <button class="automation-trigger grailed-theme" data-site="grailed">
            Grailed: ${item.platforms.grailed.status.toUpperCase()}
          </button>
        </div>
      </div>
    `).join("");
  });
}

function setupEventDelegation() {
  const container = document.getElementById("inventory-container");
  container.addEventListener("click", (event) => {
    if (event.target.classList.contains("automation-trigger")) {
      const card = event.target.closest(".inventory-card");
      const itemId = card.getAttribute("data-id");
      const targetSite = event.target.getAttribute("data-site");
      executeCrossListJob(itemId, targetSite);
    }
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
        description: "Edit me in storage or via future UI.",
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
