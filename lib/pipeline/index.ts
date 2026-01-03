// =============================================================================
// Pipeline Module Exports
// =============================================================================

// Types
export type {
  // Extraction types
  CertaintyLevel,
  SupportingQuote,
  Decision,
  Commitment,
  Risk,
  OpenQuestion,
  NotableQuote,
  ExtractedFacts,
  
  // Deduplication types
  DeduplicatedFacts,
  
  // Validation types
  DecisionValidation,
  CommitmentValidation,
  ValidationFlag,
  ValidationResult,
  
  // Configuration types
  PipelineModelId,
  PipelineStageConfig,
  PackageId,
  ModelPackage,
  PipelineConfig,
  
  // Execution types
  PipelineStage,
  StageResult,
  PipelineResult,
  
  // API types
  GenerateRequest,
  GenerateResponse,
  GenerateErrorResponse,
  MeetingMetadata,
} from "./types";

// Package configuration
export {
  PIPELINE_MODELS,
  MODEL_PACKAGES,
  getPackage,
  getStageConfig,
  getCustomConfigRiskLevel,
  isValidationMandatory,
  calculatePipelineCost,
  getAvailableModels,
  getModelInfo,
} from "./packages";
export type { PipelineModelInfo } from "./packages";

// Pipeline execution
export {
  executePipeline,
  executeValidationOnly,
  getStageMessage,
  calculateTotalTokens,
  getTimingBreakdown,
} from "./executor";
export type { PipelineStageStatus, PipelineProgress, PipelineOptions } from "./executor";

// Individual stages (for advanced use)
export { executeExtraction } from "./extraction";
export { executeDeduplication } from "./deduplication";
export { executeSynthesis } from "./synthesis";
export { executeValidation } from "./validation";

// Schema and parsing (model-agnostic extraction)
export {
  ExtractionResultSchema,
  DecisionSchema,
  CommitmentSchema,
  parseExtractionResult,
  coerceAndParse,
} from "./schema";
export type { ExtractionResult, ParseResult, ValidationError } from "./schema";

// JSON parser
export { extractJsonFromResponse, getExtractionPreview } from "./json-parser";

// Prompts (for customization)
export {
  EXTRACTION_PROMPT,
  DEDUPLICATION_PROMPT,
  SYNTHESIS_PROMPT,
  VALIDATION_PROMPT,
  getExtractionPromptWithMetadata,
  getSynthesisPromptWithTemplate,
} from "./prompts";
