import { NextRequest, NextResponse } from "next/server";
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

const EXTRACTION_PROMPT = `你是一个设计竞赛信息提取助手。根据网页正文提取竞赛的结构化信息。

硬规则：
1. 只能从输入文本中提取信息，不要添加输入中没有的信息
2. 某个字段在输入中找不到时，该字段值为 null
3. 如果输入文本中完全没有竞赛信息，返回 { "unknown": true }

返回 JSON：
{
  "unknown": false,
  "title": "赛事全称" | null,
  "organizer": "主办方" | null,
  "level": "国家级" | "省级" | "行业" | null,
  "overview": "一句话简介（50字以内）" | null,
  "contestType": "征稿" | "排行" | "展览" | null,
  "tags": ["标签数组"] | [],
  "submissionStartDate": "YYYY-MM-DD" | null,
  "submissionDeadline": "YYYY-MM-DD" | null,
  "categories": ["赛道名称"] | [],
  "eligibility": "参赛资格说明" | null,
  "entryFee": {"amount": 0, "note": "免费"} | null,
  "awards": "奖项设置" | null,
  "specFormat": "作品格式要求" | null,
  "aiPolicy": "AIGC政策" | null,
  "detailBody": "赛事详细说明 Markdown" | null,
  "confidence": "high" | "medium" | "low",
  "sourceNote": "数据来源说明"
}`;

export async function POST(request: NextRequest) {
  const { url } = await request.json();
  if (!url) {
    return NextResponse.json({ success: false, error: "请提供链接" }, { status: 400 });
  }

  // Step 1: Actually fetch the page — no skipping this
  let pageText: string;
  try {
    pageText = await fetchPageText(url);
  } catch (err) {
    if (err instanceof PageFetchError) {
      return NextResponse.json(
        { success: false, error: `无法访问该页面: ${err.message}` },
        { status: 422 },
      );
    }
    if (err instanceof ContentExtractionError) {
      return NextResponse.json(
        { success: false, error: `页面内容无法提取: ${err.message}` },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { success: false, error: `抓取失败: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  // Step 2: AI extraction from real content
  try {
    const response = await getOpenAI().chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        {
          role: "user",
          content: `以下是从 ${url} 提取的网页正文：\n\n${pageText}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI 未返回内容");

    const data = JSON.parse(content);

    if (data.unknown) {
      return NextResponse.json({
        success: false,
        error: "该页面不包含可识别的竞赛信息",
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `AI 提取失败: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
