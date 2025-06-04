import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { parseRequestSchema, type ParseRequest } from "@shared/schema";
import { z } from "zod";
import * as cheerio from "cheerio";

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

      const { parseURL, selector, method, extra } = validationResult.data;

      try {
        // Fetch the webpage with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(parseURL, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; HTMLParserAPI/1.0)'
          }
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        let result: string = "";
        const elements = $(selector);

        if (elements.length === 0) {
          throw new Error(`No elements found matching selector: ${selector}`);
        }

        switch (method) {
          case "text":
            result = elements.map((_, el) => $(el).text().trim()).get().join("\n\n");
            break;
          
          case "html":
            result = elements.map((_, el) => $(el).html()).get().join("\n\n");
            break;
          
          case "attribute":
            if (!extra) {
              throw new Error("Extra parameter is required for attribute extraction");
            }
            result = elements.map((_, el) => $(el).attr(extra) || "").get()
              .filter(val => val !== "")
              .join("\n");
            break;
          
          default:
            throw new Error(`Unsupported method: ${method}`);
        }

        // Log successful request
        await storage.logRequest({
          parseUrl: parseURL,
          selector: selector,
          method: method,
          extra: extra,
          success: true,
          responseLength: result.length,
          errorMessage: null
        });

        // Return plain text response
        res.set('Content-Type', 'text/plain');
        res.send(result);

      } catch (fetchError: any) {
        let errorMessage = "Unknown error occurred";
        
        if (fetchError.name === 'AbortError') {
          errorMessage = "Request timeout (10 seconds exceeded)";
        } else if (fetchError.code === 'ENOTFOUND') {
          errorMessage = "Invalid URL or network error";
        } else if (fetchError.message) {
          errorMessage = fetchError.message;
        }

        // Log failed request
        await storage.logRequest({
          parseUrl: parseURL,
          selector: selector,
          method: method,
          extra: extra,
          success: false,
          responseLength: null,
          errorMessage: errorMessage
        });

        res.status(400).send(`Error: ${errorMessage}`);
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
