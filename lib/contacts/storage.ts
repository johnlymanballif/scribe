// Safe Postgres import - try @vercel/postgres first, fall back to pg for Supabase/compatibility
let sql: any = null;
let pgPool: any = null;

// Check if connection string looks like Supabase (or if @vercel/postgres will fail)
const isSupabaseConnection = process.env.POSTGRES_URL?.includes("supabase.co") || 
                             process.env.POSTGRES_URL?.includes("pooler.supabase.com");

if (isSupabaseConnection) {
  // Use pg library for Supabase connections
  try {
    const { Pool } = require("pg");
    pgPool = new Pool({
      connectionString: process.env.POSTGRES_URL,
    });
    
    // Create a sql template tag compatible interface
    sql = (strings: TemplateStringsArray, ...values: any[]) => {
      let query = strings[0];
      const params: any[] = [];
      for (let i = 0; i < values.length; i++) {
        params.push(values[i]);
        query += `$${params.length}` + strings[i + 1];
      }
      return pgPool.query(query, params).then((result: any) => ({
        rows: result.rows,
      }));
    };
    
    console.log("✅ Using pg library for Supabase Postgres connection");
  } catch (error) {
    console.warn("⚠️  Failed to set up pg library:", error);
  }
} else {
  // Try @vercel/postgres for Vercel Postgres
  try {
    const postgres = require("@vercel/postgres");
    sql = postgres.sql;
  } catch (error) {
    console.warn("⚠️  Failed to import @vercel/postgres, using file storage:", error);
  }
}

import type { Company, Person, DictionaryEntry, ContactsData } from "./types";
import { runMigrations } from "./migrations";
import * as fileStorage from "./file-storage";

// -----------------------------------------------------------------------------
// Storage Strategy Detection
// -----------------------------------------------------------------------------

let storageMode: "postgres" | "file" | null = null;

async function detectStorageMode(): Promise<"postgres" | "file"> {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/contacts/storage.ts:12',message:'detectStorageMode entry',data:{currentMode:storageMode,hasPostgresUrl:!!process.env.POSTGRES_URL,hasSql:!!sql},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
  // #endregion
  
  // Always return file storage if sql is not available
  if (!sql) {
    storageMode = "file";
    return "file";
  }
  
  if (storageMode) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/contacts/storage.ts:14',message:'Using cached storage mode',data:{mode:storageMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return storageMode;
  }

  // Check if POSTGRES_URL is set
  if (!process.env.POSTGRES_URL) {
    console.log("⚠️  POSTGRES_URL not set, using file-based storage");
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/contacts/storage.ts:19',message:'No POSTGRES_URL, using file storage',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    storageMode = "file";
    return "file";
  }

  // Try to connect to Postgres - wrap everything in try-catch to ensure we never throw
  try {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/contacts/storage.ts:26',message:'Attempting Postgres connection',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
    // #endregion
    if (!sql) {
      throw new Error("Postgres SQL client not available");
    }
    await sql`SELECT 1`;
    await runMigrations();
    console.log("✅ Using Postgres database");
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/contacts/storage.ts:29',message:'Postgres connection succeeded',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    storageMode = "postgres";
    return "postgres";
  } catch (error) {
    console.warn("⚠️  Postgres connection failed, falling back to file storage:", error);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/contacts/storage.ts:33',message:'Postgres connection failed, using file fallback',data:{errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
    // #endregion
    storageMode = "file";
    return "file";
  }
}

// -----------------------------------------------------------------------------
// Company Operations
// -----------------------------------------------------------------------------

export async function getCompanies(): Promise<Company[]> {
  const mode = await detectStorageMode();
  if (mode === "postgres" && sql) {
    try {
      const result = await sql`
        SELECT id, name, created_at, updated_at
        FROM companies
        ORDER BY created_at DESC
      `;
      
      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.warn("Postgres query failed, falling back to file storage:", error);
      return fileStorage.getCompanies();
    }
  }
  return fileStorage.getCompanies();
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const mode = await detectStorageMode();
  if (mode === "postgres" && sql) {
    try {
      const result = await sql`
        SELECT id, name, created_at, updated_at
        FROM companies
        WHERE id = ${id}
        LIMIT 1
      `;
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.warn("Postgres query failed, falling back to file storage:", error);
      return fileStorage.getCompanyById(id);
    }
  }
  return fileStorage.getCompanyById(id);
}

export async function createCompany(name: string): Promise<Company> {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/contacts/storage.ts:86',message:'createCompany entry',data:{name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C,D'})}).catch(()=>{});
  // #endregion
  const mode = await detectStorageMode();
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/contacts/storage.ts:88',message:'createCompany storage mode detected',data:{mode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
  // #endregion
  if (mode === "postgres" && sql) {
    try {
      const now = new Date().toISOString();
      const id = `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await sql`
        INSERT INTO companies (id, name, created_at, updated_at)
        VALUES (${id}, ${name.trim()}, ${now}, ${now})
      `;
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/contacts/storage.ts:100',message:'createCompany postgres insert succeeded',data:{id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return {
        id,
        name: name.trim(),
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      console.warn("Postgres insert failed, falling back to file storage:", error);
      // Fall through to file storage
    }
  }
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/contacts/storage.ts:107',message:'createCompany using file storage',data:{name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  return fileStorage.createCompany(name);
}

export async function updateCompany(id: string, name: string): Promise<Company> {
  const mode = await detectStorageMode();
  if (mode === "postgres" && sql) {
    try {
      const now = new Date().toISOString();
      
      const result = await sql`
        UPDATE companies
        SET name = ${name.trim()}, updated_at = ${now}
        WHERE id = ${id}
        RETURNING id, name, created_at, updated_at
      `;
      
      if (result.rows.length === 0) {
        throw new Error(`Company with id ${id} not found`);
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.warn("Postgres update failed, falling back to file storage:", error);
      return fileStorage.updateCompany(id, name);
    }
  }
  return fileStorage.updateCompany(id, name);
}

export async function deleteCompany(id: string): Promise<void> {
  const mode = await detectStorageMode();
  if (mode === "postgres" && sql) {
    try {
      await sql`
        UPDATE people
        SET company_id = NULL
        WHERE company_id = ${id}
      `;
      
      const result = await sql`
        DELETE FROM companies
        WHERE id = ${id}
        RETURNING id
      `;
      
      if (result.rows.length === 0) {
        throw new Error(`Company with id ${id} not found`);
      }
      return;
    } catch (error) {
      console.warn("Postgres delete failed, falling back to file storage:", error);
      return fileStorage.deleteCompany(id);
    }
  }
  return fileStorage.deleteCompany(id);
}

// -----------------------------------------------------------------------------
// Person Operations
// -----------------------------------------------------------------------------

export async function getPeople(): Promise<Person[]> {
  const mode = await detectStorageMode();
  if (mode === "postgres" && sql) {
    try {
      const result = await sql`
        SELECT id, name, title, company_id, created_at, updated_at
        FROM people
        ORDER BY created_at DESC
      `;
      
      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        title: row.title || undefined,
        companyId: row.company_id || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.warn("Postgres query failed, falling back to file storage:", error);
      return fileStorage.getPeople();
    }
  }
  return fileStorage.getPeople();
}

export async function getPersonById(id: string): Promise<Person | null> {
  const mode = await detectStorageMode();
  if (mode === "postgres" && sql) {
    try {
      const result = await sql`
        SELECT id, name, title, company_id, created_at, updated_at
        FROM people
        WHERE id = ${id}
        LIMIT 1
      `;
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        title: row.title || undefined,
        companyId: row.company_id || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.warn("Postgres query failed, falling back to file storage:", error);
      return fileStorage.getPersonById(id);
    }
  }
  return fileStorage.getPersonById(id);
}

export async function createPerson(
  name: string,
  title?: string,
  companyId?: string
): Promise<Person> {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/contacts/storage.ts:176',message:'createPerson entry',data:{name,companyId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C,D'})}).catch(()=>{});
  // #endregion
  const mode = await detectStorageMode();
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/contacts/storage.ts:179',message:'createPerson storage mode detected',data:{mode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
  // #endregion
  
  if (companyId) {
    const companyExists = await getCompanyById(companyId);
    if (!companyExists) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/contacts/storage.ts:184',message:'createPerson company validation failed',data:{companyId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      throw new Error(`Company with id ${companyId} not found`);
    }
  }
  
  if (mode === "postgres" && sql) {
    try {
      const now = new Date().toISOString();
      const id = `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await sql`
        INSERT INTO people (id, name, title, company_id, created_at, updated_at)
        VALUES (
          ${id},
          ${name.trim()},
          ${title?.trim() || null},
          ${companyId || null},
          ${now},
          ${now}
        )
      `;
      
      return {
        id,
        name: name.trim(),
        title: title?.trim(),
        companyId,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      console.warn("Postgres insert failed, falling back to file storage:", error);
      // Fall through to file storage
    }
  }
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8fe9982-be51-4975-89a7-147631832a9b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/contacts/storage.ts:213',message:'createPerson using file storage',data:{name,companyId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  return fileStorage.createPerson(name, title, companyId);
}

export async function updatePerson(
  id: string,
  name: string,
  title?: string,
  companyId?: string
): Promise<Person> {
  const mode = await detectStorageMode();
  
  if (companyId) {
    const companyExists = await getCompanyById(companyId);
    if (!companyExists) {
      throw new Error(`Company with id ${companyId} not found`);
    }
  }
  
  if (mode === "postgres" && sql) {
    try {
      const now = new Date().toISOString();
      
      const result = await sql`
        UPDATE people
        SET name = ${name.trim()},
            title = ${title?.trim() || null},
            company_id = ${companyId || null},
            updated_at = ${now}
        WHERE id = ${id}
        RETURNING id, name, title, company_id, created_at, updated_at
      `;
      
      if (result.rows.length === 0) {
        throw new Error(`Person with id ${id} not found`);
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        title: row.title || undefined,
        companyId: row.company_id || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.warn("Postgres update failed, falling back to file storage:", error);
      return fileStorage.updatePerson(id, name, title, companyId);
    }
  }
  return fileStorage.updatePerson(id, name, title, companyId);
}

export async function deletePerson(id: string): Promise<void> {
  const mode = await detectStorageMode();
  if (mode === "postgres" && sql) {
    try {
      const result = await sql`
        DELETE FROM people
        WHERE id = ${id}
        RETURNING id
      `;
      
      if (result.rows.length === 0) {
        throw new Error(`Person with id ${id} not found`);
      }
      return;
    } catch (error) {
      console.warn("Postgres delete failed, falling back to file storage:", error);
      return fileStorage.deletePerson(id);
    }
  }
  return fileStorage.deletePerson(id);
}

// -----------------------------------------------------------------------------
// Dictionary Operations
// -----------------------------------------------------------------------------

export async function getDictionary(): Promise<DictionaryEntry[]> {
  const mode = await detectStorageMode();
  if (mode === "postgres" && sql) {
    try {
      const result = await sql`
        SELECT id, incorrect, correct, created_at, updated_at
        FROM dictionary
        ORDER BY created_at DESC
      `;
      
      return result.rows.map((row: any) => ({
        id: row.id,
        incorrect: row.incorrect,
        correct: row.correct,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.warn("Postgres query failed, falling back to file storage:", error);
      return fileStorage.getDictionary();
    }
  }
  return fileStorage.getDictionary();
}

export async function getDictionaryEntryById(id: string): Promise<DictionaryEntry | null> {
  const mode = await detectStorageMode();
  if (mode === "postgres" && sql) {
    try {
      const result = await sql`
        SELECT id, incorrect, correct, created_at, updated_at
        FROM dictionary
        WHERE id = ${id}
        LIMIT 1
      `;
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        incorrect: row.incorrect,
        correct: row.correct,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.warn("Postgres query failed, falling back to file storage:", error);
      return fileStorage.getDictionaryEntryById(id);
    }
  }
  return fileStorage.getDictionaryEntryById(id);
}

export async function createDictionaryEntry(
  incorrect: string,
  correct: string
): Promise<DictionaryEntry> {
  const mode = await detectStorageMode();
  if (mode === "postgres" && sql) {
    try {
      const now = new Date().toISOString();
      const id = `dict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await sql`
        INSERT INTO dictionary (id, incorrect, correct, created_at, updated_at)
        VALUES (${id}, ${incorrect.trim()}, ${correct.trim()}, ${now}, ${now})
      `;
      
      return {
        id,
        incorrect: incorrect.trim(),
        correct: correct.trim(),
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      console.warn("Postgres insert failed, falling back to file storage:", error);
      return fileStorage.createDictionaryEntry(incorrect, correct);
    }
  }
  return fileStorage.createDictionaryEntry(incorrect, correct);
}

export async function updateDictionaryEntry(
  id: string,
  incorrect: string,
  correct: string
): Promise<DictionaryEntry> {
  const mode = await detectStorageMode();
  if (mode === "postgres" && sql) {
    try {
      const now = new Date().toISOString();
      
      const result = await sql`
        UPDATE dictionary
        SET incorrect = ${incorrect.trim()},
            correct = ${correct.trim()},
            updated_at = ${now}
        WHERE id = ${id}
        RETURNING id, incorrect, correct, created_at, updated_at
      `;
      
      if (result.rows.length === 0) {
        throw new Error(`Dictionary entry with id ${id} not found`);
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        incorrect: row.incorrect,
        correct: row.correct,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.warn("Postgres update failed, falling back to file storage:", error);
      return fileStorage.updateDictionaryEntry(id, incorrect, correct);
    }
  }
  return fileStorage.updateDictionaryEntry(id, incorrect, correct);
}

export async function deleteDictionaryEntry(id: string): Promise<void> {
  const mode = await detectStorageMode();
  if (mode === "postgres" && sql) {
    try {
      const result = await sql`
        DELETE FROM dictionary
        WHERE id = ${id}
        RETURNING id
      `;
      
      if (result.rows.length === 0) {
        throw new Error(`Dictionary entry with id ${id} not found`);
      }
      return;
    } catch (error) {
      console.warn("Postgres delete failed, falling back to file storage:", error);
      return fileStorage.deleteDictionaryEntry(id);
    }
  }
  return fileStorage.deleteDictionaryEntry(id);
}

// -----------------------------------------------------------------------------
// Combined Operations
// -----------------------------------------------------------------------------

export async function getAllContacts(): Promise<ContactsData> {
  const mode = await detectStorageMode();
  if (mode === "postgres" && sql) {
    try {
      const [companies, people, dictionary] = await Promise.all([
        getCompanies(),
        getPeople(),
        getDictionary(),
      ]);
      
      return {
        companies,
        people,
        dictionary,
      };
    } catch (error) {
      console.warn("Postgres getAllContacts failed, falling back to file storage:", error);
      return fileStorage.getAllContacts();
    }
  }
  return fileStorage.getAllContacts();
}
