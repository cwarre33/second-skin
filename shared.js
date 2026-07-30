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
   * Wait for an element to appear AND become enabled (not disabled).
   */
  waitForEnabled(selector, timeoutMs = 5000) {
    return new Promise((resolve) => {
      const isEnabled = (el) =>
        el && !el.disabled && !el.getAttribute("aria-disabled") && el.getAttribute("disabled") === null;

      const found = document.querySelector(selector);
      if (found && isEnabled(found)) return resolve(found);

      const deadline = Date.now() + timeoutMs;
      let timer = null;
      let observer = null;

      const finish = (el) => {
        clearTimeout(timer);
        if (observer) observer.disconnect();
        resolve(el);
      };

      const check = () => {
        const el = document.querySelector(selector);
        if (el && isEnabled(el)) return finish(el);
        if (Date.now() >= deadline) return finish(null);
      };

      timer = setTimeout(() => finish(null), timeoutMs);

      observer = new MutationObserver(check);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["disabled", "aria-disabled"]
      });
    });
  },

  /**
   * Click a Radix-style trigger, pick an option whose visible text contains
   * `optionText`, and wait for the trigger's placeholder text to change.
   */
  async selectRadixOption(trigger, optionText, timeoutMs = 5000) {
    if (!trigger || trigger.disabled || trigger.getAttribute("aria-disabled")) return false;

    const deadline = Date.now() + timeoutMs;
    const originalText = (trigger.textContent || "").trim();

    trigger.click();
    await this.humanDelay(200, 200);

    // Find the opened menu and the target option.
    const option = await new Promise((resolve) => {
      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, Math.max(deadline - Date.now(), 100));

      const observer = new MutationObserver(() => {
        const menus = document.querySelectorAll('[role="menu"], [role="listbox"], [data-state="open"]');
        for (const menu of menus) {
          const items = menu.querySelectorAll('[role="menuitem"], [role="option"]');
          for (const item of items) {
            if ((item.textContent || "").toLowerCase().includes(optionText.toLowerCase())) {
              clearTimeout(timer);
              observer.disconnect();
              return resolve(item);
            }
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      // Also check immediately in case menu is already open.
      observer.takeRecords();
      const menus = document.querySelectorAll('[role="menu"], [role="listbox"], [data-state="open"]');
      for (const menu of menus) {
        const items = menu.querySelectorAll('[role="menuitem"], [role="option"]');
        for (const item of items) {
          if ((item.textContent || "").toLowerCase().includes(optionText.toLowerCase())) {
            clearTimeout(timer);
            observer.disconnect();
            return resolve(item);
          }
        }
      }
    });

    if (!option) return false;
    option.click();
    await this.humanDelay(200, 200);

    // Wait for the trigger text to update as a commit signal.
    return new Promise((resolve) => {
      const remaining = Math.max(deadline - Date.now(), 100);
      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(false);
      }, remaining);

      const check = () => {
        const currentText = (trigger.textContent || "").trim();
        if (currentText && currentText !== originalText) {
          clearTimeout(timer);
          observer.disconnect();
          resolve(true);
        }
      };

      const observer = new MutationObserver(check);
      observer.observe(trigger, { childList: true, subtree: true, characterData: true });
      check();
    });
  },

  /**
   * Type into an autocomplete input, wait for an option containing `optionText`,
   * and click it.
   */
  async fillAutocomplete(input, optionText, timeoutMs = 5000) {
    if (!input) return false;

    const deadline = Date.now() + timeoutMs;
    this.dispatchSyntheticInput(input, optionText);
    await this.humanDelay(250, 350);

    return new Promise((resolve) => {
      const remaining = Math.max(deadline - Date.now(), 100);
      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(false);
      }, remaining);

      const scanAndClick = () => {
        const options = document.querySelectorAll('[role="option"], [role="listbox"] > *');
        for (const opt of options) {
          if ((opt.textContent || "").toLowerCase().includes(optionText.toLowerCase())) {
            clearTimeout(timer);
            observer.disconnect();
            opt.click();
            resolve(true);
            return true;
          }
        }
        return false;
      };

      const observer = new MutationObserver(scanAndClick);

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden", "aria-hidden", "style", "data-state"]
      });

      if (scanAndClick()) return;
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
