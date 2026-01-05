import { promises as fs } from "fs";
import path from "path";
import type { Company, Person, DictionaryEntry, ContactsData } from "./types";

// -----------------------------------------------------------------------------
// File-based Storage (Fallback)
// -----------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const CONTACTS_FILE = path.join(DATA_DIR, "contacts.json");

async function ensureDataDir(): Promise<void> {
  // Don't try to create directories in serverless environments
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || process.cwd() === "/var/task";
  if (isServerless) {
    throw new Error("File storage is not available in serverless environments. Please configure Postgres.");
  }
  
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function readContactsFile(): Promise<ContactsData> {
  await ensureDataDir();
  
  try {
    const content = await fs.readFile(CONTACTS_FILE, "utf-8");
    const data = JSON.parse(content);
    return {
      companies: data.companies || [],
      people: data.people || [],
      dictionary: data.dictionary || [],
    };
  } catch (error) {
    return { companies: [], people: [], dictionary: [] };
  }
}

async function writeContactsFile(data: ContactsData): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(CONTACTS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// -----------------------------------------------------------------------------
// Company Operations
// -----------------------------------------------------------------------------

export async function getCompanies(): Promise<Company[]> {
  const data = await readContactsFile();
  return data.companies;
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const companies = await getCompanies();
  return companies.find((c) => c.id === id) || null;
}

export async function createCompany(name: string): Promise<Company> {
  const data = await readContactsFile();
  const now = new Date().toISOString();
  
  const company: Company = {
    id: `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
  };
  
  data.companies.push(company);
  await writeContactsFile(data);
  return company;
}

export async function updateCompany(id: string, name: string): Promise<Company> {
  const data = await readContactsFile();
  const company = data.companies.find((c) => c.id === id);
  
  if (!company) {
    throw new Error(`Company with id ${id} not found`);
  }
  
  company.name = name.trim();
  company.updatedAt = new Date().toISOString();
  
  await writeContactsFile(data);
  return company;
}

export async function deleteCompany(id: string): Promise<void> {
  const data = await readContactsFile();
  
  data.companies = data.companies.filter((c) => c.id !== id);
  data.people = data.people.map((p) => {
    if (p.companyId === id) {
      return { ...p, companyId: undefined };
    }
    return p;
  });
  
  await writeContactsFile(data);
}

// -----------------------------------------------------------------------------
// Person Operations
// -----------------------------------------------------------------------------

export async function getPeople(): Promise<Person[]> {
  const data = await readContactsFile();
  return data.people;
}

export async function getPersonById(id: string): Promise<Person | null> {
  const people = await getPeople();
  return people.find((p) => p.id === id) || null;
}

export async function createPerson(
  name: string,
  title?: string,
  companyId?: string
): Promise<Person> {
  const data = await readContactsFile();
  const now = new Date().toISOString();
  
  if (companyId) {
    const companyExists = data.companies.some((c) => c.id === companyId);
    if (!companyExists) {
      throw new Error(`Company with id ${companyId} not found`);
    }
  }
  
  const person: Person = {
    id: `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    title: title?.trim(),
    companyId,
    createdAt: now,
    updatedAt: now,
  };
  
  data.people.push(person);
  await writeContactsFile(data);
  return person;
}

export async function updatePerson(
  id: string,
  name: string,
  title?: string,
  companyId?: string
): Promise<Person> {
  const data = await readContactsFile();
  const person = data.people.find((p) => p.id === id);
  
  if (!person) {
    throw new Error(`Person with id ${id} not found`);
  }
  
  if (companyId) {
    const companyExists = data.companies.some((c) => c.id === companyId);
    if (!companyExists) {
      throw new Error(`Company with id ${companyId} not found`);
    }
  }
  
  person.name = name.trim();
  person.title = title?.trim();
  person.companyId = companyId;
  person.updatedAt = new Date().toISOString();
  
  await writeContactsFile(data);
  return person;
}

export async function deletePerson(id: string): Promise<void> {
  const data = await readContactsFile();
  data.people = data.people.filter((p) => p.id !== id);
  await writeContactsFile(data);
}

// -----------------------------------------------------------------------------
// Dictionary Operations
// -----------------------------------------------------------------------------

export async function getDictionary(): Promise<DictionaryEntry[]> {
  const data = await readContactsFile();
  return data.dictionary;
}

export async function getDictionaryEntryById(id: string): Promise<DictionaryEntry | null> {
  const dictionary = await getDictionary();
  return dictionary.find((d) => d.id === id) || null;
}

export async function createDictionaryEntry(
  incorrect: string,
  correct: string
): Promise<DictionaryEntry> {
  const data = await readContactsFile();
  const now = new Date().toISOString();
  
  const entry: DictionaryEntry = {
    id: `dict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    incorrect: incorrect.trim(),
    correct: correct.trim(),
    createdAt: now,
    updatedAt: now,
  };
  
  data.dictionary.push(entry);
  await writeContactsFile(data);
  return entry;
}

export async function updateDictionaryEntry(
  id: string,
  incorrect: string,
  correct: string
): Promise<DictionaryEntry> {
  const data = await readContactsFile();
  const entry = data.dictionary.find((d) => d.id === id);
  
  if (!entry) {
    throw new Error(`Dictionary entry with id ${id} not found`);
  }
  
  entry.incorrect = incorrect.trim();
  entry.correct = correct.trim();
  entry.updatedAt = new Date().toISOString();
  
  await writeContactsFile(data);
  return entry;
}

export async function deleteDictionaryEntry(id: string): Promise<void> {
  const data = await readContactsFile();
  data.dictionary = data.dictionary.filter((d) => d.id !== id);
  await writeContactsFile(data);
}

// -----------------------------------------------------------------------------
// Combined Operations
// -----------------------------------------------------------------------------

export async function getAllContacts(): Promise<ContactsData> {
  return await readContactsFile();
}

