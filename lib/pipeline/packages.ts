// =============================================================================
// Model Package Configurations
// =============================================================================

import type { ModelPackage, PipelineModelId, PipelineStageConfig, PackageId } from "./types";

// -----------------------------------------------------------------------------
// Allowed Models for Pipeline
// -----------------------------------------------------------------------------

export interface PipelineModelInfo {
  id: PipelineModelId;
  name: string;
  provider: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  description: string;
  strengths: string[];
  contextTokens: number;
}

export const PIPELINE_MODELS: Record<PipelineModelId, PipelineModelInfo> = {
  "anthropic/claude-sonnet-4": {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
    description: "Nuanced writing, strong structure, excellent judgment",
    strengths: ["writing", "reasoning", "instruction-following"],
    contextTokens: 200_000,
  },
  "anthropic/claude-haiku-4": {
    id: "anthropic/claude-haiku-4",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.0,
    description: "Fast and affordable with strong instruction-following",
    strengths: ["speed", "cost-efficiency", "instruction-following"],
    contextTokens: 200_000,
  },
  "deepseek/deepseek-r1": {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    inputCostPer1M: 0.55,
    outputCostPer1M: 2.19,
    description: "Strong reasoning model, excellent for extraction and validation",
    strengths: ["reasoning", "analysis", "structured-output"],
    contextTokens: 64_000,
  },
  "moonshotai/kimi-k2": {
    id: "moonshotai/kimi-k2",
    name: "Kimi K2",
    provider: "MoonshotAI",
    inputCostPer1M: 0.6,
    outputCostPer1M: 2.5,
    description: "Fast, capable, good value for synthesis",
    strengths: ["speed", "long-context", "formatting"],
    contextTokens: 131_072,
  },
  "google/gemini-2.5-flash": {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    description: "Very fast with massive context window, great for long meetings",
    strengths: ["speed", "long-context", "cost-efficiency"],
    contextTokens: 1_048_576,
  },
  "openai/gpt-4o": {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    inputCostPer1M: 2.5,
    outputCostPer1M: 10.0,
    description: "Top-tier generalist with reliable formatting and clarity",
    strengths: ["writing", "reasoning", "reliability"],
    contextTokens: 128_000,
  },
};

// -----------------------------------------------------------------------------
// Preset Packages
// -----------------------------------------------------------------------------

export const MODEL_PACKAGES: Record<Exclude<PackageId, "CUSTOM">, ModelPackage> = {
  TRUST_MAX: {
    id: "TRUST_MAX",
    name: "Trust Max",
    description: "Maximum reliability for sensitive meetings. Uses Claude for extraction and writing.",
    stages: {
      extraction: "anthropic/claude-sonnet-4",
      synthesis: "anthropic/claude-sonnet-4",
      validation: "anthropic/claude-haiku-4",
    },
    risk_level: "low",
    use_cases: ["HR discussions", "Legal meetings", "Board meetings", "Sensitive topics"],
  },
  BALANCED_PRO: {
    id: "BALANCED_PRO",
    name: "Balanced Pro",
    description: "Fast and accurate. Gemini extracts, Claude writes, Haiku validates. ~30s total.",
    stages: {
      extraction: "google/gemini-2.5-flash",
      synthesis: "anthropic/claude-sonnet-4",
      validation: "anthropic/claude-haiku-4",
    },
    risk_level: "low",
    use_cases: ["Team syncs", "Project updates", "Planning sessions", "General meetings"],
  },
  FAST_ELEGANT: {
    id: "FAST_ELEGANT",
    name: "Fast & Elegant",
    description: "Speed-optimized for internal use. Gemini for extraction and validation. ~20s total.",
    stages: {
      extraction: "google/gemini-2.5-flash",
      synthesis: "moonshotai/kimi-k2",
      validation: "google/gemini-2.5-flash",
    },
    risk_level: "medium",
    use_cases: ["Brainstorms", "Internal syncs", "Creative sessions", "Low-stakes meetings"],
  },
};

// -----------------------------------------------------------------------------
// Package Utilities
// -----------------------------------------------------------------------------

/**
 * Get a package configuration by ID
 */
export function getPackage(packageId: PackageId): ModelPackage | null {
  if (packageId === "CUSTOM") {
    return null;
  }
  return MODEL_PACKAGES[packageId] ?? null;
}

/**
 * Get stage configuration from package ID or custom config
 */
export function getStageConfig(
  packageId: PackageId,
  customConfig?: PipelineStageConfig
): PipelineStageConfig {
  if (packageId === "CUSTOM" && customConfig) {
    return customConfig;
  }
  const pkg = getPackage(packageId);
  if (!pkg) {
    // Default to BALANCED_PRO if invalid
    return MODEL_PACKAGES.BALANCED_PRO.stages;
  }
  return pkg.stages;
}

/**
 * Determine risk level for a custom configuration
 */
export function getCustomConfigRiskLevel(config: PipelineStageConfig): "low" | "medium" | "high" {
  const isClaudeWriter = config.synthesis.includes("anthropic/claude");
  const isClaudeValidator = config.validation.includes("anthropic/claude");
  const isGptWriter = config.synthesis === "openai/gpt-4o";
  
  if (isClaudeWriter) {
    return "low";
  }
  
  if (isGptWriter || isClaudeValidator) {
    return "medium";
  }
  
  return "high";
}

/**
 * Check if validation is mandatory for the given configuration
 * Validation is mandatory for non-Claude/non-GPT writers
 */
export function isValidationMandatory(config: PipelineStageConfig): boolean {
  const trustedWriters = [
    "anthropic/claude-sonnet-4",
    "anthropic/claude-haiku-4",
    "openai/gpt-4o",
  ];
  return !trustedWriters.includes(config.synthesis);
}

/**
 * Calculate estimated cost for a pipeline run
 * Assumes ~12k input tokens per stage, ~2k output for extraction/validation, ~1k for synthesis
 */
export function calculatePipelineCost(config: PipelineStageConfig): {
  extraction: number;
  synthesis: number;
  validation: number;
  total: number;
} {
  const extractionModel = PIPELINE_MODELS[config.extraction];
  const synthesisModel = PIPELINE_MODELS[config.synthesis];
  const validationModel = PIPELINE_MODELS[config.validation];

  // Rough token estimates per stage
  const estimates = {
    extraction: { input: 12000, output: 3000 },
    synthesis: { input: 4000, output: 1500 },
    validation: { input: 6000, output: 1000 },
  };

  const extractionCost =
    (estimates.extraction.input / 1_000_000) * extractionModel.inputCostPer1M +
    (estimates.extraction.output / 1_000_000) * extractionModel.outputCostPer1M;

  const synthesisCost =
    (estimates.synthesis.input / 1_000_000) * synthesisModel.inputCostPer1M +
    (estimates.synthesis.output / 1_000_000) * synthesisModel.outputCostPer1M;

  const validationCost =
    (estimates.validation.input / 1_000_000) * validationModel.inputCostPer1M +
    (estimates.validation.output / 1_000_000) * validationModel.outputCostPer1M;

  return {
    extraction: extractionCost,
    synthesis: synthesisCost,
    validation: validationCost,
    total: extractionCost + synthesisCost + validationCost,
  };
}

/**
 * Get all available model IDs
 */
export function getAvailableModels(): PipelineModelId[] {
  return Object.keys(PIPELINE_MODELS) as PipelineModelId[];
}

/**
 * Get model info by ID
 */
export function getModelInfo(modelId: PipelineModelId): PipelineModelInfo {
  return PIPELINE_MODELS[modelId];
}

