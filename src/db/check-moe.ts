import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env.local") });

import { db } from "./index";
import { competitions } from "./schema";

async function go() {
  const all = await db.select().from(competitions);
  console.log(`Total: ${all.length} competitions\n`);
  for (const c of all) {
    console.log(`[${c.isMoeCompetition === "true" ? "MOE" : " - "}] ${c.title.slice(0, 50)}`);
  }
  process.exit(0);
}
go();
