import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const result = await db.select().from(admins).where(eq(admins.username, "admin")).limit(1);
  if (!result.length) {
    return NextResponse.json({ success: false, error: "系统未初始化" }, { status: 500 });
  }

  const valid = await bcrypt.compare(password, result[0].passwordHash);
  if (!valid) {
    return NextResponse.json({ success: false, error: "密码错误" }, { status: 401 });
  }

  const token = await createToken();
  await setAuthCookie(token);

  return NextResponse.json({ success: true });
}
