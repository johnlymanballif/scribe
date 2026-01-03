"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2, X, Check, ArrowRight } from "lucide-react";
import type { Company, Person, DictionaryEntry } from "@/lib/contacts/types";

export default function ContactBookPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [dictionary, setDictionary] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [companySearch, setCompanySearch] = useState("");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [dictSearch, setDictSearch] = useState("");
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
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch("/api/contacts");
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const data = await response.json();
      setCompanies(data.companies || []);
      setPeople(data.people || []);
      setDictionary(data.dictionary || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      // Set empty arrays on error to prevent infinite loading
      setCompanies([]);
      setPeople([]);
      setDictionary([]);
    } finally {
      setLoading(false);
    }
  };

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
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const filteredPeople = people.filter((p) =>
    p.name.toLowerCase().includes(peopleSearch.toLowerCase())
  );

  const filteredDictionary = dictionary.filter(
    (d) =>
      d.incorrect.toLowerCase().includes(dictSearch.toLowerCase()) ||
      d.correct.toLowerCase().includes(dictSearch.toLowerCase())
  );

  const getCompanyName = (companyId?: string) => {
    if (!companyId) return "";
    return companies.find((c) => c.id === companyId)?.name || "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-primary font-sans">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-sm text-secondary">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-primary font-sans">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <header className="mb-8">
          <h1 className="text-xl font-medium tracking-tight">Contact Book</h1>
          <p className="mt-2 text-sm text-secondary">
            Manage companies, people, and transcription corrections
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Companies Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-primary">Companies</h2>
              <button
                onClick={handleCreateCompany}
                className="text-xs text-secondary hover:text-primary flex items-center gap-1"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {/* Add Company Input */}
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Company name"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateCompany();
                  }
                }}
                className="flex-1 px-3 py-2 bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm text-primary"
              />
              <button
                onClick={handleCreateCompany}
                className="px-3 py-2 bg-primary text-white rounded-md text-sm hover:bg-black/80"
              >
                Add
              </button>
            </div>

            {/* Search */}
            <div className="mb-4 relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tertiary"
              />
              <input
                type="text"
                placeholder="Search companies"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm text-primary"
              />
            </div>

            {/* Companies List */}
            <div className="space-y-1">
              {filteredCompanies.length === 0 ? (
                <div className="text-sm text-tertiary py-4 text-center">
                  {companySearch ? "No companies found" : "No companies yet"}
                </div>
              ) : (
                filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="group flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-md hover:bg-surface transition-colors"
                  >
                    {editingCompany === company.id ? (
                      <>
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
                          className="flex-1 px-2 py-1 text-sm bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent/50"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateCompany(company.id)}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCompany(null);
                            setEditingCompanyName("");
                          }}
                          className="text-tertiary hover:text-secondary"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-primary">
                          {company.name}
                        </span>
                        <button
                          onClick={() => startEditingCompany(company)}
                          className="opacity-0 group-hover:opacity-100 text-tertiary hover:text-secondary transition-opacity"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(company.id)}
                          className="opacity-0 group-hover:opacity-100 text-tertiary hover:text-rose-600 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* People Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-primary">People</h2>
              <button
                onClick={handleCreatePerson}
                className="text-xs text-secondary hover:text-primary flex items-center gap-1"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {/* Add Person Input */}
            <div className="mb-4 space-y-2">
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
                className="w-full px-3 py-2 bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm text-primary"
              />
              <input
                type="text"
                placeholder="Title (optional)"
                value={newPerson.title}
                onChange={(e) =>
                  setNewPerson({ ...newPerson, title: e.target.value })
                }
                className="w-full px-3 py-2 bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm text-primary"
              />
              <select
                value={newPerson.companyId}
                onChange={(e) =>
                  setNewPerson({ ...newPerson, companyId: e.target.value })
                }
                className="w-full px-3 py-2 bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm text-primary"
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
                className="w-full px-3 py-2 bg-primary text-white rounded-md text-sm hover:bg-black/80"
              >
                Add Person
              </button>
            </div>

            {/* Search */}
            <div className="mb-4 relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tertiary"
              />
              <input
                type="text"
                placeholder="Search people"
                value={peopleSearch}
                onChange={(e) => setPeopleSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm text-primary"
              />
            </div>

            {/* People List */}
            <div className="space-y-1">
              {filteredPeople.length === 0 ? (
                <div className="text-sm text-tertiary py-4 text-center">
                  {peopleSearch ? "No people found" : "No people yet"}
                </div>
              ) : (
                filteredPeople.map((person) => (
                  <div
                    key={person.id}
                    className="group flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-md hover:bg-surface transition-colors"
                  >
                    {editingPerson === person.id ? (
                      <div className="flex-1 space-y-2">
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
                          className="w-full px-2 py-1 text-sm bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent/50"
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
                          className="w-full px-2 py-1 text-sm bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent/50"
                        />
                        <select
                          value={editingPersonData.companyId}
                          onChange={(e) =>
                            setEditingPersonData({
                              ...editingPersonData,
                              companyId: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 text-sm bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent/50"
                        >
                          <option value="">No company</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdatePerson(person.id)}
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            <Check size={16} />
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
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-primary font-medium">
                            {person.name}
                          </div>
                          {(person.title || person.companyId) && (
                            <div className="text-xs text-tertiary">
                              {[person.title, getCompanyName(person.companyId)]
                                .filter(Boolean)
                                .join(" • ")}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => startEditingPerson(person)}
                          className="opacity-0 group-hover:opacity-100 text-tertiary hover:text-secondary transition-opacity"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeletePerson(person.id)}
                          className="opacity-0 group-hover:opacity-100 text-tertiary hover:text-rose-600 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Dictionary Section */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-medium text-primary">Transcription Dictionary</h2>
              <p className="text-xs text-tertiary mt-1">
                Words that are commonly mistranscribed (names, companies, technical terms)
              </p>
            </div>
            <button
              onClick={handleCreateDict}
              className="text-xs text-secondary hover:text-primary flex items-center gap-1"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {/* Add Dictionary Entry Input */}
          <div className="mb-4 flex gap-2 items-center">
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
              className="flex-1 px-3 py-2 bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm text-primary"
            />
            <ArrowRight size={16} className="text-tertiary flex-shrink-0" />
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
              className="flex-1 px-3 py-2 bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm text-primary"
            />
            <button
              onClick={handleCreateDict}
              disabled={!newDict.incorrect.trim() || !newDict.correct.trim()}
              className="px-3 py-2 bg-primary text-white rounded-md text-sm hover:bg-black/80 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {/* Search */}
          <div className="mb-4 relative max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tertiary"
            />
            <input
              type="text"
              placeholder="Search dictionary"
              value={dictSearch}
              onChange={(e) => setDictSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm text-primary"
            />
          </div>

          {/* Dictionary List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredDictionary.length === 0 ? (
              <div className="text-sm text-tertiary py-4 text-center col-span-full">
                {dictSearch ? "No entries found" : "No dictionary entries yet"}
              </div>
            ) : (
              filteredDictionary.map((entry) => (
                <div
                  key={entry.id}
                  className="group flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-md hover:bg-surface transition-colors"
                >
                  {editingDict === entry.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingDictData.incorrect}
                        onChange={(e) =>
                          setEditingDictData({
                            ...editingDictData,
                            incorrect: e.target.value,
                          })
                        }
                        className="flex-1 px-2 py-1 text-sm bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent/50"
                        autoFocus
                      />
                      <ArrowRight size={14} className="text-tertiary flex-shrink-0" />
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
                        className="flex-1 px-2 py-1 text-sm bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                      <button
                        onClick={() => handleUpdateDict(entry.id)}
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingDict(null);
                          setEditingDictData({ incorrect: "", correct: "" });
                        }}
                        className="text-tertiary hover:text-secondary"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm text-secondary line-through">
                        {entry.incorrect}
                      </span>
                      <ArrowRight size={14} className="text-tertiary flex-shrink-0" />
                      <span className="flex-1 text-sm text-primary font-medium">
                        {entry.correct}
                      </span>
                      <button
                        onClick={() => startEditingDict(entry)}
                        className="opacity-0 group-hover:opacity-100 text-tertiary hover:text-secondary transition-opacity"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteDict(entry.id)}
                        className="opacity-0 group-hover:opacity-100 text-tertiary hover:text-rose-600 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

