import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { parseRequestSchema, type ParseRequest } from "@shared/schema";
import { z } from "zod";
import { htmlParserService, HtmlParserService } from "./services/htmlParserService";

export async function registerRoutes(app: Express): Promise<Server> {
  // HTML Parser API endpoint
  app.post("/api/parse", async (req, res) => {
    try {
      // Validate request body
      const validationResult = parseRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(", ");
        
        // Log failed request
        await storage.logRequest({
          parseUrl: req.body.parseURL || "invalid",
          selector: req.body.selector || "invalid",
          method: req.body.method || "invalid",
          extra: req.body.extra,
          success: false,
          responseLength: null,
          errorMessage: `Validation error: ${errorMessage}`
        });
        
        return res.status(400).send(`Validation error: ${errorMessage}`);
      }

      const { parseURL, selector, method, extra, format } = validationResult.data;

      try {
        // Use the business logic service to parse the webpage
        const parseResult = await htmlParserService.parseWebpage({
          parseURL,
          selector,
          method,
          extra,
          format
        });

        // Log successful request
        await storage.logRequest({
          parseUrl: parseURL,
          selector: selector,
          method: method,
          extra: extra,
          success: true,
          responseLength: parseResult.responseLength,
          errorMessage: null
        });

        // Return response in the appropriate format
        if (format === "json") {
          res.set('Content-Type', 'application/json');
          res.json(parseResult.data);
        } else {
          res.set('Content-Type', 'text/plain');
          res.send(parseResult.data);
        }

      } catch (parseError: any) {
        const error = HtmlParserService.categorizeError(parseError);

        // Log failed request
        await storage.logRequest({
          parseUrl: parseURL,
          selector: selector,
          method: method,
          extra: extra,
          success: false,
          responseLength: null,
          errorMessage: error.message
        });

        res.status(400).send(`Error: ${error.message}`);
      }

    } catch (error: any) {
      console.error("Parse API error:", error);
      res.status(500).send("Internal server error");
    }
  });

  // Get recent request logs endpoint (for monitoring/debugging)
  app.get("/api/logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const logs = await storage.getRecentRequests(limit);
      res.json(logs);
    } catch (error) {
      console.error("Logs API error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Health check endpoint
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
