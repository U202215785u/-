import { pgTable, serial, text, timestamp, jsonb, integer, varchar } from "drizzle-orm/pg-core";

export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  organizer: varchar("organizer", { length: 256 }).default(""),
  level: varchar("level", { length: 32 }).default(""),
  overview: text("overview").default(""),
  posterUrl: text("poster_url").default(""),
  contestType: varchar("contest_type", { length: 32 }).default(""),
  tags: text("tags").array().default([]),
  submissionStartDate: varchar("submission_start_date", { length: 32 }).default(""),
  submissionDeadline: varchar("submission_deadline", { length: 32 }).default(""),
  officialUrl: text("official_url").default(""),
  status: varchar("status", { length: 16 }).notNull().default("draft"),
  source: varchar("source", { length: 16 }).notNull().default("manual"),

  deadlines: jsonb("deadlines").default([]),
  categories: jsonb("categories").default([]),
  eligibility: text("eligibility").default(""),
  entryFee: jsonb("entry_fee").default({ amount: 0, note: "" }),
  awards: text("awards").default(""),
  specFormat: text("spec_format").default(""),
  aiPolicy: text("ai_policy").default(""),
  isMoeCompetition: text("is_moe_competition").default("false"), // "true"|"false" — 教育部赛事（保研加分）
  dataVerified: text("data_verified").default("false"), // "true"|"false" — 数据是否已核实

  detailBody: text("detail_body").default(""),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
