import { WebParseLiteError } from "./types.js";

export const DEFAULT_TIMEOUT = 10000;
export const DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; WebParseLite/1.0)";

export async function fetchPage(
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
