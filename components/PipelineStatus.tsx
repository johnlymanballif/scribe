"use client";

import { useEffect, useState } from "react";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type StageId = "extraction" | "deduplication" | "synthesis" | "validation";

interface Stage {
  id: StageId;
  label: string;
  message: string;
  longMessage: string;
}

const STAGES: Stage[] = [
  { 
    id: "extraction", 
    label: "Extract", 
    message: "Extracting facts from transcript...",
    longMessage: "Using Gemini Flash for fast extraction..."
  },
  { 
    id: "deduplication", 
    label: "Dedupe", 
    message: "Consolidating duplicates...",
    longMessage: "Merging similar items..."
  },
  { 
    id: "synthesis", 
    label: "Write", 
    message: "Writing summary...",
    longMessage: "Claude is crafting your notes..."
  },
  { 
    id: "validation", 
    label: "Validate", 
    message: "Validating claims...",
    longMessage: "Checking accuracy..."
  },
];

// Optimized timing estimates for fast models (Gemini Flash, Claude Haiku)
const STAGE_DURATIONS = {
  extraction: 8000,    // 8s - Gemini Flash is fast
  deduplication: 2000, // 2s - mostly deterministic
  synthesis: 12000,    // 12s - Claude writing
  validation: 6000,    // 6s - Claude Haiku is fast
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function PipelineStatus() {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showLongMessage, setShowLongMessage] = useState(false);

  // Track total elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Show "taking longer" message after 15 seconds on current stage
  useEffect(() => {
    setShowLongMessage(false);
    const timeout = setTimeout(() => {
      setShowLongMessage(true);
    }, 15000);
    return () => clearTimeout(timeout);
  }, [currentStageIndex]);

  // Advance through stages on estimated timing
  useEffect(() => {
    const currentStage = STAGES[currentStageIndex];
    const duration = STAGE_DURATIONS[currentStage.id];
    
    const stageTimeout = setTimeout(() => {
      if (currentStageIndex < STAGES.length - 1) {
        setCurrentStageIndex((prev) => prev + 1);
      }
    }, duration);

    return () => clearTimeout(stageTimeout);
  }, [currentStageIndex]);

  const currentStage = STAGES[currentStageIndex];
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-500">
      {/* Stage indicator dots */}
      <div className="flex items-center gap-2 mb-8">
        {STAGES.map((stage, index) => {
          const isActive = index === currentStageIndex;
          const isComplete = index < currentStageIndex;
          
          return (
            <div key={stage.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "w-3 h-3 rounded-full transition-all duration-300",
                    isComplete ? "bg-emerald-500" : "",
                    isActive ? "bg-accent ring-4 ring-accent/20 animate-pulse" : "",
                    !isComplete && !isActive ? "bg-gray-200" : "",
                  ].join(" ")}
                />
                <span className={[
                  "text-[10px] mt-1.5 transition-colors",
                  isActive ? "text-primary font-medium" : "",
                  isComplete ? "text-emerald-600" : "",
                  !isComplete && !isActive ? "text-tertiary" : "",
                ].join(" ")}>
                  {stage.label}
                </span>
              </div>
              {index < STAGES.length - 1 && (
                <div
                  className={[
                    "w-8 h-0.5 mx-2 mb-5 transition-colors duration-300",
                    isComplete ? "bg-emerald-500" : "bg-gray-200",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Animated spinner */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full border-4 border-surface flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-accent animate-spin absolute" />
          <span className="text-xs font-mono text-secondary">
            {minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : `${seconds}s`}
          </span>
        </div>
      </div>

      {/* Current stage message */}
      <div className="text-center max-w-xs">
        <div className="text-sm font-medium text-primary mb-1">
          {currentStage.message}
        </div>
        {showLongMessage && (
          <div className="text-xs text-tertiary animate-in fade-in duration-500">
            {currentStage.longMessage}
          </div>
        )}
      </div>

      {/* Helpful tip */}
      {elapsed > 30 && (
        <div className="mt-8 text-xs text-tertiary bg-surface px-4 py-2 rounded-md animate-in fade-in duration-500">
          Almost there! Complex transcripts may take a bit longer.
        </div>
      )}
    </div>
  );
}
