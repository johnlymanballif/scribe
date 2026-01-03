// =============================================================================
// Stage 3: Validation (Trust Layer)
// =============================================================================

import type { 
  DeduplicatedFacts, 
  ValidationResult, 
  ValidationFlag,
  DecisionValidation,
  CommitmentValidation,
  PipelineModelId, 
  StageResult 
} from "./types";
import { VALIDATION_PROMPT } from "./prompts";
import { callOpenRouter, stripReasoningTokens, extractJsonFromResponse } from "./llm";

/**
 * Execute Stage 3: Validation
 * 
 * Adversarially verifies that the written summary is fully supported by extracted facts.
 * Does NOT auto-reject - low confidence surfaces as a user-facing trust signal.
 */
export async function executeValidation(
  deduplicatedFacts: DeduplicatedFacts,
  summary: string,
  modelId: PipelineModelId
): Promise<StageResult<ValidationResult>> {
  const startTime = Date.now();

  try {
    const response = await callOpenRouter({
      model: modelId,
      messages: [
        { role: "system", content: VALIDATION_PROMPT },
        { 
          role: "user", 
          content: `## EXTRACTED FACTS\n\`\`\`json\n${JSON.stringify(deduplicatedFacts, null, 2)}\n\`\`\`\n\n## WRITTEN SUMMARY\n${summary}` 
        },
      ],
      temperature: 0.0, // Zero temperature for consistent validation
      response_format: { type: "json_object" },
    });

    if (!response.success) {
      // Return a fallback validation result on failure
      return {
        success: true,
        data: createFallbackValidation(summary, modelId),
        error: null,
        duration_ms: Date.now() - startTime,
        tokens_used: { input: 0, output: 0 },
      };
    }

    const cleanedContent = stripReasoningTokens(response.content);
    const jsonContent = extractJsonFromResponse(cleanedContent);
    
    let parsed: Partial<ValidationResult>;
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      // Return fallback on parse failure
      return {
        success: true,
        data: createFallbackValidation(summary, modelId),
        error: null,
        duration_ms: Date.now() - startTime,
        tokens_used: {
          input: response.usage?.prompt_tokens ?? 0,
          output: response.usage?.completion_tokens ?? 0,
        },
      };
    }

    const validationResult = normalizeValidationResult(parsed, summary, modelId);

    return {
      success: true,
      data: validationResult,
      error: null,
      duration_ms: Date.now() - startTime,
      tokens_used: {
        input: response.usage?.prompt_tokens ?? 0,
        output: response.usage?.completion_tokens ?? 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown validation error",
      duration_ms: Date.now() - startTime,
      tokens_used: { input: 0, output: 0 },
    };
  }
}

/**
 * Create a fallback validation result when LLM validation fails
 */
function createFallbackValidation(summary: string, modelId: PipelineModelId): ValidationResult {
  return {
    overall_confidence_score: 70, // Conservative middle ground
    decision_validations: [],
    commitment_validations: [],
    flagged_issues: [{
      type: "unsupported_claim",
      severity: "warning",
      description: "Automated validation could not complete. Manual review recommended.",
      location: "entire summary",
      suggested_fix: null,
    }],
    validation_metadata: {
      validation_timestamp: new Date().toISOString(),
      model_used: modelId,
      summary_length: summary.length,
    },
  };
}

/**
 * Normalize and validate the LLM's validation output
 */
function normalizeValidationResult(
  raw: Partial<ValidationResult>,
  summary: string,
  modelId: PipelineModelId
): ValidationResult {
  const overallScore = normalizeScore(raw.overall_confidence_score);
  
  return {
    overall_confidence_score: overallScore,
    decision_validations: normalizeDecisionValidations(raw.decision_validations),
    commitment_validations: normalizeCommitmentValidations(raw.commitment_validations),
    flagged_issues: normalizeFlaggedIssues(raw.flagged_issues),
    validation_metadata: {
      validation_timestamp: new Date().toISOString(),
      model_used: modelId,
      summary_length: summary.length,
    },
  };
}

function normalizeScore(score: unknown): number {
  if (typeof score === "number") {
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  if (typeof score === "string") {
    const parsed = parseFloat(score);
    if (!isNaN(parsed)) {
      return Math.max(0, Math.min(100, Math.round(parsed)));
    }
  }
  return 70; // Default conservative score
}

function normalizeDecisionValidations(raw: unknown): DecisionValidation[] {
  if (!Array.isArray(raw)) return [];
  
  return raw.map((v) => {
    const validation = v as Record<string, unknown>;
    return {
      decision_id: String(validation.decision_id ?? "unknown"),
      confidence: normalizeScore(validation.confidence),
      has_supporting_evidence: Boolean(validation.has_supporting_evidence ?? true),
      language_matches_certainty: Boolean(validation.language_matches_certainty ?? true),
      issues: normalizeStringArray(validation.issues),
    };
  });
}

function normalizeCommitmentValidations(raw: unknown): CommitmentValidation[] {
  if (!Array.isArray(raw)) return [];
  
  return raw.map((v) => {
    const validation = v as Record<string, unknown>;
    return {
      commitment_id: String(validation.commitment_id ?? "unknown"),
      confidence: normalizeScore(validation.confidence),
      has_owner: Boolean(validation.has_owner ?? true),
      has_supporting_evidence: Boolean(validation.has_supporting_evidence ?? true),
      issues: normalizeStringArray(validation.issues),
    };
  });
}

function normalizeFlaggedIssues(raw: unknown): ValidationFlag[] {
  if (!Array.isArray(raw)) return [];
  
  const validTypes = [
    "missing_evidence",
    "tone_softening",
    "overgeneralization",
    "missing_owner",
    "certainty_mismatch",
    "unsupported_claim",
  ] as const;
  
  return raw.map((f) => {
    const flag = f as Record<string, unknown>;
    const rawType = String(flag.type ?? "unsupported_claim");
    const type = validTypes.includes(rawType as typeof validTypes[number])
      ? rawType as typeof validTypes[number]
      : "unsupported_claim";
    
    const rawSeverity = String(flag.severity ?? "warning").toLowerCase();
    const severity = rawSeverity === "error" ? "error" : "warning";
    
    return {
      type,
      severity,
      description: String(flag.description ?? "Unknown issue"),
      location: String(flag.location ?? "unknown"),
      suggested_fix: flag.suggested_fix ? String(flag.suggested_fix) : null,
    };
  });
}

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === "string");
}

