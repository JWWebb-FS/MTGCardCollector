import { Router } from "express";
import { db } from "@workspace/db";
import { feedbackTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

const mapFeedback = (f: typeof feedbackTable.$inferSelect) => ({
  id: f.id,
  message: f.message,
  rating: f.rating ?? null,
  page: f.page ?? null,
  submittedAt: f.submittedAt.toISOString(),
});

router.get("/feedback", async (req, res) => {
  const items = await db
    .select()
    .from(feedbackTable)
    .orderBy(desc(feedbackTable.submittedAt));
  return res.json(items.map(mapFeedback));
});

router.post("/feedback", async (req, res) => {
  const { message, rating, page } = req.body;
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }
  const inserted = await db
    .insert(feedbackTable)
    .values({
      message: message.trim(),
      rating: rating ?? null,
      page: page ?? null,
    })
    .returning();
  return res.status(201).json(mapFeedback(inserted[0]));
});

export default router;
