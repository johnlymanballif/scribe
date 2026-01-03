"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Company } from "@/lib/contacts/types";

interface ContactSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function ContactSelector({
  value,
  onChange,
  placeholder = "Select or type company name",
}: ContactSelectorProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

  const selectedCompany = companies.find((c) => c.id === value);

  return (
    <div className="relative z-50">
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-full px-3 py-2 bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm text-primary cursor-pointer flex items-center justify-between gap-2"
      >
        <span className={selectedCompany ? "text-primary flex-1" : "text-secondary flex-1"}>
          {selectedCompany ? selectedCompany.name : placeholder}
        </span>
        {selectedCompany && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="text-tertiary hover:text-secondary"
          >
            <X size={14} />
          </button>
        )}
        <svg
          className={`w-4 h-4 text-tertiary transition-transform flex-shrink-0 ${
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
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent/50"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="py-1">
              {value && (
                <div
                  onClick={() => {
                    onChange("");
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-surface text-tertiary"
                >
                  Clear selection
                </div>
              )}
              {filteredCompanies.length === 0 ? (
                <div className="px-3 py-2 text-sm text-tertiary">
                  {searchTerm ? "No companies found" : "No companies"}
                </div>
              ) : (
                filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => {
                      onChange(company.id);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-surface ${
                      value === company.id ? "bg-surface" : ""
                    }`}
                  >
                    {company.name}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

