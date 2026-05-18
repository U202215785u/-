# 竞赛信息板 第一期 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建竞赛信息板第一期：管理后台（登录+增删改查）+ 公开浏览 + AI 辅助搜罗

**Architecture:** Next.js App Router 全栈应用，PostgreSQL+Drizzle ORM 数据层，JWT Cookie 认证，OpenAI/Claude API 做赛事信息结构化。管理页面纯白功能风，公开页面基础样式。

**Tech Stack:** Next.js 14+ (App Router), TypeScript, PostgreSQL (Neon), Drizzle ORM, Tailwind CSS, bcryptjs, jose, openai SDK

---

## File Structure

```
src/
├── db/
│   ├── schema.ts              # Drizzle schema
│   └── index.ts               # DB connection + client
├── lib/
│   ├── auth.ts                # JWT sign/verify, cookie helpers
│   └── ai-scout.ts            # Search + LLM extraction logic
├── types/
│   └── index.ts               # Shared TS types (Competition, ApiResponse, etc.)
├── app/
│   ├── layout.tsx             # Root layout (minimal, just html+body)
│   ├── page.tsx               # Homepage: search bar + filter tabs + card grid
│   ├── globals.css            # Tailwind directives + base styles
│   ├── c/
│   │   └── [id]/
│   │       └── page.tsx       # Competition detail / share landing page
│   ├── admin/
│   │   ├── page.tsx           # Login form OR dashboard (based on auth state)
│   │   ├── layout.tsx         # Check auth, redirect to login if no token
│   │   └── edit/
│   │       └── [id]/
│   │           └── page.tsx   # Create/edit form, id="new" for create
│   └── api/
│       ├── competitions/
│       │   ├── route.ts       # GET /api/competitions
│       │   └── [id]/
│       │       └── route.ts   # GET /api/competitions/[id]
│       └── admin/
│           ├── login/
│           │   └── route.ts   # POST /api/admin/login
│           ├── competitions/
│           │   ├── route.ts   # GET list (with drafts), POST create
│           │   └── [id]/
│           │       └── route.ts   # PUT update
│           └── ai-scout/
│               └── route.ts   # POST /api/admin/ai-scout
└── components/
    ├── CompetitionCard.tsx     # Single card for list grid
    ├── CompetitionFilters.tsx  # Search input + level/type/tag filters
    ├── AdminCompetitionTable.tsx  # Table for admin dashboard
    ├── CompetitionForm.tsx     # Create/edit form (shared)
    └── AiScoutModal.tsx        # Modal: trigger scout → preview → import
```

---

## Phase 1: Project Scaffold + Database

### Task 1.1: Create Next.js project

```bash
cd "C:\Users\Administrator\vibecoding\咸鱼美术组"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

Expected: package.json, tsconfig.json, next.config.ts, tailwind.config.ts, src/app/layout.tsx all created.

### Task 1.2: Install dependencies

```bash
npm install drizzle-orm @neondatabase/serverless drizzle-kit bcryptjs jose openai
npm install -D @types/bcryptjs
```

### Task 1.3: Create .env.local

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\.env.local`:

```
DATABASE_URL=postgresql://...
ADMIN_PASSWORD=your_admin_password_here
JWT_SECRET=a_random_secret_string_min_32_chars
OPENAI_API_KEY=sk-...
BING_SEARCH_API_KEY=... (optional, for AI scout)
```

### Task 1.4: Create drizzle.config.ts

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Task 1.5: Create DB connection

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\db\index.ts`:

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### Task 1.6: Create database schema

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\db\schema.ts`:

```typescript
import { pgTable, serial, text, timestamp, jsonb, integer, varchar } from "drizzle-orm/pg-core";

export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  organizer: varchar("organizer", { length: 256 }).default(""),
  level: varchar("level", { length: 32 }).default(""),        // 国家级 | 省级 | 行业
  overview: text("overview").default(""),
  posterUrl: text("poster_url").default(""),
  contestType: varchar("contest_type", { length: 32 }).default(""), // 征稿 | 排行 | 展览
  tags: text("tags").array().default([]),
  submissionDeadline: varchar("submission_deadline", { length: 32 }).default(""),
  officialUrl: text("official_url").default(""),
  status: varchar("status", { length: 16 }).notNull().default("draft"), // draft | published | archived
  source: varchar("source", { length: 16 }).notNull().default("manual"), // manual | ai

  // Layer 2: flexible structured fields (jsonb)
  deadlines: jsonb("deadlines").default([]),     // [{label: string, date: string}, ...]
  categories: jsonb("categories").default([]),   // string[]
  eligibility: text("eligibility").default(""),
  entryFee: jsonb("entry_fee").default({ amount: 0, note: "" }), // {amount: number, note: string}
  awards: text("awards").default(""),
  specFormat: text("spec_format").default(""),
  aiPolicy: text("ai_policy").default(""),

  // Layer 3: free body
  detailBody: text("detail_body").default(""),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Task 1.7: Push schema to database

```bash
npx drizzle-kit push
```

Expected output: "No changes to push" or tables created successfully.

### Task 1.8: Seed admin account

Create `C:\Users\Administrator\vibecoding\咸鱼美术组\src\db\seed.ts`:

```typescript
import { db } from "./index";
import { admins } from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 10);
  await db.insert(admins).values({
    username: "admin",
    passwordHash: hash,
  }).onConflictDoNothing();
  console.log("Admin seeded");
  process.exit(0);
}

seed();
```

Run:
```bash
npx tsx src/db/seed.ts
```

---

## Phase 2: Shared Types + Auth Library

### Task 2.1: Create shared types

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\types\index.ts`:

```typescript
export interface CompetitionDeadline {
  label: string;   // e.g. "报名截止", "作品提交", "省赛评审"
  date: string;    // e.g. "2026-03-15"
}

export interface EntryFee {
  amount: number;  // 0 = free
  note: string;
}

export interface Competition {
  id: number;
  title: string;
  organizer: string;
  level: string;
  overview: string;
  posterUrl: string;
  contestType: string;
  tags: string[];
  submissionDeadline: string;
  officialUrl: string;
  status: "draft" | "published" | "archived";
  source: "manual" | "ai";
  deadlines: CompetitionDeadline[];
  categories: string[];
  eligibility: string;
  entryFee: EntryFee;
  awards: string;
  specFormat: string;
  aiPolicy: string;
  detailBody: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

### Task 2.2: Create auth library

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\lib\auth.ts`:

```typescript
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-min-32-chars-long");
const COOKIE_NAME = "admin_token";

export async function createToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function getAuthFromCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyToken(token);
}

export async function requireAuth(): Promise<void> {
  const authed = await getAuthFromCookie();
  if (!authed) redirect("/admin");
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
```

---

## Phase 3: API Routes

### Task 3.1: Public - GET /api/competitions

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\app\api\competitions\route.ts`:

```typescript
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

  const conditions = [eq(competitions.status, "published")];

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

  // Filter by tag in-memory (array containment in pg would need @>, keep it simple)
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
```

### Task 3.2: Public - GET /api/competitions/[id]

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\app\api\competitions\[id]\route.ts`:

```typescript
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
```

### Task 3.3: Admin - POST /api/admin/login

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\app\api\admin\login\route.ts`:

```typescript
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
```

### Task 3.4: Admin - GET/POST /api/admin/competitions

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\app\api\admin\competitions\route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { competitions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET() {
  if (!(await getAuthFromCookie())) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const result = await db
    .select()
    .from(competitions)
    .orderBy(desc(competitions.createdAt));

  return NextResponse.json({ success: true, data: result });
}

export async function POST(request: NextRequest) {
  if (!(await getAuthFromCookie())) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const body = await request.json();

  const [inserted] = await db.insert(competitions).values({
    title: body.title || "",
    organizer: body.organizer || "",
    level: body.level || "",
    overview: body.overview || "",
    posterUrl: body.posterUrl || "",
    contestType: body.contestType || "",
    tags: body.tags || [],
    submissionDeadline: body.submissionDeadline || "",
    officialUrl: body.officialUrl || "",
    status: body.status || "draft",
    source: body.source || "manual",
    deadlines: body.deadlines || [],
    categories: body.categories || [],
    eligibility: body.eligibility || "",
    entryFee: body.entryFee || { amount: 0, note: "" },
    awards: body.awards || "",
    specFormat: body.specFormat || "",
    aiPolicy: body.aiPolicy || "",
    detailBody: body.detailBody || "",
  }).returning();

  return NextResponse.json({ success: true, data: inserted }, { status: 201 });
}
```

### Task 3.5: Admin - PUT /api/admin/competitions/[id]

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\app\api\admin\competitions\[id]\route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { competitions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthFromCookie } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAuthFromCookie())) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const [updated] = await db
    .update(competitions)
    .set({
      title: body.title,
      organizer: body.organizer,
      level: body.level,
      overview: body.overview,
      posterUrl: body.posterUrl,
      contestType: body.contestType,
      tags: body.tags,
      submissionDeadline: body.submissionDeadline,
      officialUrl: body.officialUrl,
      status: body.status,
      source: body.source,
      deadlines: body.deadlines,
      categories: body.categories,
      eligibility: body.eligibility,
      entryFee: body.entryFee,
      awards: body.awards,
      specFormat: body.specFormat,
      aiPolicy: body.aiPolicy,
      detailBody: body.detailBody,
      updatedAt: new Date(),
    })
    .where(eq(competitions.id, parseInt(id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ success: false, error: "未找到" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: updated });
}
```

### Task 3.6: Admin - POST /api/admin/ai-scout

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\app\api\admin\ai-scout\route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { scoutCompetitions } from "@/lib/ai-scout";

export async function POST(request: NextRequest) {
  if (!(await getAuthFromCookie())) {
    return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
  }

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
```

---

## Phase 4: AI Scout Logic

### Task 4.1: Create AI scout library

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\lib\ai-scout.ts`:

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ScoutResult {
  title: string;
  organizer: string;
  level: string;
  overview: string;
  contestType: string;
  tags: string[];
  submissionDeadline: string;
  officialUrl: string;
  deadlines: { label: string; date: string }[];
  categories: string[];
  eligibility: string;
  entryFee: { amount: number; note: string };
  awards: string;
  specFormat: string;
  aiPolicy: string;
  detailBody: string;
  confidence: "high" | "medium" | "low";
  sourceNote: string;
}

const SYSTEM_PROMPT = `你是一个设计竞赛信息收集助手。用户会给你关于当前正在征稿的设计类竞赛的信息，你需要提取并结构化这些信息。

返回 JSON 数组，每个元素格式如下：
{
  "title": "赛事全称",
  "organizer": "主办方",
  "level": "国家级|省级|行业",
  "overview": "一句话简介（50字以内）",
  "contestType": "征稿|排行|展览",
  "tags": ["平面设计","插画",...],
  "submissionDeadline": "最近的提交截止日期，格式YYYY-MM-DD",
  "officialUrl": "官方网址",
  "deadlines": [{"label":"报名截止","date":"2026-03-15"},...],
  "categories": ["视觉传达","动画",...],
  "eligibility": "参赛资格说明",
  "entryFee": {"amount":0,"note":"免费"} 或 {"amount":50,"note":"学生组"},
  "awards": "奖项设置简述",
  "specFormat": "作品格式要求",
  "aiPolicy": "AIGC相关政策",
  "detailBody": "完整的赛事通知摘要（Markdown格式）",
  "confidence": "high|medium|low（你对此信息准确度的判断）",
  "sourceNote": "这条信息的来源线索"
}

规则：
- 只收录国家级、省级和知名行业赛事
- 忽略校内赛、院系赛、纯地方性比赛
- 如果关键信息缺失（如没有截止日期），confidence 设为 low
- 不确定的字段留空字符串，不要编造`;

export async function scoutCompetitions(keywords: string): Promise<ScoutResult[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `请搜索并整理当前正在征稿的设计类竞赛信息。搜索关键词：${keywords}。请列出你确定正在举办的赛事（截止日期在2026年内的），用中文返回。`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI 未返回内容");

  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : (parsed.results || parsed.competitions || []);
}
```

---

## Phase 5: Admin Pages

### Task 5.1: Admin layout with auth check

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\app\admin\layout.tsx`:

```typescript
import { requireAuth } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Only require auth for dashboard & edit pages, not login page
  // We handle this per-page since login doesn't need auth
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Link href="/admin" className="font-bold text-lg">竞赛管理</Link>
        <div className="flex gap-4 text-sm">
          <Link href="/admin/edit/new" className="text-blue-600 hover:underline">+ 手动添加</Link>
          <Link href="/" className="text-gray-600 hover:underline">查看前台</Link>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

### Task 5.2: Admin page (login + dashboard combined)

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\app\admin\page.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminCompetitionTable from "@/components/AdminCompetitionTable";
import AiScoutModal from "@/components/AiScoutModal";

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null=loading
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [showScout, setShowScout] = useState(false);
  const router = useRouter();

  // Check auth on mount
  useEffect(() => {
    fetch("/api/admin/competitions")
      .then((r) => {
        if (r.ok) {
          setAuthed(true);
          return r.json();
        }
        setAuthed(false);
      })
      .then((d) => {
        if (d?.success) setCompetitions(d.data);
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
      loadCompetitions();
    } else {
      const d = await res.json();
      setError(d.error || "登录失败");
    }
    setLoading(false);
  };

  const loadCompetitions = useCallback(async () => {
    const res = await fetch("/api/admin/competitions");
    const d = await res.json();
    if (d.success) setCompetitions(d.data);
  }, []);

  const handleStatusChange = async (id: number, status: string) => {
    await fetch(`/api/admin/competitions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadCompetitions();
  };

  const handleImportDrafts = async (drafts: any[]) => {
    for (const draft of drafts) {
      await fetch("/api/admin/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, status: "draft", source: "ai" }),
      });
    }
    loadCompetitions();
    setShowScout(false);
  };

  // Loading
  if (authed === null) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  // Login form
  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-sm w-96">
          <h1 className="text-xl font-bold mb-6">管理登录</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入管理密码"
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded py-2 hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    );
  }

  // Dashboard
  const drafts = competitions.filter((c) => c.status === "draft");
  const published = competitions.filter((c) => c.status === "published");
  const archived = competitions.filter((c) => c.status === "archived");

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">管理面板</h2>
        <button
          onClick={() => setShowScout(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          AI 搜罗
        </button>
      </div>

      {/* Drafts */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3 text-yellow-700">
          草稿箱 ({drafts.length})
        </h3>
        <AdminCompetitionTable
          items={drafts}
          onStatusChange={handleStatusChange}
          emptyText="暂无草稿"
        />
      </section>

      {/* Published */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3 text-green-700">
          已发布 ({published.length})
        </h3>
        <AdminCompetitionTable
          items={published}
          onStatusChange={handleStatusChange}
          emptyText="还没有已发布的赛事"
        />
      </section>

      {/* Archived */}
      {archived.length > 0 && (
        <section className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-gray-500">
            已归档 ({archived.length})
          </h3>
          <AdminCompetitionTable
            items={archived}
            onStatusChange={handleStatusChange}
            emptyText=""
          />
        </section>
      )}

      {showScout && (
        <AiScoutModal
          onClose={() => setShowScout(false)}
          onImport={handleImportDrafts}
        />
      )}
    </div>
  );
}
```

### Task 5.3: AdminCompetitionTable component

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\components\AdminCompetitionTable.tsx`:

```typescript
"use client";

import Link from "next/link";

interface Props {
  items: any[];
  onStatusChange: (id: number, status: string) => void;
  emptyText: string;
}

export default function AdminCompetitionTable({ items, onStatusChange, emptyText }: Props) {
  if (items.length === 0) {
    return <p className="text-gray-400 text-sm py-4">{emptyText}</p>;
  }

  return (
    <div className="bg-white rounded border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="text-left px-4 py-2">赛事</th>
            <th className="text-left px-4 py-2">状态</th>
            <th className="text-left px-4 py-2">来源</th>
            <th className="text-left px-4 py-2">截止</th>
            <th className="text-left px-4 py-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link href={`/admin/edit/${c.id}`} className="text-blue-600 hover:underline font-medium">
                  {c.title || "(无标题)"}
                </Link>
                <div className="text-gray-400 text-xs">{c.organizer}</div>
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  c.status === "published" ? "bg-green-100 text-green-700" :
                  c.status === "draft" ? "bg-yellow-100 text-yellow-700" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  {c.status === "published" ? "已发布" : c.status === "draft" ? "草稿" : "已归档"}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {c.source === "ai" ? "AI" : "手动"}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {c.submissionDeadline || "-"}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  {c.status === "draft" && (
                    <button
                      onClick={() => onStatusChange(c.id, "published")}
                      className="text-green-600 hover:underline text-xs"
                    >
                      发布
                    </button>
                  )}
                  {c.status === "published" && (
                    <button
                      onClick={() => onStatusChange(c.id, "archived")}
                      className="text-gray-500 hover:underline text-xs"
                    >
                      归档
                    </button>
                  )}
                  {c.status === "archived" && (
                    <button
                      onClick={() => onStatusChange(c.id, "published")}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      重新发布
                    </button>
                  )}
                  <Link href={`/admin/edit/${c.id}`} className="text-blue-600 hover:underline text-xs">
                    编辑
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Task 5.4: CompetitionForm component

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\components\CompetitionForm.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string; // "new" or number string
}

const emptyForm = {
  title: "", organizer: "", level: "", overview: "", posterUrl: "",
  contestType: "", tags: "", submissionDeadline: "", officialUrl: "",
  deadlines: "", categories: "", eligibility: "", awards: "", specFormat: "",
  aiPolicy: "", detailBody: "", status: "draft",
  entryFeeAmount: "0", entryFeeNote: "",
};

export default function CompetitionForm({ id }: Props) {
  const router = useRouter();
  const isNew = id === "new";
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      fetch(`/api/admin/competitions`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            const item = d.data.find((c: any) => c.id === parseInt(id));
            if (item) {
              setForm({
                title: item.title || "",
                organizer: item.organizer || "",
                level: item.level || "",
                overview: item.overview || "",
                posterUrl: item.posterUrl || "",
                contestType: item.contestType || "",
                tags: (item.tags || []).join(", "),
                submissionDeadline: item.submissionDeadline || "",
                officialUrl: item.officialUrl || "",
                deadlines: JSON.stringify(item.deadlines || []),
                categories: (item.categories || []).join(", "),
                eligibility: item.eligibility || "",
                awards: item.awards || "",
                specFormat: item.specFormat || "",
                aiPolicy: item.aiPolicy || "",
                detailBody: item.detailBody || "",
                status: item.status || "draft",
                entryFeeAmount: String(item.entryFee?.amount || 0),
                entryFeeNote: item.entryFee?.note || "",
              });
            }
          }
          setLoading(false);
        });
    }
  }, [id, isNew]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      categories: form.categories.split(",").map((t) => t.trim()).filter(Boolean),
      deadlines: (() => {
        try { return JSON.parse(form.deadlines); } catch { return []; }
      })(),
      entryFee: {
        amount: parseInt(form.entryFeeAmount) || 0,
        note: form.entryFeeNote,
      },
    };
    delete (body as any).entryFeeAmount;
    delete (body as any).entryFeeNote;

    const url = isNew ? "/api/admin/competitions" : `/api/admin/competitions/${id}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      const d = await res.json();
      setError(d.error || "保存失败");
    }
    setSaving(false);
  };

  if (loading) return <p>加载中...</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-6">{isNew ? "添加赛事" : "编辑赛事"}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Layer 1: Core fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">赛事名称 *</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)}
            required className="w-full border rounded px-3 py-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">主办方</label>
            <input value={form.organizer} onChange={(e) => set("organizer", e.target.value)}
              className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">级别</label>
            <select value={form.level} onChange={(e) => set("level", e.target.value)}
              className="w-full border rounded px-3 py-2">
              <option value="">请选择</option>
              <option value="国家级">国家级</option>
              <option value="省级">省级</option>
              <option value="行业">行业</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">赛事类型</label>
            <select value={form.contestType} onChange={(e) => set("contestType", e.target.value)}
              className="w-full border rounded px-3 py-2">
              <option value="">请选择</option>
              <option value="征稿">征稿</option>
              <option value="排行">排行</option>
              <option value="展览">展览</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">提交截止日期</label>
            <input type="date" value={form.submissionDeadline} onChange={(e) => set("submissionDeadline", e.target.value)}
              className="w-full border rounded px-3 py-2" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">一句话简介</label>
          <input value={form.overview} onChange={(e) => set("overview", e.target.value)}
            className="w-full border rounded px-3 py-2" placeholder="50字以内" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">海报图片URL</label>
            <input value={form.posterUrl} onChange={(e) => set("posterUrl", e.target.value)}
              className="w-full border rounded px-3 py-2" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">官方链接</label>
            <input value={form.officialUrl} onChange={(e) => set("officialUrl", e.target.value)}
              className="w-full border rounded px-3 py-2" placeholder="https://..." />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">标签（逗号分隔）</label>
          <input value={form.tags} onChange={(e) => set("tags", e.target.value)}
            className="w-full border rounded px-3 py-2" placeholder="平面设计, 插画, AIGC" />
        </div>

        {/* Layer 2: Flexible fields */}
        <hr className="my-6" />
        <h3 className="font-semibold text-gray-800">结构详情（选填）</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">设计类别（逗号分隔）</label>
          <input value={form.categories} onChange={(e) => set("categories", e.target.value)}
            className="w-full border rounded px-3 py-2" placeholder="视觉传达, 动画视频, 交互设计" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">参赛资格</label>
          <textarea value={form.eligibility} onChange={(e) => set("eligibility", e.target.value)}
            className="w-full border rounded px-3 py-2" rows={2} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">报名费</label>
            <input type="number" value={form.entryFeeAmount} onChange={(e) => set("entryFeeAmount", e.target.value)}
              className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">费用说明</label>
            <input value={form.entryFeeNote} onChange={(e) => set("entryFeeNote", e.target.value)}
              className="w-full border rounded px-3 py-2" placeholder="如: 免费 / 学生组 ¥50" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">奖项设置</label>
          <textarea value={form.awards} onChange={(e) => set("awards", e.target.value)}
            className="w-full border rounded px-3 py-2" rows={2} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">作品格式要求</label>
          <textarea value={form.specFormat} onChange={(e) => set("specFormat", e.target.value)}
            className="w-full border rounded px-3 py-2" rows={2} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AIGC 政策</label>
          <input value={form.aiPolicy} onChange={(e) => set("aiPolicy", e.target.value)}
            className="w-full border rounded px-3 py-2" placeholder="如: 禁止AIGC / 设有AIGC赛道" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">赛程节点（JSON）</label>
          <textarea value={form.deadlines} onChange={(e) => set("deadlines", e.target.value)}
            className="w-full border rounded px-3 py-2 font-mono text-sm" rows={3}
            placeholder='[{"label":"报名截止","date":"2026-03-15"},{"label":"作品提交","date":"2026-03-25"}]' />
        </div>

        {/* Layer 3: Free body */}
        <hr className="my-6" />
        <h3 className="font-semibold text-gray-800">正文（Markdown）</h3>
        <div>
          <textarea value={form.detailBody} onChange={(e) => set("detailBody", e.target.value)}
            className="w-full border rounded px-3 py-2 font-mono text-sm" rows={10}
            placeholder="完整的赛事通知..." />
        </div>

        {/* Status */}
        <hr className="my-6" />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
          <select value={form.status} onChange={(e) => set("status", e.target.value)}
            className="w-full border rounded px-3 py-2">
            <option value="draft">草稿</option>
            <option value="published">发布</option>
            <option value="archived">归档</option>
          </select>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-4 pt-4">
          <button type="submit" disabled={saving}
            className="bg-gray-900 text-white px-6 py-2 rounded hover:bg-gray-800 disabled:opacity-50">
            {saving ? "保存中..." : "保存"}
          </button>
          <button type="button" onClick={() => router.back()}
            className="border border-gray-300 px-6 py-2 rounded hover:bg-gray-50">
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Task 5.5: Edit page (wraps form)

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\app\admin\edit\[id]\page.tsx`:

```typescript
import { requireAuth } from "@/lib/auth";
import CompetitionForm from "@/components/CompetitionForm";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  return <CompetitionForm id={id} />;
}
```

---

## Phase 6: AI Scout Modal

### Task 6.1: Create AiScoutModal component

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\components\AiScoutModal.tsx`:

```typescript
"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
  onImport: (drafts: any[]) => void;
}

export default function AiScoutModal({ onClose, onImport }: Props) {
  const [keywords, setKeywords] = useState("国家级 设计竞赛 2026 大学生 征稿");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");

  const handleScout = async () => {
    setSearching(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ai-scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords }),
      });
      const d = await res.json();
      if (d.success) {
        setResults(d.data);
        setSelected(new Set(d.data.map((_: any, i: number) => i)));
      } else {
        setError(d.error || "搜罗失败");
      }
    } catch {
      setError("网络错误");
    }
    setSearching(false);
  };

  const toggle = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };

  const handleImport = () => {
    const drafts = results.filter((_, i) => selected.has(i));
    if (drafts.length === 0) return;
    onImport(drafts);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-bold">AI 搜罗赛事</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="p-6 flex gap-3 border-b border-gray-100">
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
            placeholder="搜索关键词"
          />
          <button
            onClick={handleScout}
            disabled={searching || !keywords.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            {searching ? "搜罗中..." : "开始搜罗"}
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {error && <p className="text-red-500 mb-4">{error}</p>}

          {results.length > 0 && (
            <>
              <p className="text-sm text-gray-500 mb-4">发现 {results.length} 条可能赛事，勾选后导入草稿箱</p>
              <div className="space-y-3">
                {results.map((item, i) => (
                  <label key={i} className={`flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    selected.has(i) ? "border-blue-300 bg-blue-50" : "border-gray-200"
                  }`}>
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggle(i)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-gray-500">
                        {item.organizer} · 截止 {item.submissionDeadline} · 可信度: {item.confidence}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">{item.overview}</div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {!searching && results.length === 0 && !error && (
            <p className="text-gray-400 text-center py-12">输入关键词后点击"开始搜罗"</p>
          )}

          {searching && (
            <p className="text-gray-400 text-center py-12">正在搜罗中，大约需要 10-20 秒...</p>
          )}
        </div>

        {results.length > 0 && (
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            <button onClick={onClose} className="border px-4 py-2 rounded hover:bg-gray-50">取消</button>
            <button onClick={handleImport} disabled={selected.size === 0}
              className="bg-gray-900 text-white px-6 py-2 rounded hover:bg-gray-800 disabled:opacity-50">
              导入选中 ({selected.size} 条) → 草稿箱
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Phase 7: Public Pages

### Task 7.1: Root layout

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\app\layout.tsx`:

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "咸鱼美术组 · 竞赛信息板",
  description: "发现值得参加的设计竞赛",
  openGraph: {
    title: "咸鱼美术组 · 竞赛信息板",
    description: "发现值得参加的设计竞赛",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
```

### Task 7.2: Homepage - competition list with filters

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\app\page.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import CompetitionCard from "@/components/CompetitionCard";
import CompetitionFilters from "@/components/CompetitionFilters";
import Link from "next/link";

export default function Homepage() {
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: "", level: "", tag: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.level) params.set("level", filters.level);
    if (filters.tag) params.set("tag", filters.tag);
    params.set("page", "1");
    params.set("pageSize", "50");

    const res = await fetch(`/api/competitions?${params}`);
    const d = await res.json();
    if (d.success) setCompetitions(d.data.items);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">咸鱼美术组</h1>
            <p className="text-xs text-gray-400">竞赛信息板</p>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link href="/" className="text-gray-900 hover:underline">首页</Link>
            <a href="https://github.com" target="_blank" rel="noopener" className="text-gray-400 hover:underline">关于社团</a>
          </nav>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <CompetitionFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Competition Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {loading ? (
          <p className="text-gray-400 text-center py-12">加载中...</p>
        ) : competitions.length === 0 ? (
          <p className="text-gray-400 text-center py-12">暂无赛事信息，敬请期待</p>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">{competitions.length} 个赛事</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {competitions.map((c) => (
                <CompetitionCard key={c.id} competition={c} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

### Task 7.3: CompetitionFilters component

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\components\CompetitionFilters.tsx`:

```typescript
"use client";

interface Props {
  filters: { q: string; level: string; tag: string };
  onChange: (f: { q: string; level: string; tag: string }) => void;
}

const LEVELS = ["", "国家级", "省级", "行业"];
const COMMON_TAGS = ["", "平面设计", "插画", "CG", "动画", "产品设计", "摄影", "AIGC", "交互设计", "文创"];

export default function CompetitionFilters({ filters, onChange }: Props) {
  const update = (key: string, value: string) => onChange({ ...filters, [key]: value });

  return (
    <div className="space-y-3">
      {/* Search */}
      <input
        type="text"
        value={filters.q}
        onChange={(e) => update("q", e.target.value)}
        placeholder="搜索赛事名称、主办方..."
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
      />

      {/* Level tabs */}
      <div className="flex gap-2 flex-wrap">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => update("level", l)}
            className={`px-3 py-1 rounded-full text-xs border ${
              filters.level === l
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {l || "全部级别"}
          </button>
        ))}
      </div>

      {/* Tag pills */}
      <div className="flex gap-2 flex-wrap">
        {COMMON_TAGS.map((t) => (
          <button
            key={t}
            onClick={() => update("tag", filters.tag === t ? "" : t)}
            className={`px-2 py-0.5 rounded text-xs ${
              filters.tag === t
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {t || "全部标签"}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Task 7.4: CompetitionCard component

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\components\CompetitionCard.tsx`:

```typescript
import Link from "next/link";

function formatDeadline(dateStr: string): { text: string; urgent: boolean } {
  if (!dateStr) return { text: "", urgent: false };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { text: dateStr, urgent: false };
  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: "已截止", urgent: false };
  if (days === 0) return { text: "今天截止", urgent: true };
  if (days <= 7) return { text: `还剩 ${days} 天`, urgent: true };
  if (days <= 30) return { text: `还剩 ${days} 天`, urgent: false };
  return { text: dateStr, urgent: false };
}

export default function CompetitionCard({ competition: c }: { competition: any }) {
  const deadline = formatDeadline(c.submissionDeadline);

  return (
    <Link href={`/c/${c.id}`} className="block border border-gray-200 rounded-lg p-4 hover:border-gray-400 hover:shadow-sm transition-all">
      {/* Poster placeholder or image */}
      {c.posterUrl ? (
        <img src={c.posterUrl} alt={c.title} className="w-full h-40 object-cover rounded mb-3 bg-gray-100" />
      ) : (
        <div className="w-full h-40 rounded mb-3 bg-gray-100 flex items-center justify-center text-gray-300 text-sm">
          {c.contestType || "设计竞赛"}
        </div>
      )}

      {/* Level badge */}
      {c.level && (
        <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 mb-2">
          {c.level}
        </span>
      )}

      <h3 className="font-semibold text-sm leading-snug mb-1 line-clamp-2">{c.title}</h3>
      <p className="text-xs text-gray-400 mb-2">{c.organizer}</p>

      {/* Deadline */}
      <span className={`text-xs ${deadline.urgent ? "text-red-500 font-medium" : "text-gray-400"}`}>
        {deadline.text}
      </span>
    </Link>
  );
}
```

---

## Phase 8: Detail/Share Page

### Task 8.1: Competition detail page

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\app\c\[id]\page.tsx`:

```typescript
import { Metadata } from "next";
import DetailContent from "./DetailContent";

async function getCompetition(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/competitions/${id}`, { cache: "no-store" });
    const d = await res.json();
    return d.success ? d.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = await getCompetition(id);
  if (!c) return { title: "未找到" };
  return {
    title: `${c.title} - 咸鱼美术组`,
    description: c.overview || c.title,
    openGraph: {
      title: c.title,
      description: c.overview || "",
      images: c.posterUrl ? [c.posterUrl] : [],
      type: "article",
    },
  };
}

export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCompetition(id);

  if (!c) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">
        赛事不存在或未发布
      </div>
    );
  }

  return <DetailContent competition={c} />;
}
```

### Task 8.2: DetailContent client component

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\app\c\[id]\DetailContent.tsx`:

```typescript
"use client";

export default function DetailContent({ competition: c }: { competition: any }) {
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: c.title, text: c.overview, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      alert("链接已复制，可粘贴分享到微信群");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Poster */}
      {c.posterUrl && (
        <img src={c.posterUrl} alt={c.title} className="w-full max-h-64 object-cover rounded-lg mb-6" />
      )}

      {/* Title & meta */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {c.level && <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{c.level}</span>}
          {c.contestType && <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{c.contestType}</span>}
        </div>
        <h1 className="text-2xl font-bold mb-2">{c.title}</h1>
        <p className="text-gray-500">{c.organizer}</p>
        {c.submissionDeadline && (
          <p className="text-red-500 text-sm mt-2">截止日期：{c.submissionDeadline}</p>
        )}
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        className="w-full mb-8 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        分享到微信群 / 复制链接
      </button>

      {/* Overview */}
      {c.overview && <p className="text-gray-700 mb-8 leading-relaxed">{c.overview}</p>}

      {/* Layer 2: structured sections */}
      <div className="space-y-6 mb-8">
        {c.eligibility && (
          <Section title="参赛资格">{c.eligibility}</Section>
        )}

        {c.deadlines && c.deadlines.length > 0 && (
          <Section title="赛程安排">
            <div className="space-y-1">
              {c.deadlines.map((d: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600">{d.label}</span>
                  <span className="text-gray-900">{d.date}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {c.categories && c.categories.length > 0 && (
          <Section title="设计类别">
            <div className="flex gap-2 flex-wrap">
              {c.categories.map((cat: string, i: number) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 rounded">{cat}</span>
              ))}
            </div>
          </Section>
        )}

        {c.awards && <Section title="奖项设置">{c.awards}</Section>}
        {c.specFormat && <Section title="作品格式要求">{c.specFormat}</Section>}
        {c.aiPolicy && <Section title="AIGC 政策">{c.aiPolicy}</Section>}

        {c.entryFee && (c.entryFee.amount > 0 || c.entryFee.note) && (
          <Section title="报名费用">
            {c.entryFee.amount > 0 ? `¥${c.entryFee.amount}` : "免费"}
            {c.entryFee.note && `（${c.entryFee.note}）`}
          </Section>
        )}
      </div>

      {/* Layer 3: Full body */}
      {c.detailBody && (
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold mb-4">详细通知</h2>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
            {c.detailBody}
          </div>
        </div>
      )}

      {/* Official link */}
      {c.officialUrl && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <a
            href={c.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-gray-800"
          >
            查看官方通知 →
          </a>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">{title}</h3>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
}
```

---

## Phase 9: Polish & Verification

### Task 9.1: Add Tailwind base styles

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\src\app\globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Hide nav when opened from WeChat in-app browser */
/* WeChat adds a top bar, but we can't detect it server-side.
   The share page is lightweight by design - no heavy nav. */
```

### Task 9.2: Create .env.example

Write `C:\Users\Administrator\vibecoding\咸鱼美术组\.env.example`:

```
DATABASE_URL=postgresql://...
ADMIN_PASSWORD=change_me
JWT_SECRET=generate_a_random_string_at_least_32_characters
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Task 9.3: Build check

```bash
npm run build
```

Expected: no errors. Fix any type errors.

### Task 9.4: Start dev server and verify

```bash
npm run dev
```

Manual checks:
1. Open http://localhost:3000 → see empty competition list with "暂无赛事信息"
2. Go to http://localhost:3000/admin → see login form
3. Login with admin password
4. Click "手动添加" → fill form → save as draft → see it in draft box
5. Click "发布" → see it in published
6. Go to homepage → see the competition card
7. Click card → see detail page
8. Click "分享到微信群" → copies link

---

## Self-Review

### Spec coverage check
- [x] 数据库建表 + 项目脚手架 → Phase 1
- [x] 管理后台（登录 + 手动添加/编辑/发布/下架） → Phase 5
- [x] 公开首页（竞赛列表 + 筛选） → Phase 7
- [x] 竞赛详情页（含微信分享优化） → Phase 8
- [x] AI 搜罗功能（管理员手动触发） → Phase 4 + 6

### Placeholder scan
- [x] No TBD/TODO/implement later
- [x] All code is complete, every file has exact content

### Type consistency
- [x] Competition type defined in types/index.ts
- [x] Schema fields match types
- [x] API responses match ApiResponse<T> shape
- [x] Form data maps correctly to API body
