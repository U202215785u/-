import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ═══════════════════════════════════════════════════════════
// scrapeListingPage — HTML table parsing
// ═══════════════════════════════════════════════════════════

// We test via fetch mocking since scrapeListingPage calls fetch internally
import { scrapeListingPage, ListingScrapeError } from "@/lib/ai-scout";

function mockListingHtml(rows: string[]): string {
  return `<!DOCTYPE html><html><head></head><body><table>
<tr>
<td width="110"><span style="font-size: 12pt;"><strong>设计类别</strong></span></td>
<td width="465"><span style="font-size: 12pt;"><strong>设计竞赛项目列表</strong></span></td>
<td width="140"><span style="font-size: 12pt;"><strong>报名截止日期</strong></span></td>
</tr>
${rows.join("\n")}
</table></body></html>`;
}

function mockRow(category: string, title: string, url: string, deadline: string): string {
  return `<tr>
<td width="110"><span style="font-size: 12pt;">【${category}】</span></td>
<td width="465"><span style="font-size: 12pt;"><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></span></td>
<td width="140"><span style="font-size: 12pt;">${deadline}</span></td>
</tr>`;
}

describe("scrapeListingPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses a standard listing page with multiple entries", async () => {
    const html = mockListingHtml([
      mockRow("综合设计", "2026国际大学生设计盛典", "https://www.shejijingsai.com/2026/01/1.html", "2027年3月22日"),
      mockRow("视觉传达", "2026平面设计大赛", "https://www.shejijingsai.com/2026/02/2.html", "2026年8月15日"),
      mockRow("建筑环境", "2026天作奖建筑设计竞赛", "https://www.shejijingsai.com/2026/05/3.html", "2026年12月30日"),
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const entries = await scrapeListingPage("https://www.shejijingsai.com/liebiao");

    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({
      category: "综合设计",
      title: "2026国际大学生设计盛典",
      detailUrl: "https://www.shejijingsai.com/2026/01/1.html",
      deadline: "2027年3月22日",
    });
    expect(entries[2].title).toBe("2026天作奖建筑设计竞赛");
  });

  it("skips the header row", async () => {
    const html = mockListingHtml([
      mockRow("工业产品", "唯一赛事", "https://www.shejijingsai.com/2026/01/1.html", "2026年6月1日"),
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const entries = await scrapeListingPage("https://www.shejijingsai.com/liebiao");
    expect(entries).toHaveLength(1);
    expect(entries[0].category).toBe("工业产品");
  });

  it("throws ListingScrapeError when no entries found", async () => {
    const html = mockListingHtml([]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    );

    await expect(scrapeListingPage("https://www.shejijingsai.com/liebiao")).rejects.toThrow(
      ListingScrapeError,
    );
  });

  it("throws ListingScrapeError when table format changes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html><body><p>No table here</p></body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    await expect(scrapeListingPage("https://www.shejijingsai.com/liebiao")).rejects.toThrow(
      ListingScrapeError,
    );
  });

  it("handles single-digit months and days in dates", async () => {
    const html = mockListingHtml([
      mockRow("综合设计", "测试赛事", "https://www.shejijingsai.com/2026/01/1.html", "2026年5月9日"),
      mockRow("视觉传达", "另一赛事", "https://www.shejijingsai.com/2026/01/2.html", "2026年12月3日"),
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const entries = await scrapeListingPage("https://www.shejijingsai.com/liebiao");
    expect(entries[0].deadline).toBe("2026年5月9日");
    expect(entries[1].deadline).toBe("2026年12月3日");
  });

  it("makes relative URLs absolute", async () => {
    const html = mockListingHtml([
      mockRow("综合设计", "测试赛事", "/2026/01/1.html", "2026年12月3日"),
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const entries = await scrapeListingPage("https://www.shejijingsai.com/liebiao");
    expect(entries[0].detailUrl).toBe("https://www.shejijingsai.com/2026/01/1.html");
  });
});

// ═══════════════════════════════════════════════════════════
// listingToScoutResult — data conversion
// ═══════════════════════════════════════════════════════════

import type { ListEntry } from "@/lib/ai-scout";

// We can't import listingToScoutResult directly (it's not exported),
// but we can test via scoutCompetitions with fetchDetails=false

describe("listingToScoutResult (via scoutCompetitions listing-only mode)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("converts Chinese dates to ISO format", async () => {
    const html = mockListingHtml([
      mockRow("综合设计", "测试赛事", "https://www.shejijingsai.com/2026/01/1.html", "2026年12月30日"),
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const { scoutCompetitions } = await import("@/lib/ai-scout");
    const results = await scoutCompetitions({
      listingUrls: ["https://www.shejijingsai.com/liebiao"],
      fetchDetails: false,
    });

    expect(results[0].submissionDeadline).toBe("2026-12-30");
    expect(results[0].deadlines[0]).toEqual({ label: "报名截止", date: "2026-12-30" });
  });

  it("maps category tags correctly", async () => {
    const html = mockListingHtml([
      mockRow("综合设计", "赛事A", "https://www.shejijingsai.com/2026/01/1.html", "2026年6月1日"),
      mockRow("建筑环境", "赛事B", "https://www.shejijingsai.com/2026/01/2.html", "2026年6月1日"),
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const { scoutCompetitions } = await import("@/lib/ai-scout");
    const results = await scoutCompetitions({
      listingUrls: ["https://www.shejijingsai.com/liebiao"],
      fetchDetails: false,
    });

    expect(results[0].tags).toContain("综合设计");
    expect(results[1].tags).toContain("建筑环境");
  });

  it("sets officialUrl from detailUrl", async () => {
    const html = mockListingHtml([
      mockRow("综合设计", "赛事A", "https://www.shejijingsai.com/2026/01/1.html", "2026年6月1日"),
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const { scoutCompetitions } = await import("@/lib/ai-scout");
    const results = await scoutCompetitions({
      listingUrls: ["https://www.shejijingsai.com/liebiao"],
      fetchDetails: false,
    });

    expect(results[0].officialUrl).toBe("https://www.shejijingsai.com/2026/01/1.html");
  });

  it("sets confidence to medium for listing-only data", async () => {
    const html = mockListingHtml([
      mockRow("综合设计", "赛事A", "https://www.shejijingsai.com/2026/01/1.html", "2026年6月1日"),
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const { scoutCompetitions } = await import("@/lib/ai-scout");
    const results = await scoutCompetitions({
      listingUrls: ["https://www.shejijingsai.com/liebiao"],
      fetchDetails: false,
    });

    expect(results[0].confidence).toBe("medium");
  });
});

// ═══════════════════════════════════════════════════════════
// Deduplication
// ═══════════════════════════════════════════════════════════

describe("scoutCompetitions deduplication", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deduplicates entries with the same title", async () => {
    const html = mockListingHtml([
      mockRow("综合设计", "相同标题", "https://www.shejijingsai.com/2026/01/1.html", "2026年6月1日"),
      mockRow("视觉传达", "相同标题", "https://www.shejijingsai.com/2026/01/2.html", "2026年6月1日"),
      mockRow("建筑环境", "不同标题", "https://www.shejijingsai.com/2026/01/3.html", "2026年6月1日"),
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const { scoutCompetitions } = await import("@/lib/ai-scout");
    const results = await scoutCompetitions({
      listingUrls: ["https://www.shejijingsai.com/liebiao"],
      fetchDetails: false,
    });

    expect(results).toHaveLength(2);
    const titles = results.map((r) => r.title);
    expect(titles).toContain("相同标题");
    expect(titles).toContain("不同标题");
  });

  it("filters by keywords when provided", async () => {
    const html = mockListingHtml([
      mockRow("综合设计", "国际设计大赛", "https://www.shejijingsai.com/2026/01/1.html", "2026年6月1日"),
      mockRow("视觉传达", "平面海报竞赛", "https://www.shejijingsai.com/2026/01/2.html", "2026年6月1日"),
      mockRow("建筑环境", "建筑设计大赛", "https://www.shejijingsai.com/2026/01/3.html", "2026年6月1日"),
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const { scoutCompetitions } = await import("@/lib/ai-scout");
    const results = await scoutCompetitions({
      keywords: "平面",
      listingUrls: ["https://www.shejijingsai.com/liebiao"],
      fetchDetails: false,
    });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("平面海报竞赛");
  });
});

// ═══════════════════════════════════════════════════════════
// No fallbacks — honest failure
// ═══════════════════════════════════════════════════════════

describe("no fallback behavior", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when listing page returns HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 }),
    );

    await expect(
      scrapeListingPage("https://www.shejijingsai.com/liebiao"),
    ).rejects.toThrow();
  });

  it("throws ListingScrapeError when page has no table rows", async () => {
    const html = mockListingHtml([]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
    );

    await expect(
      scrapeListingPage("https://www.shejijingsai.com/liebiao"),
    ).rejects.toThrow(ListingScrapeError);
  });
});
