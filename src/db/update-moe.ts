import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env.local") });

import { db } from "./index";
import { competitions } from "./schema";
import { eq } from "drizzle-orm";

async function update() {
  // MOE-certified (教育部竞赛排行榜内 → 保研加分)
  const moeTrue = ["NCDA", "大广赛", "3D大赛", "米兰设计周", "中国好创意", "计算机设计大赛", "全国美展"];
  for (const kw of moeTrue) {
    await db.update(competitions).set({ isMoeCompetition: "true" }).where(eq(competitions.title, competitions.title)); // fallback, find by title pattern won't work easily with drizzle
  }

  // A simpler approach: update all known MOE competitions by ID
  const all = await db.select({ id: competitions.id, title: competitions.title }).from(competitions);

  for (const c of all) {
    const t = c.title;
    let isMoe = "false";

    if (t.includes("NCDA") || t.includes("大广赛") || t.includes("3D大赛") || t.includes("三维数字化") ||
        t.includes("米兰设计周") || t.includes("中国好创意") || t.includes("计算机设计大赛") || t.includes("全国美展")) {
      isMoe = "true";
    }

    // DIA is MOE-certified too (中国设计智造大奖)
    if (t.includes("DIA") || t.includes("中国设计智造大奖")) {
      isMoe = "true";
    }

    await db.update(competitions).set({ isMoeCompetition: isMoe }).where(eq(competitions.id, c.id));
    console.log(`${isMoe === "true" ? "✓" : " "} ${t.slice(0, 40)}...`);
  }

  console.log("\nMOE status updated");
  process.exit(0);
}

update();
