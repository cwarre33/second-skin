// shared.js — DOM automation primitives used by platform content scripts

const SECOND_SKIN = {
  /**
   * Dispatch a React/Vue-compatible synthetic input event burst.
   * Returns true if the element was found and mutated.
   */
  dispatchSyntheticInput(element, value) {
    if (!element) return false;
    element.value = value;
    element.dispatchEvent(new Event("focus", { bubbles: true }));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
    return true;
  },

  /**
   * Set a file input's files from a list of base64 data URIs.
   * `files` is an array like [{ name, mime, data: base64String }].
   */
  async injectFiles(input, files) {
    if (!input) return false;
    const dt = new DataTransfer();
    for (const { name, mime, data } of files) {
      const bytes = atob(data);
      const array = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        array[i] = bytes.charCodeAt(i);
      }
      const blob = new Blob([array], { type: mime });
      dt.items.add(new File([blob], name, { type: mime }));
    }
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  },

  /**
   * Wait for an element to appear in the DOM up to `timeoutMs`.
   */
  waitFor(selector, timeoutMs = 5000) {
    return new Promise((resolve) => {
      const found = document.querySelector(selector);
      if (found) return resolve(found);

      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeoutMs);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearTimeout(timer);
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    });
  },

  /**
   * Human-like randomized delay.
   */
  humanDelay(base = 1500, variance = 1500) {
    return new Promise((resolve) =>
      setTimeout(resolve, Math.floor(Math.random() * variance) + base)
    );
  },

  /**
   * Update an item's platform metadata in chrome.storage.local.
   */
  async updatePlatformMeta(itemId, site, status) {
    return new Promise((resolve) => {
      chrome.storage.local.get(["inventory"], (result) => {
        const inventory = result.inventory || [];
        const item = inventory.find((i) => i.id === itemId);
        if (item) {
          item.platforms[site] = {
            ...item.platforms[site],
            status,
            lastChecked: new Date().toISOString()
          };
          chrome.storage.local.set({ inventory }, resolve);
        } else {
          resolve();
        }
      });
    });
  },

  /**
   * Clear the active listing job mutex.
   */
  clearJobMutex() {
    chrome.storage.local.set({ currentListingJob: null });
  }
};

// Export for testability when running under Node-like loaders; otherwise global.
if (typeof module !== "undefined" && module.exports) {
  module.exports = SECOND_SKIN;
}
