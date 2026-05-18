import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env.local") });

import { db } from "./index";
import { competitions } from "./schema";
import { eq, sql } from "drizzle-orm";

async function fix() {
  // ── 1. KTK: 2026年征稿未公布，清空deadline ──
  await db.execute(sql`
    UPDATE competitions
    SET submission_deadline = '',
        overview = '全球华人设计最高奖之一，设专业组和学生组，21个参赛类别。2026年征稿尚未公布，预计8月启动。',
        detail_body = '## 赛事简介\n靳埭强设计奖（KTK设计奖）由国际著名设计大师靳埭强先生于1999年创办，是全球华人设计界最具影响力的奖项之一。\n\n## 最新动态\n2025年度（上一届）主题为「重构」+「潮」+ 自由主题，截稿2025年11月8日。\n\n## 2026年赛事\n2026年度征稿章程、主题及截止日期尚未公布。按照历年规律，通常8月中旬启动征稿，10月底至11月初截止。\n\n## 参赛费用\n学生组 ¥50/件，专业组 ¥150/件。\n\n## 官方渠道\n官网：ktkda.cn'
    WHERE title LIKE '%靳埭强%' OR title LIKE '%KTK%'
  `);

  // ── 2. GGAC: 第8届 → 第7届 ──
  await db.execute(sql`
    UPDATE competitions
    SET title = '第7届GGAC全球游戏美术概念大赛',
        overview = '全球最大游戏美术赛事，本届主题「人间烟火录」。创作奖面向全球创作者，学院奖面向在校学生。',
        submission_deadline = '2026-10-15',
        detail_body = '## 赛事简介\nGGAC（Global Game Art Concept）是全球最大的游戏美术概念大赛，第七届主题为「人间烟火录」。\n\n## 赛制\n- 创作奖（面向全部创作者）：角色概念、场景概念、角色模型、世界观IP\n- 学院奖（面向全日制在读/应届毕业生）：2D美术、3D模型、动画短片\n- 创意实验室：多个合作命题赛道\n\n## 时间\n- 开启：2026年5月2日\n- 截稿：2026年10月15日 12:00（UTC+8）\n\n## AI政策\n创作奖所有组别禁止AIGC；学院奖2D美术/3D模型组禁止AIGC。\n\n## 官网\nggac.com'
    WHERE title LIKE '%GGAC%'
  `);

  // ── 3. 白金创意: 第26届已截止(2026.1.31)，第27届未公布 ──
  await db.execute(sql`
    UPDATE competitions
    SET title = '第27届白金创意国际大学生平面设计大赛',
        submission_deadline = '',
        overview = '中国最具影响力的大学生平面设计竞赛之一。第27届征稿预计2026年10月启动，具体日期待公布。',
        deadlines = '[{"label":"预计征稿启动","date":"2026年10-11月"}]',
        detail_body = '## 赛事简介\n白金创意国际大学生平面设计大赛由中国美术学院主办，创办于2000年。\n\n## 最新动态\n第26届（2025-2026）已于2026年1月31日截稿，目前处于评审阶段。\n\n## 第27届预告\n预计2026年10月底至11月初启动征稿，具体章程待官方公布。\n\n## 竞赛单元（以第26届为参考）\n插图设计、海报设计、品牌形象设计、字体设计、信息设计、书籍设计、包装设计、数字媒体设计、综合项目设计\n\n## 参赛资格\n全球全日制院校设计专业在校生，应届毕业生可参赛。\n\n## 官网\nplatinumaward.org'
    WHERE title LIKE '%白金创意%'
  `);

  // ── 4. NCDA: 数据准确，补充院校报名信息 ──
  await db.execute(sql`
    UPDATE competitions
    SET deadlines = '[{"label":"院校报名","date":"2026-06-20"},{"label":"作品投稿","date":"2026-06-20"},{"label":"院校审核提交","date":"2026-06-25"},{"label":"省赛评审","date":"2026年7-8月"},{"label":"国赛评审","date":"2026年8月"}]'
    WHERE title LIKE '%NCDA%'
  `);

  // ── Print results ──
  const all = await db.select({
    title: competitions.title,
    deadline: competitions.submissionDeadline,
    moe: competitions.isMoeCompetition,
    overview: competitions.overview,
  }).from(competitions).orderBy(competitions.title);

  console.log("修正后数据:\n");
  for (const c of all) {
    const d = c.deadline || "待公布";
    console.log(`[${c.moe === "true" ? "MOE" : " - "}] ${c.title.slice(0, 50)}`);
    console.log(`       截止: ${d}`);
    console.log(`       简介: ${(c.overview || "").slice(0, 60)}`);
    console.log();
  }

  process.exit(0);
}

fix();
