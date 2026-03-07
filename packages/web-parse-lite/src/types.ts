import { z } from "zod";

export const parseOptionsSchema = z.object({
  url: z.string().url("Invalid URL format"),
  selector: z.string().min(1, "CSS selector is required"),
  method: z.enum(["text", "html", "attribute"], {
    errorMap: () => ({ message: "Method must be 'text', 'html', or 'attribute'" }),
  }),
  attribute: z.string().optional(),
  format: z
    .enum(["json", "plaintext"], {
      errorMap: () => ({ message: "Format must be 'json' or 'plaintext'" }),
    })
    .default("json"),
  timeout: z.number().positive().optional(),
  userAgent: z.string().optional(),
}).refine(
  (data) => {
    if (data.method === "attribute" && !data.attribute) {
      return false;
    }
    return true;
  },
  {
    message: "attribute is required when method is 'attribute'",
    path: ["attribute"],
  }
);

export type ParseOptions = z.infer<typeof parseOptionsSchema>;

export interface ParseHtmlOptions {
  html: string;
  selector: string;
  method: "text" | "html" | "attribute";
  attribute?: string;
  format?: "json" | "plaintext";
}

export interface ParseResult {
  data: string[] | string;
  format: "json" | "plaintext";
}

export interface ParseError {
  message: string;
  type: "validation" | "network" | "parsing" | "timeout" | "unknown";
}

export interface DiscoverOptions {
  url: string;
  timeout?: number;
  userAgent?: string;
}

export interface DiscoverResult {
  selectors: string[];
  sample: Record<string, string>;
}

export class WebParseLiteError extends Error {
  public readonly type: ParseError["type"];

  constructor(message: string, type: ParseError["type"]) {
    super(message);
    this.name = "WebParseLiteError";
    this.type = type;
  }
}
