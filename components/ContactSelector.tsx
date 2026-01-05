"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Company } from "@/lib/contacts/types";

interface ContactSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  onCreatePerson?: (companyId: string) => void;
}

export default function ContactSelector({
  value,
  onChange,
  placeholder = "Select or type company name",
  onCreatePerson,
}: ContactSelectorProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch("/api/contacts");
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const data = await response.json();
      setCompanies(data.companies || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
      setCompanies([]);
    }
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCompanies = companies.filter((c) => value.includes(c.id));

  const toggleCompany = (companyId: string) => {
    if (value.includes(companyId)) {
      onChange(value.filter((id) => id !== companyId));
    } else {
      onChange([...value, companyId]);
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "company",
          name: newCompanyName.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create company");
      }

      const newCompany = await response.json();
      setCompanies([...companies, newCompany]);
      onChange([...value, newCompany.id]);
      setIsCreating(false);
      setNewCompanyName("");
      setIsOpen(false);
    } catch (error) {
      console.error("Error creating company:", error);
      alert(error instanceof Error ? error.message : "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showCreateOption = searchTerm && !filteredCompanies.some(
    (c) => c.name.toLowerCase() === searchTerm.toLowerCase()
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
        aria-label={selectedCompanies.length === 0 ? placeholder : `${selectedCompanies.length} compan${selectedCompanies.length === 1 ? 'y' : 'ies'} selected`}
        className="w-full min-h-[44px] px-0 py-2.5 bg-transparent border-0 border-b border-transparent hover:border-borderSubtle focus-visible:border-borderFocus focus-visible:outline-none text-sm text-primary cursor-pointer flex items-center gap-2 flex-wrap transition-colors"
      >
        {selectedCompanies.length === 0 ? (
          <span className="text-tertiary">{placeholder}</span>
        ) : (
          selectedCompanies.map((company) => (
            <span
              key={company.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surfaceHover hover:bg-surface rounded text-xs text-primary font-mono transition-colors"
            >
              {company.name}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleCompany(company.id);
                }}
                aria-label={`Remove ${company.name}`}
                className="hover:text-secondary p-0.5 -mr-0.5"
              >
                <X size={12} strokeWidth={1.5} />
              </button>
            </span>
          ))
        )}
        <svg
          className={`w-4 h-4 text-tertiary transition-transform flex-shrink-0 ${
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
            role="listbox"
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
                    aria-label="Filter companies"
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
                        setIsOpen(false);
                        setSearchTerm("");
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm cursor-pointer hover:bg-surface/50 text-tertiary transition-colors min-h-[44px]"
                    >
                      Clear selection
                    </button>
                  )}
                  {showCreateOption && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreating(true);
                        setNewCompanyName(searchTerm);
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm cursor-pointer hover:bg-surface/50 text-primary transition-colors flex items-center gap-2 min-h-[44px]"
                    >
                      <span className="text-tertiary">+</span>
                      Create "{searchTerm}"
                    </button>
                  )}
                  {filteredCompanies.length === 0 && !showCreateOption ? (
                    <div className="px-3 py-2 text-sm text-tertiary">
                      {searchTerm ? "No companies found" : "No companies"}
                    </div>
                  ) : (
                filteredCompanies.map((company) => {
                  const isSelected = value.includes(company.id);
                  return (
                    <button
                      type="button"
                      key={company.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCompany(company.id);
                        setSearchTerm("");
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm cursor-pointer hover:bg-surface/50 focus-visible:bg-surface/50 focus-visible:outline-none transition-colors min-h-[44px] flex items-center gap-3 ${
                        isSelected ? "bg-surface/50" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        aria-label={`Select ${company.name}`}
                        className="cursor-pointer w-4 h-4"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      />
                      <span className="flex-1">{company.name}</span>
                    </button>
                  );
                })
                  )}
                </div>
              </>
            ) : (
              <div className="p-3" onClick={(e) => e.stopPropagation()}>
                <div className="text-sm text-secondary mb-2">
                  Creating: <span className="text-primary">{newCompanyName}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Company name"
                    className="flex-1 px-2 py-1.5 text-sm border border-border rounded focus:border-primary focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateCompany();
                      if (e.key === "Escape") {
                        setIsCreating(false);
                        setSearchTerm("");
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleCreateCompany}
                    disabled={isSubmitting || !newCompanyName.trim()}
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
