import { Router } from "express";
import {
  SearchScryfallCardsQueryParams,
  GetScryfallCardParams,
  GetCardPrintsParams,
} from "@workspace/api-zod";

const router = Router();
const SCRYFALL_BASE = "https://api.scryfall.com";

function mapCard(card: Record<string, unknown>) {
  const imageUris = card.image_uris as Record<string, string> | undefined;
  const cardFaces = card.card_faces as Array<{ image_uris?: Record<string, string> }> | undefined;
  const resolvedImageUris = imageUris ?? cardFaces?.[0]?.image_uris ?? null;
  const prices = card.prices as Record<string, string | null> | undefined;

  return {
    id: card.id,
    name: card.name,
    setCode: card.set,
    setName: card.set_name,
    collectorNumber: card.collector_number,
    typeLine: card.type_line,
    manaCost: card.mana_cost ?? null,
    cmc: card.cmc ?? 0,
    colorIdentity: card.color_identity ?? [],
    oracleText: card.oracle_text ?? null,
    legalities: card.legalities ?? null,
    imageUris: resolvedImageUris
      ? {
          small: resolvedImageUris.small ?? null,
          normal: resolvedImageUris.normal ?? null,
          large: resolvedImageUris.large ?? null,
          art_crop: resolvedImageUris.art_crop ?? null,
        }
      : null,
    prices: {
      usd: prices?.usd ?? null,
      usd_foil: prices?.usd_foil ?? null,
    },
    rarity: card.rarity,
    artist: card.artist ?? null,
    flavorText: card.flavor_text ?? null,
    printsSearchUri: card.prints_search_uri ?? null,
  };
}

router.get("/scryfall/search", async (req, res) => {
  const parseResult = SearchScryfallCardsQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error });
  }

  const { q, page = 1 } = parseResult.data;

  try {
    const url = `${SCRYFALL_BASE}/cards/search?q=${encodeURIComponent(q)}&page=${page}&order=name`;
    const response = await fetch(url, {
      headers: { "User-Agent": "MTGCollectionManager/1.0" },
    });

    if (response.status === 404) {
      return res.json({ totalCards: 0, hasMore: false, data: [] });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: "Scryfall API error" });
    }

    const data = await response.json() as {
      total_cards: number;
      has_more: boolean;
      next_page?: string;
      data: Record<string, unknown>[];
    };

    const nextPageNum = data.has_more ? (page ?? 1) + 1 : null;

    return res.json({
      totalCards: data.total_cards,
      hasMore: data.has_more,
      nextPage: nextPageNum,
      data: data.data.map(mapCard),
    });
  } catch {
    return res.status(500).json({ error: "Failed to reach Scryfall API" });
  }
});

router.get("/scryfall/cards/:scryfallId", async (req, res) => {
  const parseResult = GetScryfallCardParams.safeParse({ scryfallId: req.params.scryfallId });
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error });
  }

  try {
    const response = await fetch(
      `${SCRYFALL_BASE}/cards/${parseResult.data.scryfallId}`,
      { headers: { "User-Agent": "MTGCollectionManager/1.0" } }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: "Card not found" });
    }

    const card = await response.json() as Record<string, unknown>;
    return res.json(mapCard(card));
  } catch {
    return res.status(500).json({ error: "Failed to reach Scryfall API" });
  }
});

interface RawCard {
  oracle_text?: string;
  type_line?: string;
  keywords?: string[];
}

interface CounterCategoryDef {
  label: string;
  description: string;
  query: string;
}

function getCounterCategories(card: RawCard): CounterCategoryDef[] {
  const oracle = (card.oracle_text || "").toLowerCase();
  const types = (card.type_line || "").toLowerCase();
  const keywords = ((card.keywords || []) as string[]).map((k) => k.toLowerCase());
  const cats: CounterCategoryDef[] = [];

  if (keywords.includes("annihilator") || oracle.includes("annihilator")) {
    cats.push({
      label: "Anti-Annihilator",
      description: "Fog effects and counterspells to stop annihilator triggers",
      query: `(o:fog or o:"can't attack" or (o:counter t:instant o:creature))`,
    });
  }

  if ((types.includes("instant") || types.includes("sorcery")) && /deals? \d+ damage/.test(oracle)) {
    cats.push({
      label: "Burn Shield",
      description: "Prevent or redirect burn damage with protection and life gain",
      query: `(o:"prevent all damage" or o:"protection from red" or keyword:lifelink) (t:creature or t:enchantment or t:instant)`,
    });
  }

  if (oracle.includes("counter target spell") || oracle.includes("counter target instant") || oracle.includes("counter target sorcery")) {
    cats.push({
      label: "Uncounterable Spells",
      description: "Spells and permanents that can't be countered",
      query: `o:"can't be countered" (t:instant or t:sorcery or t:creature)`,
    });
  }

  if (keywords.includes("flying") && types.includes("creature")) {
    cats.push({
      label: "Reach & Anti-Air",
      description: "Block and neutralize flying threats",
      query: `keyword:reach t:creature`,
    });
  }

  const graveyardKws = ["flashback", "unearth", "escape", "dredge", "disturb", "aftermath", "retrace", "jump-start"];
  if (oracle.match(/from (your|a|the) graveyard/) || keywords.some((k) => graveyardKws.includes(k))) {
    cats.push({
      label: "Graveyard Hate",
      description: "Exile graveyards to shut down recursion strategies",
      query: `(o:exile o:graveyard) (t:instant or t:sorcery or t:enchantment or t:artifact)`,
    });
  }

  if (oracle.includes("create") && oracle.includes("token")) {
    cats.push({
      label: "Token Sweepers",
      description: "Mass removal to clear token swarms",
      query: `(o:"destroy all creatures" or o:"damage to each creature" or o:"exile all creatures")`,
    });
  }

  if (keywords.includes("indestructible") || oracle.includes("indestructible")) {
    cats.push({
      label: "Indestructible Answers",
      description: "Exile effects that bypass indestructible",
      query: `(o:"exile target creature" or o:"exile all") (t:instant or t:sorcery)`,
    });
  }

  if (keywords.includes("hexproof") || keywords.includes("shroud") || oracle.includes("hexproof") || oracle.includes("shroud")) {
    cats.push({
      label: "Edict & Mass Removal",
      description: "Sacrifice effects and board wipes bypass hexproof",
      query: `(o:"each opponent sacrifices" or o:"destroy all" or o:"sacrifice a creature") (t:instant or t:sorcery or t:enchantment)`,
    });
  }

  if (keywords.includes("trample")) {
    cats.push({
      label: "Deathtouch Blockers",
      description: "Deathtouch creatures kill and nullify trample damage",
      query: `keyword:deathtouch t:creature`,
    });
  }

  if (oracle.includes(" mill ") || (oracle.includes("put") && oracle.includes("into your graveyard") && oracle.includes("library"))) {
    cats.push({
      label: "Anti-Mill",
      description: "Protect your library from being milled out",
      query: `(o:"shuffle" o:"graveyard" o:"library") or o:"if you would lose the game"`,
    });
  }

  if (keywords.includes("lifelink") || (oracle.includes("you gain") && oracle.includes("life") && oracle.includes("loses"))) {
    cats.push({
      label: "Life Gain Hate",
      description: "Prevent opponents from gaining life",
      query: `o:"can't gain life" or o:"life your opponents would gain"`,
    });
  }

  if (types.includes("enchantment") && cats.length < 3) {
    cats.push({
      label: "Enchantment Removal",
      description: "Destroy or exile this enchantment",
      query: `(o:"destroy target enchantment" or o:"exile target enchantment") (t:instant or t:sorcery or t:creature)`,
    });
  }

  if (types.includes("artifact") && !types.includes("enchantment") && cats.length < 3) {
    cats.push({
      label: "Artifact Hate",
      description: "Destroy or exile artifacts",
      query: `(o:"destroy target artifact" or o:"exile target artifact") (t:instant or t:sorcery or t:creature)`,
    });
  }

  if (types.includes("creature") && cats.length === 0) {
    cats.push({
      label: "Creature Removal",
      description: "Destroy or exile this threat",
      query: `(o:"destroy target creature" or o:"exile target creature") (t:instant or t:sorcery)`,
    });
  }

  return cats.slice(0, 5);
}

router.get("/scryfall/cards/:scryfallId/counters", async (req, res) => {
  const { scryfallId } = req.params;

  try {
    const cardResp = await fetch(`${SCRYFALL_BASE}/cards/${scryfallId}`, {
      headers: { "User-Agent": "MTGCollectionManager/1.0" },
    });
    if (!cardResp.ok) return res.status(404).json({ error: "Card not found" });
    const rawCard = await cardResp.json() as RawCard & Record<string, unknown>;

    const categories = getCounterCategories(rawCard);

    const results = await Promise.all(
      categories.map(async (cat) => {
        try {
          const url = `${SCRYFALL_BASE}/cards/search?q=${encodeURIComponent(cat.query)}&unique=cards&order=edhrec&page=1`;
          const resp = await fetch(url, { headers: { "User-Agent": "MTGCollectionManager/1.0" } });
          if (!resp.ok) return { label: cat.label, description: cat.description, cards: [] };
          const data = await resp.json() as { data: Record<string, unknown>[] };
          const cards = data.data.slice(0, 8).map((c) => {
            const imageUris = c.image_uris as Record<string, string> | undefined;
            const cardFaces = c.card_faces as Array<{ image_uris?: Record<string, string> }> | undefined;
            const img = imageUris?.normal ?? cardFaces?.[0]?.image_uris?.normal ?? null;
            const prices = c.prices as Record<string, string | null> | undefined;
            return {
              id: c.id as string,
              name: c.name as string,
              typeLine: (c.type_line as string | undefined) ?? null,
              manaCost: (c.mana_cost as string | undefined) ?? null,
              oracleText: (c.oracle_text as string | undefined) ?? null,
              imageUri: img,
              priceUsd: prices?.usd ?? null,
            };
          });
          return { label: cat.label, description: cat.description, cards };
        } catch {
          return { label: cat.label, description: cat.description, cards: [] };
        }
      })
    );

    return res.json(results.filter((r) => r.cards.length > 0));
  } catch {
    return res.status(500).json({ error: "Failed to fetch counter cards" });
  }
});

router.get("/scryfall/cards/:scryfallId/prints", async (req, res) => {
  const parseResult = GetCardPrintsParams.safeParse({ scryfallId: req.params.scryfallId });
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error });
  }

  try {
    // First get the card to find its prints_search_uri
    const cardResponse = await fetch(
      `${SCRYFALL_BASE}/cards/${parseResult.data.scryfallId}`,
      { headers: { "User-Agent": "MTGCollectionManager/1.0" } }
    );

    if (!cardResponse.ok) {
      return res.status(404).json({ error: "Card not found" });
    }

    const card = await cardResponse.json() as { prints_search_uri?: string; name?: string };
    const printsUri = card.prints_search_uri;

    if (!printsUri) {
      return res.json([mapCard(card as Record<string, unknown>)]);
    }

    const printsResponse = await fetch(printsUri, {
      headers: { "User-Agent": "MTGCollectionManager/1.0" },
    });

    if (!printsResponse.ok) {
      return res.json([]);
    }

    const printsData = await printsResponse.json() as { data: Record<string, unknown>[] };
    return res.json(printsData.data.map(mapCard));
  } catch {
    return res.status(500).json({ error: "Failed to reach Scryfall API" });
  }
});

router.get("/scryfall/sets", async (req, res) => {
  try {
    const response = await fetch(`${SCRYFALL_BASE}/sets`, {
      headers: { "User-Agent": "MTGCollectionManager/1.0" },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch sets" });
    }

    const data = await response.json() as {
      data: Array<{
        code: string;
        name: string;
        released_at?: string;
        set_type: string;
        card_count: number;
        icon_svg_uri?: string;
      }>;
    };

    const sets = data.data.map((s) => ({
      code: s.code,
      name: s.name,
      releasedAt: s.released_at ?? null,
      setType: s.set_type,
      cardCount: s.card_count,
      iconSvgUri: s.icon_svg_uri ?? null,
    }));

    return res.json(sets);
  } catch {
    return res.status(500).json({ error: "Failed to reach Scryfall API" });
  }
});

router.get("/scryfall/sets/:setCode/cards", async (req, res) => {
  const { setCode } = req.params;
  const page = parseInt(req.query.page as string) || 1;

  try {
    const url = `${SCRYFALL_BASE}/cards/search?q=set:${encodeURIComponent(setCode)}&order=set&unique=prints&page=${page}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "MTGCollectionManager/1.0" },
    });

    if (!response.ok) {
      return res.json({ totalCards: 0, hasMore: false, data: [] });
    }

    const data = await response.json() as {
      total_cards: number;
      has_more: boolean;
      data: Record<string, unknown>[];
    };

    return res.json({
      totalCards: data.total_cards,
      hasMore: data.has_more,
      nextPage: data.has_more ? page + 1 : null,
      data: data.data.map(mapCard),
    });
  } catch {
    return res.status(500).json({ error: "Failed to reach Scryfall API" });
  }
});

export default router;
