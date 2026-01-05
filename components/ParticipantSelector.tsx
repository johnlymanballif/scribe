"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Person, Company } from "@/lib/contacts/types";

interface ParticipantSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  companyId?: string;
}

export default function ParticipantSelector({
  value,
  onChange,
  placeholder = "Select participants",
  companyId,
}: ParticipantSelectorProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonTitle, setNewPersonTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setPeople(data.people || []);
      setCompanies(data.companies || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      setPeople([]);
      setCompanies([]);
    }
  };

  const getPersonDisplayName = (person: Person): string => {
    const company = companies.find((c) => c.id === person.companyId);
    const parts = [person.name];
    if (person.title) parts.push(person.title);
    if (company) parts.push(company.name);
    return parts.join(" • ");
  };

  const filteredPeople = people.filter((person) => {
    const matchesCompany = !companyId || person.companyId === companyId;
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCompany && matchesSearch;
  });

  const selectedPeople = people.filter((p) => value.includes(p.id));

  const togglePerson = (personId: string) => {
    if (value.includes(personId)) {
      onChange(value.filter((id) => id !== personId));
    } else {
      onChange([...value, personId]);
    }
  };

  const handleCreatePerson = async () => {
    if (!newPersonName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "person",
          name: newPersonName.trim(),
          title: newPersonTitle.trim() || undefined,
          companyId: companyId || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create person");
      }

      const newPerson = await response.json();
      setPeople([...people, newPerson]);
      onChange([...value, newPerson.id]);
      setIsCreating(false);
      setNewPersonName("");
      setNewPersonTitle("");
      setIsOpen(false);
    } catch (error) {
      console.error("Error creating person:", error);
      alert(error instanceof Error ? error.message : "Failed to create person");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showCreateOption = searchTerm && !filteredPeople.some(
    (p) => p.name.toLowerCase() === searchTerm.toLowerCase()
  );

  return (
    <div className="relative z-50">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={selectedPeople.length === 0 ? placeholder : `${selectedPeople.length} participant${selectedPeople.length === 1 ? '' : 's'} selected`}
        className="w-full min-h-[44px] px-0 py-2.5 bg-transparent border-0 border-b border-transparent hover:border-borderSubtle focus-visible:border-borderFocus focus-visible:outline-none text-sm cursor-pointer flex items-center gap-2 flex-wrap transition-colors"
      >
        {selectedPeople.length === 0 ? (
          <span className="text-tertiary">{placeholder}</span>
        ) : (
          selectedPeople.map((person) => (
            <span
              key={person.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surfaceHover hover:bg-surface rounded text-xs text-primary font-mono transition-colors"
            >
              {person.name}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  togglePerson(person.id);
                }}
                aria-label={`Remove ${person.name}`}
                className="hover:text-secondary p-0.5 -mr-0.5"
              >
                <X size={12} strokeWidth={1.5} />
              </button>
            </span>
          ))
        )}
        <svg
          className={`w-4 h-4 text-tertiary ml-auto transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setIsCreating(false);
              setSearchTerm("");
            }}
          />
          <div 
            className="absolute z-50 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-60 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {!isCreating ? (
              <>
                <div className="p-3 border-b border-borderSubtle">
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsCreating(false);
                    }}
                    aria-label="Filter participants"
                    className="w-full px-0 py-2 text-sm bg-transparent border-0 border-b border-transparent hover:border-borderSubtle focus-visible:border-borderFocus focus-visible:outline-none min-h-[44px]"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
                <div className="py-1">
                  {value.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange([]);
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm cursor-pointer hover:bg-surface/50 text-tertiary transition-colors min-h-[44px]"
                    >
                      Clear selection
                    </button>
                  )}
                  {showCreateOption && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsCreating(true);
                        setNewPersonName(searchTerm);
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm cursor-pointer hover:bg-surface/50 text-primary transition-colors flex items-center gap-2 min-h-[44px]"
                    >
                      <span className="text-tertiary">+</span>
                      Create "{searchTerm}"
                      {companyId && <span className="text-xs text-tertiary"> (will be added to selected company)</span>}
                    </button>
                  )}
                  {filteredPeople.length === 0 && !showCreateOption ? (
                    <div className="px-3 py-2 text-sm text-tertiary">
                      {searchTerm ? "No people found" : "No people"}
                    </div>
                  ) : (
                    filteredPeople.map((person) => {
                      const isSelected = value.includes(person.id);
                      return (
                        <button
                          type="button"
                          key={person.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            togglePerson(person.id);
                            setSearchTerm("");
                          }}
                          className={`w-full text-left px-3 py-2.5 text-sm cursor-pointer hover:bg-surface/50 focus-visible:bg-surface/50 focus-visible:outline-none flex items-center gap-3 transition-colors min-h-[44px] ${
                            isSelected ? "bg-surface/50" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            aria-label={`Select ${person.name}`}
                            className="cursor-pointer w-4 h-4"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          />
                          <div className="flex-1">
                            <div className="text-primary">{person.name}</div>
                            {(person.title || person.companyId) && (
                              <div className="text-xs text-tertiary mt-0.5">
                                {getPersonDisplayName(person)}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="p-3" onClick={(e) => e.stopPropagation()}>
                <div className="text-sm text-secondary mb-2">
                  Creating: <span className="text-primary">{newPersonName}</span>
                  {companyId && (
                    <span className="text-tertiary"> (will be added to selected company)</span>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    placeholder="Name"
                    className="w-full px-2 py-1.5 text-sm border border-border rounded focus:border-primary focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreatePerson();
                      if (e.key === "Escape") {
                        setIsCreating(false);
                        setSearchTerm("");
                      }
                    }}
                    autoFocus
                  />
                  <input
                    type="text"
                    value={newPersonTitle}
                    onChange={(e) => setNewPersonTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="w-full px-2 py-1.5 text-sm border border-border rounded focus:border-primary focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreatePerson();
                      if (e.key === "Escape") {
                        setIsCreating(false);
                        setSearchTerm("");
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreatePerson}
                      disabled={isSubmitting || !newPersonName.trim()}
                      className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isSubmitting ? "..." : "Add"}
                    </button>
                    <button
                      onClick={() => {
                        setIsCreating(false);
                        setSearchTerm("");
                      }}
                      className="px-3 py-1.5 text-sm text-tertiary hover:text-primary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
