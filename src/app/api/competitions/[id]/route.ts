import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { competitions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await db
    .select()
    .from(competitions)
    .where(eq(competitions.id, parseInt(id)))
    .limit(1);

  if (!result.length) {
    return NextResponse.json({ success: false, error: "未找到" }, { status: 404 });
  }

  if (result[0].status !== "published") {
    return NextResponse.json({ success: false, error: "未发布" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result[0] });
}
