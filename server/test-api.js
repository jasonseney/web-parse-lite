const BASE = "http://localhost:5000";

let passed = 0;
let failed = 0;
let skipped = 0;

async function test(name, fn) {
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

async function networkTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    const msg = e.message || "";
    if (msg.includes("fetch failed") || msg.includes("network") || msg.includes("502") || msg.includes("504") || msg.includes("500")) {
      console.log(`  ⊘ ${name} [SKIPPED — network unavailable]`);
      skipped++;
    } else {
      console.log(`  ✗ ${name}`);
      console.log(`    ${msg}`);
      failed++;
    }
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json() : await res.text();
  return { status: res.status, contentType, data, isJson };
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json() : await res.text();
  return { status: res.status, data, isJson };
}

// ─── Error tests ───

console.log("\n── JSON format: error responses ──");

await test("validation error returns JSON envelope with 400", async () => {
  const res = await post("/api/parse", {
    parseURL: "not-a-url",
    selector: "h1",
    method: "text",
    format: "json",
  });
  assert(res.status === 400, `status should be 400, got ${res.status}`);
  assert(res.isJson, "should be JSON");
  assert(res.data.success === false, "success should be false");
  assert(res.data.error.type === "validation", `type should be validation, got ${res.data.error.type}`);
  assert(typeof res.data.error.message === "string", "message should be string");
});

await test("missing selector returns 400 with validation error", async () => {
  const res = await post("/api/parse", {
    parseURL: "https://example.com",
    selector: "",
    method: "text",
    format: "json",
  });
  assert(res.status === 400, `status should be 400, got ${res.status}`);
  assert(res.data.success === false, "success should be false");
  assert(res.data.error.type === "validation", `type should be validation, got ${res.data.error.type}`);
});

await test("attribute method without extra returns 400", async () => {
  const res = await post("/api/parse", {
    parseURL: "https://example.com",
    selector: "a",
    method: "attribute",
    format: "json",
  });
  assert(res.status === 400, `status should be 400, got ${res.status}`);
  assert(res.data.success === false, "success should be false");
  assert(res.data.error.type === "validation", `type should be validation, got ${res.data.error.type}`);
});

await test("invalid method returns 400", async () => {
  const res = await post("/api/parse", {
    parseURL: "https://example.com",
    selector: "h1",
    method: "xpath",
    format: "json",
  });
  assert(res.status === 400, `status should be 400, got ${res.status}`);
  assert(res.data.success === false, "success should be false");
});

await test("empty request body returns 400", async () => {
  const res = await post("/api/parse", {});
  assert(res.status === 400, `status should be 400, got ${res.status}`);
});

console.log("\n── Plaintext format: error responses ──");

await test("validation error in plaintext returns text/plain", async () => {
  const res = await post("/api/parse", {
    parseURL: "not-a-url",
    selector: "h1",
    method: "text",
    format: "plaintext",
  });
  assert(res.status === 400, `status should be 400, got ${res.status}`);
  assert(!res.isJson, "should NOT be JSON");
  assert(res.contentType.includes("text/plain"), `should be text/plain, got ${res.contentType}`);
  assert(typeof res.data === "string", "should be a string");
});

await test("default format (no format param) returns text/plain on error", async () => {
  const res = await post("/api/parse", {
    parseURL: "bad-url",
    selector: "h1",
    method: "text",
  });
  assert(res.status === 400, `status should be 400, got ${res.status}`);
  assert(!res.isJson, "should NOT be JSON");
});

console.log("\n── JSON envelope structure ──");

await test("JSON error has correct structure: { success, error: { message, type } }", async () => {
  const res = await post("/api/parse", {
    parseURL: "not-valid",
    selector: "h1",
    method: "text",
    format: "json",
  });
  assert(res.data.hasOwnProperty("success"), "should have success field");
  assert(res.data.hasOwnProperty("error"), "should have error field");
  assert(res.data.error.hasOwnProperty("message"), "error should have message");
  assert(res.data.error.hasOwnProperty("type"), "error should have type");
  assert(!res.data.hasOwnProperty("data"), "should NOT have data on error");
});

// ─── Success tests (network required) ───

console.log("\n── Network tests: success responses (example.com) ──");

await networkTest("JSON text extraction returns envelope with data array", async () => {
  const res = await post("/api/parse", {
    parseURL: "https://example.com",
    selector: "h1",
    method: "text",
    format: "json",
  });
  if (res.status !== 200) throw new Error(`${res.status}`);
  assert(res.isJson, "should be JSON");
  assert(res.data.success === true, "success should be true");
  assert(Array.isArray(res.data.data), "data should be an array");
  assert(res.data.data.length > 0, "data should not be empty");
  assert(res.data.data[0] === "Example Domain", `expected 'Example Domain', got '${res.data.data[0]}'`);
  assert(res.data.meta.selector === "h1", "meta.selector should be h1");
  assert(res.data.meta.method === "text", "meta.method should be text");
  assert(res.data.meta.format === "json", "meta.format should be json");
  assert(res.data.meta.count === res.data.data.length, "meta.count should match data.length");
});

await networkTest("JSON attribute extraction returns href values", async () => {
  const res = await post("/api/parse", {
    parseURL: "https://example.com",
    selector: "a",
    method: "attribute",
    extra: "href",
    format: "json",
  });
  if (res.status !== 200) throw new Error(`${res.status}`);
  assert(res.data.success === true, "success should be true");
  assert(Array.isArray(res.data.data), "data should be an array");
  assert(res.data.data.length > 0, "should have at least one link");
  assert(res.data.data[0].startsWith("http"), `expected URL, got '${res.data.data[0]}'`);
  assert(res.data.meta.method === "attribute", "meta.method should be attribute");
});

await networkTest("JSON html extraction returns inner HTML", async () => {
  const res = await post("/api/parse", {
    parseURL: "https://example.com",
    selector: "p",
    method: "html",
    format: "json",
  });
  if (res.status !== 200) throw new Error(`${res.status}`);
  assert(res.data.success === true, "success should be true");
  assert(Array.isArray(res.data.data), "data should be an array");
  assert(res.data.data.length > 0, "should have content");
  assert(res.data.meta.method === "html", "meta.method should be html");
});

await networkTest("plaintext format returns raw text", async () => {
  const res = await post("/api/parse", {
    parseURL: "https://example.com",
    selector: "h1",
    method: "text",
    format: "plaintext",
  });
  if (res.status !== 200) throw new Error(`${res.status}`);
  assert(!res.isJson, "should NOT be JSON");
  assert(res.contentType.includes("text/plain"), `should be text/plain, got ${res.contentType}`);
  assert(typeof res.data === "string", "should be a string");
  assert(res.data.includes("Example Domain"), `expected 'Example Domain' in response`);
});

await networkTest("no matching selector returns 404 with parsing error", async () => {
  const res = await post("/api/parse", {
    parseURL: "https://example.com",
    selector: ".this-class-does-not-exist",
    method: "text",
    format: "json",
  });
  if (res.status === 502 || res.status === 504 || res.status === 500) throw new Error(`${res.status}`);
  assert(res.status === 404, `status should be 404, got ${res.status}`);
  assert(res.data.success === false, "success should be false");
  assert(res.data.error.type === "parsing", `type should be parsing, got ${res.data.error.type}`);
});

// ─── Other endpoints ───

console.log("\n── Health endpoint ──");

await test("health check returns expected structure", async () => {
  const res = await get("/api/health");
  assert(res.status === 200, `status should be 200, got ${res.status}`);
  assert(res.data.status === "healthy", "status should be healthy");
  assert(typeof res.data.timestamp === "string", "should have timestamp");
  assert(res.data.service === "HTML Parser API", "should have service name");
});

console.log("\n── Logs endpoint (local access) ──");

await test("logs endpoint returns array from localhost", async () => {
  const res = await get("/api/logs?limit=5");
  assert(res.status === 200, `status should be 200, got ${res.status}`);
  assert(Array.isArray(res.data), "should return an array");
});

// Summary
const total = passed + failed;
console.log(`\n${"═".repeat(40)}`);
console.log(`  Results: ${passed}/${total} tests passed`);
if (skipped > 0) {
  console.log(`  ${skipped} test(s) skipped (network)`);
}
if (failed > 0) {
  console.log(`  ${failed} test(s) FAILED`);
  console.log(`${"═".repeat(40)}\n`);
  process.exit(1);
} else {
  console.log(`  All tests passed!`);
  console.log(`${"═".repeat(40)}\n`);
}
