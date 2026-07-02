import { pgTable, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { collectionCardsTable } from "./collectionCards";

export const cardPriceSnapshotsTable = pgTable("card_price_snapshots", {
  id: serial("id").primaryKey(),
  collectionCardId: integer("collection_card_id")
    .notNull()
    .references(() => collectionCardsTable.id, { onDelete: "cascade" }),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }),
  priceFoil: numeric("price_foil", { precision: 10, scale: 2 }),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
});

export type CardPriceSnapshot = typeof cardPriceSnapshotsTable.$inferSelect;
