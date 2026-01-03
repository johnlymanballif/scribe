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

3) Run:
```bash
npm run dev
```

Open http://localhost:3000

## Notes
- Export format is Markdown (`.md`) optimized for Notion import.
- Model prices are sourced from OpenRouter model pages and may change over time.
