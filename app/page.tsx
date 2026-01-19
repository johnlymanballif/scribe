"use client";

import { useMemo, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { 
  ArrowRight, 
  Download, 
  Upload
} from "lucide-react";
import {
  DocumentTextIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

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

type Section = "scribe" | "contacts";

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function MeetingNotesApp() {
  // Navigation state
  const [activeSection, setActiveSection] = useState<Section>("scribe");
  
  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Input state
  const [transcript, setTranscript] = useState("");
  
  // Metadata state (optional but recommended)
  const [clientCompanyIds, setClientCompanyIds] = useState<string[]>([]);
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
  const [currentPipelineStage, setCurrentPipelineStage] = useState<"extraction" | "deduplication" | "synthesis" | "validation" | "complete" | null>(null);

  // Result state
  const [result, setResult] = useState<PipelineResult | null>(null);

  const selectedTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === selectedTemplateId) ?? TEMPLATES[0],
    [selectedTemplateId]
  );

  // Fetch contacts on mount and set default "New Apology"
  useEffect(() => {
    fetch("/api/contacts")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const fetchedCompanies = data.companies || [];
        const fetchedPeople = data.people || [];
        setCompanies(fetchedCompanies);
        setPeople(fetchedPeople);
        
        // Set "New Apology" as default client if it exists
        const newApologyCompany = fetchedCompanies.find(
          (c: Company) => c.name === "New Apology"
        );
        if (newApologyCompany) {
          setClientCompanyIds([newApologyCompany.id]);
        }
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
    setCurrentPipelineStage("extraction");

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
            clientName: clientCompanyIds.length > 0 ? clientCompanyIds.map(id => companies.find(c => c.id === id)?.name).filter(Boolean).join(", ") : undefined,
            participants: participantIds.length > 0 ? people.filter(p => participantIds.includes(p.id)).map(p => p.name) : undefined,
            meetingName: meetingName.trim() || undefined,
            date: meetingDate.trim() || undefined,
          },
        }),
      });

      if (!response.ok) {
        // Non-streaming error response
        const data = await response.json();
        const errorMessage = data?.error || data?.details || "Request failed";
        throw new Error(errorMessage);
      }

      // Handle Server-Sent Events stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep incomplete event in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            try {
              const event = JSON.parse(jsonStr);

              if (event.type === "progress") {
                setCurrentPipelineStage(event.stage);
              } else if (event.type === "complete") {
                setCurrentPipelineStage("complete");
                const pipelineResult: PipelineResult = {
                  summary: event.result.summary || "",
                  confidence: event.result.confidence ?? 70,
                  validationFlags: event.result.validation_flags || [],
                  processingTime: event.result.processingTime || {
                    extraction: 0,
                    deduplication: 0,
                    synthesis: 0,
                    validation: 0,
                    total: 0,
                  },
                };
                setResult(pipelineResult);
                setStep(3);
              } else if (event.type === "error") {
                throw new Error(event.error || "Pipeline error");
              }
            } catch (parseErr) {
              console.error("Failed to parse SSE event:", parseErr);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Error generating notes. Please try again.";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
      setCurrentPipelineStage(null);
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
    // Reset to default "New Apology" if it exists
    const newApologyCompany = companies.find((c) => c.name === "New Apology");
    setClientCompanyIds(newApologyCompany ? [newApologyCompany.id] : []);
    setParticipantIds([]);
    setMeetingName("");
    setMeetingDate("");
  };

  return (
    <div className="min-h-screen bg-background">
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-16" tabIndex={-1}>
        {activeSection === "scribe" ? (
          <ScribeSection
            step={step}
            setStep={setStep}
            transcript={transcript}
            setTranscript={setTranscript}
            clientCompanyIds={clientCompanyIds}
            setClientCompanyIds={setClientCompanyIds}
            participantIds={participantIds}
            setParticipantIds={setParticipantIds}
            meetingName={meetingName}
            setMeetingName={setMeetingName}
            meetingDate={meetingDate}
            setMeetingDate={setMeetingDate}
            companies={companies}
            people={people}
            selectedPackageId={selectedPackageId}
            setSelectedPackageId={setSelectedPackageId}
            customConfig={customConfig}
            setCustomConfig={setCustomConfig}
            selectedTemplateId={selectedTemplateId}
            setSelectedTemplateId={setSelectedTemplateId}
            isGenerating={isGenerating}
            currentPipelineStage={currentPipelineStage}
            result={result}
            handleFileUpload={handleFileUpload}
            generateNotes={generateNotes}
            downloadForNotion={downloadForNotion}
            startOver={startOver}
          />
        ) : (
          <div className="space-y-8">
            <div className="space-y-2">
              <h1 className="text-xl font-medium tracking-tight text-balance">Contacts</h1>
              <p className="text-sm text-tertiary leading-relaxed">
                Manage companies, people, and transcription corrections
              </p>
            </div>
            <div className="border-t border-border/30 pt-8">
              {/* We'll redirect to the contacts page for full functionality */}
              <div className="text-center py-12">
                <p className="text-sm text-tertiary mb-4">Full contact management is available on the dedicated contacts page.</p>
                <button
                  onClick={() => window.location.href = '/contacts'}
                  className="text-sm text-primary hover:text-secondary transition-colors flex items-center gap-2 justify-center"
                >
                  Go to Contacts <ArrowRight size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ScribeSection({
  step,
  setStep,
  transcript,
  setTranscript,
  clientCompanyIds,
  setClientCompanyIds,
  participantIds,
  setParticipantIds,
  meetingName,
  setMeetingName,
  meetingDate,
  setMeetingDate,
  companies,
  people,
  selectedPackageId,
  setSelectedPackageId,
  customConfig,
  setCustomConfig,
  selectedTemplateId,
  setSelectedTemplateId,
  isGenerating,
  currentPipelineStage,
  result,
  handleFileUpload,
  generateNotes,
  downloadForNotion,
  startOver
}: {
  step: 1 | 2 | 3;
  setStep: (step: 1 | 2 | 3) => void;
  transcript: string;
  setTranscript: (transcript: string) => void;
  clientCompanyIds: string[];
  setClientCompanyIds: (ids: string[]) => void;
  participantIds: string[];
  setParticipantIds: (ids: string[]) => void;
  meetingName: string;
  setMeetingName: (name: string) => void;
  meetingDate: string;
  setMeetingDate: (date: string) => void;
  companies: Company[];
  people: Person[];
  selectedPackageId: PackageId;
  setSelectedPackageId: (id: PackageId) => void;
  customConfig: PipelineStageConfig;
  setCustomConfig: (config: PipelineStageConfig) => void;
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  isGenerating: boolean;
  currentPipelineStage: "extraction" | "deduplication" | "synthesis" | "validation" | "complete" | null;
  result: PipelineResult | null;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  generateNotes: () => Promise<void>;
  downloadForNotion: () => void;
  startOver: () => void;
}) {
  const selectedTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === selectedTemplateId) ?? TEMPLATES[0],
    [selectedTemplateId]
  );

  return (
    <div className="space-y-12">
      {step === 1 && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-2">
            <h1 className="text-xl font-medium tracking-tight text-balance">Generate Meeting Summary</h1>
            <p className="text-sm text-tertiary leading-relaxed">
              Upload or paste your transcript to begin processing
            </p>
          </div>

          <div className="space-y-10">
            <div className="space-y-3">
              <label className="text-sm text-secondary">Transcript</label>
              <textarea
                placeholder="Paste your meeting transcript here..."
                className="w-full min-h-[240px] resize-none text-sm leading-relaxed bg-white border border-border/40 rounded-lg px-4 py-3 focus-visible:ring-0 transition-colors"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
              <div className="relative">
                <input
                  type="file"
                  accept=".txt,.md,.srt,.vtt"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                />
                <button className="inline-flex items-center gap-2 px-3 py-2 text-sm text-tertiary hover:text-primary transition-colors border border-border/40 rounded-lg hover:border-border/80">
                  <Upload className="w-4 h-4" />
                  Upload file
                </button>
              </div>
            </div>

            <div className="space-y-5 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm text-secondary">Meeting Name</label>
                  <input
                    placeholder="Q4 Strategy Review"
                    className="w-full bg-white border border-border/40 rounded-lg px-3 py-2 text-sm focus:ring-0 transition-colors"
                    value={meetingName}
                    onChange={(e) => setMeetingName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-secondary">Meeting Date</label>
                  <input
                    type="date"
                    className="w-full bg-white border border-border/40 rounded-lg px-3 py-2 text-sm focus:ring-0 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm text-secondary">Client Company</label>
                  <ContactSelector
                    value={clientCompanyIds}
                    onChange={setClientCompanyIds}
                    placeholder="Select companies"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-secondary">Participants</label>
                  <ParticipantSelector
                    value={participantIds}
                    onChange={setParticipantIds}
                    placeholder="Select participants"
                    companyId={clientCompanyIds.length === 1 ? clientCompanyIds[0] : undefined}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setStep(2)} 
                disabled={!transcript.trim()}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                Configure Pipeline <ArrowRight size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isGenerating ? (
            <div className="space-y-12">
              <div className="space-y-2">
                <h1 className="text-xl font-medium tracking-tight">Generating Summary</h1>
                <p className="text-sm text-tertiary leading-relaxed">
                  Processing your transcript through the pipeline
                </p>
              </div>
              <PipelineStatus currentStage={currentPipelineStage || undefined} />
            </div>
          ) : (
            <div className="space-y-12">
              <div className="space-y-2">
                <h1 className="text-xl font-medium tracking-tight">Configure Pipeline</h1>
                <p className="text-sm text-tertiary leading-relaxed">
                  Customize processing stages for your summary
                </p>
              </div>

              <div className="space-y-10">
                {/* Pipeline Package Selection */}
                <section>
                  <h2 className="text-sm font-medium text-secondary mb-4">
                    Processing Package
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
                  <h2 className="text-sm font-medium text-secondary mb-4">
                    Output Template
                  </h2>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {TEMPLATES.map((t) => {
                      const selected = t.id === selectedTemplateId;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTemplateId(t.id)}
                          className={[
                            "px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all",
                            selected
                              ? "bg-primary text-white"
                              : "bg-surface hover:bg-surfaceHover text-secondary",
                          ].join(" ")}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                  <details className="mt-4">
                    <summary className="text-xs text-tertiary cursor-pointer hover:text-secondary transition-colors">
                      View template instructions
                    </summary>
                    <pre className="mt-3 p-4 bg-surface rounded-lg text-xs text-secondary whitespace-pre-wrap font-mono max-h-48 overflow-y-auto leading-relaxed">
                      {selectedTemplate.prompt}
                    </pre>
                  </details>
                </section>

                {/* Pipeline Stages */}
                <section>
                  <h2 className="text-sm font-medium text-secondary mb-4">
                    Pipeline Stages
                  </h2>
                  <div className="space-y-1">
                    {[
                      { name: "Extract", desc: "Identify facts, decisions, and tasks" },
                      { name: "Deduplicate", desc: "Merge repeated information" },
                      { name: "Synthesize", desc: "Convert to coherent narrative" },
                      { name: "Validate", desc: "Cross-check for accuracy" },
                    ].map((stage, i) => (
                      <div
                        key={stage.name}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface transition-colors"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs text-tertiary bg-surface border border-border/40 mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <div className="text-sm font-medium text-primary mb-0.5">{stage.name}</div>
                          <div className="text-xs text-tertiary leading-relaxed">{stage.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-border/30">
                <button 
                  onClick={() => setStep(1)} 
                  className="text-sm text-tertiary hover:text-primary transition-colors flex items-center gap-2"
                >
                  ← Back
                </button>
                <button
                  onClick={generateNotes}
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2 transition-all"
                >
                  Run Pipeline <ArrowRight size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && result && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-2">
            <h1 className="text-xl font-medium tracking-tight">Meeting Summary</h1>
            <p className="text-sm text-tertiary leading-relaxed">
              Your AI-generated summary is ready
            </p>
          </div>

          {/* Header with actions */}
          <div className="flex justify-between items-center my-8">
            <button
              onClick={() => setStep(2)}
              className="text-sm text-tertiary hover:text-primary transition-colors flex items-center gap-2"
            >
              ← Back
            </button>
            <div className="flex gap-3">
              <button
                onClick={startOver}
                className="px-4 py-2 text-sm text-tertiary hover:text-primary transition-colors rounded-lg border border-border/40 hover:border-border/80"
              >
                New transcript
              </button>
              <button
                onClick={downloadForNotion}
                disabled={!result.summary.trim()}
                className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accentHover flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                <Download size={16} strokeWidth={1.5} /> Download .md
              </button>
            </div>
          </div>

          {/* Confidence Score */}
          <div className="mb-8">
            <ConfidenceScore
              score={result.confidence}
              flags={result.validationFlags}
              showDetails={true}
            />
          </div>

          {/* Processing time (subtle) */}
          <div className="mb-8 text-xs text-tertiary font-mono flex gap-6">
            <span>Total: {(result.processingTime.total / 1000).toFixed(1)}s</span>
            <span>Extract: {(result.processingTime.extraction / 1000).toFixed(1)}s</span>
            <span>Write: {(result.processingTime.synthesis / 1000).toFixed(1)}s</span>
            <span>Validate: {(result.processingTime.validation / 1000).toFixed(1)}s</span>
          </div>

          {/* Summary */}
          <div className="bg-white/50 rounded-xl p-8 md:p-10 min-h-[60vh] border border-border/40">
            {!result.summary.trim() ? (
              <div className="text-sm text-tertiary">No summary generated.</div>
            ) : (
              <article className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:font-normal prose-headings:text-primary prose-p:text-secondary prose-p:leading-relaxed prose-li:text-secondary prose-strong:text-primary prose-strong:font-medium">
                <ReactMarkdown>{result.summary}</ReactMarkdown>
              </article>
            )}
          </div>

          {/* Save Contact Section */}
          <div className="mt-8 border-t border-border/30 pt-8">
            <details className="group">
              <summary className="text-sm font-medium text-secondary cursor-pointer hover:text-primary transition-colors flex items-center gap-2">
                <span className="text-tertiary group-open:rotate-90 transition-transform">▶</span>
                Save Contact
              </summary>
              <div className="mt-4 p-4 bg-surface/50 rounded-lg space-y-4">
                <div className="space-y-3">
                  <label className="text-sm text-secondary">Add Company</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="new-company-name"
                      placeholder="Company name"
                      className="flex-1 bg-white border border-border/40 rounded-lg px-3 py-2 text-sm focus:ring-0"
                    />
                    <button
                      onClick={async () => {
                        const input = document.getElementById("new-company-name") as HTMLInputElement;
                        const name = input?.value?.trim();
                        if (!name) return;
                        
                        try {
                          const response = await fetch("/api/contacts", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ type: "company", name }),
                          });
                          if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.error || "Failed to create company");
                          }
                          input.value = "";
                          alert("Company saved!");
                        } catch (error) {
                          alert(error instanceof Error ? error.message : "Failed to create company");
                        }
                      }}
                      aria-label="Save Company"
                      className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                    >
                      Save Company
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm text-secondary">Add Person</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      id="new-person-name"
                      placeholder="Name"
                      className="bg-white border border-border/40 rounded-lg px-3 py-2 text-sm focus:ring-0"
                    />
                    <input
                      type="text"
                      id="new-person-title"
                      placeholder="Title (optional)"
                      className="bg-white border border-border/40 rounded-lg px-3 py-2 text-sm focus:ring-0"
                    />
                    <button
                      onClick={async () => {
                        const nameInput = document.getElementById("new-person-name") as HTMLInputElement;
                        const titleInput = document.getElementById("new-person-title") as HTMLInputElement;
                        const name = nameInput?.value?.trim();
                        if (!name) return;
                        
                        try {
                          const response = await fetch("/api/contacts", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ 
                              type: "person", 
                              name, 
                              title: titleInput?.value?.trim() || undefined,
                              companyId: clientCompanyIds.length === 1 ? clientCompanyIds[0] : undefined,
                            }),
                          });
                          if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.error || "Failed to create person");
                          }
                          nameInput.value = "";
                          titleInput.value = "";
                          alert("Person saved!");
                        } catch (error) {
                          alert(error instanceof Error ? error.message : "Failed to create person");
                        }
                      }}
                      aria-label="Save Contact"
                      className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                    >
                      Save Contact
                    </button>
                  </div>
                  {clientCompanyIds.length === 1 && (
                    <p className="text-xs text-tertiary">
                      Person will be associated with: <span className="text-primary">{companies.find(c => c.id === clientCompanyIds[0])?.name || "selected company"}</span>
                    </p>
                  )}
                </div>
              </div>
            </details>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-border/30 text-xs text-tertiary">
            <p className="mb-2">
              <span className="text-secondary">Pipeline:</span> Extract facts → Deduplicate → Synthesize → Validate
            </p>
            <p>
              Tip: In Notion, use <span className="font-mono">Settings → Import → Text & Markdown</span> and upload the .md file.
            </p>
          </footer>
        </div>
      )}
    </div>
  );
}
