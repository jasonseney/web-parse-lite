import * as cheerio from "cheerio";
import {
  WebParseLiteError,
  type DiscoverOptions,
  type DiscoverResult,
} from "./types.js";
import { fetchPage, DEFAULT_TIMEOUT, DEFAULT_USER_AGENT } from "./fetcher.js";

const IGNORED_TAGS = new Set(["script", "style", "head", "html", "body", "meta", "link", "noscript", "svg", "path"]);

const UTILITY_CLASS_RE = /^(js-|is-|has-|d-|col-|flex|grid|block|inline|mt-|mb-|ml-|mr-|mx-|my-|px-|py-|pt-|pb-|pl-|pr-|w-|h-|min-|max-|text-|font-|bg-|border-|rounded|shadow|overflow|relative|absolute|fixed|sticky|sr-only|container|wrapper|gap-|space-|p-|m-|duration-|delay-|ease-|transition|animate-|leading-|tracking-|translate-|rotate-|scale-|skew-|origin-|object-|aspect-|line-clamp-|truncate|shrink|grow|basis-|items-|justify-|content-|self-|place-|cursor-|pointer-|select-|z-|order-|opacity-|mix-|blur-|fill-|stroke-|top-|right-|bottom-|left-|inset-)/;

const KNOWN_UTILITY_WORDS = new Set([
  "container", "wrapper", "inner", "outer", "row", "col", "flex", "grid",
  "block", "inline", "hidden", "visible", "relative", "absolute", "fixed",
  "sticky", "static", "truncate", "uppercase", "lowercase", "capitalize",
  "italic", "underline", "bold", "grow", "shrink", "group", "peer", "dark",
  "light", "prose", "clearfix", "active", "show", "open", "closed",
  "selected", "checked", "disabled", "loading", "error", "whitespace"
]);

const SEMANTIC_TAG_WEIGHT: Record<string, number> = {
  h1: 10, h2: 9, h3: 8, h4: 7, h5: 6, h6: 6,
  article: 9, section: 7, main: 8, aside: 6, nav: 5,
  header: 5, footer: 4,
  li: 5, ul: 3, ol: 3,
  figure: 5, figcaption: 5,
  time: 6, small: 6, blockquote: 7,
  p: 4, a: 2, span: 1, div: 1, button: 3, img: 3,
};

function isSemanticClass(c: string): boolean {
  if (!c) return false;
  if (c.includes(":")) return false;
  if (c.includes("[")) return false;
  if (c.startsWith("!")) return false;
  if (/^\d/.test(c)) return false;
  if (/-\d+$/.test(c)) return false;
  if (UTILITY_CLASS_RE.test(c)) return false;
  if (KNOWN_UTILITY_WORDS.has(c)) return false;
  return true;
}

function scoreSelector(tag: string, selector: string, count: number): number {
  const tagWeight = SEMANTIC_TAG_WEIGHT[tag] ?? 2;
  const hasClass = selector !== tag ? 3 : 0;

  const countScore =
    count === 1 ? 0.5 :
    count <= 25 ? Math.log2(count) + 2 :
    Math.max(0, 4 - Math.log2(count / 25));

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
      .filter(isSemanticClass)
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
