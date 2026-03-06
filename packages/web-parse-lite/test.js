import { parseHtml, parse, parseOptionsSchema, WebParseLiteError } from "./dist/index.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

function assertDeepEqual(actual, expected, label = "") {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label} Expected ${b}, got ${a}`);
}

const sampleHtml = `
<html>
<body>
  <h1>Main Title</h1>
  <ul class="fruits">
    <li class="item" data-id="1">Apple</li>
    <li class="item" data-id="2">Banana</li>
    <li class="item" data-id="3">Cherry</li>
  </ul>
  <div class="links">
    <a href="/about" class="nav">About</a>
    <a href="/contact" class="nav">Contact</a>
  </div>
  <div class="mixed">
    <p><strong>Bold</strong> and <em>italic</em></p>
    <p>Plain text</p>
  </div>
  <div class="empty-items">
    <span>Has text</span>
    <span>   </span>
    <span></span>
    <span>Also text</span>
  </div>
</body>
</html>
`;

console.log("\n── parseHtml: text method ──");

test("extracts text from multiple elements", () => {
  const result = parseHtml({ html: sampleHtml, selector: "li", method: "text" });
  assertDeepEqual(result.data, ["Apple", "Banana", "Cherry"]);
  assert(result.format === "json", "format should be json");
});

test("extracts text from a single element", () => {
  const result = parseHtml({ html: sampleHtml, selector: "h1", method: "text" });
  assertDeepEqual(result.data, ["Main Title"]);
});

test("extracts text with nested content (trims correctly)", () => {
  const result = parseHtml({ html: sampleHtml, selector: ".mixed p", method: "text" });
  assertDeepEqual(result.data, ["Bold and italic", "Plain text"]);
});

test("filters out empty/whitespace-only text results", () => {
  const result = parseHtml({ html: sampleHtml, selector: ".empty-items span", method: "text" });
  assertDeepEqual(result.data, ["Has text", "Also text"]);
});

console.log("\n── parseHtml: html method ──");

test("extracts inner HTML from elements", () => {
  const result = parseHtml({ html: sampleHtml, selector: ".mixed p", method: "html" });
  assert(Array.isArray(result.data), "should return array");
  assert(result.data[0].includes("<strong>Bold</strong>"), "should contain HTML tags");
  assert(result.data[1] === "Plain text", "plain text paragraph");
});

test("extracts inner HTML from list items", () => {
  const result = parseHtml({ html: sampleHtml, selector: "li", method: "html" });
  assertDeepEqual(result.data, ["Apple", "Banana", "Cherry"]);
});

console.log("\n── parseHtml: attribute method ──");

test("extracts href attributes", () => {
  const result = parseHtml({ html: sampleHtml, selector: "a", method: "attribute", attribute: "href" });
  assertDeepEqual(result.data, ["/about", "/contact"]);
});

test("extracts class attributes", () => {
  const result = parseHtml({ html: sampleHtml, selector: "a", method: "attribute", attribute: "class" });
  assertDeepEqual(result.data, ["nav", "nav"]);
});

test("extracts data attributes", () => {
  const result = parseHtml({ html: sampleHtml, selector: "li", method: "attribute", attribute: "data-id" });
  assertDeepEqual(result.data, ["1", "2", "3"]);
});

console.log("\n── parseHtml: format options ──");

test("json format returns string array (default)", () => {
  const result = parseHtml({ html: sampleHtml, selector: "li", method: "text" });
  assert(Array.isArray(result.data), "should be array");
  assert(result.format === "json", "format should be json");
});

test("plaintext format returns joined string", () => {
  const result = parseHtml({ html: sampleHtml, selector: "li", method: "text", format: "plaintext" });
  assert(typeof result.data === "string", "should be string");
  assert(result.data === "Apple\n\nBanana\n\nCherry", "should join with double newline");
  assert(result.format === "plaintext", "format should be plaintext");
});

test("explicit json format works", () => {
  const result = parseHtml({ html: sampleHtml, selector: "li", method: "text", format: "json" });
  assert(Array.isArray(result.data), "should be array");
});

console.log("\n── parseHtml: complex selectors ──");

test("class selector works", () => {
  const result = parseHtml({ html: sampleHtml, selector: ".item", method: "text" });
  assertDeepEqual(result.data, ["Apple", "Banana", "Cherry"]);
});

test("nested selector works", () => {
  const result = parseHtml({ html: sampleHtml, selector: ".links > a", method: "text" });
  assertDeepEqual(result.data, ["About", "Contact"]);
});

test("attribute selector works", () => {
  const result = parseHtml({ html: sampleHtml, selector: "[data-id]", method: "text" });
  assertDeepEqual(result.data, ["Apple", "Banana", "Cherry"]);
});

console.log("\n── parseHtml: error handling ──");

test("throws parsing error for no matching elements", () => {
  try {
    parseHtml({ html: sampleHtml, selector: ".nonexistent", method: "text" });
    assert(false, "should have thrown");
  } catch (e) {
    assert(e instanceof WebParseLiteError, "should be WebParseLiteError");
    assert(e.type === "parsing", `type should be parsing, got ${e.type}`);
    assert(e.message.includes("No elements found"), "message should mention no elements");
  }
});

test("throws validation error for empty selector", () => {
  try {
    parseHtml({ html: sampleHtml, selector: "", method: "text" });
    assert(false, "should have thrown");
  } catch (e) {
    assert(e instanceof WebParseLiteError, "should be WebParseLiteError");
    assert(e.type === "validation", `type should be validation, got ${e.type}`);
  }
});

test("throws validation error for attribute method without attribute param", () => {
  try {
    parseHtml({ html: sampleHtml, selector: "a", method: "attribute" });
    assert(false, "should have thrown");
  } catch (e) {
    assert(e instanceof WebParseLiteError, "should be WebParseLiteError");
    assert(e.type === "validation", `type should be validation, got ${e.type}`);
  }
});

console.log("\n── parse: validation ──");

await testAsync("throws validation error for invalid URL", async () => {
  try {
    await parse({ url: "not-a-url", selector: "h1", method: "text" });
    assert(false, "should have thrown");
  } catch (e) {
    assert(e instanceof WebParseLiteError, "should be WebParseLiteError");
    assert(e.type === "validation", `type should be validation, got ${e.type}`);
  }
});

await testAsync("throws validation error for missing selector", async () => {
  try {
    await parse({ url: "https://example.com", selector: "", method: "text" });
    assert(false, "should have thrown");
  } catch (e) {
    assert(e instanceof WebParseLiteError, "should be WebParseLiteError");
    assert(e.type === "validation", `type should be validation, got ${e.type}`);
  }
});

await testAsync("throws validation error for attribute method without attribute", async () => {
  try {
    await parse({ url: "https://example.com", selector: "a", method: "attribute" });
    assert(false, "should have thrown");
  } catch (e) {
    assert(e instanceof WebParseLiteError, "should be WebParseLiteError");
    assert(e.type === "validation", `type should be validation, got ${e.type}`);
  }
});

console.log("\n── parseOptionsSchema: Zod validation ──");

test("accepts valid input", () => {
  const result = parseOptionsSchema.safeParse({
    url: "https://example.com",
    selector: "h1",
    method: "text",
  });
  assert(result.success, "should be valid");
  assert(result.data.format === "json", "format should default to json");
});

test("rejects invalid URL", () => {
  const result = parseOptionsSchema.safeParse({
    url: "bad",
    selector: "h1",
    method: "text",
  });
  assert(!result.success, "should be invalid");
});

test("rejects invalid method", () => {
  const result = parseOptionsSchema.safeParse({
    url: "https://example.com",
    selector: "h1",
    method: "xpath",
  });
  assert(!result.success, "should be invalid");
});

test("rejects empty selector", () => {
  const result = parseOptionsSchema.safeParse({
    url: "https://example.com",
    selector: "",
    method: "text",
  });
  assert(!result.success, "should be invalid");
});

test("rejects attribute method without attribute field", () => {
  const result = parseOptionsSchema.safeParse({
    url: "https://example.com",
    selector: "a",
    method: "attribute",
  });
  assert(!result.success, "should be invalid");
});

test("accepts attribute method with attribute field", () => {
  const result = parseOptionsSchema.safeParse({
    url: "https://example.com",
    selector: "a",
    method: "attribute",
    attribute: "href",
  });
  assert(result.success, "should be valid");
});

console.log("\n── WebParseLiteError ──");

test("is an instance of Error", () => {
  const err = new WebParseLiteError("test", "network");
  assert(err instanceof Error, "should be instanceof Error");
  assert(err instanceof WebParseLiteError, "should be instanceof WebParseLiteError");
});

test("has correct name and type properties", () => {
  const err = new WebParseLiteError("oops", "timeout");
  assert(err.name === "WebParseLiteError", `name should be WebParseLiteError, got ${err.name}`);
  assert(err.type === "timeout", `type should be timeout, got ${err.type}`);
  assert(err.message === "oops", `message should be oops, got ${err.message}`);
});

test("works with all error types", () => {
  const types = ["validation", "network", "parsing", "timeout", "unknown"];
  for (const type of types) {
    const err = new WebParseLiteError("msg", type);
    assert(err.type === type, `type should be ${type}`);
  }
});

// Summary
const total = passed + failed;
console.log(`\n${"═".repeat(40)}`);
console.log(`  Results: ${passed}/${total} tests passed`);
if (failed > 0) {
  console.log(`  ${failed} test(s) FAILED`);
  console.log(`${"═".repeat(40)}\n`);
  process.exit(1);
} else {
  console.log(`  All tests passed!`);
  console.log(`${"═".repeat(40)}\n`);
}
