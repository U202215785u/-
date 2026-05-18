import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

export async function POST(request: NextRequest) {
  const { url } = await request.json();
  if (!url) {
    return NextResponse.json({ success: false, error: "请提供链接" }, { status: 400 });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `你是一个设计竞赛信息提取助手。用户会给你一个竞赛网页的URL，请根据你对这个URL对应网站的了解，提取竞赛的结构化信息。

返回 JSON：
{
  "title": "赛事全称",
  "organizer": "主办方",
  "level": "国家级|省级|行业",
  "overview": "一句话简介（50字以内）",
  "contestType": "征稿|排行|展览",
  "tags": ["平面设计","插画"],
  "submissionDeadline": "YYYY-MM-DD格式",
  "categories": ["视觉传达","动画"],
  "eligibility": "参赛资格说明（没有则空）",
  "entryFee": {"amount":0,"note":"免费"},
  "awards": "奖项设置（没有则空）",
  "specFormat": "作品格式要求（没有则空）",
  "aiPolicy": "AIGC政策（没有则空）",
  "detailBody": "赛事详细说明 Markdown"
}

规则：
- 如果你知道这个赛事的信息，请尽可能完整填写
- 不确定的字段留空，不要编造
- 如果完全不知道这个URL对应的赛事，返回 {"unknown": true}`,
        },
        {
          role: "user",
          content: `请提取这个赛事链接的信息：${url}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI 未返回内容");

    const data = JSON.parse(content);
    if (data.unknown) {
      return NextResponse.json({ success: false, error: "无法识别该链接的赛事信息，请手动填写" });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `抓取失败: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
