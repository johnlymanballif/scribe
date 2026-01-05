# Postgres Setup Guide

Since Vercel Postgres may not be available in your dashboard, here are easier alternatives:

## Option 1: Supabase (Recommended - Free & Easy)

1. **Sign up**: Go to https://supabase.com and create a free account
2. **Create a project**: Click "New Project"
3. **Get connection string**: 
   - Go to Project Settings → Database
   - Copy the "Connection string" under "Connection pooling" (use the `postgresql://` one)
4. **Add to `.env.local`**:
   ```bash
   POSTGRES_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
5. **Run migrations**:
   ```bash
   npx tsx lib/contacts/migrations.ts
   ```

## Option 2: Neon (Free Tier Available)

1. **Sign up**: Go to https://neon.tech and create a free account
2. **Create a project**: Click "Create Project"
3. **Get connection string**: Copy the connection string from the dashboard
4. **Add to `.env.local`**:
   ```bash
   POSTGRES_URL=[your-neon-connection-string]
   ```
5. **Run migrations**:
   ```bash
   npx tsx lib/contacts/migrations.ts
   ```

## Option 3: Railway (Free Trial)

1. **Sign up**: Go to https://railway.app
2. **Create Postgres**: Click "New" → "Database" → "PostgreSQL"
3. **Get connection string**: Copy from the database settings
4. **Add to `.env.local`**
5. **Run migrations**

## Option 4: Local Postgres (For Development)

If you have Postgres installed locally:

1. **Create database**:
   ```bash
   createdb scribe_dev
   ```

2. **Add to `.env.local`**:
   ```bash
   POSTGRES_URL=postgresql://localhost:5432/scribe_dev
   ```
   (Or with username: `postgresql://your-username@localhost:5432/scribe_dev`)

3. **Run migrations**:
   ```bash
   npx tsx lib/contacts/migrations.ts
   ```

## After Setup

1. **Restart your dev server**:
   ```bash
   npm run dev
   ```

2. **Test the connection**:
   ```bash
   npx tsx lib/contacts/diagnose-postgres.ts
   ```

3. **Verify it's working**: Try adding a company or person - it should now persist!

## Quick Start (Supabase)

The fastest option is Supabase:

1. Visit https://supabase.com/dashboard
2. Create new project
3. Wait for it to provision (~2 minutes)
4. Go to Settings → Database
5. Copy the connection string (under "Connection pooling")
6. Add to `.env.local`:
   ```bash
   echo 'POSTGRES_URL=your-connection-string-here' >> .env.local
   ```
7. Run: `npx tsx lib/contacts/migrations.ts`
8. Restart: `npm run dev`

That's it! Your app will now use Postgres instead of file storage.

