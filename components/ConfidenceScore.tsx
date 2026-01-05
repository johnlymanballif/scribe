"use client";

import { useMemo } from "react";
import type { ValidationFlag } from "@/lib/pipeline";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ConfidenceScoreProps {
  score: number;
  flags?: ValidationFlag[];
  showDetails?: boolean;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ConfidenceScore({ 
  score, 
  flags = [], 
  showDetails = true 
}: ConfidenceScoreProps) {
  const { level, color, bgColor, label, description } = useMemo(() => {
    if (score >= 90) {
      return {
        level: "high",
        color: "text-emerald-600",
        bgColor: "bg-emerald-50 border-emerald-200",
        label: "High Confidence",
        description: "Summary is well-supported by extracted facts",
      };
    }
    if (score >= 70) {
      return {
        level: "good",
        color: "text-sky-600",
        bgColor: "bg-sky-50 border-sky-200",
        label: "Good Confidence",
        description: "Summary is generally accurate with minor issues",
      };
    }
    if (score >= 50) {
      return {
        level: "moderate",
        color: "text-amber-600",
        bgColor: "bg-amber-50 border-amber-200",
        label: "Moderate Confidence",
        description: "Some claims may need verification",
      };
    }
    return {
      level: "low",
      color: "text-rose-600",
      bgColor: "bg-rose-50 border-rose-200",
      label: "Low Confidence",
      description: "Manual review recommended",
    };
  }, [score]);

  const errorCount = flags.filter(f => f.severity === "error").length;
  const warningCount = flags.filter(f => f.severity === "warning").length;

  return (
    <div className={`rounded-lg border p-5 ${bgColor}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <ScoreIcon level={level} />
          <span className={`text-sm font-medium ${color}`}>{label}</span>
        </div>
        <div className={`text-2xl font-mono tabular-nums ${color}`}>
          {score}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-secondary leading-relaxed">{description}</p>

      {/* Flags summary */}
      {showDetails && (errorCount > 0 || warningCount > 0) && (
        <div className="flex gap-4 text-xs mt-3 pt-3 border-t border-current/10">
          {errorCount > 0 && (
            <span className="text-rose-600">
              {errorCount} issue{errorCount > 1 ? "s" : ""}
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-amber-600">
              {warningCount} warning{warningCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Detailed flags */}
      {showDetails && flags.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-tertiary cursor-pointer hover:text-secondary transition-colors">
            View validation details
          </summary>
          <ul className="mt-3 space-y-2">
            {flags.slice(0, 5).map((flag, index) => (
              <li key={index} className="text-xs flex items-start gap-2">
                <span className={flag.severity === "error" ? "text-rose-500" : "text-amber-500"}>
                  {flag.severity === "error" ? "●" : "○"}
                </span>
                <span className="text-secondary leading-relaxed">{flag.description}</span>
              </li>
            ))}
            {flags.length > 5 && (
              <li className="text-xs text-tertiary pl-4">
                +{flags.length - 5} more...
              </li>
            )}
          </ul>
        </details>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function ScoreIcon({ level }: { level: string }) {
  if (level === "high") {
    return (
      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (level === "good") {
    return (
      <svg className="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (level === "moderate") {
    return (
      <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

