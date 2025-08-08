# Overview

This is an HTML Parser API service built with Express.js, TypeScript, and React. The application provides REST API endpoints for extracting content from web pages using CSS selectors, with support for text extraction, HTML content retrieval, and attribute extraction. The project includes both a backend API service and a React frontend client, along with comprehensive documentation generation and request logging capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Full-Stack Architecture
The application follows a monorepo structure with separate client and server directories, using TypeScript throughout for type safety and maintainability.

### Backend Architecture
- **Framework**: Express.js with TypeScript for the REST API server
- **HTML Parsing**: Cheerio library for server-side DOM manipulation and content extraction
- **Business Logic**: Separated HTML parsing service layer for better maintainability
- **Request Processing**: Supports three extraction methods (text, html, attribute) with CSS selector targeting
- **Response Formats**: JSON array format for structured data and plaintext format for legacy compatibility
- **Error Handling**: Built-in validation using Zod schemas and comprehensive error responses with categorization
- **Logging**: Request logging system with success/failure tracking and response metrics

### Frontend Architecture  
- **Framework**: React with TypeScript using Vite as the build tool and development server
- **UI Components**: Comprehensive component library using Radix UI primitives with Tailwind CSS styling
- **State Management**: TanStack Query for server state management and data fetching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod resolvers for form validation

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL support for type-safe database operations
- **Schema Management**: Centralized schema definitions with automatic TypeScript type generation
- **Migrations**: Drizzle Kit for database schema migrations and management
- **Storage Abstraction**: Dual storage implementation supporting both PostgreSQL and in-memory storage

### Development Tooling
- **Documentation**: Automated API documentation generation from README markdown
- **Build System**: Vite for frontend bundling and esbuild for backend compilation
- **Type Safety**: Shared TypeScript types between client and server through the shared directory
- **Development Server**: Vite middleware integration with Express for unified development experience

### API Design
The core `/api/parse` endpoint accepts POST requests with URL, CSS selector, extraction method, and optional attribute parameter. The service fetches web pages, parses HTML content, and returns extracted data based on the specified method. Request validation ensures proper parameter formatting and method-specific requirements.

# External Dependencies

## Core Runtime Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL database driver for serverless environments
- **cheerio**: Server-side HTML parsing and DOM manipulation library
- **drizzle-orm**: Type-safe ORM for PostgreSQL database operations

## Frontend UI Framework
- **React ecosystem**: Core React library with TypeScript support
- **@radix-ui/***: Complete set of accessible UI primitives for building the component library
- **@tanstack/react-query**: Server state management and data fetching solution
- **wouter**: Lightweight routing library for single-page application navigation

## Styling and Design
- **tailwindcss**: Utility-first CSS framework for responsive design
- **class-variance-authority**: Component variant management for consistent styling
- **clsx**: Utility for conditional className composition

## Development and Build Tools
- **vite**: Modern frontend build tool and development server
- **esbuild**: Fast JavaScript bundler for backend compilation
- **drizzle-kit**: Database schema management and migration tool
- **tsx**: TypeScript execution engine for development