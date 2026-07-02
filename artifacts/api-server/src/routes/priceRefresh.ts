import { Router } from "express";
import { db } from "@workspace/db";
import { collectionCardsTable, valueSnapshotsTable, cardPriceSnapshotsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/collection/refresh-prices", async (req, res) => {
  const cards = await db.select().from(collectionCardsTable);
  let updated = 0;
  let failed = 0;

  const uniqueIds = [...new Set(cards.map(c => c.scryfallId))];
  const priceMap: Record<string, { usd: string | null; usd_foil: string | null }> = {};

  for (const scryfallId of uniqueIds) {
    try {
      const r = await fetch(`https://api.scryfall.com/cards/${scryfallId}`, {
        headers: { "User-Agent": "MTGCollectionManager/1.0" },
      });
      if (r.ok) {
        const sf = await r.json() as { prices?: Record<string, string | null> };
        priceMap[scryfallId] = {
          usd: sf.prices?.usd ?? null,
          usd_foil: sf.prices?.usd_foil ?? null,
        };
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
    await new Promise(r => setTimeout(r, 50));
  }

  for (const card of cards) {
    const prices = priceMap[card.scryfallId];
    if (prices) {
      await db
        .update(collectionCardsTable)
        .set({ priceUsd: prices.usd, priceFoil: prices.usd_foil })
        .where(eq(collectionCardsTable.id, card.id));

      // Save per-card price snapshot
      await db.insert(cardPriceSnapshotsTable).values({
        collectionCardId: card.id,
        priceUsd: prices.usd ?? null,
        priceFoil: prices.usd_foil ?? null,
      });

      updated++;
    }
  }

  const updatedCards = await db.select().from(collectionCardsTable);
  let totalValue = 0;
  let foilValue = 0;
  let cardCount = 0;
  for (const card of updatedCards) {
    const price = parseFloat(card.foil ? (card.priceFoil ?? "0") : (card.priceUsd ?? "0")) || 0;
    const foilPrice = parseFloat(card.priceFoil ?? "0") || 0;
    totalValue += price * card.quantity;
    if (card.foil) foilValue += foilPrice * card.quantity;
    cardCount += card.quantity;
  }

  const roundedTotal = Math.round(totalValue * 100) / 100;
  const roundedFoil = Math.round(foilValue * 100) / 100;

  await db.insert(valueSnapshotsTable).values({
    totalValue: roundedTotal.toString(),
    foilValue: roundedFoil.toString(),
    cardCount,
  });

  return res.json({
    updated,
    failed,
    totalValue: roundedTotal,
  });
});

export default router;
