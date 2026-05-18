import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

interface ScoutResult {
  title: string; organizer: string; level: string; overview: string;
  contestType: string; tags: string[]; submissionStartDate: string;
  submissionDeadline: string;
  officialUrl: string; deadlines: { label: string; date: string }[];
  categories: string[]; eligibility: string;
  entryFee: { amount: number; note: string }; awards: string;
  specFormat: string; aiPolicy: string; detailBody: string;
  confidence: "high" | "medium" | "low"; sourceNote: string;
}

async function searchWeb(keywords: string): Promise<string> {
  const q = encodeURIComponent(keywords + " 设计竞赛 2026 征稿");
  const engines = [
    async () => {
      const res = await fetch("https://www.bing.com/search?q=" + q + "&setlang=zh-cn", {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept-Language": "zh-CN,zh;q=0.9" },
        signal: AbortSignal.timeout(10000),
      });
      const html = await res.text();
      const results: string[] = [];
      const re = /<li class="b_algo"[^>]*>([\s\S]*?)<\/li>/gi;
      let m;
      while ((m = re.exec(html)) !== null && results.length < 10) {
        const b = m[1];
        const t = (b.match(/<h2[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i) || [])[1];
        const s = (b.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1];
        const u = (b.match(/<cite[^>]*>([\s\S]*?)<\/cite>/i) || [])[1];
        if (t) {
          const title = t.replace(/<[^>]*>/g, "").trim();
          const snippet = s ? s.replace(/<[^>]*>/g, "").trim() : "";
          const cite = u ? u.replace(/<[^>]*>/g, "").trim() : "";
          results.push("[" + title + "]" + (cite ? " (" + cite + ")" : "") + "\n" + snippet);
        }
      }
      return results;
    },
    async () => {
      const res = await fetch("https://html.duckduckgo.com/html/?q=" + q, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(10000),
      });
      const html = await res.text();
      const results: string[] = [];
      const re = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = re.exec(html)) !== null && results.length < 10) {
        const title = m[2].replace(/<[^>]*>/g, "").trim();
        const snippet = m[3].replace(/<[^>]*>/g, "").trim();
        if (title) results.push("[" + title + "]\n" + snippet);
      }
      return results;
    },
  ];

  for (const fn of engines) {
    try {
      const r = await fn();
      if (r.length > 0) {
        return "以下是最新搜索结果(" + new Date().toISOString().slice(0, 10) + ")：\n\n" + r.join("\n---\n");
      }
    } catch {}
  }
  return "（本次未能获取实时搜索结果，请基于训练数据回答）";
}

const SYSTEM_PROMPT = [
  '你是中国设计竞赛数据库。根据搜索结果提取竞赛信息。',
  '',
  '硬约束（违反则整条无效）：',
  '1. 任何字段在搜索结果中找不到明确来源，必须留空字符串 ""。禁止推测、禁止编造、禁止用往年日期推算。',
  '2. submissionStartDate 和 submissionDeadline 如果搜索结果没有明确写出某年某月某日，必须留空。',
  '3. officialUrl 如果搜索结果没有包含官网链接，必须留空。',
  '4. 每条记录的 sourceNote 必须标明是从哪个搜索结果的哪句话提取的。如果纯凭训练记忆，sourceNote 写「训练数据-未核实」且 confidence 只能为 low。',
  '',
  'confidence 规则：',
  '- high: 信息来自赛事官网，且日期/链接完整',
  '- medium: 多个第三方来源交叉验证一致',
  '- low: 只有一个来源，或非官网，或纯训练记忆',
  '',
  '返回 JSON：{"competitions":[{...}]}。至少10个赛事。',
].join('\n');

export async function scoutCompetitions(keywords: string): Promise<ScoutResult[]> {
  const searchContext = await searchWeb(keywords);
  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: searchContext + "\n\n请提取竞赛信息。关键词：" + keywords + "。至少10个赛事，中文JSON。记住硬约束：无来源则留空。" },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 8000,
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI 未返回内容");
  const parsed = JSON.parse(content);
  return (parsed.competitions || parsed.results || []).filter((c: any) => c.title?.trim());
}
