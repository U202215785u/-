import OpenAI from "openai";
import { fetchPageText, PageFetchError, ContentExtractionError } from "@/lib/page-fetcher";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    });
  }
  return _openai;
}

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface ListEntry {
  category: string;
  title: string;
  detailUrl: string;
  deadline: string;
}

export interface ScoutResult {
  title: string;
  organizer: string;
  level: string;
  overview: string;
  posterUrl: string;
  contestType: string;
  tags: string[];
  submissionStartDate: string;
  submissionDeadline: string;
  officialUrl: string;
  deadlines: { label: string; date: string }[];
  categories: string[];
  eligibility: string;
  entryFee: { amount: number; note: string };
  awards: string;
  specFormat: string;
  aiPolicy: string;
  detailBody: string;
  confidence: "high" | "medium" | "low";
  sourceNote: string;
}

// ═══════════════════════════════════════════════════════════
// Errors — honest failure, no silent fallbacks
// ═══════════════════════════════════════════════════════════

export class ListingScrapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ListingScrapeError";
  }
}

// ═══════════════════════════════════════════════════════════
// Listing page scraper
// ═══════════════════════════════════════════════════════════

const SHEJIJINGSAI_BASE = "https://www.shejijingsai.com";

const DEFAULT_LISTING_URLS = [
  `${SHEJIJINGSAI_BASE}/liebiao`,
  `${SHEJIJINGSAI_BASE}/liebiao202604`,
  `${SHEJIJINGSAI_BASE}/liebiao202601`,
];

/**
 * Scrape a shejijingsai.com listing page.
 * Parses the HTML table: 【category】 | title link | deadline
 */
export async function scrapeListingPage(url: string): Promise<ListEntry[]> {
  const html = await fetchPageTextRaw(url);

  const entries: ListEntry[] = [];

  // Match table rows: <td>category</td> <td>title link</td> <td>deadline</td>
  const rowRe =
    /<td[^>]*>\s*(?:<span[^>]*>)?\s*【([^】]*)】(?:[^<]*)\s*(?:<\/span>)?\s*<\/td>\s*<td[^>]*>\s*(?:<span[^>]*>)?\s*<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<td[^>]*>\s*(?:<span[^>]*>)?\s*(\d{4}年\d{1,2}月\d{1,2}日)/gi;

  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const [, category, href, title, deadline] = m;
    const cleanTitle = title.replace(/<[^>]*>/g, "").trim();
    if (!cleanTitle) continue;

    entries.push({
      category: category.trim(),
      title: cleanTitle,
      detailUrl: href.startsWith("http") ? href : `${SHEJIJINGSAI_BASE}${href}`,
      deadline: deadline.trim(),
    });
  }

  if (entries.length === 0) {
    throw new ListingScrapeError(`No competition entries found on ${url} — table structure may have changed`);
  }

  return entries;
}

/** Like fetchPageText but returns raw HTML for table parsing. */
async function fetchPageTextRaw(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CompetitionBoard/1.0)",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new PageFetchError(`HTTP ${response.status}: ${url}`);
  }

  return response.text();
}

// ═══════════════════════════════════════════════════════════
// Detail page enrichment via AI
// ═══════════════════════════════════════════════════════════

const EXTRACTION_PROMPT = `你是一个设计竞赛信息提取助手。你的任务是从提供的网页正文中提取竞赛的结构化信息。

硬规则：
1. 只能从输入文本中提取信息，不要添加输入中没有的信息
2. 某个字段在输入中找不到时，该字段值为 null
3. 不要编造、不要推测、不要用训练数据补全
4. 如果输入文本中完全没有竞赛信息，返回 { "notACompetition": true }

返回 JSON：
{
  "notACompetition": false,
  "organizer": "主办方名称" | null,
  "level": "国家级" | "省级" | "行业" | null,
  "overview": "一句话简介（50字以内）" | null,
  "contestType": "征稿" | "排行" | "展览" | null,
  "tags": ["标签数组"] | [],
  "submissionStartDate": "YYYY-MM-DD" | null,
  "submissionDeadline": "YYYY-MM-DD" | null,
  "categories": ["赛道名称数组"] | [],
  "eligibility": "参赛资格说明" | null,
  "entryFee": {"amount": 0, "note": "免费"} | null,
  "awards": "奖项设置" | null,
  "specFormat": "作品格式要求" | null,
  "aiPolicy": "AIGC政策" | null,
  "detailBody": "赛事详细说明（Markdown格式，保留原文关键信息）" | null,
  "confidence": "high" | "medium" | "low",
  "sourceNote": "数据来源说明——你从网页的哪个段落提取了关键信息"
}

confidence 规则：
- high: 信息来自页面明确的官方公告，且日期/链接/主办方完整
- medium: 大部分字段有来源，部分字段缺失
- low: 只有少量字段能从页面提取`;

/**
 * Fetch a detail page and use AI to extract structured competition data.
 * Throws on fetch failure — no fallback to training data.
 */
export async function fetchAndExtractDetail(
  url: string,
  knownTitle: string,
  knownDeadline: string,
): Promise<Partial<ScoutResult>> {
  const pageText = await fetchPageText(url);

  const response = await getOpenAI().chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: EXTRACTION_PROMPT },
      {
        role: "user",
        content: [
          `已知信息：`,
          `- 赛事名称：${knownTitle}`,
          `- 报名截止日期：${knownDeadline}`,
          ``,
          `以下是从 ${url} 提取的网页正文：`,
          ``,
          pageText,
        ].join("\n"),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 8000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned empty response");

  const parsed = JSON.parse(content);

  if (parsed.notACompetition) {
    return {
      title: knownTitle,
      submissionDeadline: knownDeadline,
      officialUrl: url,
      confidence: "low",
      sourceNote: "AI 判定页面不包含竞赛信息",
    };
  }

  return {
    title: knownTitle,
    organizer: parsed.organizer ?? "",
    level: parsed.level ?? "",
    overview: parsed.overview ?? "",
    contestType: parsed.contestType ?? "",
    tags: parsed.tags ?? [],
    submissionStartDate: parsed.submissionStartDate ?? "",
    submissionDeadline: parsed.submissionDeadline ?? knownDeadline,
    officialUrl: url,
    deadlines: [],
    categories: parsed.categories ?? [],
    eligibility: parsed.eligibility ?? "",
    entryFee: parsed.entryFee ?? { amount: 0, note: "" },
    awards: parsed.awards ?? "",
    specFormat: parsed.specFormat ?? "",
    aiPolicy: parsed.aiPolicy ?? "",
    detailBody: parsed.detailBody ?? "",
    confidence: parsed.confidence ?? "medium",
    sourceNote: parsed.sourceNote ?? "",
  };
}

// ═══════════════════════════════════════════════════════════
// Orchestrator
// ═══════════════════════════════════════════════════════════

export interface ScoutOptions {
  /** Filter results by keyword (matches title and category). Default: no filter. */
  keywords?: string;
  /** Whether to fetch detail pages and run AI extraction. Default: false (listing-only). */
  fetchDetails?: boolean;
  /** Max detail pages to fetch with AI (limits cost). Default: 20. */
  maxDetails?: number;
  /** Specific listing URLs to scrape. Default: main page + recent archives. */
  listingUrls?: string[];
}

/**
 * Main entry point: scrape shejijingsai.com listing pages,
 * optionally enrich with AI extraction from detail pages.
 *
 * NEVER falls back to training data. If a page can't be fetched, it's skipped.
 * If the listing is empty, throws ListingScrapeError.
 */
export async function scoutCompetitions(options: ScoutOptions = {}): Promise<ScoutResult[]> {
  const { keywords, fetchDetails = false, maxDetails = 20, listingUrls } = options;

  // 1. Scrape listing pages
  const urls = listingUrls ?? DEFAULT_LISTING_URLS;
  const allEntries: ListEntry[] = [];

  for (const url of urls) {
    try {
      const entries = await scrapeListingPage(url);
      allEntries.push(...entries);
    } catch (err) {
      if (err instanceof ListingScrapeError) throw err; // main page must succeed
      // Archive pages can fail individually
      if (url !== urls[0]) continue;
      throw err;
    }
  }

  if (allEntries.length === 0) {
    throw new ListingScrapeError("No competition entries found on any listing page");
  }

  // 2. Deduplicate by title
  const seen = new Set<string>();
  const unique = allEntries.filter((e) => {
    const key = e.title.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 3. Filter by keywords
  const filtered = keywords
    ? unique.filter(
        (e) =>
          e.title.includes(keywords) ||
          e.category.includes(keywords),
      )
    : unique;

  // 4. Filter out past deadlines (deadline before today)
  const today = new Date().toISOString().slice(0, 10); // "2026-05-24"
  const active = filtered.filter((e) => {
    const iso = chineseDateToISO(e.deadline);
    if (!iso) return true; // keep entries with unparseable dates
    return iso >= today;
  });

  // 5. Either return listing-only results, or enrich with AI
  if (!fetchDetails) {
    return active.map((e) => listingToScoutResult(e));
  }

  // 6. Fetch detail pages with AI extraction (concurrency-limited)
  const toFetch = active.slice(0, maxDetails);
  const concurrency = 3;
  const results: ScoutResult[] = [];

  for (let i = 0; i < toFetch.length; i += concurrency) {
    const batch = toFetch.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map((entry) =>
        fetchAndExtractDetail(entry.detailUrl, entry.title, entry.deadline)
          .then((partial) => ({ ...listingToScoutResult(entry), ...partial }))
      ),
    );
    for (const r of batchResults) {
      if (r.status === "fulfilled") results.push(r.value);
    }
  }

  // Remaining entries (beyond maxDetails) get listing-only data
  for (const entry of active.slice(maxDetails)) {
    results.push(listingToScoutResult(entry));
  }

  return results;
}

/** Build a ScoutResult from listing table data alone (no AI). */
function listingToScoutResult(entry: ListEntry): ScoutResult {
  return {
    title: entry.title,
    organizer: "",
    level: mapCategoryToLevel(entry.category),
    overview: "",
    posterUrl: "",
    contestType: "征稿",
    tags: [entry.category],
    submissionStartDate: "",
    submissionDeadline: chineseDateToISO(entry.deadline),
    officialUrl: entry.detailUrl,
    deadlines: [{ label: "报名截止", date: chineseDateToISO(entry.deadline) }],
    categories: [],
    eligibility: "",
    entryFee: { amount: 0, note: "" },
    awards: "",
    specFormat: "",
    aiPolicy: "",
    detailBody: "",
    confidence: "medium",
    sourceNote: "",
  };
}

function mapCategoryToLevel(cat: string): string {
  if (cat.includes("国家") || cat.includes("国际") || cat.includes("世界")) return "国家级";
  if (cat.includes("省") || cat.includes("市")) return "省级";
  return "行业";
}

function chineseDateToISO(date: string): string {
  const m = date.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return "";
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}
