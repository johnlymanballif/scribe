// =============================================================================
// Pipeline Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// Stage 1: Extraction Output Types
// -----------------------------------------------------------------------------

export type CertaintyLevel = "tentative" | "confirmed" | "uncertain";

export interface SupportingQuote {
  quote: string;
  timestamp: string | null;
  speaker: string | null;
}

export interface Decision {
  decision_id: string;
  description: string;
  certainty_level: CertaintyLevel;
  supporting_quotes: SupportingQuote[];
}

export interface Commitment {
  commitment_id: string;
  owner: string;
  task: string;
  due_date: string | null;
  certainty_level: CertaintyLevel;
  supporting_quotes: SupportingQuote[];
}

export interface Risk {
  risk_id: string;
  description: string;
  severity: "low" | "medium" | "high" | "uncertain";
  raised_by: string | null;
  supporting_quotes: SupportingQuote[];
}

export interface OpenQuestion {
  question_id: string;
  question: string;
  raised_by: string | null;
  context: string | null;
}

export interface NotableQuote {
  quote: string;
  speaker: string | null;
  timestamp: string | null;
  significance: string;
}

export interface ExtractedFacts {
  participants: string[];
  decisions: Decision[];
  commitments: Commitment[];
  risks: Risk[];
  open_questions: OpenQuestion[];
  notable_quotes: NotableQuote[];
  extraction_metadata: {
    transcript_length: number;
    extraction_timestamp: string;
    model_used: string;
  };
}

// -----------------------------------------------------------------------------
// Stage 1.5: Deduplication Output Types
// -----------------------------------------------------------------------------

export interface DeduplicatedFacts extends Omit<ExtractedFacts, "extraction_metadata"> {
  deduplication_metadata: {
    original_decision_count: number;
    merged_decision_count: number;
    original_commitment_count: number;
    merged_commitment_count: number;
    deduplication_timestamp: string;
    model_used: string | null; // null if deterministic
  };
}

// -----------------------------------------------------------------------------
// Stage 3: Validation Output Types
// -----------------------------------------------------------------------------

export interface DecisionValidation {
  decision_id: string;
  confidence: number; // 0-100
  has_supporting_evidence: boolean;
  language_matches_certainty: boolean;
  issues: string[];
}

export interface CommitmentValidation {
  commitment_id: string;
  confidence: number;
  has_owner: boolean;
  has_supporting_evidence: boolean;
  issues: string[];
}

export interface ValidationFlag {
  type: "missing_evidence" | "tone_softening" | "overgeneralization" | "missing_owner" | "certainty_mismatch" | "unsupported_claim";
  severity: "warning" | "error";
  description: string;
  location: string; // reference to where in the summary
  suggested_fix: string | null;
}

export interface ValidationResult {
  overall_confidence_score: number; // 0-100
  decision_validations: DecisionValidation[];
  commitment_validations: CommitmentValidation[];
  flagged_issues: ValidationFlag[];
  validation_metadata: {
    validation_timestamp: string;
    model_used: string;
    summary_length: number;
  };
}

// -----------------------------------------------------------------------------
// Pipeline Configuration Types
// -----------------------------------------------------------------------------

export type PipelineModelId = 
  | "anthropic/claude-sonnet-4"
  | "anthropic/claude-haiku-4"
  | "deepseek/deepseek-r1"
  | "moonshotai/kimi-k2"
  | "google/gemini-2.5-flash"
  | "openai/gpt-4o";

export interface PipelineStageConfig {
  extraction: PipelineModelId;
  synthesis: PipelineModelId;
  validation: PipelineModelId;
}

export type PackageId = "TRUST_MAX" | "BALANCED_PRO" | "FAST_ELEGANT" | "CUSTOM";

export interface ModelPackage {
  id: PackageId;
  name: string;
  description: string;
  stages: PipelineStageConfig;
  risk_level: "low" | "medium" | "high";
  use_cases: string[];
}

export interface PipelineConfig {
  packageId: PackageId;
  stages: PipelineStageConfig;
  templatePrompt: string;
}

// -----------------------------------------------------------------------------
// Pipeline Execution Types
// -----------------------------------------------------------------------------

export type PipelineStage = "extraction" | "deduplication" | "synthesis" | "validation";

export interface StageResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  duration_ms: number;
  tokens_used: {
    input: number;
    output: number;
  };
}

export interface PipelineResult {
  success: boolean;
  summary: string | null;
  confidence: number | null;
  validation_flags: ValidationFlag[];
  stage_results: {
    extraction: StageResult<ExtractedFacts> | null;
    deduplication: StageResult<DeduplicatedFacts> | null;
    synthesis: StageResult<string> | null;
    validation: StageResult<ValidationResult> | null;
  };
  total_duration_ms: number;
  error: string | null;
}

// -----------------------------------------------------------------------------
// API Request/Response Types
// -----------------------------------------------------------------------------

export interface DictionaryCorrection {
  incorrect: string;
  correct: string;
}

export interface MeetingMetadata {
  clientName?: string;
  participants?: string[];
  meetingName?: string;
  date?: string;
  dictionary?: DictionaryCorrection[];
}

export interface GenerateRequest {
  transcript: string;
  packageId?: PackageId;
  customConfig?: PipelineStageConfig;
  templatePrompt: string;
  metadata?: MeetingMetadata;
}

export interface GenerateResponse {
  summary: string;
  confidence: number;
  validationFlags: ValidationFlag[];
  processingTime: {
    extraction: number;
    deduplication: number;
    synthesis: number;
    validation: number;
    total: number;
  };
}

export interface GenerateErrorResponse {
  error: string;
  details?: string;
  stage?: PipelineStage;
}

