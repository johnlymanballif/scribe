"use client";

import { useEffect, useState } from "react";
import { PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { Company, Person, DictionaryEntry } from "@/lib/contacts/types";

type ContactsTab = "companies" | "people" | "dictionary";

export default function ContactBookPage() {
  const [activeTab, setActiveTab] = useState<ContactsTab>("companies");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [dictionary, setDictionary] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCompany, setEditingCompany] = useState<string | null>(null);
  const [editingPerson, setEditingPerson] = useState<string | null>(null);
  const [editingDict, setEditingDict] = useState<string | null>(null);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newPerson, setNewPerson] = useState({
    name: "",
    title: "",
    companyId: "",
  });
  const [newDict, setNewDict] = useState({
    incorrect: "",
    correct: "",
  });
  const [editingCompanyName, setEditingCompanyName] = useState("");
  const [editingPersonData, setEditingPersonData] = useState({
    name: "",
    title: "",
    companyId: "",
  });
  const [editingDictData, setEditingDictData] = useState({
    incorrect: "",
    correct: "",
  });

  useEffect(() => {
    let cancelled = false;
    
    const loadContacts = async () => {
      try {
        const response = await fetch("/api/contacts", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        const data = await response.json();
        if (!cancelled) {
          setCompanies(data.companies || []);
          setPeople(data.people || []);
          setDictionary(data.dictionary || []);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching contacts:", error);
        if (!cancelled) {
          setCompanies([]);
          setPeople([]);
          setDictionary([]);
          setLoading(false);
        }
      }
    };
    
    loadContacts();
    
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "company",
          name: newCompanyName.trim(),
        }),
      });

      if (response.ok) {
        const company = await response.json();
        setCompanies([...companies, company]);
        setNewCompanyName("");
      }
    } catch (error) {
      console.error("Error creating company:", error);
      alert("Failed to create company");
    }
  };

  const handleUpdateCompany = async (id: string) => {
    if (!editingCompanyName.trim()) return;

    try {
      const response = await fetch("/api/contacts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "company",
          id,
          name: editingCompanyName.trim(),
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setCompanies(
          companies.map((c) => (c.id === id ? updated : c))
        );
        setEditingCompany(null);
        setEditingCompanyName("");
      }
    } catch (error) {
      console.error("Error updating company:", error);
      alert("Failed to update company");
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm("Are you sure you want to delete this company?")) return;

    try {
      const response = await fetch(`/api/contacts?type=company&id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCompanies(companies.filter((c) => c.id !== id));
        // Remove company assignment from people
        setPeople(
          people.map((p) => (p.companyId === id ? { ...p, companyId: undefined } : p))
        );
      }
    } catch (error) {
      console.error("Error deleting company:", error);
      alert("Failed to delete company");
    }
  };

  const handleCreatePerson = async () => {
    if (!newPerson.name.trim()) return;

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "person",
          name: newPerson.name.trim(),
          title: newPerson.title.trim() || undefined,
          companyId: newPerson.companyId || undefined,
        }),
      });

      if (response.ok) {
        const person = await response.json();
        setPeople([...people, person]);
        setNewPerson({ name: "", title: "", companyId: "" });
      }
    } catch (error) {
      console.error("Error creating person:", error);
      alert("Failed to create person");
    }
  };

  const handleUpdatePerson = async (id: string) => {
    if (!editingPersonData.name.trim()) return;

    try {
      const response = await fetch("/api/contacts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "person",
          id,
          name: editingPersonData.name.trim(),
          title: editingPersonData.title.trim() || undefined,
          companyId: editingPersonData.companyId || undefined,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setPeople(people.map((p) => (p.id === id ? updated : p)));
        setEditingPerson(null);
        setEditingPersonData({ name: "", title: "", companyId: "" });
      }
    } catch (error) {
      console.error("Error updating person:", error);
      alert("Failed to update person");
    }
  };

  const handleDeletePerson = async (id: string) => {
    if (!confirm("Are you sure you want to delete this person?")) return;

    try {
      const response = await fetch(`/api/contacts?type=person&id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPeople(people.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error("Error deleting person:", error);
      alert("Failed to delete person");
    }
  };

  const startEditingCompany = (company: Company) => {
    setEditingCompany(company.id);
    setEditingCompanyName(company.name);
  };

  const startEditingPerson = (person: Person) => {
    setEditingPerson(person.id);
    setEditingPersonData({
      name: person.name,
      title: person.title || "",
      companyId: person.companyId || "",
    });
  };

  // Dictionary handlers
  const handleCreateDict = async () => {
    if (!newDict.incorrect.trim() || !newDict.correct.trim()) return;

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dictionary",
          incorrect: newDict.incorrect.trim(),
          correct: newDict.correct.trim(),
        }),
      });

      if (response.ok) {
        const entry = await response.json();
        setDictionary([...dictionary, entry]);
        setNewDict({ incorrect: "", correct: "" });
      }
    } catch (error) {
      console.error("Error creating dictionary entry:", error);
      alert("Failed to create dictionary entry");
    }
  };

  const handleUpdateDict = async (id: string) => {
    if (!editingDictData.incorrect.trim() || !editingDictData.correct.trim()) return;

    try {
      const response = await fetch("/api/contacts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dictionary",
          id,
          incorrect: editingDictData.incorrect.trim(),
          correct: editingDictData.correct.trim(),
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setDictionary(dictionary.map((d) => (d.id === id ? updated : d)));
        setEditingDict(null);
        setEditingDictData({ incorrect: "", correct: "" });
      }
    } catch (error) {
      console.error("Error updating dictionary entry:", error);
      alert("Failed to update dictionary entry");
    }
  };

  const handleDeleteDict = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dictionary entry?")) return;

    try {
      const response = await fetch(`/api/contacts?type=dictionary&id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDictionary(dictionary.filter((d) => d.id !== id));
      }
    } catch (error) {
      console.error("Error deleting dictionary entry:", error);
      alert("Failed to delete dictionary entry");
    }
  };

  const startEditingDict = (entry: DictionaryEntry) => {
    setEditingDict(entry.id);
    setEditingDictData({
      incorrect: entry.incorrect,
      correct: entry.correct,
    });
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPeople = people.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredDictionary = dictionary.filter(
    (d) =>
      d.incorrect.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.correct.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCompanyName = (companyId?: string) => {
    if (!companyId) return "";
    return companies.find((c) => c.id === companyId)?.name || "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="text-sm text-tertiary">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main id="main-content" className="max-w-3xl mx-auto px-6 py-16" tabIndex={-1}>
        <div className="space-y-2 mb-10">
          <h1 className="text-xl font-medium tracking-tight text-balance">Contacts</h1>
          <p className="text-sm text-tertiary leading-relaxed">
            Manage companies, people, and transcription corrections
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 border-b border-border/30 -mb-px">
          <button
            onClick={() => setActiveTab("companies")}
            className={`flex items-center gap-1.5 pb-2.5 text-sm font-medium transition-colors relative ${
              activeTab === "companies" ? "text-primary" : "text-secondary hover:text-primary"
            }`}
          >
            <BuildingOfficeIcon className="w-4 h-4" />
            Companies
            {activeTab === "companies" && <div className="absolute bottom-0 left-0 right-0 h-px bg-primary" />}
          </button>
          <button
            onClick={() => setActiveTab("people")}
            className={`flex items-center gap-1.5 pb-2.5 text-sm font-medium transition-colors relative ${
              activeTab === "people" ? "text-primary" : "text-secondary hover:text-primary"
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            People
            {activeTab === "people" && <div className="absolute bottom-0 left-0 right-0 h-px bg-primary" />}
          </button>
          <button
            onClick={() => setActiveTab("dictionary")}
            className={`flex items-center gap-1.5 pb-2.5 text-sm font-medium transition-colors relative ${
              activeTab === "dictionary" ? "text-primary" : "text-secondary hover:text-primary"
            }`}
          >
            <BookOpenIcon className="w-4 h-4" />
            Dictionary
            {activeTab === "dictionary" && <div className="absolute bottom-0 left-0 right-0 h-px bg-primary" />}
          </button>
        </div>

        {/* Search and Add Button */}
        <div className="flex items-center gap-3 my-6">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary pointer-events-none" />
            <input
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-9 pr-4 py-2 bg-white border border-border/40 rounded-lg text-sm focus:ring-0 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            className="bg-primary text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
            onClick={() => {
              if (activeTab === "companies") {
                handleCreateCompany();
              } else if (activeTab === "people") {
                handleCreatePerson();
              } else if (activeTab === "dictionary") {
                handleCreateDict();
              }
            }}
          >
            <PlusIcon className="w-4 h-4" />
            New
          </button>
        </div>

        {/* Companies Tab */}
        {activeTab === "companies" && (
          <CompaniesTab 
            companies={filteredCompanies}
            editingCompany={editingCompany}
            editingCompanyName={editingCompanyName}
            setEditingCompanyName={setEditingCompanyName}
            setEditingCompany={setEditingCompany}
            newCompanyName={newCompanyName}
            setNewCompanyName={setNewCompanyName}
            handleCreateCompany={handleCreateCompany}
            handleUpdateCompany={handleUpdateCompany}
            handleDeleteCompany={handleDeleteCompany}
            startEditingCompany={startEditingCompany}
            searchQuery={searchQuery}
          />
        )}

        {/* People Tab */}
        {activeTab === "people" && (
          <PeopleTab 
            people={filteredPeople}
            companies={companies}
            editingPerson={editingPerson}
            editingPersonData={editingPersonData}
            setEditingPersonData={setEditingPersonData}
            setEditingPerson={setEditingPerson}
            newPerson={newPerson}
            setNewPerson={setNewPerson}
            handleCreatePerson={handleCreatePerson}
            handleUpdatePerson={handleUpdatePerson}
            handleDeletePerson={handleDeletePerson}
            startEditingPerson={startEditingPerson}
            getCompanyName={getCompanyName}
            searchQuery={searchQuery}
          />
        )}

        {/* Dictionary Tab */}
        {activeTab === "dictionary" && (
          <DictionaryTab 
            entries={filteredDictionary}
            editingDict={editingDict}
            editingDictData={editingDictData}
            setEditingDictData={setEditingDictData}
            setEditingDict={setEditingDict}
            newDict={newDict}
            setNewDict={setNewDict}
            handleCreateDict={handleCreateDict}
            handleUpdateDict={handleUpdateDict}
            handleDeleteDict={handleDeleteDict}
            startEditingDict={startEditingDict}
            searchQuery={searchQuery}
          />
        )}
      </main>
    </div>
  );
}

function BuildingOfficeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function CompaniesTab({ 
  companies, 
  editingCompany,
  editingCompanyName,
  setEditingCompanyName,
  setEditingCompany,
  newCompanyName,
  setNewCompanyName,
  handleCreateCompany,
  handleUpdateCompany,
  handleDeleteCompany,
  startEditingCompany,
  searchQuery
}: {
  companies: Company[];
  editingCompany: string | null;
  editingCompanyName: string;
  setEditingCompanyName: (name: string) => void;
  setEditingCompany: (id: string | null) => void;
  newCompanyName: string;
  setNewCompanyName: (name: string) => void;
  handleCreateCompany: () => void;
  handleUpdateCompany: (id: string) => void;
  handleDeleteCompany: (id: string) => void;
  startEditingCompany: (company: Company) => void;
  searchQuery: string;
}) {
  return (
    <div className="space-y-4">
      {/* Add Company Input */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="New company name"
          value={newCompanyName}
          onChange={(e) => setNewCompanyName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newCompanyName.trim()) {
              handleCreateCompany();
            }
          }}
          className="w-full px-4 py-2 bg-white border border-border/40 rounded-lg text-sm focus:ring-0 transition-colors"
        />
      </div>

      {/* Companies List */}
      <div className="space-y-px">
        {companies.length === 0 ? (
          <div className="text-sm text-tertiary py-8 text-center">
            {searchQuery ? "No companies found" : "No companies yet"}
          </div>
        ) : (
          companies.map((company) => (
            <div
              key={company.id}
              className="px-4 py-3 rounded-lg hover:bg-surface transition-colors flex items-center justify-between group"
            >
              {editingCompany === company.id ? (
                <div className="flex-1 flex items-center gap-3">
                  <input
                    type="text"
                    value={editingCompanyName}
                    onChange={(e) => setEditingCompanyName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUpdateCompany(company.id);
                      } else if (e.key === "Escape") {
                        setEditingCompany(null);
                        setEditingCompanyName("");
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-sm bg-white border border-border/40 rounded focus:ring-0"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateCompany(company.id)}
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingCompany(null);
                        setEditingCompanyName("");
                      }}
                      className="text-tertiary hover:text-secondary"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-sm text-primary flex-1">
                    {company.name}
                  </span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditingCompany(company)}
                      className="text-tertiary hover:text-primary"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCompany(company.id)}
                      className="text-tertiary hover:text-rose-600"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PeopleTab({ 
  people, 
  companies,
  editingPerson,
  editingPersonData,
  setEditingPersonData,
  setEditingPerson,
  newPerson,
  setNewPerson,
  handleCreatePerson,
  handleUpdatePerson,
  handleDeletePerson,
  startEditingPerson,
  getCompanyName,
  searchQuery
}: {
  people: Person[];
  companies: Company[];
  editingPerson: string | null;
  editingPersonData: { name: string; title: string; companyId: string };
  setEditingPersonData: (data: { name: string; title: string; companyId: string }) => void;
  setEditingPerson: (id: string | null) => void;
  newPerson: { name: string; title: string; companyId: string };
  setNewPerson: (person: { name: string; title: string; companyId: string }) => void;
  handleCreatePerson: () => void;
  handleUpdatePerson: (id: string) => void;
  handleDeletePerson: (id: string) => void;
  startEditingPerson: (person: Person) => void;
  getCompanyName: (id?: string) => string;
  searchQuery: string;
}) {
  return (
    <div className="space-y-4">
      {/* Add Person Input */}
      <div className="mb-6 space-y-3">
        <input
          type="text"
          placeholder="Name"
          value={newPerson.name}
          onChange={(e) =>
            setNewPerson({ ...newPerson, name: e.target.value })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" && newPerson.name.trim()) {
              handleCreatePerson();
            }
          }}
          className="w-full px-4 py-2 bg-white border border-border/40 rounded-lg text-sm focus:ring-0 transition-colors"
        />
        <input
          type="text"
          placeholder="Title (optional)"
          value={newPerson.title}
          onChange={(e) =>
            setNewPerson({ ...newPerson, title: e.target.value })
          }
          className="w-full px-4 py-2 bg-white border border-border/40 rounded-lg text-sm focus:ring-0 transition-colors"
        />
        <select
          value={newPerson.companyId}
          onChange={(e) =>
            setNewPerson({ ...newPerson, companyId: e.target.value })
          }
          className="w-full px-4 py-2 bg-white border border-border/40 rounded-lg text-sm focus:ring-0 transition-colors"
        >
          <option value="">No company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleCreatePerson}
          disabled={!newPerson.name.trim()}
          className="w-full px-4 py-2 text-sm text-secondary hover:text-primary disabled:opacity-50 disabled:hover:text-secondary transition-colors"
        >
          Save Contact
        </button>
      </div>

      {/* People List */}
      <div className="space-y-px">
        {people.length === 0 ? (
          <div className="text-sm text-tertiary py-8 text-center">
            {searchQuery ? "No people found" : "No people yet"}
          </div>
        ) : (
          people.map((person) => (
            <div
              key={person.id}
              className="px-4 py-3 rounded-lg hover:bg-surface transition-colors group"
            >
              {editingPerson === person.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={editingPersonData.name}
                    onChange={(e) =>
                      setEditingPersonData({
                        ...editingPersonData,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm bg-white border border-border/40 rounded focus:ring-0"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Title"
                    value={editingPersonData.title}
                    onChange={(e) =>
                      setEditingPersonData({
                        ...editingPersonData,
                        title: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm bg-white border border-border/40 rounded focus:ring-0"
                  />
                  <select
                    value={editingPersonData.companyId}
                    onChange={(e) =>
                      setEditingPersonData({
                        ...editingPersonData,
                        companyId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm bg-white border border-border/40 rounded focus:ring-0"
                  >
                    <option value="">No company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleUpdatePerson(person.id)}
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingPerson(null);
                        setEditingPersonData({
                          name: "",
                          title: "",
                          companyId: "",
                        });
                      }}
                      className="text-tertiary hover:text-secondary"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-primary">
                        {person.name}
                      </div>
                      {(person.title || person.companyId) && (
                        <div className="text-xs text-tertiary mt-0.5">
                          {[person.title, getCompanyName(person.companyId)]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditingPerson(person)}
                        className="text-tertiary hover:text-primary"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePerson(person.id)}
                        className="text-tertiary hover:text-rose-600"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DictionaryTab({ 
  entries, 
  editingDict,
  editingDictData,
  setEditingDictData,
  setEditingDict,
  newDict,
  setNewDict,
  handleCreateDict,
  handleUpdateDict,
  handleDeleteDict,
  startEditingDict,
  searchQuery
}: {
  entries: DictionaryEntry[];
  editingDict: string | null;
  editingDictData: { incorrect: string; correct: string };
  setEditingDictData: (data: { incorrect: string; correct: string }) => void;
  setEditingDict: (id: string | null) => void;
  newDict: { incorrect: string; correct: string };
  setNewDict: (dict: { incorrect: string; correct: string }) => void;
  handleCreateDict: () => void;
  handleUpdateDict: (id: string) => void;
  handleDeleteDict: (id: string) => void;
  startEditingDict: (entry: DictionaryEntry) => void;
  searchQuery: string;
}) {
  return (
    <div className="space-y-4">
      {/* Add Dictionary Entry Input */}
      <div className="mb-6 grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <input
          type="text"
          placeholder="Incorrect spelling"
          value={newDict.incorrect}
          onChange={(e) => setNewDict({ ...newDict, incorrect: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newDict.incorrect.trim() && newDict.correct.trim()) {
              handleCreateDict();
            }
          }}
          className="px-4 py-2 bg-white border border-border/40 rounded-lg text-sm focus:ring-0 font-mono transition-colors"
        />
        <ArrowRightIcon className="text-tertiary flex-shrink-0 w-4 h-4" />
        <input
          type="text"
          placeholder="Correct spelling"
          value={newDict.correct}
          onChange={(e) => setNewDict({ ...newDict, correct: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newDict.incorrect.trim() && newDict.correct.trim()) {
              handleCreateDict();
            }
          }}
          className="px-4 py-2 bg-white border border-border/40 rounded-lg text-sm focus:ring-0 font-mono transition-colors"
        />
      </div>

      {/* Dictionary List */}
      <div className="space-y-2">
        {entries.length === 0 ? (
          <div className="text-sm text-tertiary py-8 text-center">
            {searchQuery ? "No entries found" : "No dictionary entries yet"}
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="px-4 py-4 rounded-lg hover:bg-surface transition-colors group"
            >
              {editingDict === entry.id ? (
                <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-center">
                  <input
                    type="text"
                    value={editingDictData.incorrect}
                    onChange={(e) =>
                      setEditingDictData({
                        ...editingDictData,
                        incorrect: e.target.value,
                      })
                    }
                    className="px-3 py-1.5 text-sm bg-white border border-border/40 rounded focus:ring-0 font-mono"
                    autoFocus
                  />
                  <ArrowRightIcon className="text-tertiary flex-shrink-0 w-4 h-4" />
                  <input
                    type="text"
                    value={editingDictData.correct}
                    onChange={(e) =>
                      setEditingDictData({
                        ...editingDictData,
                        correct: e.target.value,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUpdateDict(entry.id);
                      } else if (e.key === "Escape") {
                        setEditingDict(null);
                        setEditingDictData({ incorrect: "", correct: "" });
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-white border border-border/40 rounded focus:ring-0 font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateDict(entry.id)}
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingDict(null);
                        setEditingDictData({ incorrect: "", correct: "" });
                      }}
                      className="text-tertiary hover:text-secondary"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                    <span className="text-sm text-secondary line-through font-mono">
                      {entry.incorrect}
                    </span>
                    <ArrowRightIcon className="text-tertiary flex-shrink-0 w-4 h-4" />
                    <span className="text-sm text-primary font-mono">
                      {entry.correct}
                    </span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditingDict(entry)}
                      className="text-tertiary hover:text-primary"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDict(entry.id)}
                      className="text-tertiary hover:text-rose-600"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}
