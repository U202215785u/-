# AGENTS.md — 咸鱼美术组竞赛信息板

## 技术约束

- **Next.js 16** (App Router, Turbopack)。路由文件系统约定：`page.tsx`、`layout.tsx`、`route.ts`。客户端组件必须 `"use client"`。
- **TypeScript**，严格但不过度。共享类型在 `src/types/index.ts`。
- **Drizzle ORM** + Neon PostgreSQL。改 schema 后必须 `npx drizzle-kit push`。不要手动写 SQL。
- **Node.js 24**（`package.json#engines` 不锁但实际要求）。`fnm use 24` 切换。
- **Tailwind CSS v4** + 自定义设计系统。全局 CSS 在 `src/app/globals.css`。

## 样式规范

### CSS 不可侵犯原则

`src/app/globals.css` 中的 OpenDesign CSS 是设计稿直接导出，不修改其数值。组件只用 `className` 引用其中定义的选择器，不在组件文件中写 `style={{}}`（数据驱动的动态值除外——如 deadline 颜色、poster 背景色）。

### 可用的 CSS 类名（摘要，完整列表见 globals.css）

**布局**：`.site-nav`、`.container`、`.hero`、`.card-grid`、`.about`、`.site-footer`、`.footer-grid`

**卡片**：`.card`、`.card-poster`、`.card-poster-inner`、`.poster-geo`、`.card-level`、`.card-quickview`、`.card-body`、`.card-title`、`.card-organizer`、`.card-deadline`

**组件**：`.filter-bar`、`.pill`、`.sort-bar`、`.sort-btn`、`.result-count`

**详情页**：`.detail-page`、`.detail-article`、`.detail-poster`、`.detail-badges`、`.detail-badge`、`.detail-title`、`.detail-organizer`、`.detail-deadline`、`.detail-share`、`.detail-share-btn`、`.detail-section`、`.detail-section-title`、`.detail-section-body`、`.detail-cta`、`.detail-cta-btn`

**状态**：`.card-deadline.urgent`、`.card-deadline.over`、`.card-level.national`、`.card-level.provincial`

**响应式**：断点 `1023px` 和 `639px`（已在 globals.css 末尾定义）。

## 数据流

```
competitions 表
  ↓ Drizzle ORM
Admin API (src/app/api/admin/competitions/)
  ↓ JSON
Admin Dashboard (src/app/admin/page.tsx)
  ↓ 审核发布 (status: draft→published)
Public API (src/app/api/competitions/)
  ↓ JSON
Homepage (src/app/page.tsx) → CompetitionCard → 详情页
```

管理后台通过 `PUT /api/admin/competitions/:id` 修改 status（draft/published/archived）。公开 API 只返回 `status='published'` 的条目。

## AI 搜罗流程

`src/lib/ai-scout.ts`：
1. `searchWeb(keywords)` — 并行调用 Bing + DuckDuckGo HTML 搜索，解析摘要
2. `scoutCompetitions(keywords)` — 搜索结果喂给 DeepSeek (`deepseek-chat`)，`response_format: json_object`，temperature 0.3
3. System prompt 有硬约束：无来源的日期/URL 必须留空，禁止推测

## 竞赛生命周期

`src/app/page.tsx` 中的 `getPhase()` 函数从 `submissionStartDate` 和 `submissionDeadline` 推导状态。前端 filter bar 的 phase pills 直接对 `published` 列表做客户端筛选，不走 API。

## 文件修改注意事项

- **用 Edit 工具改文件后检查尾部是否有空字节**——Write/Edit 工具在挂载的 Windows 目录上可能产生损坏。如果 tsc 报 `TS1127: Invalid character` 或 `TS1005: '}' expected`，用 `head -N file.tsx > tmp && cp tmp file.tsx` 截断尾部修复。
- **管理后台 (`admin/page.tsx`) 由用户自行维护**，修改前先和用户确认。
- **`AiScoutModal.tsx` 和 `CompetitionForm.tsx`** 可能被用户改动过，修改前确认当前状态。
- **数据库迁移**：改 `src/db/schema.ts` 后提醒用户运行 `npx drizzle-kit push`。

## 环境

- 开发服务器：`npm run dev` → `http://localhost:3000`
- 数据库：Neon PostgreSQL，连接串在 `.env.local` 的 `DATABASE_URL`
- AI Key：`.env.local` 中的 `DEEPSEEK_API_KEY`
