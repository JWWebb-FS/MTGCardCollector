import { Router } from "express";
import { db } from "@workspace/db";
import { houseRulesTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import {
  ListHouseRulesQueryParams,
  CreateHouseRuleBody,
  GetHouseRuleParams,
  UpdateHouseRuleParams,
  UpdateHouseRuleBody,
  DeleteHouseRuleParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/house-rules", async (req, res) => {
  const parseResult = ListHouseRulesQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error });
  }

  const { category } = parseResult.data;

  let rules;
  if (category) {
    rules = await db
      .select()
      .from(houseRulesTable)
      .where(ilike(houseRulesTable.category, `%${category}%`));
  } else {
    rules = await db.select().from(houseRulesTable);
  }

  return res.json(rules.map(mapRule));
});

router.post("/house-rules", async (req, res) => {
  const parseResult = CreateHouseRuleBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error });
  }

  const body = parseResult.data;

  const newRule = await db
    .insert(houseRulesTable)
    .values({
      title: body.title,
      description: body.description,
      category: body.category,
      officialRule: body.officialRule ?? null,
      officialRuleSource: body.officialRuleSource ?? null,
      isActive: body.isActive ?? true,
    })
    .returning();

  return res.status(201).json(mapRule(newRule[0]));
});

router.get("/house-rules/:id", async (req, res) => {
  const parseResult = GetHouseRuleParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error });
  }

  const rule = await db
    .select()
    .from(houseRulesTable)
    .where(eq(houseRulesTable.id, parseResult.data.id))
    .limit(1);

  if (!rule.length) {
    return res.status(404).json({ error: "House rule not found" });
  }

  return res.json(mapRule(rule[0]));
});

router.put("/house-rules/:id", async (req, res) => {
  const paramsResult = UpdateHouseRuleParams.safeParse({ id: Number(req.params.id) });
  const bodyResult = UpdateHouseRuleBody.safeParse(req.body);

  if (!paramsResult.success || !bodyResult.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const body = bodyResult.data;
  const updated = await db
    .update(houseRulesTable)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.officialRule !== undefined && { officialRule: body.officialRule }),
      ...(body.officialRuleSource !== undefined && { officialRuleSource: body.officialRuleSource }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(houseRulesTable.id, paramsResult.data.id))
    .returning();

  if (!updated.length) {
    return res.status(404).json({ error: "House rule not found" });
  }

  return res.json(mapRule(updated[0]));
});

router.delete("/house-rules/:id", async (req, res) => {
  const parseResult = DeleteHouseRuleParams.safeParse({ id: Number(req.params.id) });
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error });
  }

  await db
    .delete(houseRulesTable)
    .where(eq(houseRulesTable.id, parseResult.data.id));

  return res.status(204).send();
});

function mapRule(rule: typeof houseRulesTable.$inferSelect) {
  return {
    id: rule.id,
    title: rule.title,
    description: rule.description,
    category: rule.category,
    officialRule: rule.officialRule ?? null,
    officialRuleSource: rule.officialRuleSource ?? null,
    isActive: rule.isActive,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export default router;
