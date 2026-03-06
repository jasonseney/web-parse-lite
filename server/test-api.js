const BASE = "http://localhost:5000";

let passed = 0;
let failed = 0;

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
  return { status: res.status, data: await res.json() };
}

console.log("\n── JSON format: success responses ──");

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

await test("empty request body returns 400 with JSON envelope", async () => {
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

console.log("\n── Health endpoint ──");

await test("health check returns expected structure", async () => {
  const res = await get("/api/health");
  assert(res.status === 200, `status should be 200, got ${res.status}`);
  assert(res.data.status === "healthy", "status should be healthy");
  assert(typeof res.data.timestamp === "string", "should have timestamp");
  assert(res.data.service === "HTML Parser API", "should have service name");
});

console.log("\n── Logs endpoint ──");

await test("logs endpoint returns array", async () => {
  const res = await get("/api/logs?limit=5");
  assert(res.status === 200, `status should be 200, got ${res.status}`);
});

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
