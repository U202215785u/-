import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env.local") });

import { db } from "./index";
import { competitions } from "./schema";
import { eq, sql } from "drizzle-orm";

async function audit() {
  // ── 1. Remove duplicates by keyword (keep the more detailed version) ──
  const dupesToRemove = [
    "2026年全国大学生广告艺术大赛",           // keep 第18届...（大广赛）
    "2026年米兰设计周-中国高校设计学科师生优秀作品展", // keep 第10届...
    "靳埭强设计奖",                           // keep KTK设计奖...全称版
    "2026年中国大学生计算机设计大赛",           // keep 第19届...
  ];

  for (const title of dupesToRemove) {
    await db.delete(competitions).where(eq(competitions.title, title));
  }

  // ── 2. Fix MOE flags ──
  const moeKeywords = [
    "NCDA", "大广赛", "3D大赛", "三维数字化",
    "米兰设计周", "中国好创意", "计算机设计大赛",
    "全国美展", "DIA", "中国设计智造大奖"
  ];

  for (const kw of moeKeywords) {
    await db.execute(sql`
      UPDATE competitions SET is_moe_competition = 'true'
      WHERE title LIKE ${"%" + kw + "%"}
    `);
  }

  await db.execute(sql`
    UPDATE competitions SET is_moe_competition = 'false'
    WHERE is_moe_competition IS NULL OR is_moe_competition = '' OR is_moe_competition != 'true'
  `);

  // ── 3. Fix incorrect levels ──
  // DIA is 国家级
  await db.execute(sql`
    UPDATE competitions SET level = '国家级'
    WHERE title LIKE '%DIA%' OR title LIKE '%智造大奖%'
  `);
  // KTK is 行业
  await db.execute(sql`
    UPDATE competitions SET level = '行业'
    WHERE title LIKE '%靳埭强%' OR title LIKE '%KTK%'
  `);
  // 白金创意 is 行业
  await db.execute(sql`
    UPDATE competitions SET level = '行业'
    WHERE title LIKE '%白金创意%'
  `);
  // GGAC is 行业
  await db.execute(sql`
    UPDATE competitions SET level = '行业'
    WHERE title LIKE '%GGAC%'
  `);
  // GDC is 行业
  await db.execute(sql`
    UPDATE competitions SET level = '行业'
    WHERE title LIKE '%GDC%'
  `);

  // ── 4. Fix submissionDeadline format to YYYY-MM-DD ──
  // All dates should already be in YYYY-MM-DD format from seed, but let's verify
  const all = await db.select().from(competitions).orderBy(competitions.title);

  console.log(`Total: ${all.length} competitions\n`);
  for (const c of all) {
    const moe = c.isMoeCompetition === "true" ? "MOE" : " - ";
    const level = c.level || "??";
    const deadline = c.submissionDeadline || "无截止日期";
    console.log(`[${moe}] [${level}] ${c.title.slice(0, 48)}`);
    console.log(`       截止: ${deadline}  |  主办: ${(c.organizer || "未填").slice(0, 40)}`);
  }

  process.exit(0);
}

audit();
