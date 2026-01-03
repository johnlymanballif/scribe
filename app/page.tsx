"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, ArrowRight, Download, Upload } from "lucide-react";

import LoadingStatus from "@/components/LoadingStatus";
import { MODELS, TEMPLATES, calculateCost } from "@/lib/constants";

export default function MeetingNotesApp() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [transcript, setTranscript] = useState("");
  const [selectedModelId, setSelectedModelId] = useState(MODELS[0].id);
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATES[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notes, setNotes] = useState("");

  const selectedModel = useMemo(
    () => MODELS.find((m) => m.id === selectedModelId) ?? MODELS[0],
    [selectedModelId]
  );
  const selectedTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === selectedTemplateId) ?? TEMPLATES[0],
    [selectedTemplateId]
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => setTranscript((evt.target?.result as string) || "");
    reader.readAsText(file);
  };

  const generateNotes = async () => {
    setIsGenerating(true);
    setNotes("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          model: selectedModelId,
          templatePrompt: selectedTemplate.prompt,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorMessage = data?.error || data?.details || "Request failed";
        throw new Error(errorMessage);
      }

      setNotes(data.notes || "");
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
    const blob = new Blob([notes], { type: "text/markdown; charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `Meeting_Notes_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-primary font-sans selection:bg-accent/20">
      <div className="max-w-3xl mx-auto px-6 py-20 md:py-24">
        <header className="mb-14">
          <h1 className="text-xl font-medium tracking-tight">Scribe</h1>
          <p className="mt-2 text-sm text-secondary">
            Upload or paste a transcript → choose a model + template → export Markdown that imports cleanly into Notion.
          </p>
        </header>

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
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-tertiary">Or paste text</span>
              </div>
            </div>

            <textarea
              className="w-full h-56 p-4 bg-white border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/50 text-sm text-secondary resize-none"
              placeholder="Paste raw transcript here..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />

            <div className="flex justify-end">
              <button
                disabled={!transcript.trim()}
                onClick={() => setStep(2)}
                className="bg-primary text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-black/80 disabled:opacity-50 transition-all"
              >
                Configure
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isGenerating ? (
              <LoadingStatus />
            ) : (
              <div className="space-y-10">
                <section>
                  <h2 className="text-xs font-medium text-secondary mb-4 uppercase tracking-wider">
                    Select model
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {MODELS.map((model) => {
                      const selected = model.id === selectedModelId;
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => setSelectedModelId(model.id)}
                          className={[
                            "text-left p-4 rounded-lg border transition-colors",
                            selected
                              ? "bg-white border-border"
                              : "bg-surface border-transparent hover:bg-surfaceHover",
                          ].join(" ")}
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <div className="text-sm font-medium">{model.name}</div>
                              <div className="mt-0.5 text-xs text-tertiary">{model.provider}</div>
                            </div>
                            {selected && <Check size={16} className="text-accent" />}
                          </div>
                          <p className="mt-3 text-xs text-secondary">{model.description}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="text-[10px] text-tertiary font-mono bg-white/60 px-2 py-1 rounded">
                              Est. cost (1h): ${calculateCost(model.id)}
                            </span>
                            {model.contextTokens ? (
                              <span className="text-[10px] text-tertiary font-mono bg-white/60 px-2 py-1 rounded">
                                Context: {model.contextTokens.toLocaleString()}
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <h2 className="text-xs font-medium text-secondary mb-4 uppercase tracking-wider">
                    Output template
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
                  <p className="mt-3 text-sm text-secondary">
                    <span className="text-tertiary">Template behavior:</span>{" "}
                    {selectedTemplate.prompt}
                  </p>
                </section>

                <div className="flex justify-between pt-6 border-t border-border">
                  <button onClick={() => setStep(1)} className="text-sm text-secondary hover:text-primary">
                    Back
                  </button>
                  <button
                    onClick={generateNotes}
                    className="bg-primary text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-black/80 flex items-center gap-2"
                  >
                    Generate <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => setStep(2)}
                className="text-sm text-secondary hover:text-primary"
              >
                ← Back to config
              </button>
              <button
                onClick={downloadForNotion}
                disabled={!notes.trim()}
                className="bg-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-accentHover flex items-center gap-2 shadow-subtle disabled:opacity-50"
              >
                <Download size={16} /> Download .md
              </button>
            </div>

            <div className="bg-white border border-border rounded-lg p-8 md:p-10 min-h-[60vh]">
              {!notes.trim() ? (
                <div className="text-sm text-secondary">No notes generated yet.</div>
              ) : (
                <article className="prose prose-sm max-w-none prose-headings:font-medium prose-headings:text-primary prose-p:text-secondary prose-li:text-secondary prose-strong:text-primary">
                  <ReactMarkdown>{notes}</ReactMarkdown>
                </article>
              )}
            </div>
          </div>
        )}

        <footer className="mt-14 text-xs text-tertiary">
          Tip: In Notion, use <span className="font-mono">Settings → Import → Text &amp; Markdown</span> and upload the .md file.
        </footer>
      </div>
    </div>
  );
}
