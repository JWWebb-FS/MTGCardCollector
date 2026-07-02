import { Router } from "express";
import { db } from "@workspace/db";
import { collectionCardsTable } from "@workspace/db";

const router = Router();

interface CsvRow {
  name: string;
  quantity: number;
  foil: boolean;
  condition: string;
  setCode?: string;
  collectorNumber?: string;
}

function parseGenericCsv(csv: string): CsvRow[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/^"|"$/g, ""));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted fields
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });

    // Support Moxfield, Archidekt, and generic formats
    const nameField = row["name"] || row["card name"] || row["cardname"] || "";
    const qtyField = row["qty"] || row["quantity"] || row["count"] || "1";
    const foilField = row["foil"] || row["finish"] || "";
    const condField = row["condition"] || row["cond"] || "NM";
    const setField = row["set code"] || row["set"] || row["edition"] || "";
    const collectorField = row["collector number"] || row["number"] || row["#"] || "";

    if (!nameField) continue;

    rows.push({
      name: nameField,
      quantity: parseInt(qtyField) || 1,
      foil: foilField.toLowerCase().includes("foil"),
      condition: normalizeCondition(condField),
      setCode: setField.toLowerCase() || undefined,
      collectorNumber: collectorField || undefined,
    });
  }
  return rows;
}

function normalizeCondition(cond: string): string {
  const c = cond.toUpperCase().trim();
  if (c === "NM" || c === "NEAR MINT" || c === "MINT" || c === "M") return "NM";
  if (c === "LP" || c === "LIGHTLY PLAYED" || c === "SP" || c === "SLIGHTLY PLAYED") return "LP";
  if (c === "MP" || c === "MODERATELY PLAYED" || c === "PLAYED") return "MP";
  if (c === "HP" || c === "HEAVILY PLAYED") return "HP";
  if (c === "DMG" || c === "DAMAGED" || c === "D") return "DMG";
  return "NM";
}

router.post("/collection/import-csv", async (req, res) => {
  const { csvContent, format = "generic" } = req.body;
  if (!csvContent) return res.status(400).json({ error: "csvContent is required" });

  const rows = parseGenericCsv(csvContent);
  const errors: string[] = [];
  const importedCards: (typeof collectionCardsTable.$inferSelect)[] = [];
  let skipped = 0;

  for (const row of rows) {
    try {
      // Search Scryfall for the card
      let searchQuery = `!"${row.name}"`;
      if (row.setCode) searchQuery += ` set:${row.setCode}`;

      const searchUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchQuery)}&order=released&unique=prints`;
      const searchRes = await fetch(searchUrl, {
        headers: { "User-Agent": "MTGCollectionManager/1.0" },
      });

      if (!searchRes.ok) {
        // Try exact name without set
        const fallbackUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(row.name)}`;
        const fallbackRes = await fetch(fallbackUrl, {
          headers: { "User-Agent": "MTGCollectionManager/1.0" },
        });

        if (!fallbackRes.ok) {
          errors.push(`Card not found: "${row.name}"`);
          skipped++;
          continue;
        }

        const sf = await fallbackRes.json() as Record<string, unknown>;
        const card = await insertCard(sf, row);
        if (card) importedCards.push(card);
        else { errors.push(`Failed to insert: "${row.name}"`); skipped++; }
        await new Promise(r => setTimeout(r, 80));
        continue;
      }

      const searchData = await searchRes.json() as { data: Record<string, unknown>[] };
      let sf = searchData.data[0];

      // If collector number provided, try to match
      if (row.collectorNumber && searchData.data.length > 1) {
        const match = searchData.data.find(
          c => (c.collector_number as string) === row.collectorNumber
        );
        if (match) sf = match;
      }

      if (!sf) {
        errors.push(`Card not found: "${row.name}"`);
        skipped++;
        continue;
      }

      const card = await insertCard(sf, row);
      if (card) importedCards.push(card);
      else { errors.push(`Failed to insert: "${row.name}"`); skipped++; }

      await new Promise(r => setTimeout(r, 80));
    } catch (err) {
      errors.push(`Error processing "${row.name}": ${err instanceof Error ? err.message : "unknown"}`);
      skipped++;
    }
  }

  return res.json({
    imported: importedCards.length,
    skipped,
    errors,
    cards: importedCards.map(mapCard),
  });
});

async function insertCard(
  sf: Record<string, unknown>,
  row: CsvRow
): Promise<typeof collectionCardsTable.$inferSelect | null> {
  try {
    const imageUris = (sf.image_uris as Record<string, string> | undefined)
      ?? (sf.card_faces as Array<{ image_uris?: Record<string, string> }> | undefined)?.[0]?.image_uris;
    const prices = sf.prices as Record<string, string | null> | undefined;

    const [card] = await db
      .insert(collectionCardsTable)
      .values({
        scryfallId: sf.id as string,
        name: sf.name as string,
        setCode: sf.set as string,
        setName: sf.set_name as string,
        collectorNumber: sf.collector_number as string,
        quantity: row.quantity,
        foil: row.foil,
        condition: row.condition,
        colorIdentity: (sf.color_identity as string[]) ?? [],
        typeLine: sf.type_line as string,
        manaCost: (sf.mana_cost as string | undefined) ?? null,
        cmc: (sf.cmc as number | undefined)?.toString() ?? null,
        imageUri: imageUris?.normal ?? null,
        priceUsd: prices?.usd ?? null,
        priceFoil: prices?.usd_foil ?? null,
      })
      .returning();
    return card;
  } catch {
    return null;
  }
}

function mapCard(card: typeof collectionCardsTable.$inferSelect) {
  return {
    id: card.id,
    scryfallId: card.scryfallId,
    name: card.name,
    setCode: card.setCode,
    setName: card.setName,
    collectorNumber: card.collectorNumber,
    quantity: card.quantity,
    foil: card.foil,
    condition: card.condition,
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
