import { pgTable, serial, numeric, integer, timestamp } from "drizzle-orm/pg-core";

export const valueSnapshotsTable = pgTable("value_snapshots", {
  id: serial("id").primaryKey(),
  totalValue: numeric("total_value", { precision: 12, scale: 2 }).notNull(),
  foilValue: numeric("foil_value", { precision: 12, scale: 2 }).notNull().default("0"),
  cardCount: integer("card_count").notNull().default(0),
  snapshotAt: timestamp("snapshot_at").notNull().defaultNow(),
});

export type ValueSnapshot = typeof valueSnapshotsTable.$inferSelect;
