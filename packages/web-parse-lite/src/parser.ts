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

// Discover selectors
const IGNORED_TAGS = new Set(["script", "style", "head", "html", "body", "meta", "link", "noscript", "svg", "path"]);

// Utility class patterns
const UTILITY_CLASS_RE = /^(js-|is-|has-|d-|col-|flex|grid|block|inline|mt-|mb-|ml-|mr-|mx-|my-|px-|py-|pt-|pb-|pl-|pr-|w-|h-|min-|max-|text-|font-|bg-|border-|rounded|shadow|overflow|relative|absolute|fixed|sticky|sr-only|container|wrapper|gap-|space-|p-|m-|duration-|delay-|ease-|transition|animate-|leading-|tracking-|translate-|rotate-|scale-|skew-|origin-|object-|aspect-|line-clamp-|truncate|shrink|grow|basis-|items-|justify-|content-|self-|place-|cursor-|pointer-|select-|z-|order-|opacity-|mix-|blur-|fill-|stroke-|top-|right-|bottom-|left-|inset-)/;

// Known utility words that aren't patterns
const KNOWN_UTILITY_WORDS = new Set([
  "container", "wrapper", "inner", "outer", "row", "col", "flex", "grid",
  "block", "inline", "hidden", "visible", "relative", "absolute", "fixed",
  "sticky", "static", "truncate", "uppercase", "lowercase", "capitalize",
  "italic", "underline", "bold", "grow", "shrink", "group", "peer", "dark",
  "light", "prose", "clearfix", "active", "show", "open", "closed",
  "selected", "checked", "disabled", "loading", "error"
]);

// New optimized semantic class detection
function isSemanticClass(c: string): boolean {
  if (!c) return false;
  if (c.includes(":")) return false;   // sm:, hover:, dark:, 1000:, etc.
  if (c.includes("[")) return false;   // arbitrary values: p-[4px], aspect-[2/1]
  if (/^\d/.test(c)) return false;     // starts with digit
  if (/-\d+$/.test(c)) return false;   // ends in -number: gap-8, mt-4, p-3
  if (UTILITY_CLASS_RE.test(c)) return false;
  if (KNOWN_UTILITY_WORDS.has(c)) return false;
  return true;
}
// Tag weights for semantic importance
const SEMANTIC_TAG_WEIGHT: Record<string, number> = {
  h1: 10, h2: 9, h3: 8, h4: 7, h5: 6, h6: 6,
  article: 9, section: 7, main: 8, aside: 6, nav: 5,
  header: 5, footer: 4,
  li: 5, ul: 3, ol: 3,
  figure: 5, figcaption: 5,
  time: 6, small: 6, blockquote: 7,
  p: 4, a: 2, span: 1, div: 1, button: 3, img: 3,
};
// Scoring function for selectors
function scoreSelector(tag: string, selector: string, count: number): number {
  const tagWeight = SEMANTIC_TAG_WEIGHT[tag] ?? 2;
  const hasClass = selector !== tag ? 3 : 0;  // bonus for having a semantic class

  // Sweet spot: 3-25 occurrences = likely a repeating content unit
  // Penalize very high counts (nav links, generic wrappers)
  // Penalize count=1 (one-off layout divs)
  const countScore =
    count === 1 ? 0.5 :
    count <= 25 ? Math.log2(count) + 2 :
    Math.max(0, 4 - Math.log2(count / 25));  // diminishing past 25

  return tagWeight + hasClass + countScore;
}

export async function discover(options: DiscoverOptions): Promise<DiscoverResult> {
  const { url, timeout = DEFAULT_TIMEOUT, userAgent = DEFAULT_USER_AGENT } = options;

  if (!url || !url.startsWith("http")) {
    throw new WebParseLiteError("Invalid URL format", "validation");
  }

  const html = await fetchPage(url, timeout, userAgent);
  return discoverHtml(html);
}

// Main discovery function for getting selectors from HTML
export function discoverHtml(html: string): DiscoverResult {
  const $ = cheerio.load(html);
  const counts: Map<string, number> = new Map();
  const samples: Map<string, string> = new Map();

  // Process all elements
  $("*").each((_, el) => {
    const node = $(el);
    const tag = el.type === "tag" ? (el as any).name : null;
    if (!tag || IGNORED_TAGS.has(tag)) return;

    const id = node.attr("id");
  
    // Filter classes with by checking for semantic patterns
    const classes = (node.attr("class") || "")
      .split(/\s+/)
      .filter(isSemanticClass)  // <-- replaces the old inline filter
      .slice(0, 2);

    let selector = tag;
    if (id) selector += `#${id}`;
    else if (classes.length) selector += `.${classes.join(".")}`;

    counts.set(selector, (counts.get(selector) || 0) + 1);

    // Store sample text for the selector
    if (!samples.has(selector)) {
      const text = node.clone().children().remove().end().text().trim().slice(0, 80);
      if (text) samples.set(selector, text);
    }
  });

  // Sort selectors by score and take top 30
  const selectors = [...counts.entries()]
  .map(([sel, count]) => {
    const tag = sel.split(/[.#]/)[0];
    return { sel, count, score: scoreSelector(tag, sel, count) };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 30)
  .map(({ sel }) => sel);

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
