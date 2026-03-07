# web-parse-lite

Lightweight HTML parser for extracting content from web pages using CSS selectors. Built on Cheerio with Zod validation.

## Installation

```bash
npm install web-parse-lite
```

## Quick Start

### Parse a URL

```typescript
import { parse } from "web-parse-lite";

const result = await parse({
  url: "https://example.com",
  selector: "h1",
  method: "text",
});

console.log(result.data); // ["Example Domain"]
```

### Parse raw HTML

```typescript
import { parseHtml } from "web-parse-lite";

const result = parseHtml({
  html: "<ul><li>One</li><li>Two</li><li>Three</li></ul>",
  selector: "li",
  method: "text",
});

console.log(result.data); // ["One", "Two", "Three"]
```

## API

### `parse(options): Promise<ParseResult>`

Fetches a web page and extracts content using a CSS selector.

| Option      | Type                               | Required | Default     | Description                          |
| ----------- | ---------------------------------- | -------- | ----------- | ------------------------------------ |
| `url`       | `string`                           | Yes      |             | URL to fetch                         |
| `selector`  | `string`                           | Yes      |             | CSS selector to target elements      |
| `method`    | `"text" \| "html" \| "attribute"` | Yes      |             | Extraction method                    |
| `attribute` | `string`                           | If attr  |             | Attribute name (for `attribute` method) |
| `format`    | `"json" \| "plaintext"`           | No       | `"json"`    | Output format                        |
| `timeout`   | `number`                           | No       | `10000`     | Request timeout in ms                |
| `userAgent` | `string`                           | No       | Built-in    | Custom User-Agent header             |

### `parseHtml(options): ParseResult`

Parses a raw HTML string (synchronous, no network request).

| Option      | Type                               | Required | Default  | Description                          |
| ----------- | ---------------------------------- | -------- | -------- | ------------------------------------ |
| `html`      | `string`                           | Yes      |          | HTML string to parse                 |
| `selector`  | `string`                           | Yes      |          | CSS selector to target elements      |
| `method`    | `"text" \| "html" \| "attribute"` | Yes      |          | Extraction method                    |
| `attribute` | `string`                           | If attr  |          | Attribute name (for `attribute` method) |
| `format`    | `"json" \| "plaintext"`           | No       | `"json"` | Output format                        |

### `ParseResult`

```typescript
{
  data: string[] | string;  // Array for "json" format, string for "plaintext"
  format: "json" | "plaintext";
}
```

### Extraction Methods

- **`text`** — Extracts the text content of each matched element
- **`html`** — Extracts the inner HTML of each matched element
- **`attribute`** — Extracts a specific attribute value from each matched element (requires `attribute` option)

### Format Options

- **`json`** (default) — Returns `data` as `string[]`
- **`plaintext`** — Returns `data` as a single string with results joined by `\n\n`

## Discover Page Structure

### `discover(options): Promise<DiscoverResult>`

Fetches a URL and analyzes its HTML structure, returning the most common CSS selectors with sample text. Useful for exploring a page before writing selectors.

```typescript
import { discover } from "web-parse-lite";

const result = await discover({ url: "https://example.com" });
console.log(result.selectors); // ["div", "a", "p", "h1", ...]
console.log(result.sample);    // { "h1": "Example Domain", "a": "More information...", ... }
```

| Option      | Type     | Required | Default  | Description              |
| ----------- | -------- | -------- | -------- | ------------------------ |
| `url`       | `string` | Yes      |          | URL to fetch and analyze |
| `timeout`   | `number` | No       | `10000`  | Request timeout in ms    |
| `userAgent` | `string` | No       | Built-in | Custom User-Agent header |

### `discoverHtml(html): DiscoverResult`

Analyzes a raw HTML string (synchronous, no network request).

```typescript
import { discoverHtml } from "web-parse-lite";

const result = discoverHtml("<html><body><h1>Title</h1><p>Text</p></body></html>");
```

### `DiscoverResult`

```typescript
{
  selectors: string[];                // Top 30 selectors, ranked by frequency
  sample: Record<string, string>;     // Selector → first text snippet (max 80 chars)
}
```

The discover functions automatically:
- Filter out non-content tags (script, style, meta, etc.)
- Filter out utility CSS classes (flex, grid, mt-, px-, etc.)
- Prioritize elements with IDs and meaningful class names
- Cap class names at 2 per selector for usability
- Return up to 30 selectors sorted by frequency

## Error Handling

All errors throw `WebParseLiteError` with a `type` property for programmatic handling:

```typescript
import { parse, WebParseLiteError } from "web-parse-lite";

try {
  const result = await parse({ url: "https://example.com", selector: "h1", method: "text" });
} catch (error) {
  if (error instanceof WebParseLiteError) {
    console.log(error.type);    // "validation" | "network" | "parsing" | "timeout" | "unknown"
    console.log(error.message); // Human-readable error message
  }
}
```

## Validation

The package exports a Zod schema for input validation:

```typescript
import { parseOptionsSchema } from "web-parse-lite";

const result = parseOptionsSchema.safeParse(userInput);
if (!result.success) {
  console.log(result.error.issues);
}
```

## License

MIT
