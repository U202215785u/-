import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { competitions } from "@/db/schema";
import { eq, and, ilike, or, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const level = searchParams.get("level") || "";
  const tag = searchParams.get("tag") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 12;

  const conditions = [eq(competitions.status, "published"), eq(competitions.dataVerified, "true")];

  if (q) {
    conditions.push(
      or(
        ilike(competitions.title, `%${q}%`),
        ilike(competitions.organizer, `%${q}%`),
        ilike(competitions.overview, `%${q}%`)
      ) as any
    );
  }
  if (level) {
    conditions.push(eq(competitions.level, level as any));
  }

  const allItems = await db
    .select()
    .from(competitions)
    .where(and(...conditions))
    .orderBy(desc(competitions.createdAt));

  let filtered = allItems;
  if (tag) {
    filtered = allItems.filter((c) => c.tags?.includes(tag));
  }

  const total = filtered.length;
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json({
    success: true,
    data: { items, total, page, pageSize },
  });
}
