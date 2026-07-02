import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const decksTable = pgTable("decks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  format: text("format").notNull().default("casual"),
  colorIdentity: text("color_identity").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const deckCardsTable = pgTable("deck_cards", {
  id: serial("id").primaryKey(),
  deckId: integer("deck_id").notNull().references(() => decksTable.id, { onDelete: "cascade" }),
  scryfallId: text("scryfall_id").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  isCommander: boolean("is_commander").notNull().default(false),
  isSideboard: boolean("is_sideboard").notNull().default(false),
  cmc: integer("cmc"),
  typeLine: text("type_line"),
  imageUri: text("image_uri"),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertDeckSchema = createInsertSchema(decksTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeckCardSchema = createInsertSchema(deckCardsTable).omit({ id: true, addedAt: true });

export type InsertDeck = z.infer<typeof insertDeckSchema>;
export type Deck = typeof decksTable.$inferSelect;
export type DeckCard = typeof deckCardsTable.$inferSelect;
