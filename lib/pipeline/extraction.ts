// =============================================================================
// Stage 1: Extraction (Model-Agnostic)
// =============================================================================

import type { ExtractedFacts, PipelineModelId, StageResult, MeetingMetadata } from "./types";
import type { ExtractionResult } from "./schema";
import { getExtractionPromptWithMetadata } from "./prompts";
import { callOpenRouter } from "./llm";
import { extractJsonFromResponse, getExtractionPreview } from "./json-parser";

/**
 * Execute Stage 1: Extraction
 * 
 * Converts raw transcript into structured JSON facts.
 * Model-agnostic: works with Claude, GPT, Gemini, DeepSeek, etc.
 * Uses XML tagging for reliable parsing.
 */
export async function executeExtraction(
  transcript: string,
  modelId: PipelineModelId,
  metadata?: MeetingMetadata
): Promise<StageResult<ExtractedFacts>> {
  const startTime = Date.now();

  try {
    // Build extraction prompt with metadata context if provided
    const extractionPrompt = getExtractionPromptWithMetadata(metadata);
    
    const response = await callOpenRouter({
      model: modelId,
      messages: [
        { role: "system", content: extractionPrompt },
        { role: "user", content: transcript },
      ],
      temperature: 0.1, // Low temperature for factual extraction
    });

    if (!response.success) {
      return {
        success: false,
        data: null,
        error: response.error || "Failed to call extraction model",
        duration_ms: Date.now() - startTime,
        tokens_used: { input: 0, output: 0 },
      };
    }

    // Use the new model-agnostic JSON parser
    const parseResult = extractJsonFromResponse(response.content);
    
    if (!parseResult.success || !parseResult.data) {
      return {
        success: false,
        data: null,
        error: `Extraction parsing failed: ${parseResult.errors.join("; ")}`,
        duration_ms: Date.now() - startTime,
        tokens_used: {
          input: response.usage?.prompt_tokens ?? 0,
          output: response.usage?.completion_tokens ?? 0,
        },
      };
    }

    // Log extraction preview for debugging
    console.log(`[Extraction] ${getExtractionPreview(parseResult)}`);

    // Convert to ExtractedFacts format with metadata
    const extractedFacts = convertToExtractedFacts(
      parseResult.data,
      transcript.length,
      modelId
    );

    return {
      success: true,
      data: extractedFacts,
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
      error: error instanceof Error ? error.message : "Unknown extraction error",
      duration_ms: Date.now() - startTime,
      tokens_used: { input: 0, output: 0 },
    };
  }
}

/**
 * Convert parsed ExtractionResult to ExtractedFacts with metadata and IDs
 */
function convertToExtractedFacts(
  parsed: ExtractionResult,
  transcriptLength: number,
  modelId: PipelineModelId
): ExtractedFacts {
  return {
    participants: parsed.participants,
    
    decisions: parsed.decisions.map((d, i) => ({
      decision_id: d.decision_id || `D${i + 1}`,
      description: d.description,
      certainty_level: d.certainty_level,
      supporting_quotes: d.supporting_quotes.map(q => ({
        quote: q.quote,
        timestamp: q.timestamp,
        speaker: q.speaker,
      })),
    })),
    
    commitments: parsed.commitments.map((c, i) => ({
      commitment_id: c.commitment_id || `C${i + 1}`,
      owner: c.owner,
      task: c.task,
      due_date: c.due_date,
      certainty_level: c.certainty_level,
      supporting_quotes: c.supporting_quotes.map(q => ({
        quote: q.quote,
        timestamp: q.timestamp,
        speaker: q.speaker,
      })),
    })),
    
    risks: parsed.risks.map((r, i) => ({
      risk_id: r.risk_id || `R${i + 1}`,
      description: r.description,
      severity: r.severity,
      raised_by: r.raised_by,
      supporting_quotes: r.supporting_quotes.map(q => ({
        quote: q.quote,
        timestamp: q.timestamp,
        speaker: q.speaker,
      })),
    })),
    
    open_questions: parsed.open_questions.map((q, i) => ({
      question_id: q.question_id || `Q${i + 1}`,
      question: q.question,
      raised_by: q.raised_by,
      context: q.context,
    })),
    
    notable_quotes: parsed.notable_quotes.map(q => ({
      quote: q.quote,
      speaker: q.speaker,
      timestamp: q.timestamp,
      significance: q.significance,
    })),
    
    extraction_metadata: {
      transcript_length: transcriptLength,
      extraction_timestamp: new Date().toISOString(),
      model_used: modelId,
    },
  };
}
