import { pgTable, serial, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const collectionCardsTable = pgTable("collection_cards", {
  id: serial("id").primaryKey(),
  scryfallId: text("scryfall_id").notNull(),
  name: text("name").notNull(),
  setCode: text("set_code").notNull(),
  setName: text("set_name").notNull(),
  collectorNumber: text("collector_number").notNull(),
  version: text("version"),
  quantity: integer("quantity").notNull().default(1),
  foil: boolean("foil").notNull().default(false),
  condition: text("condition").notNull().default("NM"),
  colorIdentity: text("color_identity").array().notNull().default([]),
  typeLine: text("type_line").notNull(),
  manaCost: text("mana_cost"),
  cmc: numeric("cmc", { precision: 4, scale: 1 }),
  imageUri: text("image_uri"),
  priceUsd: text("price_usd"),
  priceFoil: text("price_foil"),
  notes: text("notes"),
  storageLocation: text("storage_location"),
  forTrade: boolean("for_trade").notNull().default(false),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertCollectionCardSchema = createInsertSchema(collectionCardsTable).omit({
  id: true,
  addedAt: true,
});

export type InsertCollectionCard = z.infer<typeof insertCollectionCardSchema>;
export type CollectionCard = typeof collectionCardsTable.$inferSelect;
