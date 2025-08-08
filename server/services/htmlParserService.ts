import * as cheerio from "cheerio";
import type { ParseRequest } from "@shared/schema";
import type { Element } from "domhandler";

export interface ParseResult {
  data: string[] | string;
  responseLength: number;
  format: "json" | "plaintext";
}

export interface ParseError {
  message: string;
  type: "validation" | "network" | "parsing" | "timeout" | "unknown";
}

export class HtmlParserService {
  private readonly TIMEOUT_MS = 10000; // 10 seconds
  private readonly USER_AGENT = 'Mozilla/5.0 (compatible; HTMLParserAPI/1.0)';

  async parseWebpage(request: ParseRequest): Promise<ParseResult> {
    const { parseURL, selector, method, extra, format } = request;

    // Fetch webpage with timeout
    const html = await this.fetchWebpage(parseURL);
    
    // Parse HTML
    const $ = cheerio.load(html);
    const elements = $(selector);

    if (elements.length === 0) {
      throw new Error(`No elements found matching selector: ${selector}`);
    }

    // Extract data based on method  
    const results = this.extractData(elements as any, $, method, extra);
    
    // Format response
    const responseData = format === "json" ? results : results.join("\n\n");
    const responseLength = format === "json" 
      ? JSON.stringify(results).length 
      : responseData.length;

    return {
      data: responseData,
      responseLength,
      format
    };
  }

  private async fetchWebpage(url: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.USER_AGENT
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error("Request timeout (10 seconds exceeded)");
      } else if (error.code === 'ENOTFOUND') {
        throw new Error("Invalid URL or network error");
      } else {
        throw error;
      }
    }
  }

  private extractData(
    elements: cheerio.Cheerio<Element>, 
    $: cheerio.CheerioAPI, 
    method: "text" | "html" | "attribute",
    extra?: string
  ): string[] {
    switch (method) {
      case "text":
        return elements.map((_, el) => $(el).text().trim()).get().filter(text => text !== "");
      
      case "html":
        return elements.map((_, el) => $(el).html() || "").get().filter(html => html !== "");
      
      case "attribute":
        if (!extra) {
          throw new Error("Extra parameter is required for attribute extraction");
        }
        return elements.map((_, el) => $(el).attr(extra) || "").get().filter(attr => attr !== "");
      
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  public static categorizeError(error: any): ParseError {
    if (error.name === 'AbortError') {
      return {
        message: "Request timeout (10 seconds exceeded)",
        type: "timeout"
      };
    } else if (error.code === 'ENOTFOUND') {
      return {
        message: "Invalid URL or network error",
        type: "network"
      };
    } else if (error.message?.includes("No elements found")) {
      return {
        message: error.message,
        type: "parsing"
      };
    } else if (error.message?.includes("selector")) {
      return {
        message: error.message,
        type: "validation"
      };
    } else {
      return {
        message: error.message || "Unknown error occurred",
        type: "unknown"
      };
    }
  }
}

// Create a singleton instance
export const htmlParserService = new HtmlParserService();