import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env.local") });

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
