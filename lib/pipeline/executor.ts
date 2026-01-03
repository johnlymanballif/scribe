// =============================================================================
// Pipeline Executor
// =============================================================================

import type { 
  PipelineResult, 
  PipelineStageConfig,
  PackageId,
  DeduplicatedFacts,
  ValidationResult,
  StageResult,
  MeetingMetadata,
} from "./types";
import { getStageConfig, isValidationMandatory } from "./packages";
import { executeExtraction } from "./extraction";
import { executeDeduplication } from "./deduplication";
import { executeSynthesis } from "./synthesis";
import { executeValidation } from "./validation";

// -----------------------------------------------------------------------------
// Pipeline Execution Options
// -----------------------------------------------------------------------------

export interface PipelineOptions {
  /** Skip validation stage entirely (fastest, but no confidence score) */
  skipValidation?: boolean;
  /** Run validation async - return summary immediately, validation updates later */
  asyncValidation?: boolean;
}

// -----------------------------------------------------------------------------
// Main Pipeline Execution
// -----------------------------------------------------------------------------

/**
 * Execute the complete pipeline
 * 
 * Flow: Transcript → Extraction → Deduplication → Synthesis → Validation
 * 
 * Speed optimizations:
 * - Uses fast models by default (Gemini Flash for extraction)
 * - Skips LLM deduplication for simple meetings
 * - Optional: skip or async validation
 */
export async function executePipeline(
  transcript: string,
  packageId: PackageId,
  templatePrompt: string,
  customConfig?: PipelineStageConfig,
  options: PipelineOptions = {},
  metadata?: MeetingMetadata
): Promise<PipelineResult> {
  const startTime = Date.now();
  
  // Get stage configuration
  const stages = getStageConfig(packageId, customConfig);
  
  // Initialize result structure
  const result: PipelineResult = {
    success: false,
    summary: null,
    confidence: null,
    validation_flags: [],
    stage_results: {
      extraction: null,
      deduplication: null,
      synthesis: null,
      validation: null,
    },
    total_duration_ms: 0,
    error: null,
  };

  try {
    // =========================================================================
    // Stage 1: Extraction
    // =========================================================================
    console.log(`[Pipeline] Starting extraction with ${stages.extraction}`);
    const extractionResult = await executeExtraction(transcript, stages.extraction, metadata);
    result.stage_results.extraction = extractionResult;
    
    if (!extractionResult.success || !extractionResult.data) {
      result.error = `Extraction failed: ${extractionResult.error}`;
      result.total_duration_ms = Date.now() - startTime;
      return result;
    }
    console.log(`[Pipeline] Extraction complete in ${extractionResult.duration_ms}ms`);

    // =========================================================================
    // Stage 1.5: Deduplication
    // =========================================================================
    // Skip LLM deduplication for simple meetings (< 5 decisions, < 5 commitments)
    const isSimpleMeeting = 
      extractionResult.data.decisions.length < 5 && 
      extractionResult.data.commitments.length < 5;
    
    console.log(`[Pipeline] Starting deduplication (simple: ${isSimpleMeeting})`);
    const deduplicationResult = await executeDeduplication(
      extractionResult.data,
      isSimpleMeeting ? null : stages.extraction // null = deterministic only
    );
    result.stage_results.deduplication = deduplicationResult;
    
    if (!deduplicationResult.success || !deduplicationResult.data) {
      result.error = `Deduplication failed: ${deduplicationResult.error}`;
      result.total_duration_ms = Date.now() - startTime;
      return result;
    }
    console.log(`[Pipeline] Deduplication complete in ${deduplicationResult.duration_ms}ms`);

    // =========================================================================
    // Stage 2: Synthesis
    // =========================================================================
    console.log(`[Pipeline] Starting synthesis with ${stages.synthesis}`);
    const synthesisResult = await executeSynthesis(
      deduplicationResult.data,
      stages.synthesis,
      templatePrompt,
      metadata
    );
    result.stage_results.synthesis = synthesisResult;
    
    if (!synthesisResult.success || !synthesisResult.data) {
      result.error = `Synthesis failed: ${synthesisResult.error}`;
      result.total_duration_ms = Date.now() - startTime;
      return result;
    }
    console.log(`[Pipeline] Synthesis complete in ${synthesisResult.duration_ms}ms`);

    // At this point we have a summary - mark success
    result.success = true;
    result.summary = synthesisResult.data;

    // =========================================================================
    // Stage 3: Validation
    // =========================================================================
    const mustValidate = isValidationMandatory(stages);
    const shouldSkipValidation = options.skipValidation && !mustValidate;
    
    if (shouldSkipValidation) {
      console.log(`[Pipeline] Skipping validation (optional)`);
      result.confidence = 75; // Default confidence when skipping
      result.total_duration_ms = Date.now() - startTime;
      return result;
    }

    console.log(`[Pipeline] Starting validation with ${stages.validation}`);
    const validationResult = await executeValidation(
      deduplicationResult.data,
      synthesisResult.data,
      stages.validation
    );
    result.stage_results.validation = validationResult;
    console.log(`[Pipeline] Validation complete in ${validationResult.duration_ms}ms`);
    
    // If validation failed and it was mandatory, surface the error but don't fail
    // The summary is still valid, just unverified
    if (!validationResult.success) {
      console.warn(`[Pipeline] Validation failed: ${validationResult.error}`);
      result.confidence = 70; // Default confidence on validation failure
    } else {
      result.confidence = validationResult.data?.overall_confidence_score ?? 70;
      result.validation_flags = validationResult.data?.flagged_issues ?? [];
    }

    result.total_duration_ms = Date.now() - startTime;
    console.log(`[Pipeline] Complete in ${result.total_duration_ms}ms`);
    
    return result;
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Unknown pipeline error";
    result.total_duration_ms = Date.now() - startTime;
    return result;
  }
}

/**
 * Execute validation separately (for async validation mode)
 */
export async function executeValidationOnly(
  deduplicatedFacts: DeduplicatedFacts,
  summary: string,
  validationModelId: string
): Promise<StageResult<ValidationResult>> {
  return executeValidation(
    deduplicatedFacts,
    summary,
    validationModelId as any
  );
}

// -----------------------------------------------------------------------------
// Pipeline Status Types (for streaming/progress updates)
// -----------------------------------------------------------------------------

export type PipelineStageStatus = 
  | "pending"
  | "running"
  | "completed"
  | "failed";

export interface PipelineProgress {
  currentStage: "extraction" | "deduplication" | "synthesis" | "validation" | "complete";
  stages: {
    extraction: PipelineStageStatus;
    deduplication: PipelineStageStatus;
    synthesis: PipelineStageStatus;
    validation: PipelineStageStatus;
  };
  message: string;
}

/**
 * Get human-readable message for current pipeline stage
 */
export function getStageMessage(stage: PipelineProgress["currentStage"]): string {
  switch (stage) {
    case "extraction":
      return "Extracting facts from transcript...";
    case "deduplication":
      return "Consolidating duplicates...";
    case "synthesis":
      return "Writing summary...";
    case "validation":
      return "Validating claims...";
    case "complete":
      return "Complete";
    default:
      return "Processing...";
  }
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Calculate total tokens used across all stages
 */
export function calculateTotalTokens(result: PipelineResult): {
  input: number;
  output: number;
  total: number;
} {
  let input = 0;
  let output = 0;
  
  if (result.stage_results.extraction) {
    input += result.stage_results.extraction.tokens_used.input;
    output += result.stage_results.extraction.tokens_used.output;
  }
  if (result.stage_results.deduplication) {
    input += result.stage_results.deduplication.tokens_used.input;
    output += result.stage_results.deduplication.tokens_used.output;
  }
  if (result.stage_results.synthesis) {
    input += result.stage_results.synthesis.tokens_used.input;
    output += result.stage_results.synthesis.tokens_used.output;
  }
  if (result.stage_results.validation) {
    input += result.stage_results.validation.tokens_used.input;
    output += result.stage_results.validation.tokens_used.output;
  }
  
  return { input, output, total: input + output };
}

/**
 * Get timing breakdown for each stage
 */
export function getTimingBreakdown(result: PipelineResult): {
  extraction: number;
  deduplication: number;
  synthesis: number;
  validation: number;
  total: number;
} {
  return {
    extraction: result.stage_results.extraction?.duration_ms ?? 0,
    deduplication: result.stage_results.deduplication?.duration_ms ?? 0,
    synthesis: result.stage_results.synthesis?.duration_ms ?? 0,
    validation: result.stage_results.validation?.duration_ms ?? 0,
    total: result.total_duration_ms,
  };
}
