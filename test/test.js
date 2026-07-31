// test/test.js — lightweight DOM-mocked tests for shared.js logic

const assert = require("assert");
const { JSDOM } = require("jsdom");

// jsdom may not be installed; provide a clear message if missing.
let jsdomAvailable = true;
try {
  require.resolve("jsdom");
} catch (e) {
  jsdomAvailable = false;
}

if (!jsdomAvailable) {
  console.error("jsdom is not installed. Run: npm install jsdom --save-dev");
  process.exit(1);
}

const { JSDOM: JSDOMClass } = require("jsdom");

// jsdom's atob is stricter than Node's about some padding/whitespace combos.
// shared.js uses atob for base64 image decoding, so give it a reliable polyfill.
global.atob = (encoded) => Buffer.from(encoded, "base64").toString("binary");

const SECOND_SKIN = require("../shared.js");

let pass = 0;
let fail = 0;

// Use a top-level async main so we can `await` each test. Without this,
// returning a rejected promise from an async test would escape the try/catch
// and the runner would mark it passed-on-accident.
async function main() {
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`✓ ${t.name}`);
      pass++;
    } catch (err) {
      console.error(`✗ ${t.name}`);
      console.error(`  ${err.message}`);
      fail++;
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function setupDOM(html = "") {
  const dom = new JSDOMClass(`<!DOCTYPE html><html><body>${html}</body></html>`, {
    pretendToBeVisual: true,
    url: "https://example.com/"
  });
  global.document = dom.window.document;
  global.window = dom.window;
  global.Event = dom.window.Event;
  global.File = dom.window.File;
  global.Blob = dom.window.Blob;
  // jsdom 29 does not expose DataTransfer on its window. injectFiles uses it
  // to populate a file input's `.files`. Polyfill just enough for tests.
  // Also bypass jsdom's strict FileList setter so plain objects can be assigned.
  if (!dom.window.HTMLInputElement.prototype._secondSkinFilesPatched) {
    Object.defineProperty(dom.window.HTMLInputElement.prototype, "files", {
      set(v) { this._files = v; },
      get() { return this._files; },
      configurable: true
    });
    dom.window.HTMLInputElement.prototype._secondSkinFilesPatched = true;
  }

  global.DataTransfer = class DataTransfer {
    constructor() {
      this._items = [];
      this.files = this._buildFiles();
    }
    get items() { return this; }
    _buildFiles() {
      const files = {
        length: this._items.length,
        item: (i) => this._items[i] || null,
        [Symbol.iterator]: function* () { for (const f of this._items) yield f; }
      };
      for (let i = 0; i < this._items.length; i++) {
        Object.defineProperty(files, i, { get: () => this._items[i], enumerable: true, configurable: true });
      }
      return files;
    }
    add(file) {
      this._items.push(file);
      this.files = this._buildFiles();
    }
  };
  global.MutationObserver = dom.window.MutationObserver;
}

test("dispatchSyntheticInput sets value and fires events", () => {
  setupDOM('<input id="title" />');
  const input = document.getElementById("title");
  let events = [];
  ["focus", "input", "change", "blur"].forEach((type) => {
    input.addEventListener(type, () => events.push(type));
  });

  const ok = SECOND_SKIN.dispatchSyntheticInput(input, "Vintage Tee");
  assert.strictEqual(ok, true);
  assert.strictEqual(input.value, "Vintage Tee");
  assert.deepStrictEqual(events, ["focus", "input", "change", "blur"]);
});

test("dispatchSyntheticInput returns false for null element", () => {
  const ok = SECOND_SKIN.dispatchSyntheticInput(null, "x");
  assert.strictEqual(ok, false);
});

test("waitFor resolves when element appears", async () => {
  setupDOM();
  setTimeout(() => {
    const el = document.createElement("input");
    el.id = "late";
    document.body.appendChild(el);
  }, 50);

  const found = await SECOND_SKIN.waitFor("#late", 2000);
  assert.ok(found, "should find late element");
  assert.strictEqual(found.id, "late");
});

test("waitFor resolves null after timeout", async () => {
  setupDOM();
  const start = Date.now();
  const found = await SECOND_SKIN.waitFor("#missing", 100);
  const elapsed = Date.now() - start;
  assert.strictEqual(found, null);
  assert.ok(elapsed < 300, "timeout should not overshoot much");
});

test("injectFiles populates a file input", async () => {
  setupDOM('<input type="file" id="photos" />');
  const input = document.getElementById("photos");
  let changed = false;
  input.addEventListener("change", () => (changed = true));

  const ok = await SECOND_SKIN.injectFiles(input, [
    { name: "shirt.jpg", mime: "image/jpeg", data: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" }
  ]);

  assert.strictEqual(ok, true);
  assert.strictEqual(input.files.length, 1);
  assert.strictEqual(input.files[0].name, "shirt.jpg");
  assert.strictEqual(input.files[0].type, "image/jpeg");
  assert.strictEqual(changed, true);
});

test("injectFiles returns false for null input", async () => {
  const ok = await SECOND_SKIN.injectFiles(null, []);
  assert.strictEqual(ok, false);
});

// waitForEnabled: resolves when element exists AND is not disabled.
test("waitForEnabled resolves on enabled element", async () => {
  setupDOM('<button id="b" disabled></button>');
  setTimeout(() => {
    document.getElementById("b").removeAttribute("disabled");
  }, 50);

  const found = await SECOND_SKIN.waitForEnabled("#b", 2000);
  assert.ok(found, "should find enabled element");
  assert.strictEqual(found.id, "b");
});

test("waitForEnabled resolves null after timeout when still disabled", async () => {
  setupDOM('<button id="b" disabled></button>');
  const found = await SECOND_SKIN.waitForEnabled("#b", 150);
  assert.strictEqual(found, null);
});

// selectRadixOption: clicks trigger, picks the option whose text contains `optionText`,
// waits for the trigger's placeholder text to change as a commit signal.
test("selectRadixOption clicks trigger and matches option text", async () => {
  setupDOM(`
    <button id="trigger" type="button" aria-haspopup="menu" data-state="closed">
      <span class="placeholder">Department / Category</span>
    </button>
    <div role="menu" hidden>
      <div role="menuitem">Tops</div>
      <div role="menuitem">Bottoms</div>
      <div role="menuitem">Outerwear</div>
    </div>
  `);
  // Simulate Radix flipping data-state when the menu opens.
  const trigger = document.getElementById("trigger");
  const menu = document.querySelector('[role="menu"]');
  trigger.addEventListener("click", () => {
    trigger.setAttribute("data-state", "open");
    menu.removeAttribute("hidden");
  });
  // Simulate Grailed committing the selection by changing the placeholder text.
  menu.addEventListener("click", (e) => {
    if (e.target.getAttribute("role") === "menuitem") {
      trigger.setAttribute("data-state", "closed");
      menu.setAttribute("hidden", "");
      trigger.querySelector(".placeholder").textContent = e.target.textContent;
    }
  });

  const result = await SECOND_SKIN.selectRadixOption(trigger, "Bottoms", 2000);
  assert.strictEqual(result, true);
  assert.strictEqual(trigger.querySelector(".placeholder").textContent, "Bottoms");
});

test("selectRadixOption returns false when trigger stays disabled", async () => {
  setupDOM(`
    <button id="trigger" type="button" disabled data-state="closed">
      <span class="placeholder">Select category</span>
    </button>
  `);
  const result = await SECOND_SKIN.selectRadixOption(
    document.getElementById("trigger"),
    "Bottoms",
    150
  );
  assert.strictEqual(result, false);
});

// fillAutocomplete: types into input, waits for an option containing the text, clicks it.
test("fillAutocomplete types and clicks matching option", async () => {
  setupDOM(`
    <input id="ac" type="text" placeholder="Designer" />
    <div id="popup" role="listbox" hidden>
      <div role="option">Acne Studios</div>
      <div role="option">Acronym</div>
    </div>
  `);
  const input = document.getElementById("ac");
  const popup = document.getElementById("popup");
  let inputChanged = false;
  input.addEventListener("input", () => (inputChanged = true));
  // Simulate Grailed's autocomplete revealing options once text is typed.
  input.addEventListener("input", () => popup.removeAttribute("hidden"));
  let clicked = null;
  popup.addEventListener("click", (e) => {
    if (e.target.getAttribute("role") === "option") clicked = e.target.textContent;
  });

  const result = await SECOND_SKIN.fillAutocomplete(input, "Acne", 2000);
  assert.strictEqual(result, true);
  assert.strictEqual(input.value, "Acne");
  assert.strictEqual(inputChanged, true);
  assert.strictEqual(clicked, "Acne Studios");
});

test("fillAutocomplete returns false when input is null", async () => {
  const result = await SECOND_SKIN.fillAutocomplete(null, "x", 2000);
  assert.strictEqual(result, false);
});

// Fee / payout calculator tests.
const FEES = require("../demo/lib/fees.js");

// Inventory tests (#49 structured fields).
const INVENTORY = require("../demo/lib/inventory.js");

test("createListing carries structured fields category/brand/size (#49)", () => {
  const listing = INVENTORY.createListing({
    title: "Vintage tee",
    category: "Tops",
    brand: "Levi's",
    size: "M",
    condition: "good",
  });
  assert.strictEqual(listing.title, "Vintage tee");
  assert.strictEqual(listing.category, "Tops");
  assert.strictEqual(listing.brand, "Levi's");
  assert.strictEqual(listing.size, "M");
  assert.strictEqual(listing.condition, "good");
  assert.ok(listing.id, "should generate an id");
  assert.strictEqual(listing.platforms.depop.status, "draft");
  assert.strictEqual(listing.platforms.grailed.status, "draft");
});

test("createListing defaults structured fields to empty strings", () => {
  const listing = INVENTORY.createListing({ title: "No fields" });
  assert.strictEqual(listing.category, "");
  assert.strictEqual(listing.brand, "");
  assert.strictEqual(listing.size, "");
  assert.strictEqual(listing.condition, "");
});

test("calculatePayouts returns null for empty price", () => {
  assert.strictEqual(FEES.calculatePayouts(""), null);
  assert.strictEqual(FEES.calculatePayouts("abc"), null);
});

test("calculatePayouts computes Depop, Grailed, and Poshmark nets", () => {
  const out = FEES.calculatePayouts("100");
  assert.ok(out, "should return payouts");
  assert.strictEqual(out.price, 100);
  assert.strictEqual(typeof out.depop.net, "number");
  assert.strictEqual(typeof out.grailed.net, "number");
  assert.strictEqual(typeof out.poshmark.net, "number");
  assert.ok(out.depop.net < 100, "Depop net should be less than list price");
  assert.ok(out.grailed.net < 100, "Grailed net should be less than list price");
  assert.ok(out.poshmark.net < 100, "Poshmark net should be less than list price");
});

test("suggestListPrice inverts Grailed fee schedule", () => {
  const suggestion = FEES.suggestListPrice("80", "grailed");
  assert.ok(suggestion, "should return a suggestion");
  assert.ok(suggestion.listPrice >= 80, "list price should cover target net");
  assert.ok(suggestion.payout.net >= 80, "resulting net should meet target");
});

test("suggestListPrice returns null for invalid target", () => {
  assert.strictEqual(FEES.suggestListPrice("", "grailed"), null);
  assert.strictEqual(FEES.suggestListPrice("50", "unknown"), null);
});

// Listing template tests.
const TEMPLATES = require("../demo/lib/templates.js");

test("createTemplate captures reusable fields", () => {
  const draft = {
    condition: "good",
    flaws: [{ location: "hem", description: "small stain" }],
    measurements: "P2P 22in",
    tags: "vintage, tee",
    optimizeFor: "grailed",
  };
  const t = TEMPLATES.createTemplate("Vintage tees", draft);
  assert.strictEqual(t.name, "Vintage tees");
  assert.strictEqual(t.fields.condition, "good");
  assert.deepStrictEqual(t.fields.flaws, draft.flaws);
  assert.strictEqual(t.fields.measurements, "P2P 22in");
  assert.strictEqual(t.fields.tags, "vintage, tee");
  assert.strictEqual(t.fields.optimizeFor, "grailed");
});

test("applyTemplate calls setters with stored values", () => {
  const calls = {};
  const setters = {
    setCondition: (v) => (calls.setCondition = v),
    setFlaws: (v) => (calls.setFlaws = v),
    setMeasurements: (v) => (calls.setMeasurements = v),
    setTags: (v) => (calls.setTags = v),
    setOptimizeFor: (v) => (calls.setOptimizeFor = v),
  };
  const t = TEMPLATES.createTemplate("Tees", {
    condition: "like_new",
    flaws: [],
    measurements: "L 30in",
    tags: "90s, band",
    optimizeFor: "depop",
  });
  TEMPLATES.applyTemplate(t, setters);
  assert.strictEqual(calls.setCondition, "like_new");
  assert.deepStrictEqual(calls.setFlaws, []);
  assert.strictEqual(calls.setMeasurements, "L 30in");
  assert.strictEqual(calls.setTags, "90s, band");
  assert.strictEqual(calls.setOptimizeFor, "depop");
});

// Measurement template tests.
const MEASUREMENTS = require("../demo/lib/measurements.js");

test("formatMeasurements returns empty for empty values", () => {
  assert.strictEqual(MEASUREMENTS.formatMeasurements("top", {}), "");
});

test("formatMeasurements formats top fields", () => {
  const out = MEASUREMENTS.formatMeasurements("top", {
    pit_to_pit: "22in",
    length: "28in",
    shoulder: "19in",
  });
  assert.strictEqual(
    out,
    "Pit to pit: 22in, Length: 28in, Shoulder: 19in"
  );
});

test("drawMeasurementOverlay returns null outside browser", () => {
  assert.strictEqual(MEASUREMENTS.drawMeasurementOverlay("top", { pit_to_pit: "22in" }), null);
});

// Ollama listing parser tests (no network).
const OLLAMA = require("../ollama.js");

test("parseListing extracts JSON from markdown fence", () => {
  const out = OLLAMA.parseListing('```json\n{"title":"Tee","description":"Cool tee","price":75}\n```');
  assert.deepStrictEqual(out, { title: "Tee", description: "Cool tee", price: 75 });
});

test("parseListing extracts bare JSON object", () => {
  const out = OLLAMA.parseListing('{"title":"Vintage Jacket","description":"Waxed cotton","price":220}');
  assert.deepStrictEqual(out, { title: "Vintage Jacket", description: "Waxed cotton", price: 220 });
});

test("parseListing throws on missing fields", () => {
  assert.throws(() => OLLAMA.parseListing('{"title":"Tee"}'), /missing title\/description\/price/);
});

main();
