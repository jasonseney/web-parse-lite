import { parse, WebParseLiteError, type ParseResult as PackageParseResult } from "../../packages/web-parse-lite/dist/index.js";
import type { ParseRequest } from "@shared/schema";

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
  async parseWebpage(request: ParseRequest): Promise<ParseResult> {
    const { parseURL, selector, method, extra, format } = request;

    const result = await parse({
      url: parseURL,
      selector,
      method,
      attribute: extra,
      format,
    });

    const responseLength =
      format === "json"
        ? JSON.stringify(result.data).length
        : (result.data as string).length;

    return {
      data: result.data,
      responseLength,
      format,
    };
  }

  public static categorizeError(error: any): ParseError {
    if (error instanceof WebParseLiteError) {
      return { message: error.message, type: error.type };
    }

    if (error.name === "AbortError") {
      return { message: "Request timeout (10 seconds exceeded)", type: "timeout" };
    }
    if (error.code === "ENOTFOUND") {
      return { message: "Invalid URL or network error", type: "network" };
    }
    if (error.message?.includes("No elements found")) {
      return { message: error.message, type: "parsing" };
    }
    return { message: error.message || "Unknown error occurred", type: "unknown" };
  }
}

export const htmlParserService = new HtmlParserService();
