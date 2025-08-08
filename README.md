
# HTML Parser API

A REST API service that extracts content from web pages using CSS selectors. Built with Express.js, TypeScript, and Cheerio for reliable HTML parsing.

## Features

- Extract text content from web pages
- Extract HTML content with tags
- Extract specific attributes from HTML elements
- Request logging and monitoring
- Built-in error handling and validation
- Health check endpoint

## API Endpoints

### Parse HTML Content

**POST** `/api/parse`

Extract content from a webpage using CSS selectors.

#### Request Body

```json
{
  "parseURL": "https://example.com",
  "selector": ".content p",
  "method": "text",
  "extra": "href"
}
```

**Parameters:**
- `parseURL` (string, required): The URL of the webpage to parse
- `selector` (string, required): CSS selector to target elements
- `method` (string, required): Extraction method - `"text"`, `"html"`, or `"attribute"`
- `extra` (string, optional): Required when method is `"attribute"` - specifies which attribute to extract

#### Response

Returns plain text content based on the extraction method.

#### Examples

**Extract text content:**
```bash
curl -X POST http://localhost:5000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "parseURL": "https://example.com",
    "selector": "h1",
    "method": "text"
  }'
```

**Extract HTML content:**
```bash
curl -X POST http://localhost:5000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "parseURL": "https://news.ycombinator.com",
    "selector": ".storylink",
    "method": "html"
  }'
```

**Extract attributes (e.g., links):**
```bash
curl -X POST http://localhost:5000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "parseURL": "https://example.com",
    "selector": "a",
    "method": "attribute",
    "extra": "href"
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

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad request (validation errors, parsing errors)
- `500` - Internal server error

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
