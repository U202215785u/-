import { NextRequest, NextResponse } from "next/server";
import { scoutCompetitions, ListingScrapeError } from "@/lib/ai-scout";
import { PageFetchError } from "@/lib/page-fetcher";

export async function POST(request: NextRequest) {
  const { keywords, fetchDetails, maxDetails } = await request.json();

  try {
    const results = await scoutCompetitions({
      keywords: keywords || undefined,
      fetchDetails: fetchDetails ?? false,
      maxDetails: maxDetails ?? 20,
    });

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        total: results.length,
        mode: fetchDetails ? "detail" : "listing",
        source: "shejijingsai.com",
      },
    });
  } catch (err) {
    if (err instanceof ListingScrapeError) {
      return NextResponse.json(
        { success: false, error: `列表抓取失败: ${err.message}` },
        { status: 502 },
      );
    }
    if (err instanceof PageFetchError) {
      return NextResponse.json(
        { success: false, error: `网页抓取失败: ${err.message}` },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { success: false, error: `搜罗失败: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
