import { Router } from "express";
import { db } from "@workspace/db";
import { wishlistTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function mapItem(item: typeof wishlistTable.$inferSelect) {
  return {
    id: item.id,
    scryfallId: item.scryfallId,
    name: item.name,
    setCode: item.setCode,
    setName: item.setName,
    collectorNumber: item.collectorNumber,
    typeLine: item.typeLine,
    manaCost: item.manaCost ?? null,
    colorIdentity: item.colorIdentity,
    imageUri: item.imageUri ?? null,
    priceUsd: item.priceUsd ?? null,
    priceFoil: item.priceFoil ?? null,
    foil: item.foil,
    quantity: item.quantity,
    maxPrice: item.maxPrice != null ? parseFloat(item.maxPrice) : null,
    notes: item.notes ?? null,
    addedAt: item.addedAt.toISOString(),
  };
}

router.get("/wishlist", async (req, res) => {
  const items = await db.select().from(wishlistTable).orderBy(wishlistTable.addedAt);
  return res.json(items.map(mapItem));
});

router.post("/wishlist", async (req, res) => {
  const { scryfallId, foil = false, quantity = 1, maxPrice, notes } = req.body;
  if (!scryfallId) return res.status(400).json({ error: "scryfallId is required" });

  // Fetch card data from Scryfall
  let sf: Record<string, unknown> = {};
  try {
    const r = await fetch(`https://api.scryfall.com/cards/${scryfallId}`, {
      headers: { "User-Agent": "MTGCollectionManager/1.0" },
    });
    if (r.ok) sf = await r.json() as Record<string, unknown>;
  } catch { /* continue */ }

  const imageUris = (sf.image_uris as Record<string, string> | undefined)
    ?? (sf.card_faces as Array<{ image_uris?: Record<string, string> }> | undefined)?.[0]?.image_uris;
  const prices = sf.prices as Record<string, string | null> | undefined;

  const [item] = await db
    .insert(wishlistTable)
    .values({
      scryfallId,
      name: (sf.name as string) ?? "Unknown",
      setCode: (sf.set as string) ?? "???",
      setName: (sf.set_name as string) ?? "Unknown Set",
      collectorNumber: (sf.collector_number as string) ?? "0",
      typeLine: (sf.type_line as string) ?? "",
      manaCost: (sf.mana_cost as string | undefined) ?? null,
      colorIdentity: (sf.color_identity as string[]) ?? [],
      imageUri: imageUris?.normal ?? null,
      priceUsd: prices?.usd ?? null,
      priceFoil: prices?.usd_foil ?? null,
      foil,
      quantity,
      maxPrice: maxPrice?.toString() ?? null,
      notes: notes ?? null,
    })
    .returning();

  return res.status(201).json(mapItem(item));
});

router.post("/wishlist/refresh-prices", async (req, res) => {
  const items = await db.select().from(wishlistTable);
  let updated = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const r = await fetch(`https://api.scryfall.com/cards/${item.scryfallId}`, {
        headers: { "User-Agent": "MTGCollectionManager/1.0" },
      });
      if (r.ok) {
        const sf = await r.json() as { prices?: Record<string, string | null> };
        await db
          .update(wishlistTable)
          .set({ priceUsd: sf.prices?.usd ?? null, priceFoil: sf.prices?.usd_foil ?? null })
          .where(eq(wishlistTable.id, item.id));
        updated++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
    await new Promise(r => setTimeout(r, 50));
  }

  return res.json({ updated, failed, totalValue: 0 });
});

router.put("/wishlist/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { foil, quantity, maxPrice, notes } = req.body;

  const [updated] = await db
    .update(wishlistTable)
    .set({
      ...(foil !== undefined && { foil }),
      ...(quantity !== undefined && { quantity }),
      ...(maxPrice !== undefined && { maxPrice: maxPrice?.toString() ?? null }),
      ...(notes !== undefined && { notes }),
    })
    .where(eq(wishlistTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Wishlist item not found" });
  return res.json(mapItem(updated));
});

router.delete("/wishlist/:id", async (req, res) => {
  await db.delete(wishlistTable).where(eq(wishlistTable.id, Number(req.params.id)));
  return res.status(204).send();
});

export default router;
