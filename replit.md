# Overview

This project contains two things:
1. **@js0n-dev/web-parse-lite** — A standalone npm package for extracting content from web pages using CSS selectors
2. **HTML Parser API** — An Express.js REST API service that uses the package, with request logging and documentation

# User Preferences

Preferred communication style: Simple, everyday language.

# Project Structure

```
packages/web-parse-lite/     # npm package (publishable as @js0n-dev/web-parse-lite)
  src/
    index.ts                  # Public API exports
    parser.ts                 # Parse logic (parse, parseHtml)
    discover.ts               # Discover logic (discover, discoverHtml)
    fetcher.ts                # Shared URL fetching (fetchPage)
    types.ts                  # Types, Zod schemas, WebParseLiteError
  dist/                       # Built output (JS + type declarations)
  test.js                     # Package test suite (40 tests)
  package.json
  tsconfig.json
  README.md

server/                       # Express.js API service
  index.ts                    # Server entry point
  routes.ts                   # API route handlers (/api/parse, /api/discover, /api/logs, /api/health)
  storage.ts                  # Request logging storage (Replit DB, 30-day retention, 1000 cap)
  services/
    htmlParserService.ts      # Thin wrapper around web-parse-lite package
  test-api.js                 # API endpoint test suite (12+ tests)

shared/
  schema.ts                   # Zod schemas for API request validation

scripts/
  generate-docs.js            # Generates API documentation HTML
  docs-template.html          # Documentation template

public/
  index.html                  # Generated documentation page
```

# npm Package: @js0n-dev/web-parse-lite

The core parsing logic lives in `packages/web-parse-lite/`. It exports:
- `parse(options)` — Fetches a URL and extracts content (async)
- `parseHtml(options)` — Parses raw HTML string (sync, no network)
- `discover(options)` — Fetches a URL and analyzes page structure (async)
- `discoverHtml(html)` — Analyzes raw HTML structure (sync, no network)
- `parseOptionsSchema` — Zod validation schema
- `WebParseLiteError` — Typed error class with categorization
- Types: `ParseOptions`, `ParseHtmlOptions`, `ParseResult`, `ParseError`, `DiscoverOptions`, `DiscoverResult`

Dependencies: `cheerio`, `zod` only. No Express, no database.

To build: `cd packages/web-parse-lite && npx tsc`
To test: `cd packages/web-parse-lite && node test.js`
To publish: `cd packages/web-parse-lite && npm publish`

# API Service

The Express server at `server/` uses the package for parsing and adds:
- JSON response envelope (`{ success, data, meta }` or `{ success, error }`)
- Proper HTTP status codes (400, 404, 502, 504, 500)
- Request/response logging to Replit DB (30-day retention, 1000 entry cap)
- Logs endpoint restricted to localhost only
- Auto-generated HTML documentation
- Health check endpoint

### API Endpoints
- `POST /api/parse` — Parse a webpage (params: parseURL, selector, method, extra, format)
- `POST /api/discover` — Discover page structure (params: parseURL)
- `GET /api/logs` — Recent request history (localhost only)
- `GET /api/health` — Service health check

To test API: `node server/test-api.js` (requires server running)

# External Dependencies

## npm Package (@js0n-dev/web-parse-lite)
- **cheerio**: Server-side HTML parsing and DOM manipulation
- **zod**: Runtime type validation

## API Service (root project)
- **express**: HTTP server framework
- **@replit/database**: Replit key-value database for request logging
- **cheerio**: (shared with package)
- **zod**: (shared with package)
- **marked**: Markdown-to-HTML for documentation generation
- **drizzle-orm / drizzle-zod**: Schema definitions and validation
- **tsx**: TypeScript execution for development
- **esbuild**: Backend bundling for production
