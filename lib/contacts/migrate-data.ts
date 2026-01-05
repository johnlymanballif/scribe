import { promises as fs } from "fs";
import path from "path";
import { sql } from "@vercel/postgres";
import type { ContactsData } from "./types";

// -----------------------------------------------------------------------------
// Data Migration Script
// -----------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const CONTACTS_FILE = path.join(DATA_DIR, "contacts.json");

/**
 * Migrates existing JSON data to Postgres database.
 * This is a one-time migration script to preserve existing data.
 */
export async function migrateDataFromJson(): Promise<void> {
  try {
    // Check if JSON file exists
    let jsonData: ContactsData;
    try {
      const content = await fs.readFile(CONTACTS_FILE, "utf-8");
      jsonData = JSON.parse(content);
      console.log("📄 Found existing contacts.json file");
    } catch (error) {
      console.log("ℹ️  No existing contacts.json file found, skipping migration");
      return;
    }

    // Check if database already has data
    const existingCompanies = await sql`SELECT COUNT(*) FROM companies`;
    const companyCount = parseInt(existingCompanies.rows[0].count as string, 10);
    
    if (companyCount > 0) {
      console.log("⚠️  Database already contains data. Skipping migration to avoid duplicates.");
      return;
    }

    console.log("🔄 Starting data migration...");

    // Migrate companies
    if (jsonData.companies && jsonData.companies.length > 0) {
      for (const company of jsonData.companies) {
        await sql`
          INSERT INTO companies (id, name, created_at, updated_at)
          VALUES (${company.id}, ${company.name}, ${company.createdAt}, ${company.updatedAt})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      console.log(`✅ Migrated ${jsonData.companies.length} companies`);
    }

    // Migrate people
    if (jsonData.people && jsonData.people.length > 0) {
      for (const person of jsonData.people) {
        await sql`
          INSERT INTO people (id, name, title, company_id, created_at, updated_at)
          VALUES (
            ${person.id},
            ${person.name},
            ${person.title || null},
            ${person.companyId || null},
            ${person.createdAt},
            ${person.updatedAt}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
      console.log(`✅ Migrated ${jsonData.people.length} people`);
    }

    // Migrate dictionary entries
    if (jsonData.dictionary && jsonData.dictionary.length > 0) {
      for (const entry of jsonData.dictionary) {
        await sql`
          INSERT INTO dictionary (id, incorrect, correct, created_at, updated_at)
          VALUES (
            ${entry.id},
            ${entry.incorrect},
            ${entry.correct},
            ${entry.createdAt},
            ${entry.updatedAt}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
      console.log(`✅ Migrated ${jsonData.dictionary.length} dictionary entries`);
    }

    console.log("🎉 Data migration completed successfully!");
  } catch (error) {
    console.error("❌ Error during data migration:", error);
    throw error;
  }
}

// -----------------------------------------------------------------------------
// Standalone Migration Script
// -----------------------------------------------------------------------------

/**
 * Run migration directly if this file is executed.
 * Usage: npx tsx lib/contacts/migrate-data.ts
 */
if (require.main === module) {
  migrateDataFromJson()
    .then(() => {
      console.log("Migration completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

