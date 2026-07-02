import { Router } from "express";
import { db } from "@workspace/db";
import { decksTable, deckCardsTable, collectionCardsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

function mapDeck(deck: typeof decksTable.$inferSelect, cardCount = 0) {
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description ?? null,
    format: deck.format,
    colorIdentity: deck.colorIdentity,
    isActive: deck.isActive,
    cardCount,
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
  };
}

function mapDeckCard(card: typeof deckCardsTable.$inferSelect, inCollection = false) {
  return {
    id: card.id,
    deckId: card.deckId,
    scryfallId: card.scryfallId,
    name: card.name,
    quantity: card.quantity,
    isCommander: card.isCommander,
    isSideboard: card.isSideboard,
    inCollection,
    cmc: card.cmc ?? null,
    typeLine: card.typeLine ?? null,
    imageUri: card.imageUri ?? null,
    addedAt: card.addedAt.toISOString(),
  };
}

router.get("/decks", async (req, res) => {
  const decks = await db.select().from(decksTable).orderBy(decksTable.createdAt);

  const counts = await db
    .select({ deckId: deckCardsTable.deckId, total: sql<number>`sum(${deckCardsTable.quantity})` })
    .from(deckCardsTable)
    .groupBy(deckCardsTable.deckId);

  const countMap: Record<number, number> = {};
  for (const c of counts) countMap[c.deckId] = Number(c.total);

  return res.json(decks.map(d => mapDeck(d, countMap[d.id] ?? 0)));
});

router.post("/decks", async (req, res) => {
  const { name, description, format = "casual", colorIdentity = [] } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const [deck] = await db.insert(decksTable).values({ name, description, format, colorIdentity }).returning();
  return res.status(201).json(mapDeck(deck, 0));
});

router.get("/decks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [deck] = await db.select().from(decksTable).where(eq(decksTable.id, id)).limit(1);
  if (!deck) return res.status(404).json({ error: "Deck not found" });

  const cards = await db.select().from(deckCardsTable).where(eq(deckCardsTable.deckId, id));

  const collectionCards = await db.select({ scryfallId: collectionCardsTable.scryfallId })
    .from(collectionCardsTable);
  const inCollectionSet = new Set(collectionCards.map(c => c.scryfallId));

  const mappedCards = cards.map(c => mapDeckCard(c, inCollectionSet.has(c.scryfallId)));
  const missingCards = mappedCards.filter(c => !c.inCollection);

  const cardCount = cards.reduce((sum, c) => sum + c.quantity, 0);

  return res.json({
    ...mapDeck(deck, cardCount),
    cards: mappedCards,
    missingCards,
  });
});

router.put("/decks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, format, colorIdentity, isActive } = req.body;

  const [updated] = await db
    .update(decksTable)
    .set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(format !== undefined && { format }),
      ...(colorIdentity !== undefined && { colorIdentity }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date(),
    })
    .where(eq(decksTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Deck not found" });

  const [countRow] = await db
    .select({ total: sql<number>`sum(${deckCardsTable.quantity})` })
    .from(deckCardsTable)
    .where(eq(deckCardsTable.deckId, id));

  return res.json(mapDeck(updated, Number(countRow?.total ?? 0)));
});

router.delete("/decks/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(decksTable).where(eq(decksTable.id, id));
  return res.status(204).send();
});

async function fetchCardData(scryfallId: string) {
  try {
    const r = await fetch(`https://api.scryfall.com/cards/${scryfallId}`, {
      headers: { "User-Agent": "MTGCollectionManager/1.0" },
    });
    if (r.ok) {
      const sf = await r.json() as {
        cmc?: number;
        type_line?: string;
        image_uris?: { normal?: string };
        card_faces?: Array<{ image_uris?: { normal?: string } }>;
      };
      const imageUri = sf.image_uris?.normal ?? sf.card_faces?.[0]?.image_uris?.normal ?? null;
      return {
        cmc: sf.cmc != null ? Math.round(sf.cmc) : null,
        typeLine: sf.type_line ?? null,
        imageUri,
      };
    }
  } catch { /* ignore */ }
  return { cmc: null, typeLine: null, imageUri: null };
}

router.post("/decks/:id/cards", async (req, res) => {
  const deckId = Number(req.params.id);
  const { scryfallId, name, quantity = 1, isCommander = false, isSideboard = false } = req.body;
  if (!scryfallId || !name) return res.status(400).json({ error: "scryfallId and name are required" });

  const cardData = await fetchCardData(scryfallId);

  const [card] = await db
    .insert(deckCardsTable)
    .values({
      deckId,
      scryfallId,
      name,
      quantity,
      isCommander,
      isSideboard,
      cmc: cardData.cmc,
      typeLine: cardData.typeLine,
      imageUri: cardData.imageUri,
    })
    .returning();

  await db.update(decksTable).set({ updatedAt: new Date() }).where(eq(decksTable.id, deckId));

  const [inCollection] = await db
    .select()
    .from(collectionCardsTable)
    .where(eq(collectionCardsTable.scryfallId, scryfallId))
    .limit(1);

  return res.status(201).json(mapDeckCard(card, !!inCollection));
});

router.put("/decks/:id/cards/:cardId", async (req, res) => {
  const cardId = Number(req.params.cardId);
  const { quantity, isCommander, isSideboard } = req.body;

  const [updated] = await db
    .update(deckCardsTable)
    .set({
      ...(quantity !== undefined && { quantity }),
      ...(isCommander !== undefined && { isCommander }),
      ...(isSideboard !== undefined && { isSideboard }),
    })
    .where(eq(deckCardsTable.id, cardId))
    .returning();

  if (!updated) return res.status(404).json({ error: "Deck card not found" });

  const [inCollection] = await db
    .select()
    .from(collectionCardsTable)
    .where(eq(collectionCardsTable.scryfallId, updated.scryfallId))
    .limit(1);

  return res.json(mapDeckCard(updated, !!inCollection));
});

router.delete("/decks/:id/cards/:cardId", async (req, res) => {
  const cardId = Number(req.params.cardId);
  await db.delete(deckCardsTable).where(eq(deckCardsTable.id, cardId));
  return res.status(204).send();
});

router.post("/decks/:id/import", async (req, res) => {
  const deckId = Number(req.params.id);
  const { decklist, section = "mainboard" } = req.body as { decklist: string; section?: string };

  if (!decklist) return res.status(400).json({ error: "decklist is required" });

  const [deck] = await db.select().from(decksTable).where(eq(decksTable.id, deckId)).limit(1);
  if (!deck) return res.status(404).json({ error: "Deck not found" });

  const lines = decklist.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
  const imported: typeof deckCardsTable.$inferSelect[] = [];
  const errors: string[] = [];
  let failed = 0;

  const isCommander = section === "commander";
  const isSideboard = section === "sideboard";

  for (const line of lines) {
    // Support "4 Lightning Bolt", "4x Lightning Bolt", "1x Black Lotus"
    const match = line.match(/^(\d+)x?\s+(.+)$/i);
    if (!match) {
      errors.push(`Could not parse line: "${line}"`);
      failed++;
      continue;
    }

    const quantity = parseInt(match[1]);
    const cardName = match[2].trim();

    try {
      const r = await fetch(
        `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`,
        { headers: { "User-Agent": "MTGCollectionManager/1.0" } }
      );

      if (!r.ok) {
        errors.push(`Card not found: "${cardName}"`);
        failed++;
        continue;
      }

      const sf = await r.json() as {
        id: string;
        name: string;
        cmc?: number;
        type_line?: string;
        image_uris?: { normal?: string };
        card_faces?: Array<{ image_uris?: { normal?: string } }>;
      };

      const imageUri = sf.image_uris?.normal ?? sf.card_faces?.[0]?.image_uris?.normal ?? null;

      const [card] = await db
        .insert(deckCardsTable)
        .values({
          deckId,
          scryfallId: sf.id,
          name: sf.name,
          quantity,
          isCommander,
          isSideboard,
          cmc: sf.cmc != null ? Math.round(sf.cmc) : null,
          typeLine: sf.type_line ?? null,
          imageUri,
        })
        .returning();

      imported.push(card);
    } catch {
      errors.push(`Error importing: "${cardName}"`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 80));
  }

  await db.update(decksTable).set({ updatedAt: new Date() }).where(eq(decksTable.id, deckId));

  const collectionCards = await db.select({ scryfallId: collectionCardsTable.scryfallId }).from(collectionCardsTable);
  const inCollectionSet = new Set(collectionCards.map(c => c.scryfallId));

  return res.json({
    imported: imported.length,
    failed,
    errors,
    cards: imported.map(c => mapDeckCard(c, inCollectionSet.has(c.scryfallId))),
  });
});

export default router;
