"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Person, Company } from "@/lib/contacts/types";

interface ParticipantSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export default function ParticipantSelector({
  value,
  onChange,
  placeholder = "Select participants",
}: ParticipantSelectorProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredPeople = people.filter((person) =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedPeople = people.filter((p) => value.includes(p.id));

  const togglePerson = (personId: string) => {
    if (value.includes(personId)) {
      onChange(value.filter((id) => id !== personId));
    } else {
      onChange([...value, personId]);
    }
  };

  return (
    <div className="relative z-50">
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-full min-h-[38px] px-3 py-2 bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm cursor-pointer flex items-center gap-2 flex-wrap"
      >
        {selectedPeople.length === 0 ? (
          <span className="text-secondary">{placeholder}</span>
        ) : (
          selectedPeople.map((person) => (
            <span
              key={person.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface rounded text-xs text-primary"
            >
              {person.name}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePerson(person.id);
                }}
                className="hover:text-secondary"
              >
                <X size={12} />
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
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="absolute z-50 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-60 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b border-border">
              <input
                type="text"
                placeholder="Search people..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent/50"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="py-1">
              {filteredPeople.length === 0 ? (
                <div className="px-3 py-2 text-sm text-tertiary">
                  {searchTerm ? "No people found" : "No people"}
                </div>
              ) : (
                filteredPeople.map((person) => {
                  const isSelected = value.includes(person.id);
                  return (
                    <div
                      key={person.id}
                      onClick={() => {
                        togglePerson(person.id);
                        setSearchTerm("");
                      }}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-surface flex items-center gap-2 ${
                        isSelected ? "bg-surface" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="text-primary">{person.name}</div>
                        {person.title && (
                          <div className="text-xs text-tertiary">
                            {getPersonDisplayName(person)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

