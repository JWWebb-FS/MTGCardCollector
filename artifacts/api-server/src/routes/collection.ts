import { Router } from "express";
import { db } from "@workspace/db";
import { collectionCardsTable, valueSnapshotsTable, cardPriceSnapshotsTable } from "@workspace/db";
import { eq, ilike, asc, desc, sql, and, gte, lte } from "drizzle-orm";
import {
  ListCollectionCardsQueryParams,
  AddCardToCollectionBody,
  UpdateCollectionCardParams,
  UpdateCollectionCardBody,
  DeleteCollectionCardParams,
  GetCollectionCardParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/collection", async (req, res) => {
  const parseResult = ListCollectionCardsQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error });
  }
  const { sortBy, sortDir, filterColor, filterType, search, forTrade, minCmc, maxCmc } = parseResult.data;

  const conditions: ReturnType<typeof ilike>[] = [];

  if (search) {
    conditions.push(ilike(collectionCardsTable.name, `%${search}%`));
  }
  if (filterType) {
    conditions.push(ilike(collectionCardsTable.typeLine, `%${filterType}%`));
  }
  if (forTrade === true) {
    conditions.push(eq(collectionCardsTable.forTrade, true) as any);
  }
  if (minCmc !== undefined) {
    conditions.push(gte(collectionCardsTable.cmc as any, minCmc.toString()) as any);
  }
  if (maxCmc !== undefined) {
    conditions.push(lte(collectionCardsTable.cmc as any, maxCmc.toString()) as any);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderMap: Record<string, any> = {
    name: collectionCardsTable.name,
    set: collectionCardsTable.setName,
    cmc: collectionCardsTable.cmc,
    type: collectionCardsTable.typeLine,
    price: collectionCardsTable.priceUsd,
    quantity: collectionCardsTable.quantity,
    addedAt: collectionCardsTable.addedAt,
  };

  const orderCol = sortBy && orderMap[sortBy] ? orderMap[sortBy] : collectionCardsTable.name;
  const direction = sortDir === "desc" ? desc : asc;

  const cards = await db
    .select()
    .from(collectionCardsTable)
    .where(
      conditions.length > 0
        ? sql.join(conditions, sql` AND `)
        : undefined
    )
    .orderBy(direction(orderCol));

  if (filterColor) {
    const filtered = cards.filter((c) => c.colorIdentity.includes(filterColor));
    return res.json(filtered.map(mapCard));
  }

  return res.json(cards.map(mapCard));
});

router.get("/collection/value-history", async (req, res) => {
  const snapshots = await db
    .select()
    .from(valueSnapshotsTable)
    .orderBy(asc(valueSnapshotsTable.snapshotAt));
  return res.json(snapshots.map(s => ({
    id: s.id,
    totalValue: parseFloat(s.totalValue),
    foilValue: parseFloat(s.foilValue ?? "0"),
    cardCount: s.cardCount,
    snapshotAt: s.snapshotAt.toISOString(),
  })));
});

router.get("/collection/check-duplicate", async (req, res) => {
  const scryfallId = req.query.scryfallId as string;
  if (!scryfallId) return res.status(400).json({ error: "scryfallId is required" });

  const existing = await db
    .select()
    .from(collectionCardsTable)
    .where(eq(collectionCardsTable.scryfallId, scryfallId))
    .limit(1);

  if (existing.length) {
    return res.json({ exists: true, existingCard: mapCard(existing[0]) });
  }
  return res.json({ exists: false, existingCard: null });
});

router.post("/collection", async (req, res) => {
  const parseResult = AddCardToCollectionBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error });
  }

  const body = parseResult.data;

  let scryfallData: Record<string, unknown> = {};
  try {
    const response = await fetch(`https://api.scryfall.com/cards/${body.scryfallId}`);
    if (response.ok) {
      scryfallData = await response.json() as Record<string, unknown>;
    }
  } catch {
    // Continue without Scryfall data if unavailable
  }

  const sf = scryfallData as {
    name?: string;
    set?: string;
    set_name?: string;
    collector_number?: string;
    type_line?: string;
    mana_cost?: string;
    cmc?: number;
    color_identity?: string[];
    image_uris?: { normal?: string };
    prices?: { usd?: string; usd_foil?: string };
  };

  const newCard = await db
    .insert(collectionCardsTable)
    .values({
      scryfallId: body.scryfallId,
      name: sf.name ?? "Unknown",
      setCode: sf.set ?? "???",
      setName: sf.set_name ?? "Unknown Set",
      collectorNumber: sf.collector_number ?? "0",
      quantity: body.quantity ?? 1,
      foil: body.foil ?? false,
      condition: body.condition ?? "NM",
      colorIdentity: sf.color_identity ?? [],
      typeLine: sf.type_line ?? "",
      manaCost: sf.mana_cost ?? null,
      cmc: sf.cmc?.toString() ?? null,
      imageUri: sf.image_uris?.normal ?? null,
      priceUsd: sf.prices?.usd ?? null,
      priceFoil: sf.prices?.usd_foil ?? null,
      notes: body.notes ?? null,
      forTrade: false,
    })
    .returning();

  return res.status(201).json(mapCard(newCard[0]));
});

router.get("/collection/stats", async (req, res) => {
  const cards = await db.select().from(collectionCardsTable);

  const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0);
  const uniqueCards = cards.length;

  let totalValue = 0;
  let totalFoilValue = 0;
  for (const card of cards) {
    const price = parseFloat(card.priceUsd ?? "0") || 0;
    const foilPrice = parseFloat(card.priceFoil ?? "0") || 0;
    if (card.foil) {
      totalFoilValue += foilPrice * card.quantity;
      totalValue += foilPrice * card.quantity;
    } else {
      totalValue += price * card.quantity;
    }
  }

  const colorBreakdown: Record<string, number> = {};
  for (const card of cards) {
    const colors = card.colorIdentity.length === 0 ? ["C"] : card.colorIdentity;
    for (const color of colors) {
      colorBreakdown[color] = (colorBreakdown[color] ?? 0) + card.quantity;
    }
  }

  const setMap: Record<string, { setCode: string; setName: string; count: number }> = {};
  for (const card of cards) {
    if (!setMap[card.setCode]) {
      setMap[card.setCode] = { setCode: card.setCode, setName: card.setName, count: 0 };
    }
    setMap[card.setCode].count += card.quantity;
  }
  const setBreakdown = Object.values(setMap).sort((a, b) => b.count - a.count);

  const mostValuableCards = [...cards]
    .sort((a, b) => {
      const priceA = parseFloat(a.foil ? (a.priceFoil ?? "0") : (a.priceUsd ?? "0")) || 0;
      const priceB = parseFloat(b.foil ? (b.priceFoil ?? "0") : (b.priceUsd ?? "0")) || 0;
      return priceB - priceA;
    })
    .slice(0, 5)
    .map(mapCard);

  return res.json({
    totalCards,
    uniqueCards,
    totalValue: Math.round(totalValue * 100) / 100,
    totalFoilValue: Math.round(totalFoilValue * 100) / 100,
    colorBreakdown,
    setBreakdown,
    mostValuableCards,
  });
});

router.get("/collection/:id/price-history", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const snapshots = await db
    .select()
    .from(cardPriceSnapshotsTable)
    .where(eq(cardPriceSnapshotsTable.collectionCardId, id))
    .orderBy(asc(cardPriceSnapshotsTable.capturedAt));

  return res.json(snapshots.map(s => ({
    id: s.id,
    collectionCardId: s.collectionCardId,
    priceUsd: s.priceUsd ? parseFloat(s.priceUsd) : null,
    priceFoil: s.priceFoil ? parseFloat(s.priceFoil) : null,
    capturedAt: s.capturedAt.toISOString(),
  })));
});

router.get("/collection/:id", async (req, res) => {
  const parseResult = GetCollectionCardParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error });
  }

  const card = await db
    .select()
    .from(collectionCardsTable)
    .where(eq(collectionCardsTable.id, parseResult.data.id))
    .limit(1);

  if (!card.length) {
    return res.status(404).json({ error: "Card not found" });
  }

  return res.json(mapCard(card[0]));
});

router.put("/collection/:id", async (req, res) => {
  const paramsResult = UpdateCollectionCardParams.safeParse({ id: Number(req.params.id) });
  const bodyResult = UpdateCollectionCardBody.safeParse(req.body);

  if (!paramsResult.success || !bodyResult.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const updated = await db
    .update(collectionCardsTable)
    .set({
      ...(bodyResult.data.quantity !== undefined && { quantity: bodyResult.data.quantity }),
      ...(bodyResult.data.foil !== undefined && { foil: bodyResult.data.foil }),
      ...(bodyResult.data.condition !== undefined && { condition: bodyResult.data.condition }),
      ...(bodyResult.data.notes !== undefined && { notes: bodyResult.data.notes }),
      ...(bodyResult.data.storageLocation !== undefined && { storageLocation: bodyResult.data.storageLocation }),
      ...(bodyResult.data.forTrade !== undefined && { forTrade: bodyResult.data.forTrade }),
    })
    .where(eq(collectionCardsTable.id, paramsResult.data.id))
    .returning();

  if (!updated.length) {
    return res.status(404).json({ error: "Card not found" });
  }

  return res.json(mapCard(updated[0]));
});

router.delete("/collection/:id", async (req, res) => {
  const parseResult = DeleteCollectionCardParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error });
  }

  await db
    .delete(collectionCardsTable)
    .where(eq(collectionCardsTable.id, parseResult.data.id));

  return res.status(204).send();
});

function mapCard(card: typeof collectionCardsTable.$inferSelect) {
  return {
    id: card.id,
    scryfallId: card.scryfallId,
    name: card.name,
    setCode: card.setCode,
    setName: card.setName,
    collectorNumber: card.collectorNumber,
    version: card.version ?? undefined,
    quantity: card.quantity,
    foil: card.foil,
    condition: card.condition,
    forTrade: card.forTrade,
    storageLocation: card.storageLocation ?? null,
    colorIdentity: card.colorIdentity,
    typeLine: card.typeLine,
    manaCost: card.manaCost ?? undefined,
    cmc: card.cmc != null ? parseFloat(card.cmc) : undefined,
    imageUri: card.imageUri ?? undefined,
    priceUsd: card.priceUsd ?? null,
    priceFoil: card.priceFoil ?? null,
    notes: card.notes ?? null,
    addedAt: card.addedAt.toISOString(),
  };
}

export default router;
