const FETCH_TIMEOUT_MS = 15000;

export class PageFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PageFetchError";
  }
}

export class ContentExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentExtractionError";
  }
}

/**
 * Fetch a webpage and return visible text content.
 * No Readability — we strip tags and let the AI decide what's signal.
 */
export async function fetchPageText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CompetitionBoard/1.0; +https://github.com/competition-board)",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new PageFetchError(`HTTP ${response.status}: ${url}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
    throw new ContentExtractionError(`Not an HTML page: ${contentType}`);
  }

  const html = await response.text();
  return stripHtml(html);
}

/** Remove HTML tags, scripts, styles, and collapse whitespace. */
function stripHtml(html: string): string {
  // Remove scripts, styles, and head
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, " ")
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Replace block-level tags with newlines
    .replace(/<\/(div|p|h[1-6]|li|tr|article|section|header|footer|main|nav|aside|table|br|hr)[^>]*>/gi, "\n")
    .replace(/<br[^>]*>/gi, "\n")
    // Remove all remaining tags
    .replace(/<[^>]*>/g, " ")
    // Decode common HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));

  // Collapse whitespace
  text = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");

  if (text.length < 50) {
    throw new ContentExtractionError("Extracted content too short (< 50 chars)");
  }

  return text.slice(0, 12000); // cap for LLM context
}
