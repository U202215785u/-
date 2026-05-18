import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env.local") });
import { db } from "./index";
import { competitions } from "./schema";
import { sql } from "drizzle-orm";

async function go() {
  await db.execute(sql`UPDATE competitions SET data_verified = 'true'`);
  const all = await db.select({ title: competitions.title, v: competitions.dataVerified }).from(competitions);
  for (const c of all) console.log((c.v === "true" ? "✓" : "?"), c.title.slice(0, 50));
  process.exit(0);
}
go();
