"use client";

import { useMemo, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowRight, Download, Upload } from "lucide-react";

import PipelineStatus from "@/components/PipelineStatus";
import ConfidenceScore from "@/components/ConfidenceScore";
import PackageSelector from "@/components/PackageSelector";
import ContactSelector from "@/components/ContactSelector";
import ParticipantSelector from "@/components/ParticipantSelector";
import { TEMPLATES } from "@/lib/constants";
import type { Company, Person } from "@/lib/contacts/types";
import { 
  MODEL_PACKAGES, 
  type PackageId, 
  type PipelineStageConfig,
  type ValidationFlag,
  type GenerateResponse,
} from "@/lib/pipeline";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface PipelineResult {
  summary: string;
  confidence: number;
  validationFlags: ValidationFlag[];
  processingTime: {
    extraction: number;
    deduplication: number;
    synthesis: number;
    validation: number;
    total: number;
  };
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function MeetingNotesApp() {
  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Input state
  const [transcript, setTranscript] = useState("");
  
  // Metadata state (optional but recommended)
  const [clientCompanyId, setClientCompanyId] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [meetingName, setMeetingName] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  
  // Contact book data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  
  // Configuration state
  const [selectedPackageId, setSelectedPackageId] = useState<PackageId>("BALANCED_PRO");
  const [customConfig, setCustomConfig] = useState<PipelineStageConfig>(
    MODEL_PACKAGES.BALANCED_PRO.stages
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATES[0].id);
  
  // Processing state
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Result state
  const [result, setResult] = useState<PipelineResult | null>(null);

  const selectedTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === selectedTemplateId) ?? TEMPLATES[0],
    [selectedTemplateId]
  );

  // Fetch contacts on mount
  useEffect(() => {
    fetch("/api/contacts")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setCompanies(data.companies || []);
        setPeople(data.people || []);
      })
      .catch((err) => {
        console.error("Error fetching contacts:", err);
        // Set empty arrays on error
        setCompanies([]);
        setPeople([]);
      });
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => setTranscript((evt.target?.result as string) || "");
    reader.readAsText(file);
  };

  const generateNotes = async () => {
    setIsGenerating(true);
    setResult(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          packageId: selectedPackageId,
          customConfig: selectedPackageId === "CUSTOM" ? customConfig : undefined,
          templatePrompt: selectedTemplate.prompt,
          metadata: {
            clientName: clientCompanyId ? companies.find(c => c.id === clientCompanyId)?.name : undefined,
            participants: participantIds.length > 0 ? people.filter(p => participantIds.includes(p.id)).map(p => p.name) : undefined,
            meetingName: meetingName.trim() || undefined,
            date: meetingDate.trim() || undefined,
          },
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data?.error || data?.details || "Request failed";
        throw new Error(errorMessage);
      }

      const pipelineResult: PipelineResult = {
        summary: data.summary || "",
        confidence: data.confidence ?? 70,
        validationFlags: data.validationFlags || [],
        processingTime: data.processingTime || {
          extraction: 0,
          deduplication: 0,
          synthesis: 0,
          validation: 0,
          total: 0,
        },
      };

      setResult(pipelineResult);
      setStep(3);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Error generating notes. Please try again.";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadForNotion = () => {
    if (!result?.summary) return;
    
    const blob = new Blob([result.summary], { type: "text/markdown; charset=utf-8" });
    const url = URL.createObjectURL(blob);

    // Create clean filename from meeting name or fallback to date
    let filename: string;
    if (meetingName.trim()) {
      // Sanitize meeting name for filename: replace invalid chars with underscores
      const cleanName = meetingName.trim()
        .replace(/[<>:"/\\|?*]/g, "_") // Remove invalid filename characters
        .replace(/\s+/g, "_") // Replace spaces with underscores
        .replace(/_+/g, "_") // Collapse multiple underscores
        .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
      filename = `${cleanName}.md`;
    } else {
      filename = `Meeting_Notes_${new Date().toISOString().slice(0, 10)}.md`;
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };

  const startOver = () => {
    setStep(1);
    setResult(null);
    setTranscript("");
    setClientCompanyId("");
    setParticipantIds([]);
    setMeetingName("");
    setMeetingDate("");
  };

  return (
    <div className="min-h-screen bg-background text-primary font-sans selection:bg-accent/20">
      <div className="max-w-3xl mx-auto px-6 py-20 md:py-24">
        <header className="mb-14">
          <h1 className="text-xl font-medium tracking-tight">Scribe</h1>
          <p className="mt-2 text-sm text-secondary">
            Multi-stage AI pipeline for trustworthy meeting summaries. 
            Extract → Deduplicate → Synthesize → Validate.
          </p>
        </header>

        {/* Step 1: Upload Transcript */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-10 border border-dashed border-border rounded-lg bg-surface/40 text-center hover:bg-surface transition-colors cursor-pointer relative group">
              <input
                type="file"
                accept=".txt,.md,.srt,.vtt"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileUpload}
              />
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-white rounded-md shadow-subtle text-secondary group-hover:scale-105 transition-transform">
                  <Upload size={20} strokeWidth={1.5} />
                </div>
                <div className="text-sm text-secondary">
                  <span className="text-primary font-medium">Click to upload</span> or drag a transcript file
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-tertiary">Or paste text</span>
              </div>
            </div>

            <textarea
              className="w-full h-56 p-4 bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm text-secondary resize-none"
              placeholder="Paste raw transcript here..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />

            {/* Optional Metadata Fields */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="text-xs font-medium text-secondary mb-3">
                Meeting Information <span className="text-tertiary font-normal">(optional but recommended)</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-secondary mb-1.5">Client Company</label>
                  <ContactSelector
                    value={clientCompanyId}
                    onChange={setClientCompanyId}
                    placeholder="Select company"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-secondary mb-1.5">Meeting Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm text-primary"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-secondary mb-1.5">Meeting Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm text-primary"
                  placeholder="e.g., Q4 Planning Session"
                  value={meetingName}
                  onChange={(e) => setMeetingName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs text-secondary mb-1.5">Participants</label>
                <ParticipantSelector
                  value={participantIds}
                  onChange={setParticipantIds}
                  placeholder="Select participants"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                disabled={!transcript.trim()}
                onClick={() => setStep(2)}
                className="bg-primary text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-black/80 disabled:opacity-50 transition-all"
              >
                Configure Pipeline
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Configure Pipeline */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isGenerating ? (
              <PipelineStatus />
            ) : (
              <div className="space-y-10">
                {/* Pipeline Package Selection */}
                <section>
                  <h2 className="text-xs font-medium text-secondary mb-4">
                    Pipeline Configuration
                  </h2>
                  <PackageSelector
                    selectedPackageId={selectedPackageId}
                    customConfig={customConfig}
                    onPackageChange={setSelectedPackageId}
                    onCustomConfigChange={setCustomConfig}
                  />
                </section>

                {/* Template Selection */}
                <section>
                  <h2 className="text-xs font-medium text-secondary mb-4">
                    Output Template
                  </h2>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {TEMPLATES.map((t) => {
                      const selected = t.id === selectedTemplateId;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTemplateId(t.id)}
                          className={[
                            "px-4 py-2 rounded-md text-sm border whitespace-nowrap transition-colors",
                            selected
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-secondary border-border hover:border-gray-300",
                          ].join(" ")}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                  <details className="mt-3">
                    <summary className="text-sm text-tertiary cursor-pointer hover:text-secondary">
                      View template instructions
                    </summary>
                    <pre className="mt-2 p-3 bg-surface rounded-md text-xs text-secondary whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                      {selectedTemplate.prompt}
                    </pre>
                  </details>
                </section>

                {/* Actions */}
                <div className="flex justify-between pt-6 border-t border-border">
                  <button onClick={() => setStep(1)} className="text-sm text-secondary hover:text-primary">
                    Back
                  </button>
                  <button
                    onClick={generateNotes}
                    className="bg-primary text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-black/80 flex items-center gap-2"
                  >
                    Run Pipeline <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header with actions */}
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => setStep(2)}
                className="text-sm text-secondary hover:text-primary"
              >
                ← Back to config
              </button>
              <div className="flex gap-3">
                <button
                  onClick={startOver}
                  className="px-4 py-2 text-sm text-secondary border border-border rounded-md hover:bg-surface"
                >
                  New transcript
                </button>
                <button
                  onClick={downloadForNotion}
                  disabled={!result.summary.trim()}
                  className="bg-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-accentHover flex items-center gap-2 shadow-subtle disabled:opacity-50"
                >
                  <Download size={16} /> Download .md
                </button>
              </div>
            </div>

            {/* Confidence Score */}
            <div className="mb-6">
              <ConfidenceScore
                score={result.confidence}
                flags={result.validationFlags}
                showDetails={true}
              />
            </div>

            {/* Processing time (subtle) */}
            <div className="mb-4 text-xs text-tertiary flex gap-4">
              <span>Total: {(result.processingTime.total / 1000).toFixed(1)}s</span>
              <span>Extract: {(result.processingTime.extraction / 1000).toFixed(1)}s</span>
              <span>Write: {(result.processingTime.synthesis / 1000).toFixed(1)}s</span>
              <span>Validate: {(result.processingTime.validation / 1000).toFixed(1)}s</span>
            </div>

            {/* Summary */}
            <div className="bg-white border border-border rounded-lg p-8 md:p-10 min-h-[60vh]">
              {!result.summary.trim() ? (
                <div className="text-sm text-secondary">No summary generated.</div>
              ) : (
                <article className="prose prose-sm max-w-none prose-headings:font-medium prose-headings:text-primary prose-p:text-secondary prose-li:text-secondary prose-strong:text-primary">
                  <ReactMarkdown>{result.summary}</ReactMarkdown>
                </article>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-14 text-xs text-tertiary">
          <p className="mb-2">
            <strong>Pipeline:</strong> Extract facts → Deduplicate → Synthesize → Validate
          </p>
          <p>
            Tip: In Notion, use <span className="font-mono">Settings → Import → Text &amp; Markdown</span> and upload the .md file.
          </p>
        </footer>
      </div>
    </div>
  );
}
