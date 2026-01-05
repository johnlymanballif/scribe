# Scribe

A minimal webapp to turn meeting transcripts into beautifully structured Markdown notes for Notion.

## Requirements
- Node.js 18+ (recommended 20+)

## Setup
1) Install deps:
```bash
npm install
```

2) Create `.env.local`:
```bash
cp .env.example .env.local
```
Then set `OPENROUTER_API_KEY`.

3) Set up Vercel Postgres database:
   - If deploying to Vercel: Add Vercel Postgres integration in your Vercel dashboard. The `POSTGRES_URL` environment variable will be automatically provided.
   - For local development: You can use a local Postgres instance or connect to your Vercel Postgres database by adding `POSTGRES_URL` to `.env.local`.

4) Initialize the database schema:
   The database tables will be automatically created on first use. Alternatively, you can run:
   ```bash
   npx tsx lib/contacts/migrations.ts
   ```

5) (Optional) Migrate existing data:
   If you have existing data in `data/contacts.json`, you can migrate it:
   ```bash
   npx tsx lib/contacts/migrate-data.ts
   ```

6) Run:
```bash
npm run dev
```

Open http://localhost:3000

## Notes
- Export format is Markdown (`.md`) optimized for Notion import.
- Model prices are sourced from OpenRouter model pages and may change over time.
- Contacts, companies, and dictionary entries are stored in Vercel Postgres for persistence across deployments.
