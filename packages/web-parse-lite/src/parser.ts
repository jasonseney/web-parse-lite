import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import {
  parseOptionsSchema,
  WebParseLiteError,
  type ParseOptions,
  type ParseHtmlOptions,
  type ParseResult,
  type DiscoverOptions,
  type DiscoverResult,
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

const IGNORED_TAGS = new Set(["script", "style", "head", "html", "body", "meta", "link", "noscript", "svg", "path"]);
const UTILITY_CLASS_RE = /^(js-|is-|has-|active|hidden|show|d-|col-|row|flex|grid|mt-|mb-|ml-|mr-|mx-|my-|px-|py-|pt-|pb-|pl-|pr-|w-|h-|min-|max-|text-|font-|bg-|border-|rounded|shadow|overflow|relative|absolute|fixed|sticky|inline|block|float|clear|sr-only|container|wrapper)/;

export async function discover(options: DiscoverOptions): Promise<DiscoverResult> {
  const { url, timeout = DEFAULT_TIMEOUT, userAgent = DEFAULT_USER_AGENT } = options;

  if (!url || !url.startsWith("http")) {
    throw new WebParseLiteError("Invalid URL format", "validation");
  }

  const html = await fetchPage(url, timeout, userAgent);
  return discoverHtml(html);
}

export function discoverHtml(html: string): DiscoverResult {
  const $ = cheerio.load(html);
  const counts: Map<string, number> = new Map();
  const samples: Map<string, string> = new Map();

  $("*").each((_, el) => {
    const node = $(el);
    const tag = el.type === "tag" ? (el as any).name : null;
    if (!tag || IGNORED_TAGS.has(tag)) return;

    const id = node.attr("id");
    const classes = (node.attr("class") || "")
      .split(/\s+/)
      .filter((c) => c && !UTILITY_CLASS_RE.test(c))
      .slice(0, 2);

    let selector = tag;
    if (id) selector += `#${id}`;
    else if (classes.length) selector += `.${classes.join(".")}`;

    counts.set(selector, (counts.get(selector) || 0) + 1);

    if (!samples.has(selector)) {
      const text = node.clone().children().remove().end().text().trim().slice(0, 80);
      if (text) samples.set(selector, text);
    }
  });

  const selectors = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([sel]) => sel);

  const sample: Record<string, string> = {};
  for (const sel of selectors) {
    if (samples.has(sel)) sample[sel] = samples.get(sel)!;
  }

  return { selectors, sample };
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
