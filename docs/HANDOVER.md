# 竞赛信息板 · 交接文档

> 写给下一个接手的 AI Agent 或开发者。读完这份文档，你就能无障碍继续开发。

## 项目快照

- **创建日期**：2026-05-18
- **当前状态**：第一期 100% 完成，编译零错误，可本地运行
- **部署状态**：本地开发服务器 `localhost:3000`，未上线
- **管理后台**：`/admin`，无密码直入，已移除登录认证

## 一句话理解这个项目

一个给大学美术社团用的竞赛信息聚合网站。管理员手动添加或 AI 搜罗赛事 → 审核发布 → 公开浏览 → 微信分享。

## 关键设计决策（不要推翻）

| 决策 | 理由 |
|------|------|
| 数据模型三层结构 | 设计赛事字段差异太大，不能硬套固定列。Layer1 固定字段 + Layer2 弹性 JSON + Layer3 富文本 |
| 草稿和发布共表 | 用 `status` 字段区分，不搞两张表。社团级数据量不需要 |
| API 契约先行 | 前后端共享 `src/types/index.ts`，Sttitch 设计稿替换前端时不碰 API |
| 管理后台无密码 | 用户要求取消。原 JWT 代码在 `src/lib/auth.ts` 保留但未引用 |
| DeepSeek 替代 OpenAI | 国内网络友好，SDK 兼容，只改了 baseURL 和 model |
| Figma 风格不要大改 | 已按 DESIGN.md 完整实施。Sttitch 来之前保持这个风格 |
| 无用户系统 | 明确冻结。不需要成员注册、登录、报名功能 |

## 数据模型速查

```
competitions 表
├── Layer 1 (固定，用于列表/搜索)
│   title, organizer, level, overview, posterUrl,
│   contestType, tags[], submissionDeadline, officialUrl,
│   status (draft|published|archived), source (manual|ai)
├── Layer 2 (弹性 JSON/文本)
│   deadlines[], categories[], eligibility, entryFee{},
│   awards, specFormat, aiPolicy
└── Layer 3 (自由文本)
    detailBody (Markdown)

admins 表
└── id, username, passwordHash
```

## API 路由清单

```
公开（无需认证）
  GET  /api/competitions        列表（?q=&level=&tag=&page=&pageSize=）
  GET  /api/competitions/[id]   详情（仅 published 状态返回）

管理（当前无认证）
  GET  /api/admin/competitions       全部列表（含草稿）
  POST /api/admin/competitions       新建
  PUT  /api/admin/competitions/[id]  更新
  POST /api/admin/ai-scout           触发 AI 搜罗
  POST /api/admin/login              登录（路由存在但未被前端调用）
```

## 页面状态覆盖

每个页面需要处理以下所有状态：

| 页面 | 状态 |
|------|------|
| `/` (首页) | 正常列表 / 加载中(骨架屏) / 空(引导文案) / 筛选后空 |
| `/c/[id]` (详情) | 正常 / 不存在(404) / 未发布(404) / 已截止(红色标记) |
| `/admin` (管理) | 正常 / 加载中 / 空草稿 / 空已发布 |
| `/admin/edit/[id]` | 新建(id=new) / 编辑(id=数字) / 保存中 / 错误 |

## 已知限制 & 技术债

| 项目 | 说明 |
|------|------|
| 数据库连接 | 懒加载 Proxy 模式，首次查询才建立连接 |
| 图片存储 | 目前只存 URL，不托管上传。Sttitch 可能引入图片上传 |
| AI 搜罗 | 依赖 LLM 训练数据中的竞赛知识，非实时爬虫。准确性有波动 |
| 搜索/筛选 | 标签过滤在内存中完成（非 DB 层），数据量小时够用 |
| 无分页 UI | API 支持分页参数，但前端一次性加载 50 条 |
| 管理后台样式 | 纯白功能风，没有应用 Figma 设计系统（故意的） |
| 无暗黑模式 | Figma 营销站目前也没有 |

## 常用操作指南

### 给当前项目添加功能

```bash
# 1. 确认当前状态
npm run build    # 确保编译通过

# 2. 修改代码
# 数据模型改 src/db/schema.ts
# API 改 src/app/api/
# 页面改 src/app/
# 组件改 src/components/

# 3. 数据库迁移（如果改了 schema）
npx drizzle-kit push

# 4. 验证
npm run build
npm run dev    # 手动点一遍所有页面
```

### 给下一个人接手

1. 读 `README.md` 了解概览
2. 读这份 `HANDOVER.md` 了解细节
3. 读 `docs/2026-05-18-competition-board-design.md` 了解原始设计
4. 跑 `npm run dev` 手动浏览所有页面建立直观感受
5. 跑 `npm run build` 确认环境正常

### 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod

# 设置环境变量（在 Vercel Dashboard 或 CLI）
# DATABASE_URL, DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, NEXT_PUBLIC_BASE_URL
```

### 切换到国内服务器

正式上线时用国内服务器（阿里云/腾讯云），需要：
1. 数据库迁移到国内 PostgreSQL
2. 域名备案
3. `NEXT_PUBLIC_BASE_URL` 改为正式域名
4. 考虑恢复管理密码（编辑 `.env.local` + 取消 API 路由中的注释）

## 冻结功能（不要实现）

以下功能经过讨论后明确不做。如果有人提需求，请引用此文档：

- 成员注册/登录/报名/组队 → 复杂度翻 5 倍，偏离核心价值
- 浏览统计面板 → 无实际决策意义
- 评论/留言 → 无人维护成垃圾区
- 点赞/收藏 → 功能蔓延

## 文件索引

```
咸鱼美术组/
├── README.md                              # 项目说明
├── docs/
│   ├── HANDOVER.md                        # ← 你正在读的文件
│   ├── 2026-05-18-competition-board-design.md  # 设计方案
│   └── superpowers/plans/
│       └── 2026-05-18-competition-board-plan.md # 实施计划
├── .env.local                             # 环境变量（不提交 git）
├── .env.example                           # 环境变量模板
├── drizzle.config.ts                      # Drizzle 配置
├── next.config.ts                         # Next.js 配置
├── tailwind.config.ts                     # Tailwind 配置
└── src/                                   # 源代码（见 README 项目结构）
```
