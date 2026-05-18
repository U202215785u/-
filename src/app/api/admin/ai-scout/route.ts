import { NextRequest, NextResponse } from "next/server";
import { scoutCompetitions } from "@/lib/ai-scout";

export async function POST(request: NextRequest) {
  const { keywords } = await request.json();
  const kw = keywords || "国家级 设计竞赛 2026 大学生 征稿";

  try {
    const results = await scoutCompetitions(kw);
    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `搜罗失败: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
