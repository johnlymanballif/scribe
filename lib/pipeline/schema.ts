// =============================================================================
// Zod Schemas for Extraction Output
// =============================================================================
// Runtime validation for LLM outputs with clear error messages

import { z } from "zod";

// -----------------------------------------------------------------------------
// Base Schemas
// -----------------------------------------------------------------------------

export const CertaintyLevelSchema = z.enum(["tentative", "confirmed", "uncertain"]);

export const SeverityLevelSchema = z.enum(["low", "medium", "high", "uncertain"]);

export const SupportingQuoteSchema = z.object({
  quote: z.string().min(1, "Quote cannot be empty"),
  timestamp: z.string().nullable(),
  speaker: z.string().nullable(),
});

// -----------------------------------------------------------------------------
// Core Entity Schemas
// -----------------------------------------------------------------------------

export const DecisionSchema = z.object({
  decision_id: z.string().default(""),
  description: z.string().min(1, "Decision description is required"),
  certainty_level: CertaintyLevelSchema.default("uncertain"),
  supporting_quotes: z.array(SupportingQuoteSchema).default([]),
});

export const CommitmentSchema = z.object({
  commitment_id: z.string().default(""),
  owner: z.string().min(1, "Commitment must have an owner"),
  task: z.string().min(1, "Commitment must have a task"),
  due_date: z.string().nullable().default(null),
  certainty_level: CertaintyLevelSchema.default("uncertain"),
  supporting_quotes: z.array(SupportingQuoteSchema).default([]),
});

export const RiskSchema = z.object({
  risk_id: z.string().default(""),
  description: z.string().min(1, "Risk description is required"),
  severity: SeverityLevelSchema.default("uncertain"),
  raised_by: z.string().nullable().default(null),
  supporting_quotes: z.array(SupportingQuoteSchema).default([]),
});

export const OpenQuestionSchema = z.object({
  question_id: z.string().default(""),
  question: z.string().min(1, "Question cannot be empty"),
  raised_by: z.string().nullable().default(null),
  context: z.string().nullable().default(null),
});

export const NotableQuoteSchema = z.object({
  quote: z.string().min(1, "Quote cannot be empty"),
  speaker: z.string().nullable().default(null),
  timestamp: z.string().nullable().default(null),
  significance: z.string().default(""),
});

// -----------------------------------------------------------------------------
// Main Extraction Schema
// -----------------------------------------------------------------------------

export const ExtractionResultSchema = z.object({
  participants: z.array(z.string()).default([]),
  decisions: z.array(DecisionSchema).default([]),
  commitments: z.array(CommitmentSchema).default([]),
  risks: z.array(RiskSchema).default([]),
  open_questions: z.array(OpenQuestionSchema).default([]),
  notable_quotes: z.array(NotableQuoteSchema).default([]),
});

// -----------------------------------------------------------------------------
// TypeScript Types (derived from schemas)
// -----------------------------------------------------------------------------

export type CertaintyLevel = z.infer<typeof CertaintyLevelSchema>;
export type SeverityLevel = z.infer<typeof SeverityLevelSchema>;
export type SupportingQuote = z.infer<typeof SupportingQuoteSchema>;
export type Decision = z.infer<typeof DecisionSchema>;
export type Commitment = z.infer<typeof CommitmentSchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type OpenQuestion = z.infer<typeof OpenQuestionSchema>;
export type NotableQuote = z.infer<typeof NotableQuoteSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

// -----------------------------------------------------------------------------
// Validation Utilities
// -----------------------------------------------------------------------------

export interface ValidationError {
  field: string;
  message: string;
  received: unknown;
}

export interface ParseResult<T> {
  success: boolean;
  data: T | null;
  errors: ValidationError[];
}

/**
 * Parse and validate extraction data with detailed error messages
 */
export function parseExtractionResult(data: unknown): ParseResult<ExtractionResult> {
  const result = ExtractionResultSchema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: [],
    };
  }
  
  // Convert Zod errors to our format
  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
    received: issue.code === "invalid_type" ? (issue as { received?: unknown }).received : undefined,
  }));
  
  return {
    success: false,
    data: null,
    errors,
  };
}

/**
 * Attempt to coerce and fix common LLM output issues before validation
 */
export function coerceAndParse(data: unknown): ParseResult<ExtractionResult> {
  // If it's not an object, we can't fix it
  if (typeof data !== "object" || data === null) {
    return {
      success: false,
      data: null,
      errors: [{ field: "root", message: "Expected object, got " + typeof data, received: data }],
    };
  }
  
  const obj = data as Record<string, unknown>;
  
  // Coerce common issues
  const coerced = {
    participants: coerceArray(obj.participants),
    decisions: coerceArray(obj.decisions).map(coerceDecision),
    commitments: coerceArray(obj.commitments).map(coerceCommitment),
    risks: coerceArray(obj.risks).map(coerceRisk),
    open_questions: coerceArray(obj.open_questions ?? obj.openQuestions).map(coerceOpenQuestion),
    notable_quotes: coerceArray(obj.notable_quotes ?? obj.notableQuotes).map(coerceNotableQuote),
  };
  
  return parseExtractionResult(coerced);
}

// -----------------------------------------------------------------------------
// Coercion Helpers
// -----------------------------------------------------------------------------

function coerceArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function coerceDecision(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const obj = value as Record<string, unknown>;
  return {
    ...obj,
    certainty_level: coerceCertainty(obj.certainty_level ?? obj.certaintyLevel),
    supporting_quotes: coerceArray(obj.supporting_quotes ?? obj.supportingQuotes),
  };
}

function coerceCommitment(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const obj = value as Record<string, unknown>;
  return {
    ...obj,
    due_date: obj.due_date ?? obj.dueDate ?? null,
    certainty_level: coerceCertainty(obj.certainty_level ?? obj.certaintyLevel),
    supporting_quotes: coerceArray(obj.supporting_quotes ?? obj.supportingQuotes),
  };
}

function coerceRisk(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const obj = value as Record<string, unknown>;
  return {
    ...obj,
    raised_by: obj.raised_by ?? obj.raisedBy ?? null,
    supporting_quotes: coerceArray(obj.supporting_quotes ?? obj.supportingQuotes),
  };
}

function coerceOpenQuestion(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const obj = value as Record<string, unknown>;
  return {
    ...obj,
    question_id: obj.question_id ?? obj.questionId ?? "",
    raised_by: obj.raised_by ?? obj.raisedBy ?? null,
  };
}

function coerceNotableQuote(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const obj = value as Record<string, unknown>;
  return {
    ...obj,
    significance: obj.significance ?? "",
  };
}

function coerceCertainty(value: unknown): string {
  if (typeof value !== "string") return "uncertain";
  const lower = value.toLowerCase();
  if (lower === "confirmed" || lower === "final") return "confirmed";
  if (lower === "tentative" || lower === "provisional") return "tentative";
  return "uncertain";
}

