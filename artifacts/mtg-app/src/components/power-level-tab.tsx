import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, BookOpen, Sword, Trophy, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const RAMP_NAMES = new Set([
  "Sol Ring", "Arcane Signet", "Cultivate", "Kodama's Reach", "Nature's Lore",
  "Three Visits", "Rampant Growth", "Farseek", "Skyshroud Claim", "Mana Crypt",
  "Mana Vault", "Chrome Mox", "Mox Diamond", "Birds of Paradise", "Llanowar Elves",
  "Elvish Mystic", "Fyndhorn Elves", "Avacyn's Pilgrim", "Arbor Elf", "Boreal Druid",
  "Selvala, Heart of the Wilds", "Dockside Extortionist", "Bloom Tender",
  "Solemn Simulacrum", "Burnished Hart", "Worn Powerstone", "Thought Vessel",
  "Mind Stone", "Hedron Archive", "Darksteel Ingot", "Coalition Relic",
  "Chromatic Lantern", "Commander's Sphere", "Fellwar Stone", "Explosive Vegetation",
  "Migration Path", "Harrow", "Sakura-Tribe Elder", "Wood Elves", "Farhaven Elf",
  "Sword of the Animist", "Land Tax", "Weathered Wayfarer", "Thran Dynamo",
  "Gilded Lotus", "Everflowing Chalice", "Palladium Myr", "Springleaf Drum",
  "Grim Monolith", "Ancient Tomb", "Smothering Tithe", "Orcish Lumberjack",
  "Selvala, Explorer Returned", "Frontier Guide", "Nissa's Pilgrimage", "Boundless Realms",
]);

const RAMP_PATTERNS = ["Signet", "Talisman of", "Cluestone", "Locket", "Banner", "Obelisk of"];

const DRAW_NAMES = new Set([
  "Rhystic Study", "Mystic Remora", "Phyrexian Arena", "Dark Confidant", "Skullclamp",
  "Necropotence", "Sylvan Library", "Guardian Project", "The Great Henge",
  "Edric, Spymaster of Trest", "Tymna the Weaver", "Archivist of Oghma",
  "Esper Sentinel", "Windfall", "Wheel of Fortune", "Timetwister",
  "Treasure Cruise", "Dig Through Time", "Brainstorm", "Ponder", "Preordain",
  "Night's Whisper", "Sign in Blood", "Read the Bones", "Pull from Tomorrow",
  "Blue Sun's Zenith", "Fact or Fiction", "Stroke of Genius", "Distant Melody",
  "Shamanic Revelation", "Elemental Bond", "Teferi's Ageless Insight",
  "Alms Collector", "Ohran Frostfang", "Zendikar Resurgent", "Greed",
  "Ambition's Cost", "Ancient Craving", "Painful Truths", "Consecrated Sphinx",
  "Notion Thief", "Reconnaissance Mission", "Bident of Thassa", "Coastal Piracy",
  "Rishkar's Expertise", "Soul's Majesty", "Momentous Fall", "Greater Good",
  "Selvala, Heart of the Wilds", "Beast Whisperer", "Primordial Sage",
  "Kindred Discovery", "Zenith Flare", "Phyrexian Reclamation",
]);

const INTERACTION_NAMES = new Set([
  "Counterspell", "Force of Will", "Mana Drain", "Fierce Guardianship", "Swan Song",
  "Flusterstorm", "Mental Misstep", "Arcane Denial", "Dovin's Veto", "Negate",
  "Delay", "Mana Leak", "Cyclonic Rift", "Swords to Plowshares", "Path to Exile",
  "Generous Gift", "Beast Within", "Nature's Claim", "Krosan Grip",
  "Assassin's Trophy", "Abrupt Decay", "Vindicate", "Chaos Warp",
  "Rapid Hybridization", "Reality Shift", "Vanishing Verse", "Despark",
  "Anguished Unmaking", "Utter End", "Wrath of God", "Damnation",
  "Supreme Verdict", "Toxic Deluge", "Blasphemous Act", "Chain Reaction",
  "Farewell", "Winds of Abandon", "Austere Command", "Merciless Eviction",
  "Lightning Bolt", "Electrolyze", "Mortify", "Doom Blade", "Go for the Throat",
  "Terminate", "Dismember", "Pongify", "Force of Negation", "Spell Pierce",
  "Remand", "Unwind", "Deprive", "Oblivion Ring", "Detention Sphere",
  "Grasp of Fate", "Song of the Dryads", "Imprisoned in the Moon",
  "Darksteel Mutation", "Oust", "Condemn", "Into the Roil", "Blink of an Eye",
  "Pongify", "Putrefy", "Anguished Unmaking", "Sultai Charm",
]);

const WIN_CON_NAMES = new Set([
  "Thassa's Oracle", "Laboratory Maniac", "Jace, Wielder of Mysteries",
  "Isochron Scepter", "Dramatic Reversal", "Underworld Breach",
  "Ad Nauseam", "Angel's Grace", "Doomsday", "Aetherflux Reservoir",
  "Walking Ballista", "Heliod, Sun-Crowned", "Triskelion", "Mikaeus, the Unhallowed",
  "Exquisite Blood", "Sanguine Bond", "Kiki-Jiki, Mirror Breaker",
  "Deceiver Exarch", "Pestermite", "Devoted Druid", "Vizier of Remedies",
  "Tooth and Nail", "Craterhoof Behemoth", "Triumph of the Hordes",
  "Expropriate", "Omniscience", "Enter the Infinite", "Grapeshot",
  "Empty the Warrens", "Purphoros, God of the Forge", "Impact Tremors",
  "Goblin Bombardment", "Altar of Dementia", "Ashnod's Altar",
  "Phyrexian Altar", "Grave Pact", "Dictate of Erebos", "Blood Artist",
  "Zulaport Cutthroat", "Torment of Hailfire", "Exsanguinate",
  "Elesh Norn, Grand Cenobite", "Blightsteel Colossus", "Avenger of Zendikar",
  "Finale of Devastation", "Pathbreaker Ibex", "Beastmaster Ascension",
  "Revel in Riches", "Mechanized Production", "Happily Ever After",
]);

const RAMP_UPGRADES = [
  { name: "Sol Ring", reason: "The best mana rock in Commander" },
  { name: "Arcane Signet", reason: "2-mana color-fixing rock" },
  { name: "Cultivate", reason: "Ramps and thins your deck" },
  { name: "Nature's Lore", reason: "2-mana Forest fetch, enters untapped" },
  { name: "Thought Vessel", reason: "Ramp + no maximum hand size" },
  { name: "Smothering Tithe", reason: "Explosive ramp against heavy draw decks" },
];

const DRAW_UPGRADES = [
  { name: "Rhystic Study", reason: "Opponents pay 1 each spell or you draw" },
  { name: "Mystic Remora", reason: "Explosive early draw engine" },
  { name: "Skullclamp", reason: "Converts small creatures into 2 cards" },
  { name: "Phyrexian Arena", reason: "Reliable 1 draw per turn" },
  { name: "Esper Sentinel", reason: "White Rhystic Study on a body" },
  { name: "Windfall", reason: "Mass hand refill for the whole table" },
];

const INTERACTION_UPGRADES = [
  { name: "Swords to Plowshares", reason: "Best removal spell in the format" },
  { name: "Counterspell", reason: "Hard 2-mana counter, always relevant" },
  { name: "Cyclonic Rift", reason: "Overloaded = best blue reset in the format" },
  { name: "Beast Within", reason: "Green's unconditional answer to any permanent" },
  { name: "Swan Song", reason: "1-mana counter for the most important spell types" },
  { name: "Toxic Deluge", reason: "Scales to kill indestructible and large creatures" },
];

const WIN_CON_UPGRADES = [
  { name: "Craterhoof Behemoth", reason: "One-shot combat win with any board presence" },
  { name: "Aetherflux Reservoir", reason: "Lifegain or storm-based drain win" },
  { name: "Thassa's Oracle", reason: "Instant win with empty library" },
  { name: "Torment of Hailfire", reason: "Mana-sink that scales to game-ending" },
  { name: "Triumph of the Hordes", reason: "Infect grants lethal with any token board" },
];

interface DeckCard {
  name: string;
  cmc?: number | null;
  typeLine?: string | null;
  isSideboard: boolean;
  isCommander: boolean;
  quantity: number;
}

function isRamp(name: string, typeLine: string | null | undefined, cmc: number | null | undefined): boolean {
  if (RAMP_NAMES.has(name)) return true;
  if (RAMP_PATTERNS.some((p) => name.includes(p))) return true;
  const tl = (typeLine ?? "").toLowerCase();
  if (tl.includes("artifact") && !tl.includes("creature") && (cmc === 2 || cmc === 3)) return true;
  return false;
}

interface Analysis {
  rampCount: number;
  drawCount: number;
  interactionCount: number;
  winConCount: number;
  landCount: number;
  avgCmc: number | null;
  mainCount: number;
  rampScore: number;
  drawScore: number;
  interactionScore: number;
  winConScore: number;
  manaBaseScore: number;
  totalScore: number;
  tier: string;
  tierColor: string;
  gradientClass: string;
}

function analyzeDeck(cards: DeckCard[]): Analysis {
  const mainCards = cards.filter((c) => !c.isSideboard);
  let ramp = 0, draw = 0, interaction = 0, wincon = 0, lands = 0, totalCmc = 0, nonLand = 0, mainCount = 0;

  for (const card of mainCards) {
    const qty = card.quantity;
    mainCount += qty;
    const tl = (card.typeLine || "").toLowerCase();

    if (tl.includes("land")) {
      lands += qty;
    } else {
      if (card.cmc != null) { totalCmc += card.cmc * qty; nonLand += qty; }
      if (!card.isCommander) {
        if (isRamp(card.name, card.typeLine, card.cmc)) ramp += qty;
        if (DRAW_NAMES.has(card.name)) draw += qty;
        if (INTERACTION_NAMES.has(card.name)) interaction += qty;
        if (WIN_CON_NAMES.has(card.name)) wincon += qty;
      }
    }
  }

  const avgCmc = nonLand > 0 ? totalCmc / nonLand : null;

  const rampScore    = Math.min(ramp / 10, 1) * 10;
  const drawScore    = Math.min(draw / 8, 1) * 10;
  const interactionScore = Math.min(interaction / 10, 1) * 10;
  const winConScore  = Math.min(wincon / 3, 1) * 10;
  const landDiff     = Math.abs(lands - 37);
  const landScore    = Math.max(0, 10 - landDiff * 1.5);
  const curveScore   = avgCmc != null ? Math.max(0, 10 - Math.max(0, (avgCmc - 2.5) * 2.5)) : 5;
  const manaBaseScore = (landScore + curveScore) / 2;

  const raw = (rampScore * 2 + drawScore * 2 + interactionScore * 2 + winConScore * 2 + manaBaseScore) / 9;
  const totalScore = Math.max(1, Math.min(10, parseFloat(raw.toFixed(1))));

  let tier = "Casual", tierColor = "text-blue-400", gradientClass = "from-blue-400 to-emerald-500";
  if (totalScore >= 9)        { tier = "cEDH";           tierColor = "text-red-500";    gradientClass = "from-orange-500 to-red-500"; }
  else if (totalScore >= 7.5) { tier = "Optimized";      tierColor = "text-orange-500"; gradientClass = "from-amber-500 to-orange-500"; }
  else if (totalScore >= 6)   { tier = "High Power";     tierColor = "text-amber-500";  gradientClass = "from-yellow-500 to-amber-500"; }
  else if (totalScore >= 4.5) { tier = "Focused";        tierColor = "text-yellow-500"; gradientClass = "from-emerald-500 to-yellow-500"; }
  else if (totalScore >= 3)   { tier = "Upgraded Precon"; tierColor = "text-emerald-500"; gradientClass = "from-blue-400 to-emerald-500"; }

  return { rampCount: ramp, drawCount: draw, interactionCount: interaction, winConCount: wincon, landCount: lands, avgCmc, mainCount, rampScore, drawScore, interactionScore, winConScore, manaBaseScore, totalScore, tier, tierColor, gradientClass };
}

function ScoreBar({ label, score, icon: Icon, current, ideal }: { label: string; score: number; icon: React.ElementType; current: number; ideal: number }) {
  const color = score >= 8 ? "bg-emerald-500" : score >= 5 ? "bg-amber-500" : "bg-destructive";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon className="h-3.5 w-3.5 text-primary" /> {label}
        </span>
        <span className="text-xs text-muted-foreground">{current} detected · ideal ≥{ideal}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${score * 10}%` }} />
      </div>
    </div>
  );
}

function UpgradeSection({ title, icon: Icon, cards }: { title: string; icon: React.ElementType; cards: { name: string; reason: string }[] }) {
  return (
    <Card className="bg-card border-card-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-1">
        {cards.map((card) => (
          <a
            key={card.name}
            href={`https://scryfall.com/search?q=!%22${encodeURIComponent(card.name)}%22`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium group-hover:text-primary transition-colors">{card.name}</p>
              <p className="text-xs text-muted-foreground">{card.reason}</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

export function PowerLevelTab({ cards, format }: { cards: DeckCard[]; format: string }) {
  const a = useMemo(() => analyzeDeck(cards), [cards]);
  const deckNames = useMemo(() => new Set(cards.map((c) => c.name)), [cards]);

  const isCommander = format.toLowerCase() === "commander";

  if (!isCommander) {
    return (
      <Card className="bg-card border-card-border">
        <CardContent className="py-16 text-center text-muted-foreground space-y-2">
          <Trophy className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <p className="font-medium">Power level analysis is for Commander decks.</p>
          <p className="text-sm">Change the deck format to Commander to use this feature.</p>
        </CardContent>
      </Card>
    );
  }

  if (!cards.length) {
    return (
      <Card className="bg-card border-card-border">
        <CardContent className="py-16 text-center text-muted-foreground">
          Add cards to your deck to see a power level analysis.
        </CardContent>
      </Card>
    );
  }

  const badgeClass = cn("border font-semibold",
    a.totalScore >= 9   ? "bg-red-500/10 text-red-500 border-red-500/20"     :
    a.totalScore >= 7.5 ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
    a.totalScore >= 6   ? "bg-amber-500/10 text-amber-500 border-amber-500/20"   :
    a.totalScore >= 4.5 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
    a.totalScore >= 3   ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          "bg-blue-400/10 text-blue-400 border-blue-400/20"
  );

  const needsRamp = a.rampScore < 6;
  const needsDraw = a.drawScore < 6;
  const needsInteraction = a.interactionScore < 6;
  const needsWinCon = a.winConScore < 6;
  const hasUpgrades = needsRamp || needsDraw || needsInteraction || needsWinCon;

  const rampUpgrades = RAMP_UPGRADES.filter((c) => !deckNames.has(c.name)).slice(0, 4);
  const drawUpgrades = DRAW_UPGRADES.filter((c) => !deckNames.has(c.name)).slice(0, 4);
  const interactionUpgrades = INTERACTION_UPGRADES.filter((c) => !deckNames.has(c.name)).slice(0, 4);
  const winConUpgrades = WIN_CON_UPGRADES.filter((c) => !deckNames.has(c.name)).slice(0, 4);

  return (
    <div className="space-y-5 pb-4">
      {/* Score gauge */}
      <Card className="bg-card border-card-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-full border-4 border-card-border bg-muted flex flex-col items-center justify-center shrink-0">
              <span className={cn("text-2xl font-serif font-bold leading-none", a.tierColor)}>{a.totalScore.toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">/ 10</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-lg font-serif font-bold">Power Level</h3>
                <Badge className={badgeClass}>{a.tier}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {a.mainCount} cards · {a.landCount} lands · avg CMC {a.avgCmc?.toFixed(2) ?? "—"}
              </p>
              <div className="mt-3 h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700 bg-gradient-to-r", a.gradientClass)}
                  style={{ width: `${a.totalScore * 10}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Casual</span><span>Precon</span><span>Focused</span><span>High Power</span><span>cEDH</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category breakdown */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-2">
          <CardTitle className="font-serif text-sm">Category Breakdown</CardTitle>
          <CardDescription className="text-xs">Scored against recognized Commander staples in your list</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScoreBar label="Ramp" score={a.rampScore / 10} icon={TrendingUp} current={a.rampCount} ideal={10} />
          <ScoreBar label="Card Draw" score={a.drawScore / 10} icon={BookOpen} current={a.drawCount} ideal={8} />
          <ScoreBar label="Interaction" score={a.interactionScore / 10} icon={Sword} current={a.interactionCount} ideal={10} />
          <ScoreBar label="Win Conditions" score={a.winConScore / 10} icon={Trophy} current={a.winConCount} ideal={3} />
          <ScoreBar label="Mana Base" score={a.manaBaseScore / 10} icon={Layers} current={a.landCount} ideal={37} />
        </CardContent>
      </Card>

      {/* Upgrades */}
      {hasUpgrades ? (
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-serif font-semibold">Upgrade Recommendations</h3>
            <p className="text-xs text-muted-foreground">Staples not yet in your deck that improve weak categories</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {needsRamp        && rampUpgrades.length        > 0 && <UpgradeSection title="Ramp"            icon={TrendingUp} cards={rampUpgrades} />}
            {needsDraw        && drawUpgrades.length        > 0 && <UpgradeSection title="Card Draw"       icon={BookOpen}   cards={drawUpgrades} />}
            {needsInteraction && interactionUpgrades.length > 0 && <UpgradeSection title="Interaction"     icon={Sword}      cards={interactionUpgrades} />}
            {needsWinCon      && winConUpgrades.length      > 0 && <UpgradeSection title="Win Conditions"  icon={Trophy}     cards={winConUpgrades} />}
          </div>
        </div>
      ) : (
        <Card className="bg-card border-card-border">
          <CardContent className="py-8 text-center space-y-2">
            <Trophy className="h-9 w-9 text-amber-500 mx-auto" />
            <p className="font-semibold">Deck looks well-rounded!</p>
            <p className="text-sm text-muted-foreground">All major categories are performing well.</p>
          </CardContent>
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        Analysis is based on recognized staples. Cards without oracle text may not be fully detected.
      </p>
    </div>
  );
}
