
# HTML Parser API

A REST API service that extracts content from web pages using CSS selectors. Built with Express.js, TypeScript, and Cheerio for reliable HTML parsing.

> [!NOTE]
> **Just need the parsing logic?** The core library is available as a standalone npm package:
> ```bash
> npm install @js0n-dev/web-parse-lite
> ```
> See the [package documentation](packages/web-parse-lite/README.md) for usage as a library in your own project.

## Features

- **Multiple Extraction Methods**: Extract text content, HTML content with tags, or specific element attributes
- **Flexible Response Formats**: Structured JSON with response envelope, or plain text for simple use cases
- **CSS Selector Support**: Use any valid CSS selector to target specific elements
- **Robust Error Handling**: Typed errors with appropriate HTTP status codes
- **Request Logging**: Built-in monitoring with detailed logs of all API requests

## API Endpoints

### Parse HTML Content

**POST** `/api/parse`

Extract content from a webpage using CSS selectors.

#### Request Body

```json
{
  "parseURL": "https://example.com",
  "selector": "h1",
  "method": "text",
  "format": "json"
}
```

| Parameter | Type   | Required | Default       | Description                                    |
| --------- | ------ | -------- | ------------- | ---------------------------------------------- |
| parseURL  | string | Yes      |               | URL of the webpage to parse                    |
| selector  | string | Yes      |               | CSS selector to target elements                |
| method    | string | Yes      |               | `"text"`, `"html"`, or `"attribute"`           |
| extra     | string | If attr  |               | Attribute name (required for `"attribute"` method) |
| format    | string | No       | `"plaintext"` | `"json"` or `"plaintext"`                      |

#### JSON Response Format

When `format` is `"json"`, responses use a structured envelope:

**Success (200):**
```json
{
  "success": true,
  "data": ["First heading", "Second heading", "Third heading"],
  "meta": {
    "selector": "h1, h2, h3",
    "method": "text",
    "format": "json",
    "count": 3
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "message": "No elements found matching selector: .nonexistent",
    "type": "parsing"
  }
}
```

#### Plaintext Response Format

When `format` is `"plaintext"` (default), success responses return raw `text/plain` with results joined by `\n\n`. Error responses also return plain text.

#### Status Codes

| Code | Meaning          | When                                         |
| ---- | ---------------- | -------------------------------------------- |
| 200  | Success          | Content extracted successfully               |
| 400  | Bad Request      | Invalid input (bad URL, missing fields, etc) |
| 404  | Not Found        | No elements matched the CSS selector         |
| 502  | Bad Gateway      | Failed to fetch the target URL               |
| 504  | Gateway Timeout  | Target URL took too long to respond          |
| 500  | Server Error     | Unexpected internal error                    |

#### Error Types

The `error.type` field in JSON error responses allows programmatic error handling:

| Type         | Description                              |
| ------------ | ---------------------------------------- |
| `validation` | Invalid request parameters               |
| `parsing`    | No elements found for the given selector |
| `network`    | Failed to reach or fetch the target URL  |
| `timeout`    | Target URL response exceeded 10 seconds  |
| `unknown`    | Unexpected error                         |

### Examples

**Extract text (JSON format):**

```bash
curl -X POST http://localhost:5000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "parseURL": "https://blog.replit.com",
    "selector": "h2, h2 ~ p",
    "method": "plaintext"
  }'
```

**Extract text content (JSON array format):**
```bash
curl -X POST http://localhost:5000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "parseURL": "https://en.wikipedia.org/wiki/Artificial_intelligence",
    "selector": "h1, h2, h3",
    "method": "text",
    "format": "json"
  }'
```

**Extract HTML content:**
```bash
curl -X POST http://localhost:5000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "parseURL": "https://news.ycombinator.com",
    "selector": ".submission",
    "method": "html",
    "format": "json"
  }'
```

**Extract attributes (e.g., image links):**
```bash
curl -X POST http://localhost:5000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "parseURL": "https://blog.replit.com",
    "selector": "main img",
    "method": "attribute",
    "extra": "src",
    "format": "json"
    }'
```

### Get Request Logs

**GET** `/api/logs?limit=10`

Retrieve recent API request logs for monitoring and debugging.

### Health Check

**GET** `/api/health`

Returns `{ "status": "healthy", "timestamp": "...", "service": "HTML Parser API" }`.

## Common Use Cases

- **Web Scraping for AI Agents**: Extract structured data from websites as JSON
- **Content Monitoring**: Track changes to specific elements on web pages
- **Link Extraction**: Gather all links from a webpage for crawling or processing
- **Metadata Extraction**: Extract meta tags, titles, or Open Graph data

## Development

This service is built with:
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **[web-parse-lite](packages/web-parse-lite/)** - Core HTML parsing library (also on npm)
- **Zod** - Request validation

```bash
npm run dev    # Development mode
npm run build  # Build for production
npm start      # Production mode
```

## Project Structure

```
packages/web-parse-lite/   # Standalone npm package (core parsing logic)
server/                    # Express.js API service
shared/                    # Shared schemas and types
scripts/                   # Documentation generation
public/                    # Generated API docs
```
