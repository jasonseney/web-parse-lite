
# HTML Parser API

A REST API service that extracts content from web pages using CSS selectors. Built with Express.js, TypeScript, and Cheerio for reliable HTML parsing.

## Features

- **Multiple Extraction Methods**: Extract text content, HTML content with tags, or specific element attributes
- **Flexible Response Formats**: Get results as JSON arrays for structured data processing or plain text for simple use cases
- **CSS Selector Support**: Use any valid CSS selector to target specific elements
- **Robust Error Handling**: Comprehensive validation, timeout handling, and network error management
- **Request Logging**: Built-in monitoring with detailed logs of all API requests
- **Business Logic Separation**: Clean architecture with separated service layer for maintainability

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

#### Examples

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

### Get Request Logs

**GET** `/api/logs?limit=10`

Retrieve recent API request logs for monitoring and debugging.

#### Query Parameters
- `limit` (number, optional): Number of logs to return (default: 10)

#### Response
```json
[
  {
    "id": 1,
    "parseUrl": "https://example.com",
    "selector": "h1",
    "method": "text",
    "success": true,
    "responseLength": 25,
    "timestamp": "2024-01-01T12:00:00Z"
  }
]
```

### Health Check

**GET** `/api/health`

Check if the service is running.

#### Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "service": "HTML Parser API"
}
```

## Error Handling

The API provides comprehensive error handling with appropriate HTTP status codes:

- **200 Success**: Request processed successfully
- **400 Bad Request**: 
  - Validation errors (invalid URL, missing required fields)
  - Parsing errors (no elements found matching selector)
  - Network errors (timeout, DNS resolution failed)
  - Method-specific errors (missing `extra` parameter for attribute extraction)
- **500 Internal Server Error**: Unexpected server-side issues

Error responses include descriptive messages to help diagnose issues:
```json
{
  "error": "No elements found matching selector: .nonexistent-class"
}
```

## Common Use Cases

### Web Scraping for AI Agents
Perfect for AI agents that need to extract structured data from websites:
```json
{
  "parseURL": "https://news.ycombinator.com",
  "selector": ".storylink",
  "method": "text",
  "format": "json"
}
```

### Content Monitoring
Extract specific content for monitoring changes:
```json
{
  "parseURL": "https://example.com/status",
  "selector": ".status-indicator",
  "method": "attribute",
  "extra": "class",
  "format": "json"
}
```

### Link Extraction
Gather all links from a webpage:
```json
{
  "parseURL": "https://example.com",
  "selector": "a[href^='https://']",
  "method": "attribute",
  "extra": "href",
  "format": "json"
}
```

Error responses include descriptive messages:

```json
{
  "error": "No elements found matching selector: .nonexistent"
}
```

## Common Use Cases

### Web Scraping
Extract specific content from websites for data analysis or content aggregation.

### Content Monitoring
Monitor changes to specific elements on web pages.

### Link Extraction
Extract all links from a webpage for further processing.

### Metadata Extraction
Extract meta tags, titles, or other structured data from web pages.

## Rate Limiting & Timeouts

- Request timeout: 10 seconds
- The service includes a User-Agent header for better compatibility
- All requests are logged for monitoring

## Development

This service is built with:
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Cheerio** - Server-side HTML parsing
- **Zod** - Request validation

## Deployment

The service runs on port 5000 and is ready for deployment on Replit or any Node.js hosting platform.

To start the service:
```bash
npm run dev    # Development mode
npm run build  # Build for production
npm start      # Production mode
```

## Examples with Different Websites

**Extract article titles from a news site:**
```bash
curl -X POST http://localhost:5000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "parseURL": "https://news.ycombinator.com",
    "selector": ".titleline > a",
    "method": "text"
  }'
```

**Extract product prices:**
```bash
curl -X POST http://localhost:5000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "parseURL": "https://example-store.com/product",
    "selector": ".price",
    "method": "text"
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
