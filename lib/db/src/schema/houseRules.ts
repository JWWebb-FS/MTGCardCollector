import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const houseRulesTable = pgTable("house_rules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  officialRule: text("official_rule"),
  officialRuleSource: text("official_rule_source"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertHouseRuleSchema = createInsertSchema(houseRulesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHouseRule = z.infer<typeof insertHouseRuleSchema>;
export type HouseRule = typeof houseRulesTable.$inferSelect;
