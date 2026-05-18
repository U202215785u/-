import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { competitions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [updated] = await db.update(competitions).set({
    title: body.title, organizer: body.organizer, level: body.level,
    overview: body.overview, posterUrl: body.posterUrl,
    contestType: body.contestType, tags: body.tags,
    submissionStartDate: body.submissionStartDate,
    submissionDeadline: body.submissionDeadline,
    officialUrl: body.officialUrl, status: body.status, source: body.source,
    deadlines: body.deadlines, categories: body.categories,
    eligibility: body.eligibility, entryFee: body.entryFee,
    awards: body.awards, specFormat: body.specFormat,
    aiPolicy: body.aiPolicy, isMoeCompetition: body.isMoeCompetition,
    dataVerified: body.dataVerified,
    detailBody: body.detailBody, updatedAt: new Date(),
  }).where(eq(competitions.id, parseInt(id))).returning();
  if (!updated) return NextResponse.json({ success: false, error: "未找到" }, { status: 404 });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [deleted] = await db.delete(competitions).where(eq(competitions.id, parseInt(id))).returning();
  if (!deleted) return NextResponse.json({ success: false, error: "未找到" }, { status: 404 });
  return NextResponse.json({ success: true });
}
