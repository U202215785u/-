import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchPageText, PageFetchError, ContentExtractionError } from "@/lib/page-fetcher";

describe("fetchPageText", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts visible text from HTML, stripping tags", async () => {
    const html = `<!DOCTYPE html>
<html><head><title>Test</title><style>.x{color:red}</style></head>
<body>
  <header><nav>大赛导航</nav></header>
  <main>
    <h1>2026国际大学生设计竞赛</h1>
    <p>主办方：中国设计协会与国际设计联盟</p>
    <p>参赛对象：全日制在校本科生、硕士研究生</p>
    <p>截止日期：2026年12月30日</p>
  </main>
  <footer>Copyright 2026 设计竞赛网</footer>
</body></html>`;

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );

    const text = await fetchPageText("https://example.com");
    expect(text).toContain("2026国际大学生设计竞赛");
    expect(text).toContain("中国设计协会");
    expect(text).toContain("2026年12月30日");
    expect(text).not.toContain("<h1>");
    expect(text).not.toContain(".x{color:red}");
    expect(text).not.toContain("<style>");
  });

  it("throws PageFetchError on HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 }),
    );

    await expect(fetchPageText("https://example.com")).rejects.toThrow(PageFetchError);
  });

  it("throws ContentExtractionError for non-HTML content", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("binary data", {
        status: 200,
        headers: { "content-type": "application/pdf" },
      }),
    );

    await expect(fetchPageText("https://example.com")).rejects.toThrow(ContentExtractionError);
  });

  it("throws ContentExtractionError when extracted text is too short", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html><body>Hi</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    await expect(fetchPageText("https://example.com")).rejects.toThrow(ContentExtractionError);
  });
});
