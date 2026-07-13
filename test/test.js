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
const SECOND_SKIN = require("../shared.js");

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    pass++;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
    fail++;
  }
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
  global.DataTransfer = dom.window.DataTransfer;
  global.atob = dom.window.atob;
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
