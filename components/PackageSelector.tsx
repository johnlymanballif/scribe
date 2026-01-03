"use client";

import { useState } from "react";
import { Check, ChevronDown, Shield, Zap } from "lucide-react";
import { 
  MODEL_PACKAGES, 
  PIPELINE_MODELS, 
  getCustomConfigRiskLevel,
  calculatePipelineCost,
  type PackageId, 
  type PipelineStageConfig,
  type PipelineModelId,
} from "@/lib/pipeline";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface PackageSelectorProps {
  selectedPackageId: PackageId;
  customConfig: PipelineStageConfig;
  onPackageChange: (packageId: PackageId) => void;
  onCustomConfigChange: (config: PipelineStageConfig) => void;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function PackageSelector({
  selectedPackageId,
  customConfig,
  onPackageChange,
  onCustomConfigChange,
}: PackageSelectorProps) {
  const [isCustomExpanded, setIsCustomExpanded] = useState(selectedPackageId === "CUSTOM");

  const packages = Object.values(MODEL_PACKAGES);
  const isCustomSelected = selectedPackageId === "CUSTOM";
  
  const customRiskLevel = isCustomSelected ? getCustomConfigRiskLevel(customConfig) : null;
  const estimatedCost = calculatePipelineCost(
    isCustomSelected ? customConfig : MODEL_PACKAGES[selectedPackageId as keyof typeof MODEL_PACKAGES].stages
  );

  return (
    <div className="space-y-4">
      {/* Preset packages */}
      <div className="space-y-3">
        {packages.map((pkg) => {
          const isSelected = pkg.id === selectedPackageId;
          const cost = calculatePipelineCost(pkg.stages);
          
          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => {
                onPackageChange(pkg.id);
                setIsCustomExpanded(false);
              }}
              className={[
                "w-full text-left p-4 rounded-lg border transition-all duration-200",
                isSelected
                  ? "bg-white border-accent/50 shadow-sm ring-1 ring-accent/20"
                  : "bg-surface border-transparent hover:bg-surfaceHover hover:border-border",
              ].join(" ")}
            >
              {/* Header row */}
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <PackageIcon packageId={pkg.id} />
                  <span className="text-sm font-medium">{pkg.name}</span>
                  <RiskBadge level={pkg.risk_level} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-tertiary font-mono">
                    ~${cost.total.toFixed(3)}
                  </span>
                  {isSelected && <Check size={16} className="text-accent flex-shrink-0" />}
                </div>
              </div>
              
              {/* Description */}
              <p className="text-xs text-secondary mb-3">
                {pkg.description}
              </p>
              
              {/* Model assignments */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                <ModelStageLabel 
                  stage="Extract" 
                  modelId={pkg.stages.extraction} 
                  isSelected={isSelected}
                />
                <ModelStageLabel 
                  stage="Write" 
                  modelId={pkg.stages.synthesis} 
                  isSelected={isSelected}
                />
                <ModelStageLabel 
                  stage="Validate" 
                  modelId={pkg.stages.validation} 
                  isSelected={isSelected}
                />
              </div>

              {/* Use cases (when selected) */}
              {isSelected && pkg.use_cases.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-[10px] text-tertiary mb-1">Best for</div>
                  <div className="flex flex-wrap gap-1.5">
                    {pkg.use_cases.map((useCase) => (
                      <span 
                        key={useCase} 
                        className="text-[10px] text-secondary bg-surface px-2 py-0.5 rounded"
                      >
                        {useCase}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom mode toggle */}
      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => {
            if (isCustomSelected) {
              onPackageChange("BALANCED_PRO");
              setIsCustomExpanded(false);
            } else {
              onPackageChange("CUSTOM");
              setIsCustomExpanded(true);
            }
          }}
          className={[
            "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
            isCustomSelected
              ? "bg-white border-accent/50 shadow-sm"
              : "bg-surface border-transparent hover:bg-surfaceHover",
          ].join(" ")}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span className="text-sm font-medium">Custom Pipeline</span>
            {isCustomSelected && customRiskLevel && (
              <RiskBadge level={customRiskLevel} />
            )}
          </div>
          <ChevronDown 
            size={16} 
            className={`text-tertiary transition-transform ${isCustomExpanded ? "rotate-180" : ""}`} 
          />
        </button>

        {/* Custom configuration */}
        {isCustomExpanded && (
          <div className="mt-3 p-4 bg-white border border-border rounded-lg space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="text-xs text-tertiary">
              Select a model for each pipeline stage. Validation is mandatory for non-Claude writers.
            </div>
            
            <StageModelSelect
              label="Extraction"
              description="Extracts facts from transcript"
              value={customConfig.extraction}
              onChange={(value) => onCustomConfigChange({ ...customConfig, extraction: value })}
            />
            
            <StageModelSelect
              label="Synthesis"
              description="Writes the summary"
              value={customConfig.synthesis}
              onChange={(value) => onCustomConfigChange({ ...customConfig, synthesis: value })}
            />
            
            <StageModelSelect
              label="Validation"
              description="Verifies accuracy"
              value={customConfig.validation}
              onChange={(value) => onCustomConfigChange({ ...customConfig, validation: value })}
            />

            <div className="pt-2 border-t border-border flex justify-between text-xs text-tertiary">
              <span>Estimated cost (1h meeting)</span>
              <span className="font-mono">${estimatedCost.total.toFixed(3)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function PackageIcon({ packageId }: { packageId: PackageId }) {
  switch (packageId) {
    case "TRUST_MAX":
      return <Shield size={14} className="text-emerald-500" />;
    case "FAST_ELEGANT":
      return <Zap size={14} className="text-amber-500" />;
    default:
      return <div className="w-3.5 h-3.5 rounded-full bg-sky-100 border border-sky-300" />;
  }
}

function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const styles = {
    low: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    high: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const labels = {
    low: "Low risk",
    medium: "Medium risk",
    high: "Higher risk",
  };

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

function ModelStageLabel({ 
  stage, 
  modelId,
  isSelected,
}: { 
  stage: string; 
  modelId: PipelineModelId;
  isSelected: boolean;
}) {
  const model = PIPELINE_MODELS[modelId];
  const shortName = getShortModelName(modelId);
  
  return (
    <span className={isSelected ? "text-secondary" : "text-tertiary"}>
      <span className="text-tertiary">{stage}:</span>{" "}
      <span className={isSelected ? "font-medium" : ""}>{shortName}</span>
    </span>
  );
}

function getShortModelName(modelId: PipelineModelId): string {
  switch (modelId) {
    case "anthropic/claude-sonnet-4":
      return "Claude Sonnet 4.5";
    case "anthropic/claude-haiku-4":
      return "Claude Haiku 4.5";
    case "deepseek/deepseek-r1":
      return "DeepSeek R1";
    case "moonshotai/kimi-k2":
      return "Kimi K2";
    case "google/gemini-2.5-flash":
      return "Gemini 2.5 Flash";
    case "openai/gpt-4o":
      return "GPT-4o";
    default:
      return modelId;
  }
}

function StageModelSelect({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: PipelineModelId;
  onChange: (value: PipelineModelId) => void;
}) {
  const models = Object.values(PIPELINE_MODELS);

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="text-xs font-medium text-primary">{label}</label>
        <span className="text-[10px] text-tertiary">{description}</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PipelineModelId)}
        className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent/50"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name} — {model.description}
          </option>
        ))}
      </select>
    </div>
  );
}
