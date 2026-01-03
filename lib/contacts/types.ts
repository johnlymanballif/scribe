// -----------------------------------------------------------------------------
// Contact Book Types
// -----------------------------------------------------------------------------

export interface Company {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  name: string;
  title?: string;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DictionaryEntry {
  id: string;
  incorrect: string;
  correct: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactsData {
  companies: Company[];
  people: Person[];
  dictionary: DictionaryEntry[];
}

// API request/response types
export type ContactType = "company" | "person" | "dictionary";

export interface CreateCompanyRequest {
  type: "company";
  name: string;
}

export interface CreatePersonRequest {
  type: "person";
  name: string;
  title?: string;
  companyId?: string;
}

export interface CreateDictionaryRequest {
  type: "dictionary";
  incorrect: string;
  correct: string;
}

export interface UpdateCompanyRequest {
  type: "company";
  id: string;
  name: string;
}

export interface UpdatePersonRequest {
  type: "person";
  id: string;
  name: string;
  title?: string;
  companyId?: string;
}

export interface UpdateDictionaryRequest {
  type: "dictionary";
  id: string;
  incorrect: string;
  correct: string;
}

export interface DeleteRequest {
  type: ContactType;
  id: string;
}

export type CreateContactRequest = CreateCompanyRequest | CreatePersonRequest | CreateDictionaryRequest;
export type UpdateContactRequest = UpdateCompanyRequest | UpdatePersonRequest | UpdateDictionaryRequest;

