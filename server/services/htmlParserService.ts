import { parse, discover, WebParseLiteError, type ParseResult as PackageParseResult, type DiscoverResult } from "../../packages/web-parse-lite/dist/index.js";
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

  async discoverWebpage(url: string): Promise<DiscoverResult> {
    return discover({ url });
  }

  public static categorizeError(error: any): ParseError {
    if (error instanceof WebParseLiteError) {
      if (error.type === "unknown" && error.message?.includes("fetch failed")) {
        return { message: "Failed to fetch the target URL", type: "network" };
      }
      return { message: error.message, type: error.type };
    }

    const msg = error.message || "";
    if (error.name === "AbortError") {
      return { message: "Request timeout (10 seconds exceeded)", type: "timeout" };
    }
    if (error.code === "ENOTFOUND" || msg.includes("fetch failed")) {
      return { message: "Failed to fetch the target URL", type: "network" };
    }
    if (msg.includes("No elements found")) {
      return { message: msg, type: "parsing" };
    }
    return { message: msg || "Unknown error occurred", type: "unknown" };
  }
}

export const htmlParserService = new HtmlParserService();
