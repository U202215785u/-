# 咸鱼美术组 · 竞赛信息板

汇集国家级设计赛事信息，AI 实时搜罗整理，管理员审核发布。

## 技术栈

| 层 | 选型 |
|------|------|
| 框架 | Next.js 16 (App Router + Turbopack) |
| 语言 | TypeScript |
| 数据库 | PostgreSQL (Neon Serverless) |
| ORM | Drizzle ORM |
| 样式 | OpenDesign 设计系统 (CSS class 体系) |
| 字体 | Inter (系统字体栈) |
| AI | DeepSeek API + Bing/DuckDuckGo 实时搜索 |

## 快速开始

```bash
# 环境要求：Node.js 24、npm
npm install
cp .env.example .env.local
npx drizzle-kit push
npx tsx src/db/seed.ts
npm run dev                    # http://localhost:3000
```

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `DATABASE_URL` | Neon PostgreSQL 连接串 | 是 |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | AI 搜罗需要 |
| `DEEPSEEK_BASE_URL` | DeepSeek 接口地址 | 默认 api.deepseek.com |
| `NEXT_PUBLIC_BASE_URL` | 部署域名 | 生产需要 |

## 页面

| 路由 | 说明 |
|------|------|
| `/` | 首页：竞赛卡片流 + phase/level/field 筛选 + 排序 |
| `/c/[id]` | 竞赛详情页：海报、赛程、结构化信息 + 一键复制分享文本 |
| `/admin` | 管理后台：审核面板、批量操作、AI 搜罗、URL 智能抓取 |
| `/admin/edit/[id]` | 新建/编辑竞赛（侧栏表单） |

## 项目结构

```
src/
├── db/              schema.ts / index.ts / seed.ts
├── types/           index.ts (Competition, ApiResponse 等)
├── lib/             auth.ts / ai-scout.ts (搜索 + DeepSeek 提取)
├── app/
│   ├── globals.css      设计系统 CSS (OpenDesign 导出)
│   ├── page.tsx         首页
│   ├── layout.tsx       根布局
│   ├── c/[id]/          竞赛详情 + 分享
│   ├── admin/           管理后台
│   └── api/             公开 API + 管理 API + AI 搜罗
└── components/
    ├── CompetitionCard.tsx       竞赛卡片 (SVG 几何海报)
    ├── CompetitionFilters.tsx    筛选栏 (phase/level/field pills)
    ├── CompetitionForm.tsx       竞赛编辑表单
    ├── AdminCompetitionTable.tsx 管理列表
    ├── AiScoutModal.tsx          AI 搜罗弹窗
    ├── ConfirmDialog.tsx         确认对话框
    └── Toast.tsx                 消息提示
```

## 设计系统

样式采用 OpenDesign 生成的 CSS 类名体系，像素级对齐设计稿：

- 色彩：黑白主调 + 粉彩色块 (lilac/cream/lime/mint) + `#ff3d8b` 强调色
- 字体：Inter，层级靠 weight (320-700)
- 形状：所有按钮胶囊形 50px，卡片圆角 24px
- 深度：色块替代阴影
- 间距：区块间 96px，响应式断点 1023px / 639px
- 组件零 inline style（仅数据驱动的动态值除外）

## 竞赛生命周期筛选

系统从 `submissionStartDate` 和 `submissionDeadline` 自动推导竞赛状态：

| 状态 | 条件 | 筛选用 pill |
|------|------|------------|
| 即将开始 | startDate 存在且未到 | 即将开始 |
| 征稿中 | deadline 未过期 | 征稿中 |
| 已截止 | deadline 已过期 | 已截止 |
| 待定 | 两个日期都没有 | 不显示 |

## AI 搜罗

1. 管理员输入关键词
2. 系统调用 Bing/DuckDuckGo 实时搜索网页
3. 搜索结果喂给 DeepSeek 提取结构化竞赛数据
4. 硬约束：无来源的字段强制留空，禁止推测日期
5. 每条结果标注 confidence (high/medium/low) 和 sourceNote

## 分享

竞赛详情页点击"分享给朋友"将竞赛信息格式化文本复制到剪贴板：

```
竞赛名称
主办：XXX
级别：国家级
截止：2026年X月X日

查看详情：https://...
```
