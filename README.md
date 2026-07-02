# MTG Card Collector

MTG Card Collector is a pnpm workspace for managing a Magic: The Gathering collection, decks, wishlists, house rules, and price tracking.

## Stack

- pnpm workspace monorepo
- React, Vite, Tailwind CSS
- Express API
- PostgreSQL with Drizzle ORM
- OpenAPI and Orval-generated API clients
- TypeScript

## Workspace Layout

- `artifacts/mtg-app` - main React app
- `artifacts/api-server` - Express API server
- `artifacts/mockup-sandbox` - Replit/mockup sandbox app
- `lib/db` - Drizzle schema and database helpers
- `lib/api-spec` - OpenAPI spec and code generation config
- `lib/api-client-react` - generated React Query client
- `lib/api-zod` - generated Zod schemas
- `scripts` - workspace utility scripts

## Getting Started

1. Install dependencies:

   ```powershell
   pnpm install
   ```

2. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Update `.env` with your local PostgreSQL `DATABASE_URL`.

4. Push the database schema for local development:

   ```powershell
   pnpm --filter @workspace/db run push
   ```

5. Start the API:

   ```powershell
   pnpm run dev:api
   ```

6. In another terminal, start the app:

   ```powershell
   pnpm run dev:app
   ```

The API defaults to port `5000`. The Vite app defaults to port `5173` and base path `/`.

## Common Commands

```powershell
pnpm run typecheck
pnpm run build
pnpm run codegen
pnpm run dev:api
pnpm run dev:app
```

## Notes

This project was originally built in Replit. Replit config files are kept for reference, but local development should work without Replit-specific environment variables.
