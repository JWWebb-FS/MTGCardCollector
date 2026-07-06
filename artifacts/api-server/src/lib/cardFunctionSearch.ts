interface FunctionSearchDefinition {
  readonly aliases: readonly string[];
  readonly query: string;
}

const FUNCTION_SEARCHES: readonly FunctionSearchDefinition[] = [
  {
    aliases: ["counterspell", "counterspells", "counter spell", "counter magic", "counter"],
    query: `(o:"counter target spell" or o:"counter target instant" or o:"counter target sorcery" or o:"counter target activated" or o:"counter target triggered")`,
  },
  {
    aliases: ["toxic", "poison", "poison counters", "infect"],
    query: `(keyword:toxic or keyword:infect or o:"poison counter")`,
  },
  {
    aliases: ["draw", "card draw", "draw cards"],
    query: `(o:"draw a card" or o:"draw two cards" or o:"draw three cards" or o:"draw cards")`,
  },
  {
    aliases: ["ramp", "mana ramp", "land ramp"],
    query: `((o:"search your library" o:"land card") or (o:"add" o:"mana") or o:"treasure token")`,
  },
  {
    aliases: ["removal", "kill spell", "destroy", "spot removal"],
    query: `((o:"destroy target" or o:"exile target") (t:instant or t:sorcery))`,
  },
  {
    aliases: ["board wipe", "boardwipe", "sweeper", "wrath"],
    query: `(o:"destroy all creatures" or o:"exile all creatures" or o:"damage to each creature" or o:"all creatures get")`,
  },
  {
    aliases: ["graveyard hate", "graveyard removal", "exile graveyard"],
    query: `(o:"exile" o:"graveyard")`,
  },
  {
    aliases: ["artifact removal", "artifact hate"],
    query: `(o:"destroy target artifact" or o:"exile target artifact" or o:"destroy target artifact or enchantment")`,
  },
  {
    aliases: ["enchantment removal", "enchantment hate"],
    query: `(o:"destroy target enchantment" or o:"exile target enchantment" or o:"destroy target artifact or enchantment")`,
  },
  {
    aliases: ["lifegain", "life gain", "gain life"],
    query: `(o:"you gain" o:"life")`,
  },
  {
    aliases: ["lifegain hate", "life gain hate"],
    query: `(o:"can't gain life" or o:"life your opponents would gain")`,
  },
  {
    aliases: ["tokens", "token maker", "token generation"],
    query: `(o:"create" o:"token")`,
  },
  {
    aliases: ["sacrifice", "edict", "sac outlet"],
    query: `(o:"sacrifice a creature" or o:"sacrifice another" or o:"each opponent sacrifices")`,
  },
  {
    aliases: ["protection", "hexproof", "shield"],
    query: `(keyword:hexproof or keyword:ward or o:"gains protection" or o:"indestructible until end of turn")`,
  },
  {
    aliases: ["tutor", "search library"],
    query: `(o:"search your library" -o:"basic land")`,
  },
  {
    aliases: ["recursion", "reanimate", "graveyard recursion"],
    query: `(o:"return target" o:"from your graveyard" or o:"return" o:"from your graveyard to the battlefield")`,
  },
  {
    aliases: ["mill", "self mill"],
    query: `(o:"mill" or (o:"put" o:"cards" o:"graveyard" o:"library"))`,
  },
];

const FUNCTION_SEARCH_BY_ALIAS = new Map(
  FUNCTION_SEARCHES.flatMap((definition) =>
    definition.aliases.map((alias) => [normalizeSearchText(alias), definition.query] as const),
  ),
);

const RAW_SCRYFALL_OPERATOR_PATTERN =
  /(?:^|\s)(?:a|artist|artistid|art|atag|banned|border|c|color|ci|commander|date|devotion|dir|e|edhrec|eur|f|flavor|format|frame|game|id|in|is|keyword|lang|loyalty|mana|mv|name|number|o|oracle|order|pow|power|prefer|produces|rarity|r|s|set|st|t|type|usd|wm|year):/i;

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

function extractSetTerms(query: string): { searchText: string; setTerms: string[] } {
  const setTerms: string[] = [];
  const searchText = query
    .replace(/(?:^|\s)(set|s|e):([^\s]+)/gi, (_match, prefix: string, code: string) => {
      setTerms.push(`${prefix}:${code}`);
      return " ";
    })
    .trim();

  return { searchText, setTerms };
}

function looksLikeRawScryfallQuery(query: string): boolean {
  return /[()<>!=]/.test(query) || RAW_SCRYFALL_OPERATOR_PATTERN.test(query);
}

function buildNameFallbackQuery(searchText: string): string {
  const escaped = searchText.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `name:"${escaped}"`;
}

export function buildScryfallSearchQuery(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  const { searchText, setTerms } = extractSetTerms(trimmed);
  const normalizedSearchText = normalizeSearchText(searchText);

  if (!normalizedSearchText) {
    return setTerms.join(" ");
  }

  if (looksLikeRawScryfallQuery(searchText)) {
    return [searchText, ...setTerms].filter(Boolean).join(" ");
  }

  const functionQuery = FUNCTION_SEARCH_BY_ALIAS.get(normalizedSearchText);
  const baseQuery = functionQuery ?? buildNameFallbackQuery(searchText);

  return [baseQuery, ...setTerms].filter(Boolean).join(" ");
}

export function getFunctionSearchAliases(): string[] {
  return Array.from(FUNCTION_SEARCH_BY_ALIAS.keys()).sort();
}
