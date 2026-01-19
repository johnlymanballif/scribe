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

interface PipelineStatusProps {
  /** Current stage from streaming API (optional - falls back to estimated timing) */
  currentStage?: StageId | "complete";
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function PipelineStatus({ currentStage: propStage }: PipelineStatusProps) {
  const [elapsed, setElapsed] = useState(0);
  const [stageStartTime, setStageStartTime] = useState(0);
  const [showLongMessage, setShowLongMessage] = useState(false);

  // Calculate current stage index from prop or default to 0
  const currentStageIndex = propStage
    ? STAGES.findIndex(s => s.id === propStage)
    : 0;

  // If propStage is "complete" or not found, show last stage as active
  const effectiveStageIndex = currentStageIndex === -1
    ? (propStage === "complete" ? STAGES.length : 0)
    : currentStageIndex;

  // Track total elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reset long message timer when stage changes
  useEffect(() => {
    setShowLongMessage(false);
    setStageStartTime(elapsed);
    const timeout = setTimeout(() => {
      setShowLongMessage(true);
    }, 15000);
    return () => clearTimeout(timeout);
  }, [effectiveStageIndex]);

  const currentStage = STAGES[Math.min(effectiveStageIndex, STAGES.length - 1)];
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const isComplete = propStage === "complete";

  return (
    <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-500">
      {/* Stage indicator dots */}
      <div className="flex items-center gap-2 mb-8">
        {STAGES.map((stage, index) => {
          const isActive = !isComplete && index === effectiveStageIndex;
          const isCompleted = isComplete || index < effectiveStageIndex;

          return (
            <div key={stage.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "w-3 h-3 rounded-full transition-all duration-300",
                    isCompleted ? "bg-emerald-500" : "",
                    isActive ? "bg-accent ring-4 ring-accent/20 animate-pulse" : "",
                    !isCompleted && !isActive ? "bg-gray-200" : "",
                  ].join(" ")}
                />
                <span className={[
                  "text-[10px] mt-1.5 transition-colors",
                  isActive ? "text-primary font-medium" : "",
                  isCompleted ? "text-emerald-600" : "",
                  !isCompleted && !isActive ? "text-tertiary" : "",
                ].join(" ")}>
                  {stage.label}
                </span>
              </div>
              {index < STAGES.length - 1 && (
                <div
                  className={[
                    "w-8 h-0.5 mx-2 mb-5 transition-colors duration-300",
                    isCompleted ? "bg-emerald-500" : "bg-gray-200",
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
          {!isComplete && (
            <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-accent animate-spin absolute" />
          )}
          <span className="text-xs font-mono text-secondary">
            {minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : `${seconds}s`}
          </span>
        </div>
      </div>

      {/* Current stage message */}
      <div className="text-center max-w-xs">
        <div className="text-sm font-medium text-primary mb-1">
          {isComplete ? "Complete!" : currentStage.message}
        </div>
        {!isComplete && showLongMessage && (
          <div className="text-xs text-tertiary animate-in fade-in duration-500">
            {currentStage.longMessage}
          </div>
        )}
      </div>

      {/* Helpful tip */}
      {!isComplete && elapsed > 30 && (
        <div className="mt-8 text-xs text-tertiary bg-surface px-4 py-2 rounded-md animate-in fade-in duration-500">
          Almost there! Complex transcripts may take a bit longer.
        </div>
      )}
    </div>
  );
}
