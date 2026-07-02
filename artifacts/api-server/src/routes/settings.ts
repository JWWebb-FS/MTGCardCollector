import { Router } from "express";
import { db } from "@workspace/db";
import { userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function getOrCreate() {
  const existing = await db.select().from(userSettingsTable).limit(1);
  if (existing.length) return existing[0];
  const created = await db.insert(userSettingsTable).values({}).returning();
  return created[0];
}

router.get("/settings", async (req, res) => {
  const settings = await getOrCreate();
  return res.json({
    id: settings.id,
    displayName: settings.displayName,
    avatarUrl: settings.avatarUrl ?? null,
    paypalEmail: settings.paypalEmail ?? null,
    updatedAt: settings.updatedAt.toISOString(),
  });
});

router.put("/settings", async (req, res) => {
  const { displayName, avatarUrl, paypalEmail } = req.body;
  const current = await getOrCreate();

  const { eq } = await import("drizzle-orm");
  const updated = await db
    .update(userSettingsTable)
    .set({
      ...(displayName !== undefined && { displayName }),
      ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
      ...(paypalEmail !== undefined && { paypalEmail: paypalEmail || null }),
      updatedAt: new Date(),
    })
    .where(eq(userSettingsTable.id, current.id))
    .returning();

  const row = updated[0] ?? current;
  return res.json({
    id: row.id,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl ?? null,
    paypalEmail: row.paypalEmail ?? null,
    updatedAt: row.updatedAt.toISOString(),
  });
});

export default router;
