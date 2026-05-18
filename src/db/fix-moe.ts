import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env.local") });

import { db } from "./index";
import { competitions } from "./schema";
import { eq, sql } from "drizzle-orm";

async function go() {
  // 1. Delete duplicates: keep lowest ID per title
  await db.execute(sql`
    DELETE FROM competitions
    WHERE id NOT IN (SELECT MIN(id) FROM competitions GROUP BY title)
  `);

  // 2. Set MOE flag for ministry-certified competitions
  const moeTrue = [
    "NCDA", "大广赛", "3D大赛", "三维数字化",
    "米兰设计周", "中国好创意", "计算机设计大赛",
    "全国美展", "DIA", "中国设计智造大奖"
  ];

  for (const kw of moeTrue) {
    await db.execute(sql`
      UPDATE competitions
      SET is_moe_competition = 'true'
      WHERE title LIKE ${"%" + kw + "%"}
    `);
  }

  // 3. Set remaining to 'false'
  await db.execute(sql`
    UPDATE competitions
    SET is_moe_competition = 'false'
    WHERE is_moe_competition IS NULL OR is_moe_competition = ''
  `);

  // Verify
  const all = await db.select({ title: competitions.title, moe: competitions.isMoeCompetition }).from(competitions);
  console.log(`Total: ${all.length} competitions\n`);
  for (const c of all) {
    console.log(`[${c.moe === "true" ? "MOE" : " - "}] ${c.title.slice(0, 55)}`);
  }
  process.exit(0);
}

go();
