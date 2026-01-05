import { sql } from "@vercel/postgres";
import type { Company, Person, DictionaryEntry, ContactsData } from "./types";
import { runMigrations } from "./migrations";

// -----------------------------------------------------------------------------
// Database Initialization
// -----------------------------------------------------------------------------

let migrationsRun = false;

async function ensureMigrations(): Promise<void> {
  if (!migrationsRun) {
    try {
      await runMigrations();
      migrationsRun = true;
    } catch (error) {
      console.error("Failed to run migrations:", error);
      // Continue anyway - migrations might already be run
      migrationsRun = true;
    }
  }
}

// -----------------------------------------------------------------------------
// Company Operations
// -----------------------------------------------------------------------------

export async function getCompanies(): Promise<Company[]> {
  await ensureMigrations();
  const result = await sql`
    SELECT id, name, created_at, updated_at
    FROM companies
    ORDER BY created_at DESC
  `;
  
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getCompanyById(id: string): Promise<Company | null> {
  await ensureMigrations();
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
}

export async function createCompany(name: string): Promise<Company> {
  await ensureMigrations();
  const now = new Date().toISOString();
  const id = `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await sql`
    INSERT INTO companies (id, name, created_at, updated_at)
    VALUES (${id}, ${name.trim()}, ${now}, ${now})
  `;
  
  return {
    id,
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateCompany(id: string, name: string): Promise<Company> {
  await ensureMigrations();
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
}

export async function deleteCompany(id: string): Promise<void> {
  await ensureMigrations();
  
  // Remove company assignment from people
  await sql`
    UPDATE people
    SET company_id = NULL
    WHERE company_id = ${id}
  `;
  
  // Delete the company
  const result = await sql`
    DELETE FROM companies
    WHERE id = ${id}
    RETURNING id
  `;
  
  if (result.rows.length === 0) {
    throw new Error(`Company with id ${id} not found`);
  }
}

// -----------------------------------------------------------------------------
// Person Operations
// -----------------------------------------------------------------------------

export async function getPeople(): Promise<Person[]> {
  await ensureMigrations();
  const result = await sql`
    SELECT id, name, title, company_id, created_at, updated_at
    FROM people
    ORDER BY created_at DESC
  `;
  
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    title: row.title || undefined,
    companyId: row.company_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getPersonById(id: string): Promise<Person | null> {
  await ensureMigrations();
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
}

export async function createPerson(
  name: string,
  title?: string,
  companyId?: string
): Promise<Person> {
  await ensureMigrations();
  
  // Validate companyId if provided
  if (companyId) {
    const companyExists = await getCompanyById(companyId);
    if (!companyExists) {
      throw new Error(`Company with id ${companyId} not found`);
    }
  }
  
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
}

export async function updatePerson(
  id: string,
  name: string,
  title?: string,
  companyId?: string
): Promise<Person> {
  await ensureMigrations();
  
  // Validate companyId if provided
  if (companyId) {
    const companyExists = await getCompanyById(companyId);
    if (!companyExists) {
      throw new Error(`Company with id ${companyId} not found`);
    }
  }
  
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
}

export async function deletePerson(id: string): Promise<void> {
  await ensureMigrations();
  
  const result = await sql`
    DELETE FROM people
    WHERE id = ${id}
    RETURNING id
  `;
  
  if (result.rows.length === 0) {
    throw new Error(`Person with id ${id} not found`);
  }
}

// -----------------------------------------------------------------------------
// Dictionary Operations
// -----------------------------------------------------------------------------

export async function getDictionary(): Promise<DictionaryEntry[]> {
  await ensureMigrations();
  const result = await sql`
    SELECT id, incorrect, correct, created_at, updated_at
    FROM dictionary
    ORDER BY created_at DESC
  `;
  
  return result.rows.map((row) => ({
    id: row.id,
    incorrect: row.incorrect,
    correct: row.correct,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getDictionaryEntryById(id: string): Promise<DictionaryEntry | null> {
  await ensureMigrations();
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
}

export async function createDictionaryEntry(
  incorrect: string,
  correct: string
): Promise<DictionaryEntry> {
  await ensureMigrations();
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
}

export async function updateDictionaryEntry(
  id: string,
  incorrect: string,
  correct: string
): Promise<DictionaryEntry> {
  await ensureMigrations();
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
}

export async function deleteDictionaryEntry(id: string): Promise<void> {
  await ensureMigrations();
  
  const result = await sql`
    DELETE FROM dictionary
    WHERE id = ${id}
    RETURNING id
  `;
  
  if (result.rows.length === 0) {
    throw new Error(`Dictionary entry with id ${id} not found`);
  }
}

// -----------------------------------------------------------------------------
// Combined Operations
// -----------------------------------------------------------------------------

export async function getAllContacts(): Promise<ContactsData> {
  await ensureMigrations();
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
}
