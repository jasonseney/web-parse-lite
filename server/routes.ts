import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { parseRequestSchema, discoverRequestSchema, type ParseRequest } from "@shared/schema";
import { z } from "zod";
import { htmlParserService, HtmlParserService } from "./services/htmlParserService";

function errorStatusCode(type: string): number {
  switch (type) {
    case "validation": return 400;
    case "parsing": return 404;
    case "network": return 502;
    case "timeout": return 504;
    default: return 500;
  }
}

function isLocalRequest(req: Request): boolean {
  const ip = req.ip || req.socket.remoteAddress || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/parse", async (req, res) => {
    try {
      const validationResult = parseRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(", ");

        await storage.logRequest({
          parseUrl: req.body.parseURL || "invalid",
          selector: req.body.selector || "invalid",
          method: req.body.method || "invalid",
          extra: req.body.extra,
          success: false,
          responseLength: null,
          errorMessage: `Validation error: ${errorMessage}`
        });

        const format = req.body.format || "plaintext";
        if (format === "json") {
          return res.status(400).json({
            success: false,
            error: { message: errorMessage, type: "validation" }
          });
        }
        return res.status(400).type("text/plain").send(`Validation error: ${errorMessage}`);
      }

      const { parseURL, selector, method, extra, format } = validationResult.data;

      try {
        const parseResult = await htmlParserService.parseWebpage({
          parseURL, selector, method, extra, format
        });

        await storage.logRequest({
          parseUrl: parseURL,
          selector, method, extra,
          success: true,
          responseLength: parseResult.responseLength,
          errorMessage: null
        });

        if (format === "json") {
          return res.json({
            success: true,
            data: parseResult.data,
            meta: {
              selector,
              method,
              format,
              count: Array.isArray(parseResult.data) ? parseResult.data.length : 1
            }
          });
        }
        return res.type("text/plain").send(parseResult.data);

      } catch (parseError: any) {
        const error = HtmlParserService.categorizeError(parseError);
        const status = errorStatusCode(error.type);

        await storage.logRequest({
          parseUrl: parseURL,
          selector, method, extra,
          success: false,
          responseLength: null,
          errorMessage: error.message
        });

        if (format === "json") {
          return res.status(status).json({
            success: false,
            error: { message: error.message, type: error.type }
          });
        }
        return res.status(status).type("text/plain").send(`Error: ${error.message}`);
      }

    } catch (error: any) {
      console.error("Parse API error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Internal server error", type: "unknown" }
      });
    }
  });

  app.post("/api/discover", async (req, res) => {
    try {
      const validationResult = discoverRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(", ");
        return res.status(400).json({
          success: false,
          error: { message: errorMessage, type: "validation" }
        });
      }

      const { parseURL } = validationResult.data;

      try {
        const result = await htmlParserService.discoverWebpage(parseURL);
        return res.json({
          success: true,
          data: result,
          meta: { url: parseURL, selectorCount: result.selectors.length }
        });
      } catch (discoverError: any) {
        const error = HtmlParserService.categorizeError(discoverError);
        const status = errorStatusCode(error.type);
        return res.status(status).json({
          success: false,
          error: { message: error.message, type: error.type }
        });
      }
    } catch (error: any) {
      console.error("Discover API error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Internal server error", type: "unknown" }
      });
    }
  });

  app.get("/api/logs", async (req, res) => {
    if (!isLocalRequest(req)) {
      return res.status(403).json({ error: "Logs are only accessible locally" });
    }

    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const logs = await storage.getRecentRequests(limit);
      res.json(logs);
    } catch (error) {
      console.error("Logs API error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "HTML Parser API"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
