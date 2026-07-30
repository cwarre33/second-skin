/**
 * Local-first inventory storage for the demo hub.
 *
 * All data stays in the browser. Images are stored as base64 data URLs.
 */

const STORAGE_KEY = "second-skin-inventory";

export function loadInventory() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveInventory(inventory) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
}

export function createListing(draft = {}) {
  return {
    id: generateId(),
    title: draft.title || "",
    description: draft.description || "",
    tags: draft.tags || [],
    price: draft.price || "",
    measurements: draft.measurements || "",
    images: draft.images || [],
    url: draft.url || "",
    platforms: {
      grailed: { status: "draft", url: "", lastUpdated: "" },
      depop: { status: "draft", url: "", lastUpdated: "" },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function updateListingStatus(listing, platform, status, url = "") {
  return {
    ...listing,
    platforms: {
      ...listing.platforms,
      [platform]: {
        status,
        url: url || listing.platforms[platform]?.url || "",
        lastUpdated: new Date().toISOString(),
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

function generateId() {
  return `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
