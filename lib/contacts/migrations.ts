// Use pg library for Supabase, @vercel/postgres for Vercel Postgres
let sql: any = null;

const isSupabaseConnection = process.env.POSTGRES_URL?.includes("supabase.co") || 
                             process.env.POSTGRES_URL?.includes("pooler.supabase.com");

if (isSupabaseConnection) {
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
  });
  
  sql = (strings: TemplateStringsArray, ...values: any[]) => {
    let query = strings[0];
    const params: any[] = [];
    for (let i = 0; i < values.length; i++) {
      params.push(values[i]);
      query += `$${params.length}` + strings[i + 1];
    }
    return pool.query(query, params).then((result: any) => ({
      rows: result.rows,
    }));
  };
} else {
  const postgres = require("@vercel/postgres");
  sql = postgres.sql;
}

// -----------------------------------------------------------------------------
// Database Schema Migration
// -----------------------------------------------------------------------------

/**
 * Creates all required tables for the contacts system.
 * This should be run once when setting up the database.
 * Safe to run multiple times (uses IF NOT EXISTS).
 */
export async function runMigrations(): Promise<void> {
  try {
    // Create companies table
    await sql`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `;

    // Create people table
    await sql`
      CREATE TABLE IF NOT EXISTS people (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        title TEXT,
        company_id TEXT,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `;

    // Create dictionary table
    await sql`
      CREATE TABLE IF NOT EXISTS dictionary (
        id TEXT PRIMARY KEY,
        incorrect TEXT NOT NULL,
        correct TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `;

    // Create index on people.company_id for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_people_company_id ON people(company_id)
    `;

    console.log("✅ Database migrations completed successfully");
  } catch (error) {
    console.error("❌ Error running migrations:", error);
    throw error;
  }
}

// -----------------------------------------------------------------------------
// Standalone Migration Script
// -----------------------------------------------------------------------------

/**
 * Run migrations directly if this file is executed.
 * Usage: npx tsx lib/contacts/migrations.ts
 */
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log("Migrations completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

