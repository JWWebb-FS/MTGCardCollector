# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Grimoire — MTG Collection Manager

### Features

**Collection**
- Add cards via Scryfall search (with set/printing selection)
- Track condition (NM/LP/MP/HP/DMG), foil treatment, quantity
- Personal notes per card
- Storage location field (e.g. "Binder 2", "Box A")
- Mark cards as available for trade (Trade List tab)
- Advanced filters: color, card type, CMC range (min/max)
- Sort by name, price, mana value, set

**Dashboard**
- Total card count, total value, foil value summary
- Color distribution pie chart
- Top sets bar chart
- Collection value history line chart (snapshots saved on each price refresh)
- Most valuable cards gallery

**Decks**
- Create decks with name, format, color identity, description
- Import deck from plain text decklist ("4 Lightning Bolt" or "4x Lightning Bolt" format)
- Deck detail with card list grouped by type (Creatures, Spells, Lands, etc.)
- Mana curve bar chart (using stored CMC per card)
- Legality checker: validates card copy limits (4-of / singleton), deck size for format
- Missing-from-collection badge per card
- Export deck to clipboard (plain text format)

**Wishlist**
- Search and add cards to wishlist
- Set target price per card (inline editing)
- Price alert: green highlight + banner when market price is at or below target
- Refresh prices from Scryfall

**Sets**
- Browse all MTG sets with collection completion percentage

**House Rules**
- Create and manage custom house rules

### Database Schema (key tables)

- `collection_cards` — scryfallId, name, setCode, quantity, foil, condition, colorIdentity, typeLine, cmc, imageUri, priceUsd, priceFoil, notes, storageLocation, forTrade
- `deck_cards` — scryfallId, name, quantity, isCommander, isSideboard, cmc, typeLine, imageUri
- `value_snapshots` — totalValue, foilValue, cardCount, snapshotAt
- `wishlist_items` — scryfallId, name, quantity, foil, maxPrice (price alert threshold)
- `decks` — name, description, format, colorIdentity, isActive

### API sentinel values

- Set filter "all sets": `"__all__"` (avoids collision with Alliances set code `"all"`)
