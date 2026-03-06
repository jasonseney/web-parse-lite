import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import {
  parseOptionsSchema,
  WebParseLiteError,
  type ParseOptions,
  type ParseHtmlOptions,
  type ParseResult,
} from "./types.js";

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; WebParseLite/1.0)";

export async function parse(options: ParseOptions): Promise<ParseResult> {
  const validated = parseOptionsSchema.safeParse(options);
  if (!validated.success) {
    const msg = validated.error.issues.map((i) => i.message).join("; ");
    throw new WebParseLiteError(msg, "validation");
  }

  const { url, selector, method, attribute, format } = validated.data;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;

  const html = await fetchPage(url, timeout, userAgent);
  return extractFromHtml(html, selector, method, attribute, format);
}

export function parseHtml(options: ParseHtmlOptions): ParseResult {
  const { html, selector, method, attribute, format = "json" } = options;

  if (!selector || selector.length === 0) {
    throw new WebParseLiteError("CSS selector is required", "validation");
  }
  if (method === "attribute" && !attribute) {
    throw new WebParseLiteError(
      "attribute is required when method is 'attribute'",
      "validation"
    );
  }

  return extractFromHtml(html, selector, method, attribute, format);
}

async function fetchPage(
  url: string,
  timeout: number,
  userAgent: string
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": userAgent },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new WebParseLiteError(
        `HTTP ${response.status}: ${response.statusText}`,
        "network"
      );
    }

    return await response.text();
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error instanceof WebParseLiteError) throw error;

    if (error.name === "AbortError") {
      throw new WebParseLiteError(
        `Request timeout (${timeout}ms exceeded)`,
        "timeout"
      );
    }
    if (error.code === "ENOTFOUND") {
      throw new WebParseLiteError(
        "Invalid URL or network error",
        "network"
      );
    }
    throw new WebParseLiteError(
      error.message || "Unknown error occurred",
      "unknown"
    );
  }
}

function extractFromHtml(
  html: string,
  selector: string,
  method: "text" | "html" | "attribute",
  attribute: string | undefined,
  format: "json" | "plaintext"
): ParseResult {
  const $ = cheerio.load(html);
  const elements = $(selector);

  if (elements.length === 0) {
    throw new WebParseLiteError(
      `No elements found matching selector: ${selector}`,
      "parsing"
    );
  }

  const results = extractData(elements as cheerio.Cheerio<Element>, $, method, attribute);
  const data = format === "json" ? results : results.join("\n\n");

  return { data, format };
}

function extractData(
  elements: cheerio.Cheerio<Element>,
  $: cheerio.CheerioAPI,
  method: "text" | "html" | "attribute",
  attribute?: string
): string[] {
  switch (method) {
    case "text":
      return elements
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t) => t !== "");

    case "html":
      return elements
        .map((_, el) => $(el).html() || "")
        .get()
        .filter((h) => h !== "");

    case "attribute":
      if (!attribute) {
        throw new WebParseLiteError(
          "attribute is required for attribute extraction",
          "validation"
        );
      }
      return elements
        .map((_, el) => $(el).attr(attribute) || "")
        .get()
        .filter((a) => a !== "");

    default:
      throw new WebParseLiteError(`Unsupported method: ${method}`, "validation");
  }
}
