#!/usr/bin/env node
/**
 * Diagnostic script to check Postgres configuration and connection
 * Usage: npx tsx lib/contacts/diagnose-postgres.ts
 * 
 * Note: This script reads from process.env which should be loaded by Next.js
 * For standalone use, ensure .env.local is loaded or set POSTGRES_URL manually
 */

// Try to load .env.local manually if not already loaded
try {
  const fs = require("fs");
  const path = require("path");
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line: string) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim();
      }
    });
  }
} catch (e) {
  // Ignore errors, assume env vars are already loaded
}

console.log("🔍 Postgres Connection Diagnostics\n");
console.log("=" .repeat(50));

// Check 1: Environment variable
console.log("\n1. Checking POSTGRES_URL environment variable...");
const postgresUrl = process.env.POSTGRES_URL;
if (!postgresUrl) {
  console.log("   ❌ POSTGRES_URL is not set");
  console.log("   💡 To fix:");
  console.log("      - For local dev: Add POSTGRES_URL to .env.local");
  console.log("      - For Vercel: Add Vercel Postgres integration in dashboard");
} else {
  console.log("   ✅ POSTGRES_URL is set");
  // Show first/last few chars for security
  const preview = postgresUrl.length > 20 
    ? `${postgresUrl.substring(0, 10)}...${postgresUrl.substring(postgresUrl.length - 10)}`
    : "***";
  console.log(`   📝 Preview: ${preview} (length: ${postgresUrl.length})`);
  
  // Check URL format
  if (postgresUrl.startsWith("postgresql://") || postgresUrl.startsWith("postgres://")) {
    console.log("   ✅ URL format looks correct");
  } else {
    console.log("   ⚠️  URL format might be incorrect (should start with postgresql:// or postgres://)");
  }
}

// Check 2: Package installation
console.log("\n2. Checking @vercel/postgres package...");
try {
  const postgres = require("@vercel/postgres");
  console.log("   ✅ @vercel/postgres package is installed");
  
  if (postgres.sql) {
    console.log("   ✅ sql function is available");
  } else {
    console.log("   ❌ sql function is not available");
  }
} catch (error: any) {
  console.log("   ❌ @vercel/postgres package not found");
  console.log(`   💡 Install with: npm install @vercel/postgres`);
  console.log(`   Error: ${error.message}`);
  process.exit(1);
}

// Check 3: Connection test
async function testConnection() {
  console.log("\n3. Testing Postgres connection...");
  if (!postgresUrl) {
    console.log("   ⏭️  Skipping (POSTGRES_URL not set)");
    return;
  }
  
  try {
    // Use pg for Supabase, @vercel/postgres for Vercel Postgres
    let sql: any;
    const isSupabase = postgresUrl.includes("supabase.co") || postgresUrl.includes("pooler.supabase.com");
    
    if (isSupabase) {
      console.log("   🔄 Using pg library for Supabase connection...");
      const { Pool } = require("pg");
      const pool = new Pool({ connectionString: postgresUrl });
      sql = (strings: TemplateStringsArray, ...values: any[]) => {
        let query = strings[0];
        const params: any[] = [];
        for (let i = 0; i < values.length; i++) {
          params.push(values[i]);
          query += `$${params.length}` + strings[i + 1];
        }
        return pool.query(query, params).then((result: any) => ({ rows: result.rows }));
      };
    } else {
      const postgres = require("@vercel/postgres");
      sql = postgres.sql;
    }
    
    console.log("   🔄 Attempting connection...");
    const startTime = Date.now();
    const result = await sql`SELECT 1 as test, version() as pg_version`;
    const duration = Date.now() - startTime;
    
    console.log("   ✅ Connection successful!");
    console.log(`   ⏱️  Response time: ${duration}ms`);
    if (result.rows && result.rows.length > 0) {
      const pgVersion = result.rows[0].pg_version;
      console.log(`   🐘 PostgreSQL version: ${pgVersion}`);
    }
    
    // Check 4: Table existence
    console.log("\n4. Checking database tables...");
    let tables: any;
    if (isSupabase) {
      const { Pool } = require("pg");
      const pool = new Pool({ connectionString: postgresUrl });
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('companies', 'people', 'dictionary')
        ORDER BY table_name
      `);
      tables = { rows: result.rows };
    } else {
      tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('companies', 'people', 'dictionary')
        ORDER BY table_name
      `;
    }
    
    const existingTables = tables.rows.map((r: any) => r.table_name);
    const requiredTables = ['companies', 'people', 'dictionary'];
    
    requiredTables.forEach(table => {
      if (existingTables.includes(table)) {
        console.log(`   ✅ Table '${table}' exists`);
      } else {
        console.log(`   ❌ Table '${table}' is missing`);
      }
    });
    
    if (existingTables.length === 0) {
      console.log("   💡 Run migrations: npx tsx lib/contacts/migrations.ts");
    }
    
  } catch (error: any) {
    console.log("   ❌ Connection failed!");
    console.log(`   🔴 Error: ${error.message}`);
    console.log(`   📋 Error details:`, error);
    
    if (error.message.includes("ENOTFOUND") || error.message.includes("getaddrinfo")) {
      console.log("\n   💡 Possible issues:");
      console.log("      - Database hostname is incorrect");
      console.log("      - Network connectivity issue");
    } else if (error.message.includes("password") || error.message.includes("authentication")) {
      console.log("\n   💡 Possible issues:");
      console.log("      - Database credentials are incorrect");
      console.log("      - User doesn't have permission to access database");
    } else if (error.message.includes("does not exist")) {
      console.log("\n   💡 Possible issues:");
      console.log("      - Database name is incorrect");
    } else {
      console.log("\n   💡 Check your POSTGRES_URL connection string format");
      console.log("      Format: postgresql://user:password@host:port/database");
    }
  }
}

testConnection().then(() => {
  console.log("\n" + "=".repeat(50));
  console.log("\n✅ Diagnostics complete!\n");
}).catch((error) => {
  console.error("\n❌ Diagnostics failed:", error);
  process.exit(1);
});

