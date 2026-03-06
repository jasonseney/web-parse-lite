# Overview

This project contains two things:
1. **web-parse-lite** — A standalone npm package for extracting content from web pages using CSS selectors
2. **HTML Parser API** — An Express.js REST API service that uses the package, with request logging and documentation

# User Preferences

Preferred communication style: Simple, everyday language.

# Project Structure

```
packages/web-parse-lite/     # npm package (publishable)
  src/
    index.ts                  # Public API exports
    parser.ts                 # Core parsing logic (parse, parseHtml)
    types.ts                  # Types, Zod schemas, WebParseLiteError
  dist/                       # Built output (JS + type declarations)
  package.json
  tsconfig.json
  README.md

server/                       # Express.js API service
  index.ts                    # Server entry point
  routes.ts                   # API route handlers
  storage.ts                  # Request logging storage (Replit DB)
  services/
    htmlParserService.ts      # Thin wrapper around web-parse-lite package

shared/
  schema.ts                   # Zod schemas for API request validation

scripts/
  generate-docs.js            # Generates API documentation HTML
  docs-template.html          # Documentation template

public/
  index.html                  # Generated documentation page
```

# npm Package: web-parse-lite

The core parsing logic lives in `packages/web-parse-lite/`. It exports:
- `parse(options)` — Fetches a URL and extracts content (async)
- `parseHtml(options)` — Parses raw HTML string (sync, no network)
- `parseOptionsSchema` — Zod validation schema
- `WebParseLiteError` — Typed error class with categorization
- Types: `ParseOptions`, `ParseHtmlOptions`, `ParseResult`, `ParseError`

Dependencies: `cheerio`, `zod` only. No Express, no database.

To build: `cd packages/web-parse-lite && npx tsc`
To publish: `cd packages/web-parse-lite && npm publish`

# API Service

The Express server at `server/` uses the package for parsing and adds:
- Request validation via Zod schemas
- Request/response logging to Replit DB
- Auto-generated HTML documentation
- Health check endpoint

### API Endpoints
- `POST /api/parse` — Parse a webpage (params: parseURL, selector, method, extra, format)
- `GET /api/logs` — Recent request history
- `GET /api/health` — Service health check

# External Dependencies

## npm Package (web-parse-lite)
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
