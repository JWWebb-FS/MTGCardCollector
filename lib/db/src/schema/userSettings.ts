import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const userSettingsTable = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull().default("Collector"),
  avatarUrl: text("avatar_url"),
  paypalEmail: text("paypal_email"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserSettings = typeof userSettingsTable.$inferSelect;
