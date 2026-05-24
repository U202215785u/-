import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { competitions } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const result = await db.select().from(competitions).orderBy(desc(competitions.createdAt));
  return NextResponse.json({ success: true, data: result });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const [inserted] = await db.insert(competitions).values({
    title: body.title || "", organizer: body.organizer || "",
    level: body.level || "", overview: body.overview || "",
    posterUrl: body.posterUrl || "", contestType: body.contestType || "",
    tags: body.tags || [],
    submissionStartDate: body.submissionStartDate || "",
    submissionDeadline: body.submissionDeadline || "",
    officialUrl: body.officialUrl || "",
    status: body.status || "draft", source: body.source || "manual",
    deadlines: body.deadlines || [], categories: body.categories || [],
    eligibility: body.eligibility || "",
    entryFee: body.entryFee || { amount: 0, note: "" },
    awards: body.awards || "", specFormat: body.specFormat || "",
    aiPolicy: body.aiPolicy || "", isMoeCompetition: body.isMoeCompetition || "false",
    dataVerified: body.dataVerified || "false",
    confidence: body.confidence || "",
    sourceNote: body.sourceNote || "",
    detailBody: body.detailBody || "",
  }).returning();
  return NextResponse.json({ success: true, data: inserted }, { status: 201 });
}
