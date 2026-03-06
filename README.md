
# HTML Parser API

A REST API service that extracts content from web pages using CSS selectors. Built with Express.js, TypeScript, and Cheerio for reliable HTML parsing.

> **Just need the parsing logic?** The core library is available as a standalone npm package:
> ```bash
> npm install web-parse-lite
> ```
> See the [package documentation](packages/web-parse-lite/README.md) for usage as a library in your own project.

## Features

- **Multiple Extraction Methods**: Extract text content, HTML content with tags, or specific element attributes
- **Flexible Response Formats**: Get results as JSON arrays for structured data processing or plain text for simple use cases
- **CSS Selector Support**: Use any valid CSS selector to target specific elements
- **Robust Error Handling**: Comprehensive validation, timeout handling, and network error management
- **Request Logging**: Built-in monitoring with detailed logs of all API requests

## API Endpoints

### Parse HTML Content

**POST** `/api/parse`

Extract content from a webpage using CSS selectors.

#### Request Body

```json
{
  "parseURL": "https://example.com",
  "selector": "section .content p a",
  "method": "attribute",
  "extra": "href",
  "format": "json"
}
```

**Parameters:**
- `parseURL` (string, required): The URL of the webpage to parse
- `selector` (string, required): CSS selector to target elements
- `method` (string, required): Extraction method - `"text"`, `"html"`, or `"attribute"`
- `extra` (string, optional): Required when method is `"attribute"` - specifies which attribute to extract
- `format` (string, optional): Response format - `"json"` or `"plaintext"` (default: `"plaintext"`)

#### Response

Returns content in the specified format:
- **JSON format**: Array of strings, each element is a separate match
- **Plain text format**: All matches joined with `\n\n` separator

### Get Request Logs

**GET** `/api/logs?limit=10`

Retrieve recent API request logs for monitoring and debugging.

**Query Parameters:**
- `limit` (number, optional): Number of logs to return (default: 10)

### Health Check

**GET** `/api/health`

Check if the service is running.

## Examples

**Extract text content (plain text format):**
```bash
curl -X POST http://localhost:5000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "parseURL": "https://blog.replit.com",
    "selector": "h2, h2 ~ p",
    "method": "text"
  }'
```

**Extract text content (JSON array format):**
```bash
curl -X POST http://localhost:5000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "parseURL": "https://news.ycombinator.com",
    "selector": ".titleline > a",
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

**Extract attributes (e.g., links):**
```bash
curl -X POST http://localhost:5000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "parseURL": "https://blog.replit.com",
    "selector": "main a",
    "method": "attribute",
    "extra": "href",
    "format": "json"
  }'
```

**Extract all image URLs:**
```bash
curl -X POST http://localhost:5000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "parseURL": "https://example.com",
    "selector": "img",
    "method": "attribute",
    "extra": "src"
  }'
```

## Error Handling

The API provides descriptive error responses with appropriate HTTP status codes:

- **200 Success**: Request processed successfully
- **400 Bad Request**: Validation errors, parsing errors (no matching elements), network errors, or timeout
- **500 Internal Server Error**: Unexpected server-side issues

## Common Use Cases

- **Web Scraping for AI Agents**: Extract structured data from websites as JSON arrays
- **Content Monitoring**: Track changes to specific elements on web pages
- **Link Extraction**: Gather all links from a webpage for processing
- **Metadata Extraction**: Extract meta tags, titles, or other structured data

## Rate Limiting & Timeouts

- Request timeout: 10 seconds
- The service includes a User-Agent header for better compatibility
- All requests are logged for monitoring

## Development

This service is built with:
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **[web-parse-lite](packages/web-parse-lite/)** - Core HTML parsing library (also available on npm)
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
