import { pgTable, serial, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const wishlistTable = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  scryfallId: text("scryfall_id").notNull(),
  name: text("name").notNull(),
  setCode: text("set_code").notNull(),
  setName: text("set_name").notNull(),
  collectorNumber: text("collector_number").notNull(),
  typeLine: text("type_line").notNull(),
  manaCost: text("mana_cost"),
  colorIdentity: text("color_identity").array().notNull().default([]),
  imageUri: text("image_uri"),
  priceUsd: text("price_usd"),
  priceFoil: text("price_foil"),
  foil: boolean("foil").notNull().default(false),
  quantity: integer("quantity").notNull().default(1),
  maxPrice: numeric("max_price", { precision: 10, scale: 2 }),
  notes: text("notes"),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertWishlistSchema = createInsertSchema(wishlistTable).omit({ id: true, addedAt: true });

export type InsertWishlistItem = z.infer<typeof insertWishlistSchema>;
export type WishlistItem = typeof wishlistTable.$inferSelect;
